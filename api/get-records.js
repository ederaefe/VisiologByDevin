import { createClient } from '@supabase/supabase-js';
import {
    DEFAULT_TEMPLATE,
    normalizeTemplate
} from '../lib/visitor-schema.js';

function publicImageUrl(supabase, filename) {
    if (!filename) return null;
    const { data: { publicUrl } } = supabase.storage
        .from('logbooks')
        .getPublicUrl(filename);
    return publicUrl;
}

async function loadTemplates(supabase, records) {
    const templateIds = [...new Set(records.map(record => record.template_id).filter(Boolean))];
    const templates = new Map();
    if (templateIds.length > 0) {
        const { data, error } = await supabase
            .from('logbook_templates')
            .select('*')
            .in('id', templateIds);
        if (error) throw error;
        (data || []).forEach(template => templates.set(template.id, normalizeTemplate(template)));
    }
    return records.map(record => ({
        ...record,
        template: templates.get(record.template_id) || DEFAULT_TEMPLATE
    }));
}

function applyRecordFilters(query, params) {
    if (params.scan_id) query = query.eq('scan_id', params.scan_id);
    if (params.review_status && params.review_status !== 'flagged') {
        query = query.eq('review_status', params.review_status);
    }
    if (params.validation_status && params.validation_status !== 'flagged') {
        query = query.eq('validation_status', params.validation_status);
    }
    if (params.review_status === 'flagged' || params.validation_status === 'flagged') {
        query = query.or('review_status.eq.needs_review,validation_status.eq.invalid');
    }
    return query;
}

async function fetchRecords(supabase, params) {
    let query = supabase
        .from('visiolog_records')
        .select('*')
        .order('created_at', { ascending: false });
    query = applyRecordFilters(query, params);
    const { data, error } = await query;
    if (error) throw error;
    return loadTemplates(supabase, data || []);
}

async function fetchAudits(supabase, records) {
    if (!records.length) return records;
    const recordIds = records.map(record => record.id);
    const { data, error } = await supabase
        .from('visiolog_record_audit')
        .select('*')
        .in('record_id', recordIds)
        .order('created_at', { ascending: false });
    if (error) throw error;
    const auditsByRecord = new Map();
    (data || []).forEach(audit => {
        const audits = auditsByRecord.get(audit.record_id) || [];
        audits.push(audit);
        auditsByRecord.set(audit.record_id, audits);
    });
    return records.map(record => ({
        ...record,
        audits: auditsByRecord.get(record.id) || []
    }));
}

async function fetchWorklist(supabase, includeAll = false) {
    const { data: records, error: recordError } = await supabase
        .from('visiolog_records')
        .select('id,scan_id,review_status,validation_status');
    if (recordError) throw recordError;

    const grouped = new Map();
    (records || []).forEach(record => {
        const group = grouped.get(record.scan_id) || {
            scan_id: record.scan_id,
            total_count: 0,
            counts: {
                pending: 0,
                needs_review: 0,
                approved: 0,
                rejected: 0,
                invalid: 0
            },
            flagged_count: 0
        };
        group.total_count += 1;
        if (group.counts[record.review_status] !== undefined) {
            group.counts[record.review_status] += 1;
        }
        if (record.validation_status === 'invalid') group.counts.invalid += 1;
        if (record.review_status === 'needs_review' || record.validation_status === 'invalid') {
            group.flagged_count += 1;
        }
        grouped.set(record.scan_id, group);
    });

    const { data: scans, error: scanError } = await supabase
        .from('visiolog_scans')
        .select('*')
        .order('created_at', { ascending: false });
    if (scanError) throw scanError;

    return (scans || [])
        .map(scan => {
            const group = grouped.get(scan.id) || {
                scan_id: scan.id,
                total_count: 0,
                flagged_count: 0,
                counts: {
                    pending: 0,
                    needs_review: 0,
                    approved: 0,
                    rejected: 0,
                    invalid: 0
                }
            };
            if (!includeAll && group.flagged_count === 0) return null;
            return {
                id: scan.id,
                scan_id: scan.id,
                filename: scan.filename,
                status: scan.status,
                template_id: scan.template_id,
                created_at: scan.created_at,
                url: publicImageUrl(supabase, scan.filename),
                ...group,
                flagged_count: group.flagged_count
            };
        })
        .filter(Boolean)
        .filter(scan => includeAll || scan.flagged_count > 0);
}

// Convert records to CSV format
function recordsToCSV(records) {
    if (!records || records.length === 0) return '';
    
    const headers = ['ID', 'Name', 'Date', 'Status', 'Category', 'Scan ID', 'Created At', 'Updated At'];
    const csvRows = [headers.join(',')];
    
    records.forEach(record => {
        const row = [
            record.id || '',
            record.data?.name || record.data?.visitor_name || '',
            record.created_at || '',
            record.review_status || 'pending',
            record.template_id || 'default',
            record.scan_id || '',
            record.created_at || '',
            record.updated_at || record.created_at || ''
        ];
        
        // Escape CSV values
        const escapedRow = row.map(value => {
            const stringValue = String(value || '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        
        csvRows.push(escapedRow.join(','));
    });
    
    return csvRows.join('\n');
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;
    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'Database configuration missing.' });
    }

    try {
        const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
        const params = req.query || {};
        
        // Check if CSV format is requested
        if (params.format === 'csv') {
            let records = await fetchRecords(supabase, params);
            if (params.include_audit === 'true' || params.include === 'audit') {
                records = await fetchAudits(supabase, records);
            }
            
            const csvData = recordsToCSV(records);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=visiolog-records.csv');
            return res.status(200).send(csvData);
        }
        
        if (params.mode === 'worklist' || params.worklist === 'true') {
            return res.status(200).json({
                mode: 'worklist',
                scans: await fetchWorklist(supabase, params.all === 'true')
            });
        }

        let records = await fetchRecords(supabase, params);
        if (params.include_audit === 'true' || params.include === 'audit') {
            records = await fetchAudits(supabase, records);
        }
        return res.status(200).json({
            mode: 'records',
            records,
            count: records.length
        });
    } catch (error) {
        console.error('Fetch Records Error:', error);
        return res.status(500).json({ error: error.message || 'Could not fetch records.' });
    }
}
