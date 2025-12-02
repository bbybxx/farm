# 🧮 FarmRPG Craft Calculator

A comprehensive crafting and exploring calculator for FarmRPG, built with React 19 and Vite.

**Live:** [https://farm-pink-gamma.vercel.app/](https://farm-pink-gamma.vercel.app/)

## ✨ Features

### 🔨 Crafting Mode
- **Resource Calculation** — Calculate all base materials needed for any craftable item
- **Perks Support** — Apply Resource Saver, crafting perks, meals, and other modifiers
- **Craft Chain Navigation** — Navigate through intermediate recipes with breadcrumb trail
- **"Used In" View** — See all recipes that use a specific item (reverse crafting)

### 🗺️ Locations Mode  
- **Location Explorer** — Browse drops from any exploring location
- **Drop Rate Calculations** — Calculate expected drops based on Apple Cider or Arnold Palmer usage
- **Real Drop Data** — Accurate drop rates from actual game data

### 📜 Quests Mode
- **Questlines Browser** — View all questlines and their requirements
- **Quest Details** — See required items, silver, and rewards for each quest
- **Pin Quests** — Save quests to your pinned list for quick access

### 📌 Pinning System
- **Pin Resources** — Save any resource calculation for later reference
- **Folders** — Organize pinned items into custom folders
- **Quick Pin** — Pin any item with custom quantity

### ⚙️ Additional Features
- **PWA Support** — Install as app, works offline with service worker
- **Telegram WebApp** — Native integration with Telegram Mini Apps
- **Dark Theme** — Optimized for comfortable use
- **Craft History** — Track your calculation history
- **buddy.farm Links** — Quick links to buddy.farm for item details
- **Number Formatting** — Readable number display with thousands separators

## 🛠️ Tech Stack

- **React 19.1** — UI framework
- **Vite 7** — Build tool
- **Framer Motion** — Animations
- **Vercel** — Hosting & serverless functions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/bbybxx/farm.git
cd craft-calculator

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

For data sync scripts to work, set up the following environment variable:

```bash
# Required for sync scripts
GRAPHQL_API_ENDPOINT=your_graphql_api_endpoint
```

For GitHub Actions workflows, add `GRAPHQL_API_ENDPOINT` as a repository secret.

## 📁 Project Structure

```
craft-calculator/
├── src/
│   ├── app/           # Main App component
│   ├── components/    # React components
│   ├── data/          # Static data (recipes, items, perks)
│   ├── hooks/         # Custom React hooks
│   ├── services/      # Business logic services
│   ├── styles/        # CSS styles
│   └── utils/         # Utility functions
├── api/               # Vercel serverless functions
├── public/            # Static assets
├── scripts/           # Data sync scripts
└── server/            # Development server
```

## 📜 Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

MIT

## 👤 Author

**bbybxx**
- FarmRPG: [bbybxx](https://farmrpg.com/index.php#!/profile.php?user_name=bbybxx)
- Support: [Boosty](https://boosty.to/bbybxx/donate?forPost=9850758)
