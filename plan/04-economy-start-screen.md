> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/economy/`.
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 4: EconomyStartScreen — главный экран экономического режима

## Задача

Создать компонент `src/economy/components/EconomyStartScreen.jsx` — стартовый экран, который показывается вместо обычного интерфейса, когда экономический режим включён.

## Что нужно сделать

### Компонент EconomyStartScreen

Принимает пропсы:
```js
{
  onOpenLocations: () => void,  // переключает в locationsMode
  onOpenCraft: () => void       // переключает в обычный craft mode (но в рамках экономики)
}
```

Возвращает JSX:
```jsx
<div className="economy-start-screen">
  <div className="economy-start-content">
    <h2>Economy Mode</h2>
    <p>Choose your starting point:</p>
    <div className="economy-start-buttons">
      <button className="economy-start-btn locations" onClick={onOpenLocations}>
        <span className="economy-start-icon">📍</span>
        <span className="economy-start-label">Locations</span>
        <span className="economy-start-desc">Explore resources from locations</span>
      </button>
      <button className="economy-start-btn craft" onClick={onOpenCraft}>
        <span className="economy-start-icon">🔧</span>
        <span className="economy-start-label">Craft</span>
        <span className="economy-start-desc">Start with a crafting recipe</span>
      </button>
    </div>
  </div>
</div>
```

### Логика показа

- Показывается когда `economyEnabled === true` И пользователь НЕ в режиме locationsMode и НЕ в режиме craft (т.е. на "главном экране")
- Две большие кнопки: "Locations" и "Craft"
- Нажатие на Locations → `onOpenLocations()` (устанавливает locationsMode = true)
- Нажатие на Craft → `onOpenCraft()` (устанавливает craft mode = true, открывает ItemSelectModal)

### Стили

CSS будет добавлен позже (шаг 11) — пока использовать inline-стили или базовые классы. Важно:

- Две большие кнопки на весь экран, расположенные горизонтально (или вертикально на мобильных)
- Стиль "glass" как у всего приложения
- Кнопки с иконкой, названием и кратким описанием
- Нативный дизайн, consistent с существующим интерфейсом

## Проверки

1. `npm run build` — без ошибок
2. `git add -A && git commit -m "feat: add EconomyStartScreen component" && git push`
