# Craft Calculator — Feature ideas & improvements

This document collects prioritized ideas and actionable improvements for the Craft Calculator app (UX, features, data, infra, and quick wins). Each item includes a short description, why it helps, and an estimated effort (Small / Medium / Large).

---

## Quick wins (Small — days or less)

- Breadcrumb small UX polish
  - Show a subtle location icon for nodes with `isLocation` and add a hover title like "Location: Forest".
  - Make the mode label (`.breadcrumb-mode`) clickable to open the mode dropdown (`setModeOpen(true)`).
  - Restore saved location amount (already implemented) and also show it as a faint sub-label in breadcrumb (e.g., `Forest · ×10`).
  - Effort: Small — CSS + tiny JSX tweaks.

- Improve mobile scroll behavior for breadcrumbs
  - Add `scroll-snap` or ensure the last crumb is fully visible on narrow viewports. Keep auto-scroll but prefer non-jumpy transitions.
  - Effort: Small.

- Breadcrumb collapse / ellipsis for very long chains
  - Collapse middle nodes for very long chains and allow expanding on click. Keeps header tidy.
  - Effort: Small → Medium (CSS + logic).

- Mode-aware item button label
  - When `locationsMode`, the Item button shows `selectedLocation` and tapping it opens location selector (already almost done). Add a small chevron to indicate it's a selector.
  - Effort: Small.

---

## UX & Interaction (Medium)

- Persistent per-location UI state
  - Persist not only `selectedLocation` but also user's last selected variant, budget input, and filters for each location. Restoring these when the user returns improves continuity.
  - Implementation: extend `craftChain` location node or store `locationsState` keyed by location name.
  - Effort: Medium.

- Two-panel compare mode
  - Let users open a split view with two items/amounts to compare required resources or best farming location for the same resource.
  - Use for "which is cheaper to get X: craft chain A vs B".
  - Effort: Medium → Large UI and state work.

- Smart suggestions for next craft
  - When viewing a resource, show a ranked list of crafts that use it with quick actions: "Add to chain", "Pin", "Simulate 10×".
  - Effort: Medium.

- Keyboard navigation & shortcuts
  - Add keyboard support for quick actions: open sidebar (Alt/Cmd+B), toggle modes, focus search, navigate breadcrumbs (←/→), and confirm (Enter).
  - Effort: Medium.

---

## Features (Medium → Large)

- Recipe editor & community updates
  - Allow users to edit or add local recipes and submit them (or export a patch). Keep a UI for local recipe overrides and a simple diff preview.
  - Consider a simple moderation/PR flow if you want community updates.
  - Effort: Large.

- Scenario builder / batch planner
  - Let users define a shopping/production plan: multiple target items with amounts and a combined resource list. Useful for event planning.
  - Effort: Large.

- Optimization solver
  - Given target outputs and available crafting nodes, compute minimal base resource consumption (knapsack/ILP). Could be an advanced feature accessible optionally.
  - Effort: Large (algorithm + UI).

- Offline-first & sync
  - Make the app fully offline-capable (service worker, local DB like IndexedDB) and add optional sync to a server for multi-device persistence.
  - Effort: Large.

---

## Data, integrations & backend (Medium)

- Recipe/data API & versioning
  - Move recipe and location data into a versioned JSON API (or GraphQL). Keep a small update-check mechanism (already present) but add a changelog and data schema versioning.
  - Effort: Medium.

- In-app feedback & telemetry (opt-in)
  - Add optional telemetry (feature usage, non-sensitive errors) to prioritize future improvements.
  - Integrate the existing bug report flow to attach app state snapshots (craftChain, selectedLocation) when the user consents.
  - Effort: Medium.

- Export / Import
  - Allow export of pinned lists, craftChain, and settings into JSON, and re-import them. Useful for sharing builds.
  - Effort: Small → Medium.

---

## Developer experience & code quality (Small → Medium)

- Add TypeScript types or incremental JSDoc annotations
  - Convert critical modules to TypeScript or document shapes (craftChain node, pinned entry) with JSDoc to reduce runtime bugs.
  - Effort: Medium.

- Unit tests for core logic
  - Add tests for resource calculation functions (e.g., `calculateAllResources`) and helpers like `computePinnedEstimate`.
  - Effort: Small → Medium depending on coverage target.

- Linting / formatting / CI
  - Add or tighten ESLint/Prettier rules and a lightweight CI job to run tests and linting on PRs.
  - Effort: Small.

- Small refactors
  - Extract breadcrumb logic into its own small component for easier maintenance and styling.
  - Move `locationsMode` UI into a focused subcomponent to reduce `App.jsx` size.
  - Effort: Small → Medium.

---

## Accessibility & Internationalization (Small → Medium)

- ARIA improvements and focus handling
  - Ensure breadcrumbs, mode dropdown, and modals are fully keyboard-navigable and announce state changes to screen readers.
  - Effort: Small.

- Localization (i18n)
  - Prepare strings for localization and add support for at least one additional language (e.g., English ↔ Russian toggles already expected by project). Use a small i18n lib or an in-house JSON map.
  - Effort: Medium.

---

## Metrics & prioritization (suggested roadmap)

1. Quick wins (1–3 days): breadcrumb polish, clickable mode label, small CSS fixes, auto-scroll tuning.
2. Dev & QA (1–2 weeks): tests for core calc functions, small refactors, linting + CI.
3. UX improvements (2–4 weeks): compare mode, persistent per-location UI state, keyboard shortcuts.
4. Big features (1–3+ months): recipe editor, scenario planner, optimization solver, offline sync.

---

## Example small PRs I can implement now

- Add `.breadcrumb-mode` CSS in `src/new-app/app.css` with a consistent visual weight to match breadcrumbs.
- Add a tiny location icon SVG next to nodes with `isLocation` in `App.jsx` (already added the node flag in the chain).
- Make the mode label open `mode` dropdown on click (`onClick={() => setModeOpen(true)}`).

If you pick one or two items from the Quick wins or Example PRs, I can implement them right away and run a quick smoke check.

---

## Resource sourcing suggestions (Small → Medium)

Problem / user story
- You have a target quantity of a resource (for example, the amount of Wood required to finish a set of Red Trunks). You want to know where to get that exact amount most efficiently with your current perks and which exploring budget (ciders / AP / stamina) will produce it. Currently you have to manually switch into Locations, test budgets, and compare — it's slow and error-prone.

Proposed feature
- Add a "Find sources" flow that, given a required quantity of a resource, computes and ranks locations (and location variants) by how many ciders / AP / stamina are needed to obtain that quantity under the user's active perks and exploring settings.

What the UI looks like
- Small button near resource lines (Resources view, location drops, or pinned card): "Find sources".
- Clicking opens a modal or side-panel that shows:
  - Resource name and requested amount.
  - A ranked table with rows: Location, Variant (if applicable), Expected drops per unit (cider/AP/stamina), Required budget (ciders / AP / stamina), Confidence / data notes, Quick action (Open Location / Pin / Set amount).
  - Controls to switch the exploring metric (Cider / AP / Stamina) and tweak amount (or pre-fill from selected resource shortage).
  - Option to apply the result: click "Use in place" to set the exploring budget in Locations view or auto-insert a location node into the craftChain.

Algorithm & data needs
- Reuse existing `computePinnedEstimate` or the same estimation routine used for pinned resources to compute per-unit yields for each location/variant with the user's active perks.
- For each location (and each variant if variants exist):
  1. Compute effectiveDropsPerUnit = computePinnedEstimate({ name: resource, location }, 1, activePerks, exploringMode) → uses the appropriate metric (effectiveDropsPerCider, itemsPerAP, explores, etc.).
  2. If effectiveDropsPerUnit is usable (> 0), compute requiredBudget = ceil(requiredQuantity / effectiveDropsPerUnit).
  3. Keep the best variant per location (highest effectiveDropsPerUnit) and rank locations by requiredBudget (ascending) and/or by cost-per-drop.
- Fall back to best-known raw drops rate for a location when computePinnedEstimate lacks data for that resource/variant.

Edge cases & UX notes
- If a location has no data for that resource, mark it as "No data" and place lower in ranking.
- If multiple metrics apply (e.g., both cider and AP routes), show both columns or provide a toggle for the metric.
- Show confidence indicators when estimation used fallbacks or sparse variant data.

Implementation plan (small PR → Medium PR)
- Phase 1 (Small):
  - Add a small utility wrapper `findBestSources(resourceName, requiredAmount, { activePerks, exploringMode })` that iterates locations, calls `computePinnedEstimate` for amount=1, and returns ranked results.
  - Add a simple modal (re-using existing modal styling) that calls this utility and renders the table. Provide a "Use" button that sets selected location and amount (or sets craftChain with a location node as currently implemented).
  - Minimal tests for the utility using a mock subset of location data.
- Phase 2 (Medium):
  - Add variant-aware breakdowns, option to toggle metric (Cider / AP / Stamina), more descriptive confidence messages, and caching.
  - Add small analytics to track usage (opt-in) and tighten UI polish.

Acceptance criteria
- Given a resource and amount, the modal lists locations ranked by required exploring budget and the numbers match the per-location estimates visible elsewhere in the app (consistency with pinned estimates).
- The "Use" action navigates to the chosen location and restores the budget or inserts a location node into the craftChain.

Estimated effort
- Phase 1: Small (1–3 days) to provide a usable MVP.
- Phase 2: Medium (1–2 weeks) for polish, variants, and caching.

Why this helps
- Removes manual trial-and-error when sourcing resources for quests or large batches. Lets players quickly compare real costs across locations using their current perks and yields.

---

End of ideas. Pick items to prioritize and I will implement the chosen changes in small, verifiable steps.

---

# Русский перевод / Перевод на русский

Этот документ содержит приоритетизированные идеи и практические улучшения для приложения Craft Calculator (UX, функции, данные, инфраструктура и быстрые правки). Каждый пункт включает краткое описание, зачем это нужно, и оценку трудозатрат (Малое / Среднее / Большое).

---

## Быстрые правки (Малое — дни или меньше)

- Небольшой UX-полировщик для хлебных крошек
  - Показать слабую иконку для узлов с `isLocation` и добавить подсказку при наведении, например "Локация: Forest".
  - Сделать метку режима (`.breadcrumb-mode`) кликабельной, чтобы открывать выпадающее меню режима (`setModeOpen(true)`).
  - Восстановить сохранённое количество для локации (уже реализовано) и также показать его как бледную подпись в хлебной крошке (например, `Forest · ×10`).
  - Оценка: Малое — CSS + небольшой JSX.

- Улучшить поведение прокрутки хлебных крошек на мобильных
  - Добавить `scroll-snap` или обеспечить, чтобы последний элемент был полностью виден на узких экранах. Сохранить автоскролл, но сделать переходы менее дергаными.
  - Оценка: Малое.

- Свертывание / многоточие для длинных цепочек
  - Сворачивать средние узлы для очень длинных цепочек и позволять разворачивать по клику. Поддержит аккуратный хэдер.
  - Оценка: Малое → Среднее (CSS + логика).

- Метка кнопки Item, зависящая от режима
  - Когда `locationsMode`, кнопка Item показывает `selectedLocation`, и нажатие открывает селектор локации (почти готово). Добавить маленькую стрелку-чёверон, чтобы показать, что это селектор.
  - Оценка: Малое.

---

## UX и взаимодействие (Среднее)

- Сохранение состояния по каждой локации
  - Сохранять не только `selectedLocation`, но и последний выбранный вариант, значение бюджета и фильтры для каждой локации. Восстановление этих значений при возврате улучшит удобство.
  - Реализация: расширить узел `craftChain` для локаций или хранить `locationsState`, индексированный по имени локации.
  - Оценка: Среднее.

- Режим сравнения в два окна
  - Разрешить открывать сплит-вид с двумя предметами/количествами, чтобы сравнивать требуемые ресурсы или лучшие локации для одного ресурса.
  - Применимо для вопроса "что дешевле получить X: цепочка A против B".
  - Оценка: Среднее → Большое (UI и стейт).

- Умные подсказки следующего шага крафта
  - При просмотре ресурса показывать ранжированный список крафтов, использующих его, с быстрыми действиями: "Добавить в цепочку", "Закрепить", "Симуляция ×10".
  - Оценка: Среднее.

- Клавиатурная навигация и горячие клавиши
  - Добавить поддержку клавиатуры: открыть сайдбар (Alt/Cmd+B), переключить режимы, фокус в поиске, навигация по крошкам (←/→), подтверждение (Enter).
  - Оценка: Среднее.

---

## Функции (Среднее → Большое)

- Редактор рецептов и сообщественный обмен
  - Разрешить пользователям править или добавлять локальные рецепты и отправлять их (или экспортировать патч). Добавить UI для локальных переопределений и просмотр диффа.
  - Вариант: простая модерация/PR-процесс для обновлений от сообщества.
  - Оценка: Большое.

- Построитель сценариев / планировщик партий
  - Позволить пользователям определять план закупок/производства: несколько целевых предметов с количеством и объединённый список ресурсов. Полезно для планирования событий.
  - Оценка: Большое.

- Оптимизатор
  - При заданных целевых выходах и доступных узлах крафта вычислять минимальное потребление базовых ресурсов (задачи типа knapsack/ILP). Можно сделать опциональной продвинутой функцией.
  - Оценка: Большое (алгоритм + UI).

- Offline-first и синхронизация
  - Сделать приложение полностью рабочим офлайн (service worker, IndexedDB) и добавить опциональную синхронизацию на сервер для нескольких устройств.
  - Оценка: Большое.

---

## Данные, интеграции и бэкенд (Среднее)

- API данных и версионирование
  - Перенести данные рецептов и локаций в версионированный JSON API (или GraphQL). Оставить обновления и добавить changelog и версионирование схемы данных.
  - Оценка: Среднее.

- Обратная связь и телеметрия (по выбору)
  - Добавить опциональную телеметрию (использование фич, ненадёжные ошибки) для приоритизации улучшений.
  - Интегрировать flow отчётов об ошибках, позволяющий прикреплять снимок состояния приложения (craftChain, selectedLocation) при согласии пользователя.
  - Оценка: Среднее.

- Экспорт / Импорт
  - Разрешить экспортировать закреплённые списки, `craftChain` и настройки в JSON и импортировать их обратно. Полезно для обмена сборками.
  - Оценка: Малое → Среднее.

---

## Опыт разработчика и качество кода (Малое → Среднее)

- Добавить типизацию TypeScript или JSDoc
  - Перевести критические модули на TypeScript или документировать формы данных (узел craftChain, запись pinned) через JSDoc, чтобы снизить количество рантайм-ошибок.
  - Оценка: Среднее.

- unit-тесты для основной логики
  - Добавить тесты для функций расчёта ресурсов (например, `calculateAllResources`) и хелперов типа `computePinnedEstimate`.
  - Оценка: Малое → Среднее в зависимости от покрытия.

- Линтинг / форматирование / CI
  - Добавить или ужесточить правила ESLint/Prettier и лёгкий CI, запускающий тесты и линтинг на PR.
  - Оценка: Малое.

- Небольшие рефакторинги
  - Вынести логику хлебных крошек в отдельный компонент и вынести UI для `locationsMode` в подкомпонент, чтобы уменьшить размер `App.jsx`.
  - Оценка: Малое → Среднее.

---

## Доступность и интернационализация (Малое → Среднее)

- ARIA и фокус
  - Проверить, что хлебные крошки, меню режимов и модальные окна полностью доступны с клавиатуры и корректно сообщают изменения состояния для экранных читалок.
  - Оценка: Малое.

- Локализация (i18n)
  - Подготовить строки к локализации и добавить поддержку как минимум одного дополнительного языка (английский ↔ русский). Использовать небольшую i18n-библиотеку или JSON-карты.
  - Оценка: Среднее.

---

## Метрики и приоритизация (предложенная дорожная карта)

1. Quick wins (1–3 дня): полировка хлебных крошек, кликабельная метка режима, мелкие CSS-правки, настройка автоскролла.
2. Dev & QA (1–2 недели): тесты для ключевых функций расчёта, небольшие рефакторы, линтинг + CI.
3. UX-улучшения (2–4 недели): режим сравнения, сохранение состояний локаций, горячие клавиши.
4. Большие фичи (1–3+ месяца): редактор рецептов, планировщик сценариев, оптимизатор, оффлайн-режим и синхронизация.

---

## Примеры маленьких PR, которые я могу сделать сейчас

- Добавить CSS для `.breadcrumb-mode` в `src/new-app/app.css`, чтобы метка режима визуально соответствовала хлебным крошкам.
- Добавить маленький SVG-иконку локации рядом с узлами `isLocation` в `App.jsx` (флаг узла уже добавлен в цепочку).
- Сделать метку режима кликабельной и открывать выпадающее меню режимов (`onClick={() => setModeOpen(true)}`).

Если выберете один-два пункта из Quick wins или примеров PR, я реализую их и проведу быстрый smoke-check.

---

## Рекомендация: «Поиск источников» (конкретная фича, описанная выше)

Эта функция особенно полезна для вашей задачи: начиная от критической нехватки (например, дерева для Red Trunks), пользователь сможет одним кликом получить ранжированный список локаций и требуемого количества сидров/AP/выносливости с учётом текущих перков. Это убирает многократное переключение режимов и ручной подбор бюджета.

Готова приступить к Phase 1 и сделать минимальную рабочую версию: утилиту `findBestSources` + простой модал с кнопкой "Use".

---

Конец документа. Выберите пункты для приоритетной реализации, и я начну выполнять изменения.
