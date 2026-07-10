import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed. Use DELETE.' });
  }

  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase credentials missing' });
  }

  try {
    const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

    const tables = [
      ['visiolog_records', 'id'],
      ['visiolog_scans', 'id'],
      ['visiolog_data', 'key']
    ];

    for (const [table, column] of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .not(column, 'is', null);

      if (error) throw error;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Clear database error:', error);
    return res.status(500).json({ error: 'Failed to clear database' });
  }
}
