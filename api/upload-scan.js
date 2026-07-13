// /api/upload-scan.js
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { createSupabaseClient } from '../lib/supabase-client.js';

export const config = {
    api: {
        bodyParser: false,
    },
};

const MAX_IMAGE_SIZE = 16 * 1024 * 1024; // 16 MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function firstFieldValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

async function resolveTemplateId(supabase, requestedTemplate) {
    const value = firstFieldValue(requestedTemplate);
    if (value) {
        const selector = /^[0-9a-f-]{36}$/i.test(value) ? 'id' : 'key';
        const { data } = await supabase
            .from('logbook_templates')
            .select('id')
            .eq(selector, value)
            .maybeSingle();
        if (data) return data.id;
    }

    const { data: defaultTemplate } = await supabase
        .from('logbook_templates')
        .select('id')
        .eq('is_default', true)
        .maybeSingle();
    return defaultTemplate?.id || null;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Support both VITE_ prefixed and plain env vars for serverless functions
  const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'Database configuration missing.' });
    }

    try {
        const data = await new Promise((resolve, reject) => {
            const form = new IncomingForm();
            form.parse(req, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ fields, files });
            });
        });

        const uploadedFile = Array.isArray(data.files.file) ? data.files.file[0] : data.files.file;

        if (!uploadedFile) {
            return res.status(400).json({ error: 'Missing image in the payload.' });
        }

        const imageBuffer = fs.readFileSync(uploadedFile.filepath);
        const mimeType = uploadedFile.mimetype || 'image/jpeg';

        if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
            return res.status(400).json({ error: 'Unsupported image type. Use JPEG, PNG, or WEBP.' });
        }
        if (uploadedFile.size > MAX_IMAGE_SIZE) {
            return res.status(400).json({ error: 'Image exceeds the maximum allowed size of 16 MB.' });
        }

        const supabase = createSupabaseClient({ useServiceRole: true });
        const templateId = await resolveTemplateId(
            supabase,
            data.fields.template || data.fields.template_id
        );
        
        // Ensure bucket exists
        await supabase.storage.createBucket('logbooks', { public: true }).catch(() => {});
        
        const fileExt = uploadedFile.originalFilename ? uploadedFile.originalFilename.split('.').pop() : 'jpg';
        const filename = `visiolog_${Date.now()}.${fileExt}`;
        
        // 1. Upload to Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('logbooks')
            .upload(filename, imageBuffer, {
                contentType: mimeType,
                duplex: 'half'
            });
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('logbooks')
            .getPublicUrl(filename);

        // 2. Insert Scan Record
        const { data: scanData, error: scanError } = await supabase
            .from('visiolog_scans')
            .insert({
                filename: filename,
                status: 'pending',
                template_id: templateId
            })
            .select()
            .single();

        if (scanError) throw scanError;

        // Cleanup local temp file
        try {
            fs.unlinkSync(uploadedFile.filepath);
        } catch (cleanupError) {
            console.warn('Could not remove temporary file:', cleanupError);
        }

        // Processing is now decoupled from the upload request.
        return res.status(200).json({
            success: true,
            scanId: scanData.id,
            imageUrl: publicUrl
        });

    } catch (error) {
        console.error("Upload Scan Error:", error);
        return res.status(500).json({ error: error.message || "Failed to upload scan." });
    }
}
