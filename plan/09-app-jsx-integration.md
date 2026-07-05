> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/plugins/` (для экономики — `src/plugins/economy/`).
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 9: EconomyPlugin + PluginsRenderer — плагинная архитектура

## Задача

Создать универсальную платформу для плагинов:

1. **EconomyPlugin** (`src/plugins/economy/EconomyPlugin.jsx`) — самодостаточный плагин экономического режима, который рендерит весь экономический интерфейс. Плагин **не принимает пропсы** из App.jsx, а самостоятельно использует существующие хуки (`useCraft`, `useUIState`, `useEconomy`).

2. **PluginsRenderer** (`src/plugins/index.jsx`) — точка входа для всех плагинов. Рендерит все зарегистрированные плагины как React-компоненты. Плагины сами управляют своей видимостью.

## Что нужно сделать

### 1. Создать EconomyPlugin.jsx

Файл: `src/plugins/economy/EconomyPlugin.jsx`

```jsx
import React, { useMemo } from 'react'
import { useEconomy } from './hooks/useEconomy'
import { useCraft } from '../../hooks/useCraft'
import { useUIState } from '../../hooks/useUIState'
import EconomyStartScreen from './components/EconomyStartScreen'
import GoldCoinButton from './components/GoldCoinButton'
import EconomySimpleOverlay from './components/EconomySimpleOverlay'
import EconomyAdvanced from './components/EconomyAdvanced'
import { calculateLeftovers } from './utils/economyCalculator'
```

### 2. Логика плагина

Плагин использует хуки напрямую (без пропсов):

```js
export default function EconomyPlugin() {
  // Хуки экономики
  const {
    economyEnabled,
    economyChain,
    prices,
    setPrice,
    currency,
    exchangeRates,
    advancedState,
    updateAdvancedCraft,
    removeFromAdvancedState,
    manualAdditions,
    addManualAddition,
    simpleOverlayOpen,
    openSimpleOverlay,
    closeSimpleOverlay,
    advancedTabOpen,
    openAdvancedTab,
    closeAdvancedTab,
  } = useEconomy()

  // Существующие хуки приложения (только для чтения)
  const { item, amount, combinedRecipes } = useCraft()
  const { locationsMode, setIsItemSelectModalOpen } = useUIState()
```

### 3. Рендеринг

Плагин рендерит компоненты экономики только когда `economyEnabled === true`:

```jsx
if (!economyEnabled) return null

return (
  <>
    {/* Стартовый экран (когда не в locations и не в craft) */}
    {!locationsMode && !item && (
      <EconomyStartScreen
        onOpenLocations={() => { /* установить locationsMode */ }}
        onOpenCraft={() => { /* открыть ItemSelectModal */ }}
      />
    )}

    {/* Золотая кнопка (FAB) — показывается всегда, когда есть предметы */}
    <GoldCoinButton
      itemCount={economyChain.length}
      onClick={openSimpleOverlay}
      isActive={economyChain.length > 0}
    />

    {/* Simple оверлей */}
    {simpleOverlayOpen && (
      <EconomySimpleOverlay
        isOpen={simpleOverlayOpen}
        onClose={closeSimpleOverlay}
        economyChain={economyChain}
        prices={prices}
        onSetPrice={setPrice}
        onAddManualItem={addManualAddition}
        onOpenAdvanced={() => {
          closeSimpleOverlay()
          openAdvancedTab()
        }}
        currency={currency}
        exchangeRates={exchangeRates}
        isTradableFn={() => true}
        combinedRecipes={combinedRecipes}
      />
    )}

    {/* Advanced вкладка */}
    {advancedTabOpen && (
      <>
        <button className="economy-back-btn" onClick={closeAdvancedTab}>
          ← Back
        </button>
        <EconomyAdvanced
          leftovers={leftovers}
          advancedState={advancedState}
          onUpdateCraft={updateAdvancedCraft}
          onRemoveItem={removeFromAdvancedState}
          onAddManualItem={addManualAddition}
          manualAdditions={manualAdditions}
          prices={prices}
          currency={currency}
          exchangeRates={exchangeRates}
          combinedRecipes={combinedRecipes}
          getItemPrice={getItemPrice}
        />
      </>
    )}
  </>
)
```

### 4. Создать PluginsRenderer

Файл: `src/plugins/index.jsx`

```jsx
import EconomyPlugin from './economy/EconomyPlugin'

const PLUGINS = [EconomyPlugin]

export default function PluginsRenderer() {
  return PLUGINS.map((Plugin, i) => <Plugin key={i} />)
}
```

### 5. Важно

- **Плагин НЕ принимает пропсы** — все данные получает через хуки
- **App.jsx НЕ МЕНЯЕТСЯ агентом** — строчку `<PluginsRenderer />` добавляет пользователь вручную
- Плагин использует `useCraft` и `useUIState` только для чтения (не меняет их)
- Все переключения между Simple и Advanced происходят внутри плагина
- PluginsRenderer не знает о внутренностях плагинов — он просто рендерит их как компоненты
- Каждый плагин хранит своё состояние в localStorage со своим префиксом

## Проверки

1. `npm run build` — без ошибок (возможны ошибки, так как PluginsRenderer ещё не подключён в App.jsx — это нормально)
2. `git add -A && git commit -m "feat: create EconomyPlugin and PluginsRenderer" && git push`

## После шага 9: ручная интеграция пользователем

После завершения шага 9, пользователь должен вручную выполнить следующие действия:

### 1. Добавить PluginsRenderer в App.jsx

Открыть `src/app/App.jsx` и:

1. Добавить импорт:
```js
import PluginsRenderer from '../plugins'
```

2. Добавить `<PluginsRenderer />` в JSX (после существующих компонентов, например перед закрывающим `</div>` или `</>`):
```jsx
<PluginsRenderer />
```

### 2. Импортировать economy.css (если не сделано в шаге 11)

В `src/main.jsx` добавить:
```js
import './plugins/economy/styles/economy.css'
```

### 3. Проверить сборку

```bash
npm run build
```

### 4. Проверить в браузере

- Включить Economy Mode в настройках (секция "Plugins")
- Должен появиться стартовый экран экономики
- Выбрать предмет → должна появиться золотая кнопка
- Нажать на кнопку → должен открыться Simple оверлей
- Проверить Advanced
