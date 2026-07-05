# План: интеграция экономического режима как 4-го режима

- [x] Шаг 1: useUIState — добавить economyMode
- [x] Шаг 2: AppHeader — добавить Economy в дропдаун режимов
- [x] Шаг 3: App.jsx — убрать жёсткое скрытие UI, передать economyMode
- [x] Шаг 4: EconomyPlugin — убрать EconomyStartScreen, перейти на economyMode
- [x] Шаг 5: Перехват кликов — navigateToItem проверяет economyMode
- [x] Шаг 6: Проверить, что всё работает вместе (сборка успешна)

## Итог

Экономический режим теперь работает как 4-й режим (наряду с Crafts, Locations, Quests):

1. **useUIState** — добавлен `economyMode` с localStorage
2. **AppHeader** — в дропдауне режимов появилась кнопка "💰 Economy" (когда `economyEnabled && !economyMode`). Когда `economyMode === true` — показываются Crafts, Locations, Quests для выхода
3. **App.jsx** — убрано жёсткое скрытие UI. При `economyMode === true` обычный UI (хедер, сайдбар, ItemSelectModal, CraftSection, LocationDropsSection) работает как обычно
4. **EconomyPlugin** — убран EconomyStartScreen. Плагин только добавляет золотую кнопку и оверлеи ПОВЕРХ обычного UI
5. **navigateToItem** — при `economyMode === true` предмет добавляется в `economyChain` (через `addToEconomyChain`), а не в `craftChain`
