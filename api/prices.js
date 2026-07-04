// Vercel Serverless Function: /api/prices
// POST — приём цен от Fauna (вебхук)
// GET  — отдача цен React-приложению
//
// Использует Vercel KV (Upstash Redis) для хранения.
// Если KV не настроен — использует глобальную переменную (данные сбрасываются при холодном старте).

// Пытаемся импортировать @vercel/kv, если установлен
let kv;
try {
  kv = await import('@vercel/kv').then(m => m.kv);
} catch {
  // KV не установлен — используем фолбэк
}

// Фолбэк-хранилище (глобальная переменная — живёт пока функция "теплая")
const fallbackStore = { prices: null };

export const config = {
  api: {
    bodyParser: true, // используем встроенный JSON body parser
  },
};

export default async function handler(req, res) {
  // CORS — разрешаем запросы с любого origin (для React-приложения)
  const origin = req.headers.origin || '*';
  const isAllowedOrigin =
    !origin ||
    origin === 'null' ||
    origin.includes('localhost') ||
    origin.includes('craft-calculator.com') ||
    origin.includes('farmcraftcalculator.infy.uk') ||
    origin.includes('vercel.app');

  res.setHeader(
    'Access-Control-Allow-Origin',
    isAllowedOrigin ? (origin === 'null' ? '*' : origin) : '*'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      // ========== POST: сохранить цены (от Fauna) ==========
      case 'POST': {
        // Проверка токена авторизации
        // Токен задаётся через переменную окружения WEBHOOK_TOKEN в Vercel Dashboard
        // Ожидается заголовок: Authorization: Bearer <token>
        const authHeader = req.headers?.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        const expectedToken = process.env.WEBHOOK_TOKEN;

        if (!expectedToken || !token || token !== expectedToken) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: invalid or missing token. Set WEBHOOK_TOKEN env var and provide Authorization: Bearer <token> header.',
          });
        }


        const prices = req.body;


        if (!prices || typeof prices !== 'object' || Object.keys(prices).length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid or empty prices data. Expected a JSON object.',
          });
        }

        // Сохраняем в KV (если доступен) или в фолбэк
        if (kv) {
          await kv.set('prices', JSON.stringify(prices));
          console.log('[PRICES] Saved to Vercel KV');
        } else {
          fallbackStore.prices = prices;
          console.log('[PRICES] Saved to fallback (in-memory)');
        }

        return res.status(200).json({
          success: true,
          message: 'Prices updated successfully',
          itemCount: Object.keys(prices).length,
          storage: kv ? 'vercel-kv' : 'fallback-memory',
        });
      }

      // ========== GET: отдать цены (для React) ==========
      case 'GET': {
        let prices = null;

        if (kv) {
          const raw = await kv.get('prices');
          if (raw) {
            prices = typeof raw === 'string' ? JSON.parse(raw) : raw;
          }
        } else {
          prices = fallbackStore.prices;
        }

        if (!prices) {
          return res.status(200).json({
            success: true,
            data: {},
            message: 'No prices stored yet. Use POST to set prices.',
          });
        }

        return res.status(200).json({
          success: true,
          data: prices,
          storage: kv ? 'vercel-kv' : 'fallback-memory',
        });
      }

      // ========== Другие методы ==========
      default: {
        res.setHeader('Allow', 'GET, POST, OPTIONS');
        return res.status(405).json({ success: false, error: 'Method not allowed' });
      }
    }
  } catch (error) {
    console.error('[PRICES] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}
