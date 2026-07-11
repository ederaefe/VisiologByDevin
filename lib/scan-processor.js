import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSupabaseClient } from './supabase-client.js';
import {
    AI_MODEL_VERSION,
    createExtractionPrompt,
    normalizeTemplate,
    DEFAULT_TEMPLATE
} from './visitor-schema.js';
import { parseExtractionCsv } from './csv-parser.js';
import { validateVisitorRecords } from './validation.js';

const SCAN_BUCKET = 'logbooks';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BASE_MS = 60_000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

function now() {
    return new Date().toISOString();
}

function backoffMs(attemptCount) {
    return Math.min(MAX_BACKOFF_MS, RETRY_BASE_MS * 2 ** Math.max(0, attemptCount - 1));
}

function formatError(error) {
    return String(error?.message || error || 'Unknown error');
}

async function resolveTemplate(supabase, scanRecord) {
    if (scanRecord.template_id) {
        const { data, error } = await supabase
            .from('logbook_templates')
            .select('*')
            .eq('id', scanRecord.template_id)
            .maybeSingle();
        if (!error && data) {
            return { template: normalizeTemplate(data), templateId: data.id };
        }
    }

    const { data: defaultTemplate, error } = await supabase
        .from('logbook_templates')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();

    if (!error && defaultTemplate) {
        return {
            template: normalizeTemplate(defaultTemplate),
            templateId: defaultTemplate.id
        };
    }

    return { template: DEFAULT_TEMPLATE, templateId: scanRecord.template_id || null };
}

function recordHasProcessingOutcome(records) {
    return Array.isArray(records) && records.some(record => record.review_status === 'needs_review');
}

async function downloadScanImage(supabase, scanRecord) {
    const { data: fileData, error: downloadError } = await supabase.storage
        .from(SCAN_BUCKET)
        .download(scanRecord.filename);
    if (downloadError || !fileData) {
        throw new Error(`Failed to download image from storage: ${downloadError?.message || 'missing file'}`);
    }
    return Buffer.from(await fileData.arrayBuffer());
}

function assertExtractionText(text) {
    if (!text || !String(text).trim()) {
        throw new Error('Extraction engine returned empty text.');
    }
    const normalized = String(text).trim();
    if (/```/.test(normalized) && !/^```/.test(normalized)) {
        throw new Error('Extraction output contains unexpected formatting.');
    }
    return normalized;
}

async function runGeminiExtraction(imageBuffer, mimeType, template) {
    const { GEMINI_API_KEY } = process.env;
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured.');
    }

    const base64Data = imageBuffer.toString('base64');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: AI_MODEL_VERSION });
    const result = await model.generateContent([
        createExtractionPrompt(template),
        { inlineData: { data: base64Data, mimeType } }
    ]);

    const responseText = typeof result.response?.text === 'function'
        ? result.response.text()
        : result.response?.text || result.response || '';

    return assertExtractionText(responseText);
}

export async function claimPendingScan(supabase) {
    const nowTs = now();
    const { data: candidates, error: selectError } = await supabase
        .from('visiolog_scans')
        .select('*')
        .or('status.eq.pending,status.eq.failed')
        .lte('attempt_count', MAX_RETRY_ATTEMPTS - 1)
        .or(`next_retry_at.is.null,next_retry_at.lte.${nowTs}`)
        .order('created_at', { ascending: true })
        .limit(1);

    if (selectError) {
        throw selectError;
    }
    const scan = Array.isArray(candidates) && candidates.length > 0 ? candidates[0] : null;
    if (!scan) {
        return null;
    }

    const { data: updatedScan, error: updateError } = await supabase
        .from('visiolog_scans')
        .update({ status: 'processing', last_attempt_at: nowTs, updated_at: nowTs, error_message: null })
        .increment('attempt_count', 1)
        .eq('id', scan.id)
        .eq('status', scan.status)
        .select('*')
        .single();

    if (updateError) {
        if (updateError.details?.includes('duplicate key value')) {
            return null;
        }
        throw updateError;
    }
    return updatedScan;
}

async function persistScanRecords(supabase, scanRecord, templateId, validatedRecords) {
    const nowTs = now();
    const rows = validatedRecords.map(record => ({
        scan_id: scanRecord.id,
        template_id: templateId,
        data: record.data,
        row_index: record.row_index,
        confidence: record.confidence,
        overall_confidence: record.overall_confidence,
        validation_status: record.validation_status,
        validation_errors: record.validation_errors,
        review_status: record.review_status,
        ai_model_version: AI_MODEL_VERSION,
        raw_extra: record.raw_extra,
        created_at: nowTs,
        updated_at: nowTs
    }));

    const { error: deleteError } = await supabase
        .from('visiolog_records')
        .delete()
        .eq('scan_id', scanRecord.id);
    if (deleteError) {
        throw deleteError;
    }

    if (rows.length === 0) {
        return;
    }

    const { error: insertError } = await supabase
        .from('visiolog_records')
        .insert(rows);
    if (insertError) {
        throw insertError;
    }
}

export async function processScanRecord(supabase, scanRecord) {
    const nowTs = now();
    const { template, templateId } = await resolveTemplate(supabase, scanRecord);
    const imageBuffer = await downloadScanImage(supabase, scanRecord);
    const mimeType = scanRecord.filename?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const extractionText = await runGeminiExtraction(imageBuffer, mimeType, template);
    const extractedRecords = parseExtractionCsv(extractionText, template);
    const validatedRecords = validateVisitorRecords(extractedRecords, template);

    await persistScanRecords(supabase, scanRecord, templateId, validatedRecords);

    const finalStatus = recordHasProcessingOutcome(validatedRecords) ? 'needs_review' : 'completed';
    const { error: updateError } = await supabase
        .from('visiolog_scans')
        .update({
            status: finalStatus,
            extracted_data: validatedRecords,
            error_message: null,
            next_retry_at: null,
            updated_at: nowTs
        })
        .eq('id', scanRecord.id);

    if (updateError) {
        throw updateError;
    }
    return { status: finalStatus, count: validatedRecords.length };
}

export async function processScanById(scanId) {
    const supabase = createSupabaseClient({ useServiceRole: true });
    const { data: scanRecord, error: scanError } = await supabase
        .from('visiolog_scans')
        .select('*')
        .eq('id', scanId)
        .single();

    if (scanError || !scanRecord) {
        throw new Error('Scan job not found.');
    }

    if (scanRecord.status === 'completed' || scanRecord.status === 'needs_review') {
        return { status: scanRecord.status, count: scanRecord.extracted_data?.length || 0 };
    }

    const nowTs = now();
    const { data: processingScan, error: processingError } = await supabase
        .from('visiolog_scans')
        .update({ status: 'processing', last_attempt_at: nowTs, updated_at: nowTs, error_message: null })
        .eq('id', scanRecord.id)
        .eq('status', scanRecord.status)
        .select('*')
        .single();
    if (processingError) {
        throw processingError;
    }

    try {
        return await processScanRecord(supabase, processingScan);
    } catch (error) {
        const errorMessage = formatError(error);
        const attemptCount = (processingScan.attempt_count || 0);
        const nextRetryAt = attemptCount < MAX_RETRY_ATTEMPTS
            ? new Date(Date.now() + backoffMs(attemptCount)).toISOString()
            : null;

        await supabase
            .from('visiolog_scans')
            .update({
                status: 'failed',
                error_message: errorMessage,
                next_retry_at: nextRetryAt,
                updated_at: nowTs
            })
            .eq('id', processingScan.id);
        throw error;
    }
}

export async function processPendingScans(limit = 5) {
    const supabase = createSupabaseClient({ useServiceRole: true });
    const processed = [];
    for (let i = 0; i < limit; i += 1) {
        const scan = await claimPendingScan(supabase);
        if (!scan) break;
        try {
            const result = await processScanRecord(supabase, scan);
            processed.push({ id: scan.id, status: result.status, count: result.count });
        } catch (error) {
            const errorMessage = formatError(error);
            const attemptCount = scan.attempt_count || 1;
            const nextRetryAt = attemptCount < MAX_RETRY_ATTEMPTS
                ? new Date(Date.now() + backoffMs(attemptCount)).toISOString()
                : null;
            await supabase
                .from('visiolog_scans')
                .update({
                    status: 'failed',
                    error_message: errorMessage,
                    next_retry_at: nextRetryAt,
                    updated_at: now()
                })
                .eq('id', scan.id);
            processed.push({ id: scan.id, status: 'failed', error: errorMessage });
        }
    }
    return processed;
}
