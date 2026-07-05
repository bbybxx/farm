> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/economy/`.
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 7: EconomyAdvanced — вкладка Advanced-режима

## Задача

Создать компонент `src/economy/components/EconomyAdvanced.jsx` — полноценная вкладка Advanced для ручного управления крафтами и остатками.

## Что нужно сделать

### Компонент EconomyAdvanced

```jsx
export default function EconomyAdvanced({
  leftovers,            // массив {name, quantity, price}
  advancedState,        // массив {itemName, crafts: [{recipeName, quantity}]}
  onUpdateCraft,        // (itemName, recipeName, quantity) => void
  onRemoveItem,         // (itemIndex) => void
  onAddManualItem,      // (itemName, quantity) => void
  manualAdditions,      // массив {itemName, quantity, timestamp}
  prices,               // объект цен
  currency,             // валюта отображения
  exchangeRates,        // курсы валют
  combinedRecipes,      // все рецепты (для поиска доступных крафтов)
  getItemPrice          // функция для получения цены в нужной валюте
})
```

### Структура

#### Хедер Advanced (всегда вверху)

```jsx
<div className="economy-advanced-header">
  <div className="economy-metric cost">
    <span className="metric-label">C</span>
    <span className="metric-value" style={{ color: '#F44336' }}>
      {formatNumberRounded(cost)} {currencyLabel}
    </span>
  </div>
  <div className="economy-metric revenue">
    <span className="metric-label">R</span>
    <span className="metric-value">
      {formatNumberRounded(revenue)} {currencyLabel}
    </span>
  </div>
  <div className="economy-metric profit">
    <span className="metric-label">P</span>
    <span className="metric-value" style={{ color: profit >= 0 ? '#8BC34A' : '#F44336' }}>
      {formatNumberRounded(profit)} {currencyLabel}
    </span>
  </div>
</div>
```

#### Список остатков

Каждая строка остатка:

**Свёрнутая:**
```
┌────────────────────────────────────────────────────────┐
│ Board ×10                                              │
│ breadcrumb: Board(10) → Table(1) [← скроллится →]     │
├────────────────────────────────────────────────────────┤
```

**Развёрнутая (по клику на строку):**
```
┌────────────────────────────────────────────────────────┐
│ Board ×10                                              │
│ breadcrumb: Board(10) → Table(1)                       │
│                                                        │
│ Доступные крафты:                                      │
│ → Table (1 Board → 1 Table)  [input: 3]               │
│ → Shelf (2 Board → 1 Shelf)  [input: 0]               │
│                                                        │
│ -5 Board (used for Table)                              │
│ -2 Board (used for Shelf)                              │
├────────────────────────────────────────────────────────┤
```

### Детали реализации

#### 1. Хлебная крошка (breadcrumb)
- Показывается в каждой строке остатка
- Формат: `ТекущийПредмет(количество) → РезультатКрафта(количество)`
- Показываются ТОЛЬКО прямой крафт (без промежуточных)
- Если не влезает — горизонтальный скролл
- **Клик на элемент крошки откатывает состояние**: все последующие крафты удаляются, остатки пересчитываются

#### 2. Разворот строки
- По клику на строку показываются все доступные крафты, которые используют этот ресурс
- Для каждого крафта: название, формула, поле ввода (только цифры)
- Поле ввода: `type="number"`, минимальное значение 0
- При вводе `0` крафт считается неактивным (удаляется из advancedState)
- Ввод любого числа → мгновенный пересчёт

#### 3. Минус-строки
- Под развёрнутой строкой показываются:
  ```
  -5 Board (used for Table)
  ```
- Это некликабельные строки — показывают сколько ресурсов потрачено

#### 4. Дефицит (отрицательные количества)
- Если после пересчёта количество < 0 — строка красная
- Это не ошибка, а симуляция докупки ресурсов

#### 5. Пересчёт
- Использовать `applyCraft` из economyCalculator.js для каждого крафта в advancedState
- Вызов `runAdvanced(leftovers, advancedState, prices)` для полного пересчёта
- Результат обновляет `leftovers` и хедер (C, R, P)

#### 6. Кнопка "Add"
- Внизу списка: кнопка "Add" для ручного добавления предмета
- После добавления: запись в `manualAdditions`, журнал внизу списка
  ```
  +5 Wood (added manually)
  ```

#### 7. Кнопка "Pin/Save" в хедере
- Заглушка: "Saved! (placeholder)"

### Технические детали

```js
// Получение всех рецептов для предмета
function getAvailableCrafts(itemName, combinedRecipes) {
  return Object.entries(combinedRecipes)
    .filter(([name, recipe]) => {
      const ingredients = recipe.из || recipe.ingredients || {}
      return itemName in ingredients
    })
    .map(([name, recipe]) => ({
      name,
      ingredients: recipe.из || recipe.ingredients || {},
      output: recipe.amount || 1,
      requiredPerCraft: (recipe.из || recipe.ingredients || {})[itemName] || 1
    }))
}
```

### Производительность
- Debounce 300ms на ввод в поля крафтов
- React.memo для строк остатков (при больших списках)
- Пересчёт асинхронный (через setTimeout + debounce)

## Проверки

1. `npm run build` — без ошибок
2. `git add -A && git commit -m "feat: add EconomyAdvanced component" && git push`
