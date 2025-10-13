# 🧙‍♂️ Craft Calculator

Progressive Web App калькулятор крафта для X-Farm игры с автоматическим обновлением рецептов и интеграцией с Telegram.

## ✨ Основные возможности

- **📋 Калькулятор крафта** - Расчёт необходимых ресурсов для крафта предметов
- **🗺️ Калькулятор исследований** - Оптимальные локации для фарма с учётом дропа
- **🔄 Автообновление рецептов** - Синхронизация с buddy.farm API каждые 3 дня
- **🎨 Система перков** - Учёт бонусов от перков при расчётах
- **📌 Закрепление ресурсов** - Настройка исключений для фарма
- **🐛 Баг-репорты** - Отправка отчётов с скриншотами в Telegram
- **📱 PWA** - Устанавливается как приложение на iOS/Android
- **🌙 Тёмная тема** - Оптимизирована для комфортного использования
- **⚡ Офлайн режим** - Service Worker для работы без интернета

## 🚀 Технологии

### Frontend
- **React 19.1** - UI библиотека
- **Vite 7.1** - Сборщик и dev-сервер
- **Framer Motion 12** - Анимации
- **Service Worker** - PWA функциональность

### Backend
- **Vercel Serverless Functions** - API endpoints
- **Formidable** - Обработка multipart/form-data
- **Telegram Bot API** - Баг-репорты

### Инфраструктура
- **Vercel** - Хостинг и CI/CD
- **GraphQL** - Запросы к buddy.farm API
- **Git** - Версионирование

## 📦 Установка и разработка

### Клонирование репозитория
```bash
git clone https://github.com/bbybxx/farm.git
cd farm
```

### Установка зависимостей
```bash
npm install
```

### Локальная разработка
```bash
# Frontend dev server (HMR)
npm run dev
# Откроется http://localhost:5173

# Production build
npm run build

# Preview production build
npm run preview
```

### Локальный сервер для тестирования API
```bash
cd server
npm install
npm start
# Откроется http://localhost:3000
```

## 🌍 Production деплой

Проект автоматически деплоится на Vercel при push в `main` ветку:
- Frontend: `npm run build` → `dist/`
- Serverless Functions: `api/*.js`

**Live URL:** [craft-calculator.vercel.app](https://craft-calculator.vercel.app)

## 📁 Структура проекта

```
craft-calculator/
├── api/                        # Vercel serverless functions
│   ├── bug-report.js          # Telegram bug report endpoint
│   └── graphql.php            # GraphQL proxy (legacy)
├── public/                    # Статические файлы
│   ├── img/items/            # Иконки предметов
│   ├── manifest.json         # PWA manifest
│   └── service-worker.js     # Service Worker
├── server/                    # Dev server для локальной разработки
│   ├── server.js             # Express server
│   └── package.json          # Server dependencies
├── src/
│   ├── app/                  # Основное приложение
│   │   ├── App.jsx           # Root компонент
│   │   ├── app.css           # Глобальные стили
│   │   └── findBestSources.js # Алгоритм оптимизации фарма
│   ├── components/           # UI компоненты
│   │   ├── BugReportModal.jsx
│   │   ├── ItemDisplay.jsx
│   │   ├── LocationConfigPanel.jsx
│   │   ├── LocationImage.jsx
│   │   └── PinnedLocationSelect.jsx
│   ├── data/                 # Игровые данные
│   │   ├── items-api.json    # Все предметы
│   │   ├── recipes-api.json  # Все рецепты
│   │   ├── perks.js          # Система перков
│   │   └── locations.md      # Описание локаций
│   ├── hooks/                # React hooks
│   │   ├── useTelegram.js    # Telegram WebApp интеграция
│   │   └── useViewportHeight.js
│   ├── services/             # Бизнес-логика
│   │   ├── RecipeUpdateService.js
│   │   └── itemImages.js
│   ├── styles/               # Стили
│   │   └── ios-pwa-fix.css   # iOS PWA фиксы
│   ├── utils/                # Утилиты
│   │   └── recipeCalculator.js
│   ├── main.jsx              # Entry point
│   └── silence-console.js    # Отключение console в production
├── docs/                      # Документация
│   └── FEATURE_IDEAS.md
├── ANDROID_ARCHIVE.md        # История миграции с Capacitor
├── arnold-palmer.md          # Документация по Arnold Palmer event
├── future-plans.md           # Планы развития
├── package.json              # Frontend dependencies
├── vite.config.ts            # Vite конфигурация
└── vercel.json               # Vercel deployment config
```

## 🔧 Конфигурация

### Environment Variables

#### Production (Vercel)
```bash
# Telegram Bot
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id

# CORS (автоматически от Vercel)
ALLOWED_ORIGINS=https://your-domain.vercel.app
```

#### Development (server/.env)
```bash
NODE_ENV=development
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id
PORT=3000
```

### PWA Configuration

PWA настроен в `public/manifest.json`:
- **Имя:** Craft Calculator
- **Иконки:** 192×192, 512×512 (PNG), 180×180 (Apple Touch)
- **Режим:** standalone
- **Тема:** dark (#1a1a2e)

iOS PWA фиксы для Dynamic Island в `src/styles/ios-pwa-fix.css`.

## 📱 Использование

### Установка PWA

**iOS (Safari):**
1. Откройте сайт в Safari
2. Нажмите кнопку "Поделиться" 
3. Выберите "На экран «Домой»"

**Android (Chrome):**
1. Откройте сайт в Chrome
2. Нажмите меню (⋮)
3. Выберите "Установить приложение"

### Отправка баг-репорта

1. Нажмите кнопку "🐛" в правом верхнем углу
2. Опишите проблему
3. Прикрепите скриншоты (опционально, до 8 файлов)
4. Отправьте — репорт придёт в Telegram разработчику

## 🎨 Фичи для интеграции с игрой

Проект готов к интеграции с API игры для:
- Привязки игровых аккаунтов
- Синхронизации инвентаря
- Автоматического импорта доступных ресурсов
- Отображения прогресса крафта в реальном времени

## 🧹 Недавние изменения

### v0.3.0 (October 2025)
- ✅ Полная миграция на PWA (удалён Capacitor/Android)
- ✅ Чистка codebase: удалены старые компоненты, скрипты парсинга, test файлы
- ✅ Переименование `src/new-app/` → `src/app/`
- ✅ iOS PWA фиксы для Dynamic Island/notch
- ✅ Serverless функция для баг-репортов с Formidable
- ✅ Service Worker с auto-update
- ✅ Обновлены drop rates для Haunted House
- ✅ Arnold Palmer event auto-sync с Apple Cider

## 📊 Статистика

- **191** рецепта крафта
- **1000+** игровых предметов
- **40+** локаций для исследования
- **15** перков с бонусами
- **~530 KB** размер бандла (gzip: ~145 KB)

## 🤝 Contributing

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 Лицензия

MIT License - свободно используйте для своих проектов.

## 🔗 Ссылки

- **Живой сайт:** [craft-calculator.vercel.app](https://craft-calculator.vercel.app)
- **Репозиторий:** [github.com/bbybxx/farm](https://github.com/bbybxx/farm)
- **API источник:** [buddy.farm](https://buddy.farm)
- **История Android:** [ANDROID_ARCHIVE.md](./ANDROID_ARCHIVE.md)

---

Made with ❤️ for X-Farm community
