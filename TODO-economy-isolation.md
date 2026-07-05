# Economy Plugin — Header Fix Checklist

## Проблема: EconomyAppHeader не соответствует AppHeader

### Найденные расхождения:

1. **Клик по breadcrumbs — заглушка вместо логики**
   - `EconomyAppHeader` строка 55-62: location node — комментарий "handled by plugin's own logic", но реально ничего не делает
   - Не переключает `view` на `'location'` / `'craft'`
   - Не восстанавливает `selectedLocation` / `locationAmount`
   - В `AppHeader` есть полноценная логика: `setLocationsMode(true)`, `setSelectedLocation(target.name)`, восстановление amount

2. **Кнопка "mode" — заглушка вместо дропдауна**
   - В `EconomyAppHeader` просто вызывает `onExit`
   - В `AppHeader` — полноценный дропдаун с 3 опциями (Crafts/Locations/Quests), анимацией framer-motion, сохранением breadcrumbs

3. **Нет автоскролла breadcrumbs**
   - В `App.jsx` есть `useEffect` скроллящий breadcrumbs вправо
   - В `EconomyPlugin.jsx` такого нет

### План фикса:

- [x] Проанализировать расхождения
- [ ] Исправить EconomyAppHeader — клик по breadcrumbs
- [ ] Исправить EconomyAppHeader — кнопка mode → дропдаун
- [ ] Добавить автоскролл breadcrumbs в EconomyPlugin
- [ ] Проверить что не сломалось
