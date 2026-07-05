> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/economy/`.
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 1: Хук useEconomy

## Задача

Создать хук `src/economy/hooks/useEconomy.js` для управления состоянием экономического режима.

## Что нужно сделать

1. Создать файл `src/economy/hooks/useEconomy.js`
2. Использовать `loadFromStorage` / `saveToStorage` из `../../utils/storage.js` (префикс `economy_`)
3. Хук должен управлять следующими состояниями:

### Состояния

| Поле | Тип | localStorage key | Дефолт |
|------|-----|------------------|--------|
| `economyEnabled` | boolean | `economy_enabled` | `false` |
| `economyChain` | array | `economy_chain` | `[]` |
| `prices` | object | `economy_prices` | `{}` |
| `currency` | string (`gold`/`ap`/`oj`) | `economy_currency` | `'gold'` |
| `exchangeRates` | object | `economy_exchangeRates` | `{ apToGold: null, ojToGold: null, ojToAp: null }` |
| `advancedState` | array | `economy_advancedState` | `[]` |
| `manualAdditions` | array | `economy_manualAdditions` | `[]` |
| `priceRefreshable` | object | `economy_priceRefreshable` | `{}` |
| `simpleOverlayOpen` | boolean | (не сохраняется) | `false` |
| `advancedTabOpen` | boolean | (не сохраняется) | `false` |

### Формат данных

```js
economyChain: [
  { name: 'Board', amount: 10, fixed: true },  // fixed = true — рекурсия запрещена
  { name: 'Table', amount: 2, fixed: true }
]

prices: {
  'Board': { gold: 50, ap: null, oj: null },
  'Iron Ore': { gold: null, ap: 5, oj: null }
}

exchangeRates: {
  apToGold: null,   // 1000 AP = X Gold
  ojToGold: null,   // 1000 OJ = X Gold
  ojToAp: null      // 1000 OJ = X AP
}

advancedState: [
  {
    itemName: 'Board',
    crafts: [
      { recipeName: 'Table', quantity: 3 }
    ]
  }
]

manualAdditions: [
  { itemName: 'Wood', quantity: 5, timestamp: Date.now() }
]

priceRefreshable: {
  'Board': true,  // true = будет перезаписано при обновлении из Fauna
  'Iron Ore': false  // false = ручной ввод, сохраняется
}
```

### Функции, которые должен возвращать хук

```js
setEconomyEnabled(bool)
  // При включении: очищает economyChain, сбрасывает advancedState/manualAdditions
  // При выключении: ничего не чистит (данные сохраняются в localStorage)

addToEconomyChain(name, amount)  // добавляет элемент с fixed: true
setEconomyChain(array)           // полная замена цепочки
clearEconomyChain()              // очистка цепочки

setPrices(prices)                // полная замена prices
setPrice(itemName, currency, value)  // установка цены для одного предмета

setCurrency(currency)            // gold/ap/oj
setExchangeRates(rates)          // полная замена курсов

addManualAddition(itemName, quantity)  // добавляет запись в manualAdditions

setAdvancedState(state)          // полная замена advancedState
updateAdvancedCraft(itemName, recipeName, quantity)
  // обновляет/добавляет крафт в advancedState для конкретного itemName
  // если quantity === 0 — удаляет крафт

removeFromAdvancedState(itemIndex)  // удаляет строку из advancedState

setPriceRefreshable(itemName, bool)  // установка тоггла для конкретного предмета

openSimpleOverlay() / closeSimpleOverlay()
openAdvancedTab() / closeAdvancedTab()
```

## Проверки

1. `npm run build` — сборка без ошибок
2. В браузере: открыть консоль, проверить что `import` хука не падает (закомментировать его пока)
3. `git add -A && git commit -m "feat: add useEconomy hook" && git push`

## Важно

- Все изменения сохраняются в localStorage через `useEffect`
- `economyChain` НЕ связан с `craftChain` — это отдельное состояние
- При `economyEnabled = true` вызывается `clearEconomyChain()` чтобы цепочка строилась заново
- Рекурсия запрещена: `fixed: true` для всех элементов economyChain
- Хук **не зависит от пропсов** — он самодостаточен и использует только `loadFromStorage`/`saveToStorage`

## Стиль кода

- Пример из существующего `useUIState.js` и `useSettings.js`
- Использовать `useState` с lazy initializer через `loadFromStorage`
- Для каждого поля — отдельный `useEffect` с `saveToStorage`
- Названия переменных в camelCase
