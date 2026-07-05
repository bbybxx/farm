> ⚠️ **КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (читай перед началом)**
> - **НЕ ТРОГАЙ** `App.jsx`, `AppHeader.jsx`, `SettingsTab.jsx` (кроме случаев, когда шаг явно разрешает).
> - **НЕ ИСПОЛЬЗУЙ** `craftChain` — только `economyChain`.
> - **ВСЕ НОВЫЕ ФАЙЛЫ** создавай в `src/economy/`.
> - **ПОСЛЕ ШАГА** запусти `npm run build` и проверь, что обычный режим работает.


# Шаг 3: Toggle экономического режима в настройках

## Задача

Добавить переключатель "Enable Economy Mode" в `src/components/Sidebar/SettingsTab.jsx`, используя импорт `useEconomy` напрямую (без пропсов из App.jsx).

## Что нужно сделать

### 1. Импортировать useEconomy в SettingsTab.jsx

В начале файла `src/components/Sidebar/SettingsTab.jsx` добавить импорт:

```js
import { useEconomy } from '../../economy/hooks/useEconomy'
```

### 2. Использовать хук внутри компонента

В теле компонента `SettingsTab` (после других хуков) добавить:

```js
const { economyEnabled, setEconomyEnabled } = useEconomy()
```

**Важно:** хук `useEconomy` самодостаточен — он не требует пропсов. Все состояния загружаются из localStorage.

### 3. Добавить секцию "Economy Mode" в JSX

Добавить секцию между "Features" и "Exploring" (или в любое подходящее место внутри формы настроек):

```jsx
<h3 className="section-title">Economy Mode</h3>

<div className="setting-item">
  <label className="setting-label">
    <input
      type="checkbox"
      checked={economyEnabled}
      onChange={(e) => setEconomyEnabled(e.target.checked)}
      className="setting-checkbox"
    />
    Enable Economy Mode
  </label>
  <p className="setting-description">
    Calculate profit/loss for crafting chains. Chain starts fresh when enabling.
  </p>
</div>
```

### 4. Дизайн
- Использовать существующий стиль чекбоксов как в `pinnedEnabled`
- Текст описания: "Calculate profit/loss for crafting chains. Chain starts fresh when enabling."
- Секция под "Features", над "Exploring"

## Проверки

1. `npm run build` — без ошибок
2. В браузере: открыть Settings → должна быть секция "Economy Mode" с чекбоксом
3. Чекбокс должен переключаться (пока ничего не делает, так как EconomyPlugin ещё не создан)
4. `git add -A && git commit -m "feat: add economy mode toggle to settings" && git push`

## Важно
- **НЕ добавлять пропсы** `economyEnabled`/`setEconomyEnabled` в сигнатуру компонента `SettingsTab`
- **НЕ трогать** `App.jsx` — передача пропсов не требуется
- SettingsTab показывается в sidebar — проверьте что чекбокс выглядит нативно
- Использовать `// Economy Mode` комментарий для маркировки секции
- Хук `useEconomy` уже создан на шаге 1 — он загружает состояние из localStorage
