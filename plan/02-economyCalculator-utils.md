> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/economy/`.
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 2: economyCalculator.js

## Задача

Создать файл `src/economy/utils/economyCalculator.js` с функциями для экономических расчётов.

## Функции

### `calculateCost(chain, prices)`
- Вход: `economyChain` (массив `{name, amount, fixed}`) и `prices` (объект цен)
- Выход: число — общая стоимость всех ресурсов в цепочке
- Логика: sum(price[name]?.gold ?? 0) * amount для каждого элемента цепочки
- Если у предмета нет цены — его стоимость считается 0

### `calculateRevenue(leftovers, prices)`
- Вход: массив leftovers (только торгуемые) и prices
- Выход: число — выручка от продажи всех остатков
- Логика: sum(price[name]?.gold ?? 0) * quantity
- Если нет цены — вклад 0, но в Simple будет предупреждение

### `calculateProfit(cost, revenue)`
- Вход: cost, revenue
- Выход: revenue - cost

### `calculateLeftovers(chain, prices, isTradableFn)`
- Вход: цепочка, цены, функция проверки торгуемости
- Выход: массив `{name, quantity, price, isTradable}`
- Только торгуемые предметы (isTradableFn возвращает true)
- Для каждого предмета: количество (суммируется если повторяется), цена (из prices)

### `applyCraft(leftovers, itemName, quantity, craftRecipe)`
- Вход: текущий список остатков, название предмета для крафта, количество, рецепт
- Выход: новый список остатков после крафта
- Логика:
  1. Найти в leftovers строку с itemName
  2. Вычесть ингредиенты (из рецепта) из соответствующих строк leftovers
  3. Может уйти в минус — это нормально (симуляция докупки)
  4. Добавить результат крафта в leftovers (или увеличить существующий)
  5. Вернуть новый массив

### `convertPrice(value, fromCurrency, toCurrency, exchangeRates)`
- Вход: число, fromCurrency (`'gold'`/`'ap'`/`'oj'`), toCurrency, курсы
- Выход: число — сконвертированное значение
- Если курс не задан — возвращает null
- Логика:
  - gold → gold: value
  - ap → gold: value / 1000 * exchangeRates.apToGold
  - oj → gold: value / 1000 * exchangeRates.ojToGold
  - oj → ap: value / 1000 * exchangeRates.ojToAp
  - И т.д.

### `getItemPrice(itemName, currency, prices, exchangeRates)`
- Вход: название предмета, валюта отображения, цены, курсы
- Выход: число или null — цена предмета в указанной валюте
- Если цена введена прямо в этой валюте — возвращает её
- Если цена в другой валюте — конвертирует через convertPrice
- Если нет цены — null

### `runSimple(chain, prices)`
- Вход: цепочка, цены
- Выход: объект `{ cost, revenue, profit, leftovers, warnings }`
  - cost: calculateCost
  - leftovers: calculateLeftovers
  - revenue: calculateRevenue(leftovers, prices)
  - profit: calculateProfit(cost, revenue)
  - warnings: массив предметов без цен (для предупреждения)
  - optimalPath: (заглушка) просто копия chain пока

### `runAdvanced(leftovers, advancedState, prices)`
- Вход: список остатков, advancedState, цены
- Выход: объект `{ updatedLeftovers, cost, revenue, profit, deficitItems }`
- Применяет все крафты из advancedState к leftovers через applyCraft
- Вычисляет cost, revenue, profit
- deficitItems: массив предметов с отрицательным количеством

### `findOptimalPath(chain, prices, recipes, exchangeRates)` (ЗАГЛУШКА)
- Вход: цепочка, цены, рецепты, курсы
- Выход: ТОТ ЖЕ chain (заглушка для Simple-режима)
- В будущем: комбинаторная оптимизация

## Сигнатуры

```js
export function calculateCost(chain, prices) { ... }
export function calculateRevenue(leftovers, prices) { ... }
export function calculateProfit(cost, revenue) { ... }
export function calculateLeftovers(chain, prices, isTradableFn) { ... }
export function applyCraft(leftovers, itemName, quantity, craftRecipe) { ... }
export function convertPrice(value, fromCurrency, toCurrency, exchangeRates) { ... }
export function getItemPrice(itemName, currency, prices, exchangeRates) { ... }
export function runSimple(chain, prices) { ... }
export function runAdvanced(leftovers, advancedState, prices) { ... }
export function findOptimalPath(chain, prices, recipes, exchangeRates) { ... }
```

## Важно

- Все функции ЧИСТЫЕ — не мутируют входные данные, возвращают новые объекты/массивы
- `applyCraft` — ключевая для Advanced: позволяет уйти в минус
- `runSimple` — пока примитивная, но с правильной структурой выхода
- `findOptimalPath` — заглушка, возвращает chain как есть

## Проверки

1. `npm run build` — без ошибок
2. Можно запустить `node -e "import('./src/economy/utils/economyCalculator.js')"` из корня (с флагом `--experimental-modules` или через vite) — но проще проверить билдом
3. `git add -A && git commit -m "feat: add economyCalculator utils" && git push`
