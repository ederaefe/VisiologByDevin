import { createClient } from '@supabase/supabase-js';
import {
    DEFAULT_TEMPLATE,
    normalizeTemplate
} from './lib/visitor-schema.js';
import { validateVisitorRecords } from './lib/validation.js';

const ACTIONS = new Set(['save', 'approve', 'reject']);

async function resolveTemplate(supabase, record) {
    if (record.template_id) {
        const { data } = await supabase
            .from('logbook_templates')
            .select('*')
            .eq('id', record.template_id)
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

function changedFields(before, after) {
    const keys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {})
    ]);
    const changes = {};
    keys.forEach(key => {
        if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
            changes[key] = {
                before: before?.[key] ?? null,
                after: after?.[key] ?? null
            };
        }
    });
    return changes;
}

function requestBody(req) {
    if (!req.body) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch {
            return {};
        }
    }
    return req.body;
}

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const body = requestBody(req);
    const recordId = body.id || body.record_id;
    const action = body.action || 'save';
    if (!recordId) return res.status(400).json({ error: 'Missing record ID.' });
    if (!ACTIONS.has(action)) {
        return res.status(400).json({ error: 'Action must be save, approve, or reject.' });
    }

    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;
    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'Database configuration missing.' });
    }

    try {
        const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
        const { data: existing, error: fetchError } = await supabase
            .from('visiolog_records')
            .select('*')
            .eq('id', recordId)
            .single();
        if (fetchError || !existing) {
            return res.status(404).json({ error: 'Record not found.' });
        }

        const template = await resolveTemplate(supabase, existing);
        const nextData = action !== 'reject' &&
            body.data &&
            typeof body.data === 'object'
            ? body.data
            : existing.data || {};
        const shouldValidate = action === 'save' || action === 'approve';
        const validated = shouldValidate
            ? validateVisitorRecords([{
                fields: nextData,
                confidence: existing.confidence || {}
            }], template)[0]
            : {
                data: nextData,
                confidence: existing.confidence || {},
                overall_confidence: existing.overall_confidence,
                validation_status: existing.validation_status,
                validation_errors: existing.validation_errors || [],
                raw_extra: existing.raw_extra || {}
            };

        const nextReviewStatus = action === 'approve'
            ? 'approved'
            : action === 'reject'
                ? 'rejected'
                : validated.validation_status === 'valid' ? 'pending' : 'needs_review';
        const now = new Date().toISOString();
        const update = {
            data: validated.data,
            overall_confidence: validated.overall_confidence,
            validation_status: validated.validation_status,
            validation_errors: validated.validation_errors,
            review_status: nextReviewStatus,
            raw_extra: {
                ...(existing.raw_extra || {}),
                ...(validated.raw_extra || {})
            },
            updated_at: now
        };

        const { data: updated, error: updateError } = await supabase
            .from('visiolog_records')
            .update(update)
            .eq('id', recordId)
            .select()
            .single();
        if (updateError) throw updateError;

        const auditChanges = {
            fields: changedFields(existing.data || {}, updated.data || {}),
            review_status: {
                before: existing.review_status,
                after: updated.review_status
            },
            validation_status: {
                before: existing.validation_status,
                after: updated.validation_status
            },
            action_payload: action === 'reject' ? { reason: body.reason || null } : null
        };
        const { data: audit, error: auditError } = await supabase
            .from('visiolog_record_audit')
            .insert({
                record_id: updated.id,
                scan_id: updated.scan_id,
                action,
                changes: auditChanges,
                actor: body.actor || 'admin',
                created_at: now
            })
            .select()
            .single();
        if (auditError) throw auditError;

        return res.status(200).json({
            record: updated,
            audit
        });
    } catch (error) {
        console.error('Update Record Error:', error);
        return res.status(500).json({ error: error.message || 'Could not update record.' });
    }
}
