// /api/update-logbook.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'PUT' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'Database configuration missing.' });
    }

    try {
        const newData = req.body;
        
        // Ensure data is an array
        if (!Array.isArray(newData)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
        }

        const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
        
        const { data, error } = await supabase
            .from('visiolog_data')
            .upsert({
                key: 'server_data',
                value: newData,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'key'
            })
            .select();

        if (error) throw error;

        return res.status(200).json({ success: true, record: data ? data[0]?.value : newData });
    } catch (error) {
        console.error('Update Logbook Error:', error);
        return res.status(500).json({ error: 'Could not update database records.' });
    }
}
