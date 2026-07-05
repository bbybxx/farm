> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/economy/`.
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 5: GoldCoinButton — золотая кнопка (FAB)

## Задача

Создать компонент `src/economy/components/GoldCoinButton.jsx` — плавающая кнопка в правом нижнем углу, которая открывает оверлей Simple-режима.

## Что нужно сделать

### Компонент GoldCoinButton

```jsx
export default function GoldCoinButton({
  itemCount,     // количество предметов в economyChain (или 0)
  onClick,       // обработчик нажатия
  isActive       // true если есть хотя бы 1 предмет в цепочке
})
```

### Поведение

- Показывается ТОЛЬКО когда `economyEnabled === true`
- Расположение: position: fixed, bottom: 24px, right: 24px (как FAB)
- Размер: примерно 56x56px
- Состояния:
  - **Неактивна** (`isActive === false` или `itemCount === 0`): серая, полупрозрачная, `pointer-events: none`
  - **Активна** (`isActive === true`): золотая, с иконкой монеты и счётчиком предметов
- Надпись на кнопке: `💰` + количество предметов, например `💰 5`
- При нажатии: вызывает `onClick()`

### Анимация (framer-motion)

- При появлении: выезжает снизу с небольшой задержкой
- При изменении счётчика: плавное изменение
- Использовать `motion.button`

```jsx
import { motion, AnimatePresence } from 'framer-motion'
```

### Стили

- Использовать классы: `gold-coin-button`, `gold-coin-button.active`, `gold-coin-button .coin-count`
- Цвета из `colors.css`:
  - Активная: фон — gold (#FFB300), тень
  - Неактивная: фон — `--button-disabled`
- Текст: белый, жирный

## Проверки

1. `npm run build` — без ошибок
2. `git add -A && git commit -m "feat: add GoldCoinButton component" && git push`
