import { processScanById } from '../lib/scan-processor.js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const id = req.query.id || req.body?.id;
    if (!id) return res.status(400).json({ error: 'Missing scan job ID.' });

    try {
        const result = await processScanById(id);
        return res.status(200).json({
            success: true,
            status: result.status,
            count: result.count
        });
    } catch (error) {
        console.error('Processing Job Error:', error);
        return res.status(500).json({
            error: String(error?.message || 'Failed to process scan.')
        });
    }
}
