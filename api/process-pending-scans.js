import { processPendingScans } from '../lib/scan-processor.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const max = Number(req.query.limit || req.body?.limit || 5);
    if (Number.isNaN(max) || max < 1 || max > 50) {
        return res.status(400).json({ error: 'Limit must be a number between 1 and 50.' });
    }

    try {
        const processed = await processPendingScans(max);
        return res.status(200).json({ processed, count: processed.length });
    } catch (error) {
        console.error('Process Pending Scans Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to process pending scans.' });
    }
}
