// /api/delete-scan.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const { id, filename } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing scan ID' });

  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase credentials missing' });
  }

  try {
    const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
    
    // 1. Delete scan row from DB
    const { error: dbError } = await supabase
      .from('visiolog_scans')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    // 2. Delete file from storage if filename is provided
    if (filename) {
      await supabase.storage
        .from('logbooks')
        .remove([filename]);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete scan error:', error);
    res.status(500).json({ error: 'Failed to delete scan' });
  }
}
