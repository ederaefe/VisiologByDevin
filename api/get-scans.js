// /api/get-scans.js
import { createClient } from '@supabase/supabase-js';

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
        
        // Fetch all jobs ordered by creation date descending
        const { data: scans, error } = await supabase
            .from('visiolog_scans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Supplement each scan object with a public image URL
        const scansWithUrls = (scans || []).map(scan => {
            const { data: { publicUrl } } = supabase.storage
                .from('logbooks')
                .getPublicUrl(scan.filename);

            return {
                ...scan,
                url: publicUrl
            };
        });

        return res.status(200).json({ scans: scansWithUrls });
    } catch (error) {
        console.error('Fetch Scans Error:', error);
        return res.status(500).json({ error: 'Could not fetch scans records.' });
    }
}
