export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('[claude] DEEPSEEK_API_KEY is not set');
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY is not configured' });
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

  // Собираем messages: system-промпт передаём как первое сообщение role: "system"
  const messages = body.system
    ? [{ role: 'system', content: body.system }, ...body.messages]
    : body.messages;

  console.log('[claude] Request | messages count:', messages?.length);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: body.max_tokens,
        messages,
      }),
    });

    const data = await response.json();
    console.log('[claude] Deepseek status:', response.status, '| finish_reason:', data.choices?.[0]?.finish_reason, '| error:', data.error ?? null);

    if (!response.ok) {
      console.error('[claude] Deepseek error response:', JSON.stringify(data));
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('[claude] Fetch error:', error.message);
    res.status(500).json({ error: error.message });
  }
}