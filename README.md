# 🧙‍♂️ Craft Calculator

Калькулятор крафта для игры с автоматическим обновлением рецептов из buddy.farm API.

## ✨ Функции

- 📋 **191 рецепт** с автоматической сортировкой по алфавиту
- 🔄 **Автообновление** рецептов каждые 3 дня из buddy.farm API
- 🎮 **Интеграция с Telegram** для багрепортов
- 📱 **Адаптивный дизайн** для всех устройств
- ⚡ **Быстрая работа** с кэшированием данных

## 🚀 Технологии

- **Frontend:** React 19, Vite, Framer Motion
- **Backend:** Node.js, Express
- **API:** GraphQL (buddy.farm)
- **Деплой:** Vercel

## 📦 Установка

```bash
# Фронтенд
npm install
npm run dev

# Бэкенд
cd server
npm install
npm start
```

## 🌍 Production

Проект автоматически деплоится на Vercel при пуше в main ветку.

## 📝 API Endpoints

- `GET /` - Главная страница калькулятора
- `POST /api/graphql` - Прокси для buddy.farm API  
- `POST /api/bug-report` - Отправка багрепортов в Telegram

## 🔧 Переменные окружения

```bash
# server/.env
NODE_ENV=production
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id
ALLOWED_ORIGINS=https://your-domain.vercel.app
```

## 📄 Лицензия

MIT License
