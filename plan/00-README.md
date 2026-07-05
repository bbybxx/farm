> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/plugins/` (для экономики — `src/plugins/economy/`).
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Экономический режим — План разработки

## Общая архитектура

```
src/
├── plugins/
│   ├── index.jsx                          # PluginsRenderer — точка входа для всех плагинов (шаг 9)
│   ├── shared/                            # Общие утилиты для плагинов (опционально)
│   └── economy/
│       ├── EconomyPlugin.jsx              # Самодостаточный плагин экономики (шаг 9)
│       ├── hooks/
│       │   └── useEconomy.js              # Хук состояния экономического режима (шаг 1)
│       ├── utils/
│       │   └── economyCalculator.js       # Логика экономических расчётов (шаг 2)
│       ├── components/
│       │   ├── EconomyStartScreen.jsx     # Главный экран (Locations/Craft) (шаг 4)
│       │   ├── GoldCoinButton.jsx         # Золотая кнопка (FAB) (шаг 5)
│       │   ├── EconomySimpleOverlay.jsx   # Оверлей Simple-режима (шаг 6)
│       │   ├── EconomyAdvanced.jsx        # Advanced вкладка + строки остатков (шаг 7)
│       │   └── EconomyPriceConfig.jsx     # Конфигуратор цен (шаг 8)
│       └── styles/
│           └── economy.css                # Стили для экономического режима (шаг 11)
├── components/
│   └── Sidebar/
│       └── SettingsTab.jsx                # Изменяется: секция "Plugins" с чекбоксом экономики (шаг 3)
├── app/
│   └── App.jsx                            # НЕ ТРОГАЕТСЯ агентом (пользователь вручную добавит <PluginsRenderer />)
└── main.jsx                               # Изменяется: импорт economy.css (шаг 11)
```

## Принципы

### Экономический режим НЕ трогает craftChain
- Используется отдельное состояние `economyChain` (в `useEconomy`)
- Обычный калькулятор не знает об экономике

### Запрещена рекурсия
- После перехода к следующему крафту количество фиксируется
- `economyChain` — это массив зафиксированных шагов

### Simple vs Advanced — взаимоисключающие
- Simple: оверлей 3/4 экрана по нажатию золотой кнопки
- Advanced: отдельная вкладка внутри EconomyPlugin
- Нельзя открыть оба одновременно

### Состояние
- Всё сохраняется в localStorage с префиксом `economy_`
- Используется хук `useEconomy` (аналог `useUIState`, `useSettings`)
- Все изменения сохраняются автоматически

### Платформа плагинов
- `src/plugins/index.jsx` (PluginsRenderer) — единая точка входа
- Каждый плагин — React-компонент, сам решает, показываться или нет
- Добавление нового плагина: создать папку в `src/plugins/` + импорт в `index.jsx`
- В SettingsTab есть общая секция "Plugins" с переключателями для каждого плагина

## Порядок реализации

| Шаг | Файл | Описание |
|-----|------|----------|
| 01 | `useEconomy.js` | Хук состояния экономического режима |
| 02 | `economyCalculator.js` | Утилиты расчётов |
| 03 | Settings toggle | Переключатель в настройках (секция "Plugins" + импорт useEconomy) |
| 04 | EconomyStartScreen | Главный экран режима |
| 05 | GoldCoinButton | Золотая кнопка (FAB) |
| 06 | EconomySimpleOverlay | Оверлей Simple |
| 07 | EconomyAdvanced | Вкладка Advanced |
| 08 | EconomyPriceConfig | Конфигуратор цен |
| 09 | EconomyPlugin + PluginsRenderer | Создание самодостаточного плагина и точки входа |
| 10 | Ручная интеграция | Пользователь вручную добавляет `<PluginsRenderer />` в App.jsx |
| 11 | Economy CSS | Стили |
