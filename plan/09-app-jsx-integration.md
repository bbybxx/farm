> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/economy/`.
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 9: EconomyPlugin — самодостаточный плагин экономического режима

## Задача

Создать файл `src/economy/EconomyPlugin.jsx` — самодостаточный плагин, который рендерит весь экономический интерфейс. Плагин **не принимает пропсы** из App.jsx, а самостоятельно использует существующие хуки (`useCraft`, `useUIState`, `useEconomy`).

## Что нужно сделать

### 1. Создать EconomyPlugin.jsx

Файл: `src/economy/EconomyPlugin.jsx`

```jsx
import { useEconomy } from './hooks/useEconomy'
import { useCraft } from '../hooks/useCraft'
import { useUIState } from '../hooks/useUIState'
import EconomyStartScreen from './components/EconomyStartScreen'
import GoldCoinButton from './components/GoldCoinButton'
import EconomySimpleOverlay from './components/EconomySimpleOverlay'
import EconomyAdvanced from './components/EconomyAdvanced'
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

  // Существующие хуки приложения
  const { item, amount, craftChain, combinedRecipes } = useCraft()
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
        {/* Кнопка "← Back" для возврата из Advanced */}
        <button
          className="economy-back-btn"
          onClick={closeAdvancedTab}
        >
          ← Back
        </button>
        <EconomyAdvanced
          leftovers={/* рассчитать из economyChain + prices */}
          advancedState={advancedState}
          onUpdateCraft={updateAdvancedCraft}
          onRemoveItem={removeFromAdvancedState}
          onAddManualItem={addManualAddition}
          manualAdditions={manualAdditions}
          prices={prices}
          currency={currency}
          exchangeRates={exchangeRates}
          combinedRecipes={combinedRecipes}
          getItemPrice={(itemName, currency) => {
            // функция получения цены
          }}
        />
      </>
    )}
  </>
)
```

### 4. Кнопка переключения Advanced (внутри плагина)

Кнопка "Advanced" **НЕ добавляется в AppHeader**. Вместо этого:

- Внутри `EconomySimpleOverlay` есть кнопка "Open Advanced ▸", которая вызывает `onOpenAdvanced()`
- Внутри `EconomyPlugin` можно добавить собственную кнопку "Advanced" (например, в углу экрана), которая переключает `advancedTabOpen`
- Кнопка "← Back" рендерится внутри плагина при открытом Advanced

### 5. Важно

- **Плагин НЕ принимает пропсы** — все данные получает через хуки
- **App.jsx НЕ МЕНЯЕТСЯ агентом** — строчку `<EconomyPlugin />` добавляет пользователь вручную
- Плагин использует `useCraft` и `useUIState` только для чтения (не меняет их)
- Все переключения между Simple и Advanced происходят внутри плагина
- Если какой-то пропс нужен, но его нет в хуках — используй `useSettings` или другие существующие хуки

## Проверки

1. `npm run build` — без ошибок (возможны ошибки, так как плагин ещё не подключён в App.jsx — это нормально)
2. `git add -A && git commit -m "feat: create EconomyPlugin" && git push`

## После шага 9: ручная интеграция пользователем

После завершения шага 9, пользователь должен вручную выполнить следующие действия:

### 1. Добавить EconomyPlugin в App.jsx

Открыть `src/app/App.jsx` и:

1. Добавить импорт:
```js
import EconomyPlugin from '../economy/EconomyPlugin'
```

2. Добавить `<EconomyPlugin />` в JSX (после существующих компонентов, например перед закрывающим `</div>` или `</>`):
```jsx
<EconomyPlugin />
```

### 2. Импортировать economy.css (если не сделано в шаге 11)

В `src/main.jsx` добавить:
```js
import './economy/styles/economy.css'
```

### 3. Проверить сборку

```bash
npm run build
```

### 4. Проверить в браузере

- Включить Economy Mode в настройках
- Должен появиться стартовый экран экономики
- Выбрать предмет → должна появиться золотая кнопка
- Нажать на кнопку → должен открыться Simple оверлей
- Проверить Advanced
