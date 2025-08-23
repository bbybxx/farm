# Craft Calculator

Craft Calculator is a React + Vite application that helps calculate crafting resource requirements and exploring drop estimates for game items.

This repository contains the web client, a small development server used during local development, and scripts to build and deploy the production bundle.

Key features
- Resource/crafting calculations for in-game items
- Pinned resources system and per-location exploring estimates
- Auto-update system for recipes (with caching and configurable intervals)
- Accessible UI components and theming

Quickstart (development)
1. Install dependencies:

```powershell
npm install
```

2. Run development server (HMR enabled):

```powershell
npm run dev
```

3. Open http://localhost:5173/ (Vite may auto-select another port if 5173 is busy)

Production build

```powershell
npm run build
npm run preview
```

This repository is configured to build with Vite. Production builds use Terser to remove console.* calls (see `vite.config.ts`) and the runtime also silences console calls in production via `src/silence-console.js`.

Deployment (Vercel)
- Push this repository to GitHub. Vercel will run the `vercel-build` / `npm run build` command and serve the `dist/` output.
- In production, client-side console logs are removed by the build and runtime guard, so F12 will be clean.

Notes about backups and branches
- This repo contains several backup branches (for example `backup-stable-2025-08-22*`). I will not delete any branches or tags without explicit confirmation. If you want to clean up old backup branches on the remote, confirm which ones to delete.

If you want, I can:
- Create a tidy release commit and tag (e.g., `v0.3.0`) and push it.
- Create a minimal project page in `index.html` describing the app (or use the existing `README.md` as site content).
- Open a PR for the README and configuration changes.

License
MIT
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
