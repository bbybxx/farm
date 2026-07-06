// Vercel Serverless Function: /api/prices
// POST — приём цен от Fauna (вебхук), коммит prices.json в GitHub, триггер деплоя Vercel
// GET  — отдача цен React-приложению (из Vercel KV или фолбэка)
//
// Переменные окружения (Vercel Dashboard):
//   WEBHOOK_TOKEN        — токен для аутентификации POST-запросов
//   GITHUB_TOKEN         — GitHub Personal Access Token (права: repo/contents:write)
//   GITHUB_REPO          — полное имя репозитория, например "bbybxx/farm"
//   GIT_BRANCH           — ветка для коммита, например "main"
//   VERCEL_DEPLOY_HOOK   — URL Vercel Deploy Hook для триггера деплоя

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

/**
 * Преобразует данные от Fauna в формат prices.json.
 * Ожидаемый вход: объект { items: [...], configuration: {...} }
 * или массив items.
 * Возвращает объект, готовый для записи в prices.json.
 */
function transformToPricesJson(data) {
  // Если данные уже в формате prices.json (есть items и/или configuration)
  if (data.items || data.configuration) {
    return {
      configuration: data.configuration || {
        gold_to_ap_rate: '62.5',
        gold_to_oj_rate: '8.25',
      },
      items: data.items || [],
      ignored_items: data.ignored_items || [],
    };
  }

  // Если данные — массив items
  if (Array.isArray(data)) {
    return {
      configuration: {
        gold_to_ap_rate: '62.5',
        gold_to_oj_rate: '8.25',
      },
      items: data,
      ignored_items: [],
    };
  }

  // Если данные — плоский объект { "Item Name": { gold, ap, oj } }
  // Преобразуем в формат prices.json
  const items = Object.entries(data).map(([name, prices]) => ({
    name,
    image: prices.image || '',
    gold: prices.gold || '',
    ap: prices.ap || '',
    oj: prices.oj || '',
    last_updated: prices.last_updated || new Date().toISOString(),
    recent: prices.recent || false,
    PC: prices.PC || false,
    history: prices.history || [],
  }));

  return {
    configuration: data.configuration || {
      gold_to_ap_rate: '62.5',
      gold_to_oj_rate: '8.25',
    },
    items,
    ignored_items: data.ignored_items || [],
  };
}

/**
 * Коммитит prices.json в GitHub репозиторий.
 * Использует GitHub Contents API.
 */
async function commitToGitHub(pricesJson) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GIT_BRANCH || 'main';

  if (!token || !repo) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPO env vars must be set');
  }

  const content = Buffer.from(JSON.stringify(pricesJson, null, 4)).toString('base64');
  const apiUrl = `https://api.github.com/repos/${repo}/contents/prices.json`;

  // 1. Получаем текущий SHA файла (нужен для обновления, а не создания)
  let sha = null;
  try {
    const getResponse = await fetch(`${apiUrl}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'farm-craft-calculator',
      },
    });
    if (getResponse.ok) {
      const current = await getResponse.json();
      sha = current.sha;
    }
  } catch {
    // Файла ещё нет — создадим новый
  }

  // 2. Отправляем новый контент
  const body = {
    message: `Update prices.json via webhook (${new Date().toISOString()})`,
    content,
    branch,
  };
  if (sha) {
    body.sha = sha;
  }

  const putResponse = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'farm-craft-calculator',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!putResponse.ok) {
    const errBody = await putResponse.text();
    throw new Error(`GitHub API error (${putResponse.status}): ${errBody}`);
  }

  const result = await putResponse.json();
  return result;
}

/**
 * Триггерит деплой на Vercel через Deploy Hook.
 */
async function triggerVercelDeploy() {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK;
  if (!hookUrl) {
    console.log('[PRICES] No VERCEL_DEPLOY_HOOK set — skipping deploy trigger');
    return null;
  }

  const response = await fetch(hookUrl, {
    method: 'POST',
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Vercel Deploy Hook error (${response.status}): ${errBody}`);
  }

  const result = await response.json();
  return result;
}

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
      // ========== POST: сохранить цены (от Fauna) → GitHub + Vercel Deploy ==========
      case 'POST': {
        // Проверка токена авторизации
        const authHeader = req.headers?.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        const expectedToken = process.env.WEBHOOK_TOKEN;

        if (!expectedToken || !token || token !== expectedToken) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: invalid or missing token. Set WEBHOOK_TOKEN env var and provide Authorization: Bearer <token> header.',
          });
        }

        const rawData = req.body;

        if (!rawData || typeof rawData !== 'object') {
          return res.status(400).json({
            success: false,
            error: 'Invalid or empty data. Expected a JSON object.',
          });
        }

        // Преобразуем данные в формат prices.json
        const pricesJson = transformToPricesJson(rawData);

        // Сохраняем в KV (если доступен) для быстрого GET
        if (kv) {
          await kv.set('prices', JSON.stringify(pricesJson));
          console.log('[PRICES] Saved to Vercel KV');
        } else {
          fallbackStore.prices = pricesJson;
          console.log('[PRICES] Saved to fallback (in-memory)');
        }

        // Коммитим в GitHub
        let githubResult = null;
        try {
          githubResult = await commitToGitHub(pricesJson);
          console.log('[PRICES] Committed to GitHub:', githubResult?.commit?.sha);
        } catch (githubError) {
          console.error('[PRICES] GitHub commit failed:', githubError.message);
          // Не прерываем — возвращаем частичный успех
          return res.status(200).json({
            success: true,
            warning: 'Saved to storage but GitHub commit failed',
            message: githubError.message,
            itemCount: pricesJson.items?.length || 0,
            storage: kv ? 'vercel-kv' : 'fallback-memory',
            githubCommit: null,
          });
        }

        // Триггерим деплой Vercel
        let deployResult = null;
        try {
          deployResult = await triggerVercelDeploy();
          console.log('[PRICES] Vercel deploy triggered:', deployResult?.id || 'ok');
        } catch (deployError) {
          console.error('[PRICES] Vercel deploy trigger failed:', deployError.message);
          // Не прерываем
        }

        return res.status(200).json({
          success: true,
          message: 'Prices updated, committed to GitHub, and deploy triggered',
          itemCount: pricesJson.items?.length || 0,
          storage: kv ? 'vercel-kv' : 'fallback-memory',
          githubCommit: githubResult?.commit?.sha || null,
          deployTriggered: !!deployResult,
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
