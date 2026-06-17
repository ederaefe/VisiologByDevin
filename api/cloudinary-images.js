// /api/cloudinary-images.js
import cloudinary from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await cloudinary.v2.api.resources({
      type: 'upload',
      prefix: 'barchscan',    // folder name – adjust if needed
      max_results: 50,
    });
    const images = result.resources.map(({ public_id, secure_url, format, bytes, created_at }) => ({
      public_id,
      url: secure_url,
      format,
      size: bytes,
      uploadedAt: created_at,
    }));
    res.status(200).json({ images });
  } catch (error) {
    console.error('Cloudinary fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
}
