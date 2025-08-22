# Production Deployment Instructions

## Требования для production

### 1. Деплой прокси-сервера
Прокси-сервер необходим для обхода CORS ограничений buddy.farm API.

**Файлы для деплоя:**
- `server/server.js` - основной файл сервера
- `server/package.json` - зависимости 
- `server/.env` - конфигурация (обновить перед деплоем)

**Переменные окружения для production:**
```bash
NODE_ENV=production
PORT=3001
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id
ALLOWED_ORIGINS=https://farmcraftcalculator.infy.uk
```

### 2. Настройка сервера
Сервер должен быть доступен по адресу: `https://farmcraftcalculator.infy.uk/api/graphql`

**Команды для запуска:**
```bash
cd server
npm install
npm start
```

### 3. Сборка фронтенда
```bash
npm run build
```

### 4. Эндпоинты сервера
- `POST /api/graphql` - прокси для buddy.farm API
- `POST /api/bug-report` - отправка багрепортов в Telegram
- `GET /api/bot-info` - информация о боте (для тестирования)

## Проверка работы

1. **Проверить прокси API:**
```bash
curl -X POST https://farmcraftcalculator.infy.uk/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ items { name type } }"}'
```

2. **Проверить CORS:**
Открыть https://farmcraftcalculator.infy.uk в браузере и проверить консоль на наличие CORS ошибок.

## Автообновление

- ✅ Система автоматически обновляет рецепты каждые 3 дня
- ✅ Дополнительное обновление 1 числа каждого месяца  
- ✅ Новые данные автоматически сортируются по алфавиту
- ✅ При недоступности API используется кэш

## Логи для мониторинга

В production логи покажут:
- `🔄 Proxying GraphQL request to buddy.farm API...`
- `✅ GraphQL request successful, items received: XXX`
- `❌ GraphQL proxy error:` (если есть проблемы)
