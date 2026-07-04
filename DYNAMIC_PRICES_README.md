# Динамическое обновление цен через Vercel Serverless Functions

## Что сделано

### 1. Serverless Function: `/api/prices`
Файл: `api/prices.js`

Единый эндпоинт, обрабатывающий:
- **POST** — приём цен от Fauna (вебхук)
- **GET** — отдача цен React-приложению

Использует `@vercel/kv` (Upstash Redis) для хранения. Если KV не настроен — использует глобальную переменную (данные сбрасываются при холодном старте).

### 2. React-хук: `usePrices`
Файл: `src/hooks/usePrices.js`

Хук для работы с динамическими ценами:
- `refreshPrices()` — GET-запрос к `/api/prices`, сохраняет в `localStorage`
- `prices` — объект с ценами (или `null`)
- `isLoading`, `error`, `lastUpdated` — состояния
- `clearPrices()` — очищает кэш

### 3. Кнопка в настройках
Добавлена секция "Dynamic Prices" в `SettingsTab` (вкладка Settings в сайдбаре).

### 4. PHP-код для Fauna
Файл: `fauna-webhook.php`

Готовый скрипт для отправки цен из админки Fauna.

---

## Инструкция по деплою

### Шаг 1. Установка зависимостей
```bash
npm install @vercel/kv
```

### Шаг 2. Настройка Vercel KV (рекомендуется)

1. Зайдите в [Vercel Dashboard](https://vercel.com)
2. Выберите ваш проект
3. Перейдите в **Storage** → **Create Database** → **Upstash Redis** (Vercel KV deprecated, используйте Upstash Redis)
4. Создайте базу данных
5. Vercel автоматически добавит переменные окружения в проект:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

### Шаг 3. Деплой

Просто запушите изменения в GitHub — Vercel автоматически пересоберёт проект:

```bash
git add .
git commit -m "Add dynamic prices API and UI"
git push
```

Vercel сам подхватит файлы из папки `api/` и развернёт их как Serverless Functions.

### Шаг 4. Проверка

После деплоя проверьте эндпоинты:

**POST (сохранить цены):**
```bash
curl -X POST https://ВАШ-САЙТ.vercel.app/api/prices \
  -H "Content-Type: application/json" \
  -d '{"Board":{"buy":10,"sell":5},"Nails":{"buy":25,"sell":12}}'
```

**GET (получить цены):**
```bash
curl https://ВАШ-САЙТ.vercel.app/api/prices
```

### Шаг 5. Настройка вебхука в Fauna

1. В админке Fauna найдите раздел для вебхуков
2. Вставьте код из `fauna-webhook.php`, заменив `YOUR_VERCEL_URL` на URL вашего сайта
3. Заполните массив `$prices` актуальными данными о ценах
4. Настройте срабатывание вебхука после обновления цен

---

## Как это работает

```
Fauna (админка)
  │
  │ POST /api/prices (JSON с ценами)
  ▼
Vercel Serverless Function (api/prices.js)
  │
  ├── Сохраняет в Vercel KV (Upstash Redis)
  │   └── Или в глобальную переменную (фолбэк)
  │
  └── React-приложение (кнопка "Refresh Prices")
        │
        │ GET /api/prices
        ▼
      Получает цены → localStorage → использует в UI
```

## Важно

1. **Vercel KV (Upstash Redis)** — данные сохраняются постоянно, даже после перезапуска функции.
2. **Фолбэк (глобальная переменная)** — данные сбрасываются при холодном старте Serverless Function (неактивность ~5-10 минут). Для production используйте KV.
3. **Старый способ (JSON в репозитории)** — продолжает работать. Динамические цены из `/api/prices` — это дополнительный слой поверх статических данных.
4. **CORS** — настроен для всех доменов, где может работать приложение (localhost, craft-calculator.com, farmcraftcalculator.infy.uk, vercel.app).
