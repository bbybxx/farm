import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { getCombinedRecipes } from '../../../utils/recipeUtils'
import { findRecipesThatUse } from '../../../utils/recipeUtils'
import { getItemLocations } from '../../../utils/exploringUtils'
import { calculateAllResources } from '../../../utils/calculator'
import { useEconomyContext } from '../EconomyContext'
import { useActivePerks } from '../hooks/useActivePerks'
import ItemDisplay from '../../../components/ItemDisplay'
import itemsAPI from '../../../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap } from '../../../utils/itemImageUtils'
import { formatNumberRounded } from '../../../utils/formatters'

const STATIC_ITEMS_MAP = normalizeItemsMap(itemsAPI)

/**
 * EconomyCraftPanel — изолированная крафт-панель для экономического режима.
 *
 * Полная копия CraftSection + controls из App.jsx.
 * Рендерится на странице (не оверлей), как оригинальный режим крафта.
 * Перки применяются через useActivePerks (чтение из localStorage).
 * Ресурсы кликабельны — ведут к навигации внутри плагина.
 *
 * Пропсы:
 *   selectedItem — string | null
 *   amount       — number
 *   onOpenSelect — () => void (открыть EconomyItemSelect)
 */
export default function EconomyCraftPanel({ selectedItem, amount: propAmount, onOpenSelect }) {
  const { addToEconomyChain } = useEconomyContext()
  const { activePerks } = useActivePerks()

  const [amount, setAmount] = useState(propAmount || 1)
  const [resourcesCollapsed, setResourcesCollapsed] = useState(false)

  // Синхронизируем amount при изменении пропса
  useEffect(() => {
    if (propAmount) setAmount(propAmount)
  }, [propAmount])

  // Рецепты
  const combinedRecipes = useMemo(() => getCombinedRecipes(), [])

  // Результат расчёта ресурсов для выбранного предмета с учётом перков
  const result = useMemo(() => {
    if (!selectedItem || !combinedRecipes[selectedItem]) return null
    return calculateAllResources(selectedItem, amount, activePerks, combinedRecipes)
  }, [selectedItem, amount, activePerks, combinedRecipes])

  // Прямые ингредиенты (из оригинального рецепта)
  const directIngredients = useMemo(() => {
    if (!selectedItem || !combinedRecipes[selectedItem]) return {}
    const recipe = combinedRecipes[selectedItem]
    return recipe.из || recipe.ingredients || {}
  }, [selectedItem, combinedRecipes])

  // Проверка, есть ли рецепт у предмета
  const isCraftable = useCallback((name) => {
    const recipe = combinedRecipes[name]
    return recipe && (recipe.из || recipe.ingredients)
  }, [combinedRecipes])

  // Проверка, есть ли контент у предмета (рецепт, используется в крафтах, дроп в локациях)
  const hasItemContent = useCallback((itemName) => {
    if (isCraftable(itemName)) return true
    const usedIn = findRecipesThatUse(itemName) || []
    if (usedIn.length > 0) return true
    const locations = getItemLocations(itemName) || []
    if (locations.length > 0) return true
    return false
  }, [isCraftable])

  // Обработчик клика по ресурсу — навигация внутри плагина
  const handleResourceClick = useCallback((resourceName, quantity) => {
    if (!hasItemContent(resourceName)) return
    // Добавляем текущий предмет в цепочку и переключаемся на ресурс
    addToEconomyChain({ name: selectedItem, amount: Number(amount) || 1 })
    onOpenSelect(resourceName)
  }, [hasItemContent, selectedItem, amount, addToEconomyChain, onOpenSelect])

  // Обработчик изменения amount (как в App.jsx — integer)
  const handleAmountChange = useCallback((e) => {
    const inputValue = e.target.value
    const cleanValue = inputValue.replace(/\D/g, '')
    if (cleanValue === '') {
      setAmount('')
      return
    }
    const numericValue = parseInt(cleanValue)
    if (numericValue > 9999999999999999) return
    setAmount(cleanValue)
  }, [])

  return (
    <>
      {/* Controls bar — копия из App.jsx */}
      <section className="glass controls">
        <label className="field">
          <span className="label">Item</span>
          <button className="input" onClick={onOpenSelect} type="button">
            <ItemDisplay itemName={selectedItem} itemsData={STATIC_ITEMS_MAP} />
          </button>
        </label>
        <label className="field">
          <span className="label">Amount</span>
          <input
            className="input amount-input"
            type="text"
            min={1}
            max={9999999999999999}
            value={String(amount)}
            placeholder="Enter amount (e.g., 1 000)"
            onChange={handleAmountChange}
          />
        </label>
      </section>

      {/* Resources Section — копия из CraftSection.jsx */}
      {Object.keys(directIngredients).length > 0 && (
        <section className="glass card">
          <h2
            className="collapsible-header"
            onClick={() => setResourcesCollapsed(!resourcesCollapsed)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>Resources</span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: resourcesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </h2>
          {!resourcesCollapsed && (
            <ul className="list">
              {Object.entries(directIngredients).map(([name, qty]) => {
                const totalQty = Math.ceil(qty * (typeof amount === 'number' ? amount : parseInt(amount) || 1))
                const clickable = hasItemContent(name)
                return (
                  <li key={name} className="resource-item">
                    <div
                      className={`resource-content ${clickable ? 'clickable' : ''}`}
                      onClick={() => {
                        if (!clickable) return
                        handleResourceClick(name, totalQty)
                      }}
                      style={clickable ? { cursor: 'pointer' } : { cursor: 'default' }}
                      title={clickable ? `View ${name}` : undefined}
                    >
                      <span className="k">
                        <ItemDisplay itemName={name} itemsData={STATIC_ITEMS_MAP}>
                          {clickable && (
                            <span className="craft-indicator">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          )}
                        </ItemDisplay>
                      </span>
                      <span className="v">{formatNumberRounded(totalQty)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* All Base Resources */}
      {result && Object.keys(result.base).length > 0 && (
        <section className="glass card">
          <h2
            className="collapsible-header"
            onClick={() => setResourcesCollapsed(!resourcesCollapsed)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>All Base Resources</span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: resourcesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </h2>
          {!resourcesCollapsed && (
            <ul className="list">
              {Object.entries(result.base).map(([name, qty]) => {
                const clickable = hasItemContent(name)
                return (
                  <li key={name} className="resource-item">
                    <div
                      className={`resource-content ${clickable ? 'clickable' : ''}`}
                      onClick={() => {
                        if (!clickable) return
                        handleResourceClick(name, qty)
                      }}
                      style={clickable ? { cursor: 'pointer' } : { cursor: 'default' }}
                      title={clickable ? `View ${name}` : undefined}
                    >
                      <span className="k">
                        <ItemDisplay itemName={name} itemsData={STATIC_ITEMS_MAP} />
                      </span>
                      <span className="v">{formatNumberRounded(qty)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
