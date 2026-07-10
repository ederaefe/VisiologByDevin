// /api/upload-scan.js
import { IncomingForm } from 'formidable';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

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

        const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
        
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
                status: 'pending'
            })
            .select()
            .single();

        if (scanError) throw scanError;

        // Cleanup local temp file
        try {
            fs.unlinkSync(uploadedFile.filepath);
        } catch (cleanupError) {
            console.warn("Could not remove temporary file:", cleanupError);
        }

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
