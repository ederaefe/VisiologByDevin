export default async function handler(req, res) {
    if (req.method !== 'PUT' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { JSONBIN_MASTER_KEY, JSONBIN_BIN_ID } = process.env;

    if (!JSONBIN_MASTER_KEY || !JSONBIN_BIN_ID) {
        return res.status(500).json({ error: 'Database configuration missing.' });
    }

    try {
        const newData = req.body;
        
        // Ensure data is an array
        if (!Array.isArray(newData)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
        }

        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_MASTER_KEY
            },
            body: JSON.stringify(newData)
        });

        if (!response.ok) {
            throw new Error('Failed to update JSONBin');
        }

        const result = await response.json();
        return res.status(200).json({ success: true, record: result.record });
    } catch (error) {
        console.error('Update Logbook Error:', error);
        return res.status(500).json({ error: 'Could not update database records.' });
    }
}
