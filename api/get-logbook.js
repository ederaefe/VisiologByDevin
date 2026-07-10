// /api/get-logbook.js
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
        
        const { data, error } = await supabase
            .from('visiolog_data')
            .select('value')
            .eq('key', 'server_data')
            .maybeSingle();

        if (error) throw error;

        // Return only the records array, fallback to empty array
        return res.status(200).json(data ? data.value : []);
    } catch (error) {
        console.error('Fetch Logbook Error:', error);
        return res.status(500).json({ error: 'Could not fetch database records.' });
    }
}
