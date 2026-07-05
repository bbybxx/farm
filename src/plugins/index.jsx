import EconomyPlugin from './economy/EconomyPlugin'

/**
 * Список всех зарегистрированных плагинов.
 * Каждый плагин — React-компонент, который сам решает, показываться или нет
 * (через свой useEnabled флаг, например economyEnabled).
 *
 * Чтобы добавить новый плагин:
 * 1. Создай папку src/plugins/<plugin-name>/
 * 2. Создай компонент плагина (например, MyPlugin.jsx)
 * 3. Импортируй его здесь и добавь в массив PLUGINS
 */
const PLUGINS = [EconomyPlugin]

/**
 * PluginsRenderer — точка входа для всех плагинов.
 * Рендерит все зарегистрированные плагины как React-компоненты.
 * Плагины сами управляют своей видимостью.
 *
 * Использование в App.jsx:
 *   import PluginsRenderer from './plugins'
 *   ...
 *   <PluginsRenderer />
 */
export default function PluginsRenderer() {
  return PLUGINS.map((Plugin, i) => <Plugin key={i} />)
}
