export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('Bot token or chat ID not configured');
      return res.status(500).json({ error: 'Bot configuration missing' });
    }

    // Отправляем сообщение в Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (telegramResponse.ok) {
      res.status(200).json({ success: true });
    } else {
      const errorData = await telegramResponse.json();
      console.error('Telegram API error:', errorData);
      res.status(500).json({ error: 'Failed to send message' });
    }

  } catch (error) {
    console.error('Bug report API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
