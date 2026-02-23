# Craft Calculator Bug Report Server

Серверная часть для обработки баг репортов из приложения Craft Calculator.

## Настройка

### 1. Установка зависимостей
```bash
cd server
npm install
```

### 2. Настройка переменных окружения
Отредактируйте файл `.env`:

```env
# Telegram Bot Configuration
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
CHAT_ID=YOUR_CHAT_ID_HERE  # ID чата куда отправлять сообщения

# Server Configuration  
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://your-domain.com
```

### 3. Получение Chat ID
Чтобы получить Chat ID:

1. Добавьте бота в чат или группу
2. Отправьте сообщение боту
3. Перейдите по ссылке: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Найдите в ответе `"chat":{"id":ВАSH_CHAT_ID}`
5. Скопируйте ID и вставьте в `.env`

## Запуск

### Разработка
```bash
npm run dev
```

### Продакшн
```bash
npm start
```

## API Endpoints

### GET `/`
Информация о сервере

### GET `/health`
Health check

### GET `/api/bot-info`
Информация о боте (для тестирования)

### POST `/api/bug-report`
Отправка баг репорта

**Body:**
```json
{
  "type": "bug_report",
  "message": "Описание бага",
  "user": {
    "id": 123456789,
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe"
  },
  "timestamp": "2025-08-19T08:37:26.632Z",
  "url": "http://localhost:5173/",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bug report sent successfully",
  "telegramMessageId": 12345
}
```

## Интеграция с фронтендом

После запуска сервера, обновите фронтенд для отправки запросов на сервер вместо использования Telegram Web App API напрямую.

## Безопасность

- Токен бота хранится в переменных окружения
- CORS настроен для разрешенных доменов
- Валидация входящих данных
- Лимит размера запроса (10MB)

## Логирование

Сервер логирует:
- Успешно отправленные сообщения
- Ошибки отправки
- Информацию о запросах

## Деплой

Для деплоя на продакшн:

1. Настройте переменные окружения
2. Установите `NODE_ENV=production`
3. Добавьте домен продакшн в `ALLOWED_ORIGINS`
4. Запустите с `npm start`
