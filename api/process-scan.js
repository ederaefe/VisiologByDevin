import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import {
    AI_MODEL_VERSION,
    DEFAULT_TEMPLATE,
    createExtractionPrompt,
    normalizeTemplate
} from './lib/visitor-schema.js';
import { validateVisitorRecords } from './lib/validation.js';

function parseModelJson(responseText) {
    const sanitizedText = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
    const startArray = sanitizedText.indexOf('[');
    const startObject = sanitizedText.indexOf('{');
    let startIndex = -1;
    let endIndex = -1;
    if (startArray !== -1 && (startObject === -1 || startArray < startObject)) {
        startIndex = startArray;
        endIndex = sanitizedText.lastIndexOf(']');
    } else if (startObject !== -1) {
        startIndex = startObject;
        endIndex = sanitizedText.lastIndexOf('}');
    }
    if (startIndex === -1 || endIndex <= startIndex) {
        throw new Error('Could not find JSON in model response.');
    }
    const rawJson = sanitizedText.substring(startIndex, endIndex + 1)
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
    const parsed = JSON.parse(rawJson);
    return Array.isArray(parsed) ? parsed : [parsed];
}

async function resolveTemplate(supabase, scanRecord) {
    if (scanRecord.template_id) {
        const { data } = await supabase
            .from('logbook_templates')
            .select('*')
            .eq('id', scanRecord.template_id)
            .maybeSingle();
        if (data) return { template: normalizeTemplate(data), templateId: data.id };
    }

    const { data: defaultTemplate } = await supabase
        .from('logbook_templates')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();
    if (defaultTemplate) {
        return {
            template: normalizeTemplate(defaultTemplate),
            templateId: defaultTemplate.id
        };
    }
    return { template: DEFAULT_TEMPLATE, templateId: scanRecord.template_id || null };
}

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const id = req.query.id || req.body?.id;
    if (!id) return res.status(400).json({ error: 'Missing scan job ID.' });

    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, GEMINI_API_KEY } = process.env;
    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY || !GEMINI_API_KEY) {
        return res.status(500).json({ error: 'System configuration missing.' });
    }
    const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

    try {
        const { data: scanRecord, error: fetchError } = await supabase
            .from('visiolog_scans')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError || !scanRecord) {
            return res.status(404).json({ error: 'Scan job not found.' });
        }
        if (scanRecord.status === 'completed' || scanRecord.status === 'needs_review') {
            return res.status(200).json({
                success: true,
                message: 'Already processed.',
                records: scanRecord.extracted_data
            });
        }

        const { template, templateId } = await resolveTemplate(supabase, scanRecord);
        await supabase
            .from('visiolog_scans')
            .update({
                status: 'processing',
                error_message: null,
                ...(templateId ? { template_id: templateId } : {})
            })
            .eq('id', id);

        const { data: fileData, error: downloadError } = await supabase.storage
            .from('logbooks')
            .download(scanRecord.filename);
        if (downloadError) {
            throw new Error(`Failed to download image from storage: ${downloadError.message}`);
        }
        const imageBuffer = Buffer.from(await fileData.arrayBuffer());
        const base64Data = imageBuffer.toString('base64');
        const mimeType = scanRecord.filename.toLowerCase().endsWith('.png')
            ? 'image/png'
            : 'image/jpeg';

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: AI_MODEL_VERSION });
        const result = await model.generateContent([
            createExtractionPrompt(template),
            { inlineData: { data: base64Data, mimeType } }
        ]);
        const extractedRecords = parseModelJson(result.response.text());

        await supabase
            .from('visiolog_scans')
            .update({ status: 'validating' })
            .eq('id', id);

        const validatedRecords = validateVisitorRecords(extractedRecords, template);
        const now = new Date().toISOString();
        const rows = validatedRecords.map(record => ({
            scan_id: id,
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
            created_at: now,
            updated_at: now
        }));

        const { error: deleteError } = await supabase
            .from('visiolog_records')
            .delete()
            .eq('scan_id', id);
        if (deleteError) throw deleteError;
        if (rows.length > 0) {
            const { error: insertError } = await supabase
                .from('visiolog_records')
                .insert(rows);
            if (insertError) throw insertError;
        }

        const hasReviewRecords = validatedRecords.some(record =>
            record.review_status === 'needs_review'
        );
        const finalStatus = hasReviewRecords ? 'needs_review' : 'completed';
        const { error: scanUpdateError } = await supabase
            .from('visiolog_scans')
            .update({
                status: finalStatus,
                extracted_data: validatedRecords,
                error_message: null
            })
            .eq('id', id);
        if (scanUpdateError) throw scanUpdateError;

        return res.status(200).json({
            success: true,
            count: rows.length,
            status: finalStatus,
            data: validatedRecords
        });
    } catch (error) {
        console.error('Processing Job Error:', error);
        await supabase
            .from('visiolog_scans')
            .update({ status: 'failed', error_message: error.message })
            .eq('id', id);
        return res.status(500).json({
            error: error.message || 'Failed to process scan.'
        });
    }
}
