// /api/reprocess-image.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { public_id, imageUrl } = req.body;
  if (!public_id || !imageUrl) return res.status(400).json({ error: 'Missing public_id or imageUrl' });

  try {
    // Fetch the image from Supabase Storage URL
    const imageResponse = await fetch(imageUrl);
    const buffer = await imageResponse.arrayBuffer();
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('file', blob, `${public_id}.jpg`);

    // Forward to your existing processing endpoint
    const processRes = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/process-logbook`, {
      method: 'POST',
      body: formData,
    });
    if (!processRes.ok) throw new Error('Processing failed');
    const data = await processRes.json();
    res.status(200).json({ success: true, result: data });
  } catch (error) {
    console.error('Reprocess error:', error);
    res.status(500).json({ error: 'Failed to reprocess image' });
  }
}
