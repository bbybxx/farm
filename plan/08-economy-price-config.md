> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/economy/`.
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 8: EconomyPriceConfig — конфигуратор цен

## Задача

Создать компонент `src/economy/components/EconomyPriceConfig.jsx` — модальное окно для управления ценами на предметы и курсами валют.

## Что нужно сделать

### Компонент EconomyPriceConfig

Модальное окно для управления ценами на предметы.

```jsx
export default function EconomyPriceConfig({
  isOpen,
  onClose,
  prices,              // объект { itemName: { gold, ap, oj } }
  onSetPrice,          // (itemName, currency, value) => void
  priceRefreshable,    // объект { itemName: true/false }
  onSetRefreshable,    // (itemName, boolean) => void
  exchangeRates,       // курсы валют
  onSetExchangeRates,  // (rates) => void
  allItems             // массив всех известных предметов (из рецептов)
})
```

### Структура

```
┌─────────────────────────────────────────────┐
│ Configure Prices                        [✕] │
│                                              │
│ ─── Exchange Rates ───                      │
│                                              │
│ 1000 AP = [______] Gold                      │
│ 1000 OJ = [______] Gold                      │
│ 1000 OJ = [______] AP                        │
│                                              │
│ ─── Item Prices ───                         │
│                                              │
│ [Search...]                                  │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Board          [50] G  [  ] [Fauna 45] │ │
│ │ Iron Ore       [__] G  [✓] [── no data]│ │
│ │ Table          [200] G [  ] [── no data]│ │
│ │ ...                                      │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ Legend: [  ] = refreshable, [✓] = manual    │
│         "Fauna 45" = цена из Fauna          │
└─────────────────────────────────────────────┘
```

### Детали

#### 1. Заголовок
- "Configure Prices" + крестик закрытия

#### 2. Секция курсов валют
- Три поля ввода (числовые):
  - "1000 AP = X Gold"
  - "1000 OJ = X Gold"
  - "1000 OJ = X AP"
- Сохраняются через `onSetExchangeRates`

#### 3. Секция предметов
- Список всех предметов, которые есть в `allItems` или в `prices`
- Поиск/фильтр по названию
- Для каждого предмета:
  - Название
  - Поле ввода для цены (только в выбранной валюте)
  - Тоггл (чекбокс) "refreshable":
    - Если включён (по умолчанию) — цена будет перезаписана при обновлении из Fauna
    - Если выключен — цена сохраняется как ручной ввод
  - Индикатор данных Fauna (пока заглушка "Fauna: —")

#### 4. Кнопка "Refresh from Fauna"
- Пока заглушка

#### 5. Закрытие
- Крестик → `onClose()`
- Все изменения сохраняются через пропсы

### Где разместить кнопку открытия

Кнопка "Configure Prices" добавляется в `SettingsTab.jsx` через импорт `useEconomy` (аналогично шагу 3). Внутри секции Economy Mode, после чекбокса включения:

```jsx
{/* В SettingsTab.jsx, внутри секции Economy Mode */}
{economyEnabled && (
  <>
    <div className="setting-item">
      <label className="setting-label">
        <span style={{ fontWeight: 600 }}>Display Currency</span>
        <select
          className="setting-select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          <option value="gold">Gold (G)</option>
          <option value="ap">AP</option>
          <option value="oj">Orange Juice (OJ)</option>
        </select>
      </label>
    </div>
    
    <button
      className="chip wide"
      onClick={() => setIsPriceConfigOpen(true)}
      type="button"
    >
      ⚙ Configure Prices
    </button>
  </>
)}
```

Для этого в `SettingsTab.jsx` нужно расширить деструктуризацию `useEconomy`:

```js
const {
  economyEnabled, setEconomyEnabled,
  currency, setCurrency,
  exchangeRates, setExchangeRates,
  prices, setPrice,
  priceRefreshable, setPriceRefreshable,
  isPriceConfigOpen, setIsPriceConfigOpen
} = useEconomy()
```

А также добавить рендеринг модалки `EconomyPriceConfig` в `SettingsTab.jsx`:

```jsx
{economyEnabled && isPriceConfigOpen && (
  <EconomyPriceConfig
    isOpen={isPriceConfigOpen}
    onClose={() => setIsPriceConfigOpen(false)}
    prices={prices}
    onSetPrice={setPrice}
    priceRefreshable={priceRefreshable}
    onSetRefreshable={setPriceRefreshable}
    exchangeRates={exchangeRates}
    onSetExchangeRates={setExchangeRates}
    allItems={allItems}
  />
)}
```

**Важно:** `allItems` можно получить из `useCraft` или передать через контекст. Если нет доступа — пока передавать пустой массив.

## Проверки

1. `npm run build` — без ошибок
2. `git add -A && git commit -m "feat: add EconomyPriceConfig component and settings integration" && git push`
