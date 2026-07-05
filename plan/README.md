> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/plugins/` (для экономики — `src/plugins/economy/`).
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# План реализации: Экономический режим (Economy Mode)

## Важные правила

1. **Экономический режим НЕ трогает craftChain** — используй отдельное состояние `economyChain`
2. **Запрещена рекурсия** — количество фиксируется после перехода (`fixed: true` у каждого элемента)
3. **Simple и Advanced не смешиваются** — Simple = оверлей на 3/4 экрана, Advanced = отдельная вкладка
4. **Дизайн consistent** — тёмная тема, glass-стили, как всё остальное приложение
5. **После каждого шага**: `npm run build`, проверить в браузере, закоммитить и запушить

## Порядок реализации (строго по шагам)

```
plan/
├── README.md                          ← этот файл
├── 01-useEconomy-hook.md              ← хук useEconomy
├── 02-economyCalculator-utils.md      ← economyCalculator.js
├── 03-settings-toggle.md              ← тоггл в настройках (секция "Plugins")
├── 04-economy-start-screen.md         ← EconomyStartScreen
├── 05-gold-coin-button.md             ← GoldCoinButton
├── 06-economy-simple-overlay.md       ← EconomySimpleOverlay
├── 07-economy-advanced.md             ← EconomyAdvanced
├── 08-economy-price-config.md         ← EconomyPriceConfig
├── 09-app-jsx-integration.md          ← EconomyPlugin + PluginsRenderer
└── 11-economy-css-styles.md           ← CSS-стили
```

## Краткое описание шагов

| Шаг | Что делается | Файлы |
|-----|-------------|-------|
| 1 | Хук `useEconomy` | `src/plugins/economy/hooks/useEconomy.js` |
| 2 | Утилиты расчёта `economyCalculator.js` | `src/plugins/economy/utils/economyCalculator.js` |
| 3 | Тоггл в настройках (секция "Plugins") | `src/components/Sidebar/SettingsTab.jsx` (импорт `useEconomy`) |
| 4 | Стартовый экран экономики | `src/plugins/economy/components/EconomyStartScreen.jsx` |
| 5 | Золотая кнопка (FAB) | `src/plugins/economy/components/GoldCoinButton.jsx` |
| 6 | Оверлей Simple-режима | `src/plugins/economy/components/EconomySimpleOverlay.jsx` |
| 7 | Вкладка Advanced | `src/plugins/economy/components/EconomyAdvanced.jsx` |
| 8 | Конфигуратор цен | `src/plugins/economy/components/EconomyPriceConfig.jsx` |
| 9 | Создание EconomyPlugin + PluginsRenderer | `src/plugins/economy/EconomyPlugin.jsx` + `src/plugins/index.jsx` |
| 10 | Ручная интеграция | Пользователь вручную добавляет `<PluginsRenderer />` в `App.jsx` |
| 11 | CSS-стили | `src/plugins/economy/styles/economy.css`, импорт в `EconomyPlugin` или `main.jsx` |

## Инструкция для агента

1. Открой файл `plan/01-useEconomy-hook.md` и следуй инструкциям
2. После завершения каждого шага:
   - Запусти `npm run build` — убедись что нет ошибок
   - Проверь в браузере (Vite dev server)
   - Выполни `git add -A && git commit -m "шаг N: описание" && git push`
3. Переходи к следующему шагу
4. Если возникла ошибка сборки — исправь её прежде чем переходить дальше
5. Не пропускай шаги. Не меняй порядок.

## Структура economyChain (отдельное состояние)

```js
// Не craftChain! Отдельное состояние в useEconomy
economyChain = [
  { name: 'Board', amount: 10, fixed: true },
  { name: 'Table', amount: 2, fixed: true }
]
```

## Компоненты и их расположение

```
src/
├── plugins/
│   ├── index.jsx                          ← новый (шаг 9) — PluginsRenderer
│   ├── shared/                            ← опционально, общие утилиты
│   └── economy/
│       ├── EconomyPlugin.jsx              ← новый (шаг 9) — самодостаточный плагин
│       ├── hooks/
│       │   └── useEconomy.js              ← новый (шаг 1)
│       ├── utils/
│       │   └── economyCalculator.js       ← новый (шаг 2)
│       ├── components/
│       │   ├── EconomyStartScreen.jsx     ← новый (шаг 4)
│       │   ├── GoldCoinButton.jsx         ← новый (шаг 5)
│       │   ├── EconomySimpleOverlay.jsx   ← новый (шаг 6)
│       │   ├── EconomyAdvanced.jsx        ← новый (шаг 7)
│       │   └── EconomyPriceConfig.jsx     ← новый (шаг 8)
│       └── styles/
│           └── economy.css                ← новый (шаг 11)
├── components/
│   └── Sidebar/
│       └── SettingsTab.jsx                ← ИЗМЕНИТЬ (шаг 3) — секция "Plugins" + импорт useEconomy
├── app/
│   └── App.jsx                            ← НЕ ТРОГАТЬ (пользователь вручную добавит <PluginsRenderer />)
└── main.jsx                               ← ИЗМЕНИТЬ (шаг 11) — импорт economy.css
```
