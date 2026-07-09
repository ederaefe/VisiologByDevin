// /api/supabase-images.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase credentials missing' });
  }

  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    // Ensure bucket exists
    await supabase.storage.createBucket('logbooks', { public: true }).catch(() => {});

    // List all files in the bucket
    const { data: files, error } = await supabase.storage
      .from('logbooks')
      .list('', {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) throw error;

    const images = (files || []).map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from('logbooks')
        .getPublicUrl(file.name);

      return {
        public_id: file.name,
        url: publicUrl,
        size: file.metadata?.size || 0,
        uploadedAt: file.created_at,
      };
    });

    res.status(200).json({ images });
  } catch (error) {
    console.error('Supabase list error:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
}
