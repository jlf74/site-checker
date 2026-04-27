export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[claude] ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  // Парсим body вручную если он ещё не был распарсен (строка вместо объекта)
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error('[claude] Failed to parse req.body:', e.message);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  console.log('[claude] Request model:', body?.model, '| messages count:', body?.messages?.length);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('[claude] Anthropic status:', response.status, '| stop_reason:', data.stop_reason, '| error:', data.error ?? null);

    if (!response.ok) {
      console.error('[claude] Anthropic error response:', JSON.stringify(data));
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('[claude] Fetch error:', error.message);
    res.status(500).json({ error: error.message });
  }
}