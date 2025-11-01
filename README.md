# 🧙‍♂️ Craft Calculator

Progressive Web App crafting calculator for FarmRPG with automatic recipe updates and Telegram integration.

## ✨ Key Features

- **📋 Crafting Calculator** - Calculate required resources for crafting items
- **🗺️ Exploration Calculator** - Optimal farming locations based on drop rates
- **🔄 Auto-update Recipes** - Sync with buddy.farm API every 3 days
- **🎨 Perk System** - Account for perk bonuses in calculations
- **📌 Resource Pinning** - Configure farming exclusions
- **🐛 Bug Reports** - Submit reports with screenshots to Telegram
- **📱 PWA** - Installable as native app on iOS/Android
- **🌙 Dark Theme** - Optimized for comfortable use
- **⚡ Offline Mode** - Service Worker for offline functionality

## 🚀 Technologies

### Frontend
- **React 19.1** - UI library
- **Vite 7.1** - Build tool and dev server
- **Framer Motion 12** - Animations
- **Service Worker** - PWA functionality

### Backend
- **Vercel Serverless Functions** - API endpoints
- **Formidable** - Multipart/form-data handling
- **Telegram Bot API** - Bug reports

### Infrastructure
- **Vercel** - Hosting and CI/CD
- **GraphQL** - buddy.farm API queries
- **Git** - Version control

## 📦 Installation & Development

### Clone Repository
```bash
git clone https://github.com/bbybxx/farm.git
cd farm
```

### Install Dependencies
```bash
npm install
```

### Environment Setup
1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure API endpoints:
   - **VITE_API_ENDPOINT** - GraphQL API endpoint (contact FarmRPG developers for access)
   - **VITE_TELEGRAM_BOT_TOKEN** - Telegram bot token for bug reports
   - **VITE_TELEGRAM_CHAT_ID** - Telegram chat ID for receiving reports

3. For the local dev server (`server/server.js`), also set:
   - **GRAPHQL_API_ENDPOINT** - Same GraphQL endpoint

> **Note:** The GraphQL API endpoint is provided by FarmRPG developers and is not publicly available. Contact the FarmRPG team for API access.

### Local Development
```bash
# Frontend dev server (HMR)
npm run dev
# Opens http://localhost:5173

# Production build
npm run build

# Preview production build
npm run preview
```

### Local Server for API Testing
```bash
cd server
npm install
npm start
# Opens http://localhost:3000
```

## 🌍 Production Deployment

Project auto-deploys to Vercel on push to `main` branch:
- Frontend: `npm run build` → `dist/`
- Serverless Functions: `api/*.js`

**Live URL:** [craft-calculator.vercel.app](https://farm-pink-gamma.vercel.app/)

## 📁 Project Structure

```
craft-calculator/
├── api/                        # Vercel serverless functions
│   ├── bug-report.js          # Telegram bug report endpoint
│   └── graphql.php            # GraphQL proxy (legacy)
├── public/                    # Static assets
│   ├── img/items/            # Item icons
│   ├── manifest.json         # PWA manifest
│   └── service-worker.js     # Service Worker
├── server/                    # Dev server for local development
│   ├── server.js             # Express server
│   └── package.json          # Server dependencies
├── src/
│   ├── app/                  # Main application
│   │   ├── App.jsx           # Root component
│   │   ├── app.css           # Global styles
│   │   └── findBestSources.js # Farm optimization algorithm
│   ├── components/           # UI components
│   │   ├── BugReportModal.jsx
│   │   ├── ItemDisplay.jsx
│   │   ├── LocationConfigPanel.jsx
│   │   ├── LocationImage.jsx
│   │   └── PinnedLocationSelect.jsx
│   ├── data/                 # Game data
│   │   ├── items-api.json    # All items
│   │   ├── recipes-api.json  # All recipes
│   │   ├── perks.js          # Perk system
│   │   └── locations.md      # Location descriptions
│   ├── hooks/                # React hooks
│   │   ├── useTelegram.js    # Telegram WebApp integration
│   │   └── useViewportHeight.js
│   ├── services/             # Business logic
│   │   ├── RecipeUpdateService.js
│   │   └── itemImages.js
│   ├── styles/               # Styles
│   │   └── ios-pwa-fix.css   # iOS PWA fixes
│   ├── utils/                # Utilities
│   │   └── recipeCalculator.js
│   ├── main.jsx              # Entry point
│   └── silence-console.js    # Console suppression in production
├── docs/                      # Documentation
│   └── FEATURE_IDEAS.md
├── ANDROID_ARCHIVE.md        # Capacitor migration history
├── arnold-palmer.md          # Arnold Palmer event documentation
├── future-plans.md           # Development roadmap
├── package.json              # Frontend dependencies
├── vite.config.ts            # Vite configuration
└── vercel.json               # Vercel deployment config
```

## 🔧 Configuration

### Environment Variables

#### Production (Vercel)
```bash
# Telegram Bot
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id

# CORS (automatically set by Vercel)
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

PWA configured in `public/manifest.json`:
- **Name:** Craft Calculator
- **Icons:** 192×192, 512×512 (PNG), 180×180 (Apple Touch)
- **Display:** standalone
- **Theme:** dark (#1a1a2e)

iOS PWA fixes for Dynamic Island in `src/styles/ios-pwa-fix.css`.

## 📱 Usage

### Installing PWA

**iOS (Safari):**
1. Open site in Safari
2. Tap "Share" button
3. Select "Add to Home Screen"

**Android (Chrome):**
1. Open site in Chrome
2. Tap menu (⋮)
3. Select "Install app"

### Submitting Bug Report

1. Click "🐛" button in top-right corner
2. Describe the issue
3. Attach screenshots (optional, up to 8 files)
4. Submit — report will be sent to developer via Telegram

## 🎨 Game API Integration Features

Project ready for game API integration:
- Player account linking
- Inventory synchronization
- Automatic import of available resources
- Real-time crafting progress display

## 🧹 Recent Changes

### v0.3.0 (October 2025)
- ✅ Full migration to PWA (removed Capacitor/Android)
- ✅ Codebase cleanup: removed old components, parsing scripts, test files
- ✅ Renamed `src/new-app/` → `src/app/`
- ✅ iOS PWA fixes for Dynamic Island/notch
- ✅ Serverless function for bug reports with Formidable
- ✅ Service Worker with auto-update
- ✅ Updated Haunted House drop rates
- ✅ Arnold Palmer event auto-sync with Apple Cider
- ✅ Git history cleanup: 1.24 GB → 181 MB (85% reduction)

## 📊 Statistics

- **191** crafting recipes
- **1000+** game items
- **40+** exploration locations
- **15** perks with bonuses
- **~530 KB** bundle size (gzip: ~145 KB)
- **181 MB** total project size (after cleanup)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - free to use for your projects.

## 🔗 Links

- **Live Site:** [craft-calculator.vercel.app](https://farm-pink-gamma.vercel.app/)
- **Repository:** [github.com/bbybxx/farm](https://github.com/bbybxx/farm)
- **API Source:** [buddy.farm](https://buddy.farm)

---

Made with ❤️ for FarmRPG community
