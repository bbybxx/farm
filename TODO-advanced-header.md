# План рефакторинга Advanced режима

## Шаги:

1. **useEconomy.js** — добавить `clearAdvancedData()` (чистит advancedState + manualAdditions)
2. **EconomyPlugin** — поднять расчёт C/R/P наверх через useMemo, передавать пропсами
3. **EconomyAppHeader** — добавить отображение C/R/P в хедер (когда view === 'advanced'), кнопку Clear рядом с mode
4. **EconomyAdvancedView** — убрать свой хедер C/R/P, принимать готовые значения пропсами
