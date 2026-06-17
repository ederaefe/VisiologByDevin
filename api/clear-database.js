export default async function handler(req, res) {
  // 1. Method guard
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed. Use DELETE.' });
  }

  // 2. Env var validation — fail loudly and clearly if misconfigured
  const BIN_ID = process.env.JSONBIN_BIN_ID;
  const API_KEY = process.env.JSONBIN_API_KEY;

  if (!BIN_ID || !API_KEY) {
    console.error('Missing JSONBin env vars: BIN_ID or API_KEY not set.');
    return res.status(500).json({
      error: 'Server misconfigured: missing JSONBin credentials.'
    });
  }

  const placeholderData = {
    status: 'empty',
    lastReset: new Date().toISOString()
  };

  // 3. Timeout control — don't let a hung JSONBin request hang your function indefinitely
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s cap

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY,
      },
      body: JSON.stringify(placeholderData),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 4. Distinguish error types instead of one generic throw
    if (response.status === 401 || response.status === 403) {
      console.error('JSONBin auth failed:', response.status);
      return res.status(502).json({ error: 'Authorization with JSONBin failed.' });
    }

    if (response.status === 404) {
      console.error('JSONBin not found:', BIN_ID);
      return res.status(502).json({ error: 'Configured bin ID does not exist.' });
    }

    if (response.status === 429) {
      console.error('JSONBin rate limit hit.');
      return res.status(503).json({ error: 'Rate limited by JSONBin. Try again shortly.' });
    }

    if (!response.ok) {
      console.error('JSONBin unexpected error:', response.status);
      return res.status(502).json({ error: `JSONBin error: ${response.status}` });
    }

    // 5. Validate the response body itself isn't garbage before trusting it
    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error('Failed to parse JSONBin response:', parseErr);
      return res.status(502).json({ error: 'Invalid response from JSONBin.' });
    }

    return res.status(200).json({ success: true, data });

  } catch (err) {
    clearTimeout(timeout);

    // 6. Differentiate abort/timeout from network failure
    if (err.name === 'AbortError') {
      console.error('JSONBin request timed out.');
      return res.status(504).json({ error: 'Request to JSONBin timed out.' });
    }

    console.error('Unexpected error in clear-database:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
