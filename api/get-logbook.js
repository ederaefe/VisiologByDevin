export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { JSONBIN_ACCESS_KEY, JSONBIN_BIN_ID } = process.env;

    if (!JSONBIN_ACCESS_KEY || !JSONBIN_BIN_ID) {
        return res.status(500).json({ error: 'Database configuration missing.' });
    }

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            headers: {
                'X-Access-Key': JSONBIN_ACCESS_KEY
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from JSONBin');
        }

        const data = await response.json();
        // Return only the records array
        return res.status(200).json(data.record || []);
    } catch (error) {
        console.error('Fetch Logbook Error:', error);
        return res.status(500).json({ error: 'Could not fetch database records.' });
    }
}
