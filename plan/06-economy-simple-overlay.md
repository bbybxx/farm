> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/economy/`.
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 6: EconomySimpleOverlay — оверлей Simple-режима

## Задача

Создать компонент `src/economy/components/EconomySimpleOverlay.jsx` — оверлей на 3/4 экрана, открывающийся по нажатию на золотую кнопку.

## Что нужно сделать

### Компонент EconomySimpleOverlay

```jsx
export default function EconomySimpleOverlay({
  isOpen,           // boolean — открыт/закрыт
  onClose,          // () => void
  economyChain,     // массив {name, amount}
  prices,           // объект цен
  onSetPrice,       // (itemName, currency, value) => void
  onAddManualItem,  // (itemName, quantity) => void
  onOpenAdvanced,   // () => void — переключение на Advanced
  currency,         // текущая валюта отображения
  exchangeRates,    // курсы валют
  isTradableFn,     // (itemName) => boolean — функция проверки торгуемости
  combinedRecipes   // рецепты для findOptimalPath
})
```

### Структура оверлея (сверху вниз)

```
┌─────────────────────────────────────┐
│ ✕ (крестик закрытия)                │
│                                     │
│ Список предметов в цепочке:        │
│ ┌─────────────────────────────────┐ │
│ │ Board           ×10  [___] $    │ │
│ │ Table           ×2   [___] $    │ │
│ │ Wood (added)    ×5   [___] $    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Add] — кнопка добавления предмета  │
│                                     │
│ [Calculate] — кнопка расчёта        │
│                                     │
│ ⚠ Price warning (если нужно)       │
│                                     │
│ === Результаты (после расчёта) ===  │
│                                     │
│ Cost:    1 000 G                    │
│ Revenue: 1 500 G                    │
│ Profit:  +500 G                     │
│                                     │
│ Leftovers:                          │
│ ┌─────────────────────────────────┐ │
│ │ Board: 5 @ 50G = 250G          │ │
│ │ Nails: 10 @ 25G = 250G         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Open Advanced ▸]                   │
│ [Pin/Save]                          │
└─────────────────────────────────────┘
```

### Детали

1. **Заголовок**: "Economy Calculator" + крестик закрытия
2. **Список предметов в цепочке**: для каждого — название, количество, поле ввода цены (числовое)
   - Кнопка "Заполнить из Fauna" — пока заглушка
3. **Кнопка "Add"**: открывает модалку/инлайн форму для добавления любого предмета
   - После добавления показывается в списке с пометкой "(added)"
   - Внизу списка журнал: `"+5 Wood (added manually)"`
4. **Кнопка "Calculate"**: запускает `runSimple(economyChain, prices)`
   - Показывает результаты ниже кнопки
5. **Предупреждение**: если у торгуемого предмета нет цены — жёлтый баннер с текстом
6. **Результаты**: Cost (красный), Revenue (белый), Profit (зелёный)
   - После цифр — сокращение валюты (G/AP/OJ) из `currency`
7. **Leftovers**: список предметов с количеством, ценой и стоимостью
   - Только торгуемые (isTradableFn)
8. **Кнопка "Open Advanced ▸"**: вызывает `onOpenAdvanced()`
9. **Кнопка "Pin/Save"**: заглушка "Saved! (placeholder)"
10. **Закрытие**: крестик → `onClose()`, данные (цены) сохраняются

### Стиль

- Оверлей на 3/4 экрана (height: 75vh), скроллится
- Затемнение фона (как у модалок)
- Использовать `AnimatePresence` + `motion.div` для анимации
- Glass-стиль как у остальных модалок

```jsx
import { motion, AnimatePresence } from 'framer-motion'
```

### Важно

- Поле ввода цены — ТОЛЬКО числовое (type="number" или фильтр через onChange)
- Цены сохраняются через `onSetPrice(itemName, 'gold', value)`
- Результаты рассчитываются только после нажатия "Calculate"
- `runSimple` из `economyCalculator.js` — используется для расчёта
- `isTradableFn` — пока заглушка `() => true` (все предметы торгуемые)

## Проверки

1. `npm run build` — без ошибок
2. `git add -A && git commit -m "feat: add EconomySimpleOverlay component" && git push`
