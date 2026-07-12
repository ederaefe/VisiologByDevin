import { createClient } from '@supabase/supabase-js';
import { validateVisitorRecords } from '../lib/validation.js';
import { DEFAULT_TEMPLATE, normalizeTemplate } from '../lib/visitor-schema.js';
import { parseCsv, parseExtractionCsv } from '../lib/csv-parser.js';

// Convert CSV rows to database records
function csvRowsToRecords(csvRows, template, scanId = null) {
    return csvRows.map((row, index) => {
        const recordData = {};
        
        // Map CSV columns to record data based on template
        if (template && template.fields) {
            template.fields.forEach((field, fieldIndex) => {
                if (row[fieldIndex]) {
                    recordData[field.key] = row[fieldIndex];
                }
            });
        } else {
            // Default mapping
            recordData.name = row[1] || '';
            recordData.visitor_name = row[1] || '';
        }
        
        const validated = validateVisitorRecords([{
            fields: recordData,
            confidence: {}
        }], template || DEFAULT_TEMPLATE)[0];
        
        return {
            scan_id: scanId,
            data: validated.data,
            confidence: validated.confidence,
            overall_confidence: validated.overall_confidence,
            validation_status: validated.validation_status,
            validation_errors: validated.validation_errors,
            raw_extra: validated.raw_extra || {},
            review_status: validated.validation_status === 'valid' ? 'pending' : 'needs_review',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    });
}

async function resolveTemplate(supabase, templateId = null) {
    if (templateId) {
        const { data } = await supabase
            .from('logbook_templates')
            .select('*')
            .eq('id', templateId)
            .maybeSingle();
        if (data) return normalizeTemplate(data);
    }

    const { data } = await supabase
        .from('logbook_templates')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();
    return data ? normalizeTemplate(data) : DEFAULT_TEMPLATE;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;
    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'Database configuration missing.' });
    }

    try {
        const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
        
        // Get CSV data from request body
        let csvData;
        if (req.body && typeof req.body === 'string') {
            csvData = req.body;
        } else if (req.body && req.body.csv) {
            csvData = req.body.csv;
        } else {
            return res.status(400).json({ error: 'CSV data required' });
        }

        const { scan_id, template_id, append = 'true' } = req.body;
        
        // Parse CSV using library
        const rows = parseCsv(csvData);
        
        if (rows.length < 2) {
            return res.status(400).json({ error: 'No data rows found in CSV' });
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        // Get template
        const template = await resolveTemplate(supabase, template_id);
        
        // Use the extraction CSV parser if template is available
        let parsedRecords;
        if (template) {
            parsedRecords = parseExtractionCsv(csvData, template);
        } else {
            // Fall back to simple mapping
            parsedRecords = dataRows.map(row => ({
                fields: {
                    name: row[1] || '',
                    visitor_name: row[1] || ''
                },
                confidence: {}
            }));
        }
        
        // Convert parsed records to database format
        const records = parsedRecords.map(parsed => {
            const validated = validateVisitorRecords([parsed], template || DEFAULT_TEMPLATE)[0];
            return {
                scan_id: scan_id,
                data: validated.data,
                confidence: validated.confidence,
                overall_confidence: validated.overall_confidence,
                validation_status: validated.validation_status,
                validation_errors: validated.validation_errors,
                raw_extra: validated.raw_extra || {},
                review_status: validated.validation_status === 'valid' ? 'pending' : 'needs_review',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        });
        
        // Process in batches to avoid memory overflow
        const batchSize = 100;
        const processedRecords = [];
        
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            const { data: inserted, error } = await supabase
                .from('visiolog_records')
                .insert(batch)
                .select();
            
            if (error) throw error;
            
            processedRecords.push(...(inserted || []));
        }

        return res.status(200).json({
            success: true,
            processed: processedRecords.length,
            total: records.length,
            records: processedRecords,
            headers
        });
    } catch (error) {
        console.error('CSV Processing Error:', error);
        return res.status(500).json({ error: error.message || 'Could not process CSV data.' });
    }
}