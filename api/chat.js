export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages is required' })
  }

  const apiUrl = process.env.AI_API_URL || 'https://yunwu.ai/v1'
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL || 'claude-opus-4-5-20251101'

  if (!apiKey) {
    return res.status(500).json({ error: 'AI_API_KEY not configured' })
  }

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: `API error: ${err}` })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || '没有收到回复'
    return res.status(200).json({ reply })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
