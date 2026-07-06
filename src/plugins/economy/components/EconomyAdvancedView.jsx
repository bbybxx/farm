/**
 * EconomyAdvancedView.jsx
 * Advanced-режим: список остатков с C/R/P хедером, таблицей трат,
 * кликабельными остатками с инлайн Used In, и кнопкой Add.
 */
import React, { useMemo, useCallback, useState } from 'react'
import ItemDisplay from '../../../components/ItemDisplay'
import { formatNumberRounded } from '../../../utils/formatters'
import { findRecipesThatUse } from '../../../utils/recipeUtils'
import { getItemsMap } from '../utils/economyData'
import {
  calculateCost,
  calculateRevenue,
  calculateProfit,
  getItemPrice,
  convertPrice,
  computeActualLeftovers,
  computeSpentByCraft,
  groupSpentByChain,
  applyManualAdditions,
} from '../utils/economyCalculator'


const STATIC_ITEMS_MAP = getItemsMap()

// Все предметы для автокомплита в Add
const ALL_ITEMS = Object.keys(STATIC_ITEMS_MAP).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))

/**
 * @param {Object} props
 * @param {Array<{name: string, amount: number, isLocation?: boolean}>} props.chain — economyChain
 * @param {Object<string, {gold?: number, ap?: number, oj?: number}>} props.prices
 * @param {'gold'|'ap'|'oj'} props.currency
 * @param {{apToGold?: number|null, ojToGold?: number|null, ojToAp?: number|null}} props.exchangeRates
 * @param {Array} props.advancedState — список крафтов пользователя
 * @param {(state: Array) => void} props.setAdvancedState
 * @param {Array<{itemName: string, quantity: number}>} props.manualAdditions
 * @param {(itemName: string, quantity: number) => void} props.addManualAddition
 * @param {(index: number) => void} props.removeManualAddition
 * @param {Object<string, {ingredients?: Object, из?: Object}>} props.recipes — все рецепты
 * @param {number} props.resourceSaverPercent — процент экономии ресурсов (0..1)
 * @param {(locationName: string, budget: number) => Array<{name: string, amount: number}>} [props.getLocationDrops]
 *        колбэк для получения всех дропов локации с estimated amounts
 * @param {(itemName: string, quantity: number) => void} [props.onCraftFromLeftover]
 *        колбэк для добавления крафта из leftovers в цепочку (chain)
 */
export default function EconomyAdvancedView({
  chain = [],
  prices = {},
  currency = 'gold',
  exchangeRates = {},
  advancedState = [],
  setAdvancedState,
  manualAdditions = [],
  addManualAddition,
  removeManualAddition,
  recipes = {},
  resourceSaverPercent = 0,
  getLocationDrops,
  onCraftFromLeftover,
}) {
  // Состояние для раскрытых Used In (по имени предмета)
  const [expandedItems, setExpandedItems] = useState(new Set())
  // Состояние для раскрытых цепочек в Spent
  const [expandedChains, setExpandedChains] = useState(new Set())
  // Состояние для модалки Add
  const [showAddModal, setShowAddModal] = useState(false)
  const [addItemName, setAddItemName] = useState('')
  const [addItemFilter, setAddItemFilter] = useState('')
  const [addQuantity, setAddQuantity] = useState(1)
  // Состояние для инлайн-крафта в Used In
  const [craftInputs, setCraftInputs] = useState({}) // { itemName: { recipeName: quantity } }

  // isTradableFn — пока все предметы считаем торгуемыми
  const isTradableFn = useCallback(() => true, [])

  // --- Мерджим advancedState в цепочку для расчётов ---
  // Крафты из advancedState добавляются как дополнительные ноды в chain,
  // чтобы leftovers, spent, C/R/P учитывали их
  const extendedChain = useMemo(() => {
    if (!advancedState || advancedState.length === 0) return chain
    const extraNodes = []
    for (const entry of advancedState) {
      for (const craft of entry.crafts) {
        extraNodes.push({ name: entry.itemName, amount: craft.quantity, fixed: true })
      }
    }
    if (extraNodes.length === 0) return chain
    return [...chain, ...extraNodes]
  }, [chain, advancedState])

  // --- Расчёт реальных остатков (на расширенной цепочке) ---
  const { leftovers, deficit } = useMemo(() => {
    return computeActualLeftovers(extendedChain, recipes, prices, isTradableFn, resourceSaverPercent, getLocationDrops)
  }, [extendedChain, recipes, prices, isTradableFn, resourceSaverPercent, getLocationDrops])

  // --- Таблица трат по крафтам (на расширенной цепочке) ---
  const spentByCraft = useMemo(() => {
    return computeSpentByCraft(extendedChain, recipes, resourceSaverPercent)
  }, [extendedChain, recipes, resourceSaverPercent])

  // --- Группировка по цепочкам ---
  const spentChains = useMemo(() => {
    return groupSpentByChain(spentByCraft)
  }, [spentByCraft])

  // --- Применяем manualAdditions к leftovers и deficit ---
  const { leftovers: mergedLeftovers, deficit: mergedDeficit } = useMemo(() => {
    return applyManualAdditions(leftovers, deficit, manualAdditions, prices)
  }, [leftovers, deficit, manualAdditions, prices])

  // --- C/R/P расчёт (на расширенной цепочке) ---
  // Всегда считаем в gold, потом конвертируем в выбранную валюту
  const { cost, revenue, profit } = useMemo(() => {
    const c = calculateCost(extendedChain, prices)
    const r = calculateRevenue(mergedLeftovers, prices)
    const p = calculateProfit(c, r)
    return { cost: c, revenue: r, profit: p }
  }, [extendedChain, prices, mergedLeftovers])

  // Конвертируем cost/revenue/profit из gold в выбранную валюту
  const { costDisplay, revenueDisplay, profitDisplay } = useMemo(() => {
    if (currency === 'gold') {
      return { costDisplay: cost, revenueDisplay: revenue, profitDisplay: profit }
    }
    const c = convertPrice(cost, 'gold', currency, exchangeRates)
    const r = convertPrice(revenue, 'gold', currency, exchangeRates)
    const p = convertPrice(profit, 'gold', currency, exchangeRates)
    return {
      costDisplay: c ?? cost,
      revenueDisplay: r ?? revenue,
      profitDisplay: p ?? profit,
    }
  }, [cost, revenue, profit, currency, exchangeRates])

  // --- Форматирование цены в выбранной валюте ---
  const formatPrice = useCallback((value) => {
    if (value == null || isNaN(value)) return '—'
    const converted = getItemPrice(
      '__internal__',
      currency,
      { '__internal__': { [currency]: { value, divisor: 1 } } },
      exchangeRates
    )
    const displayValue = converted ?? value
    const suffix = currency === 'gold' ? 'G' : currency === 'ap' ? 'AP' : 'OJ'
    return `${formatNumberRounded(Math.round(displayValue))} ${suffix}`
  }, [currency, exchangeRates])

  const currencySuffix = currency === 'gold' ? 'G' : currency === 'ap' ? 'AP' : 'OJ'


  // --- Toggle раскрытия Used In ---
  const toggleExpand = useCallback((itemName) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemName)) {
        next.delete(itemName)
      } else {
        next.add(itemName)
      }
      return next
    })
  }, [])

  // --- Toggle раскрытия цепочки в Spent ---
  const toggleChain = useCallback((chainIdx) => {
    setExpandedChains(prev => {
      const next = new Set(prev)
      if (next.has(chainIdx)) {
        next.delete(chainIdx)
      } else {
        next.add(chainIdx)
      }
      return next
    })
  }, [])

  // --- Получить used-in рецепты для предмета ---
  const getUsedIn = useCallback((itemName) => {
    try {
      return findRecipesThatUse(itemName) || []
    } catch (e) {
      return []
    }
  }, [])

  // --- Применить крафт из Used In ---
  const handleCraftFromUsedIn = useCallback((sourceItemName, recipeName, craftQty) => {
    if (!craftQty || craftQty <= 0) return

    const recipe = recipes[recipeName]
    if (!recipe) return

    // Определяем имя создаваемого предмета: у рецепта может быть поле amount или output,
    // но сам предмет — это recipeName (имя рецепта совпадает с именем предмета в FarmRPG)
    const craftedItemName = recipeName

    // Сохраняем крафт в advancedState
    if (setAdvancedState) {
      setAdvancedState(prev => {
        const existingIndex = prev.findIndex(entry => entry.itemName === craftedItemName)
        if (existingIndex >= 0) {
          const entry = prev[existingIndex]
          const craftIndex = entry.crafts.findIndex(c => c.recipeName === craftedItemName)
          let newCrafts
          if (craftIndex >= 0) {
            newCrafts = entry.crafts.map((c, i) =>
              i === craftIndex ? { ...c, quantity: (c.quantity || 0) + craftQty } : c
            )
          } else {
            newCrafts = [...entry.crafts, { recipeName: craftedItemName, quantity: craftQty }]
          }
          return prev.map((entry, i) =>
            i === existingIndex ? { ...entry, crafts: newCrafts } : entry
          )
        } else {
          return [...prev, { itemName: craftedItemName, crafts: [{ recipeName: craftedItemName, quantity: craftQty }] }]
        }
      })
    }

    // Добавляем крафт в цепочку (chain) через колбэк, чтобы leftovers обновились
    if (onCraftFromLeftover) {
      onCraftFromLeftover(craftedItemName, craftQty)
    }

    // Сбрасываем инпут
    setCraftInputs(prev => {
      const next = { ...prev }
      if (next[sourceItemName]) {
        const updated = { ...next[sourceItemName] }
        delete updated[recipeName]
        next[sourceItemName] = updated
      }
      return next
    })
  }, [recipes, setAdvancedState, onCraftFromLeftover])

  // --- Фильтр для автокомплита в Add ---
  const filteredAddItems = useMemo(() => {
    if (!addItemFilter) return []
    const lower = addItemFilter.toLowerCase()
    return ALL_ITEMS.filter(name => name.toLowerCase().includes(lower))
  }, [addItemFilter])

  // --- Добавить manual addition ---
  const handleAddItem = useCallback(() => {
    if (!addItemName || addQuantity <= 0) return
    if (addManualAddition) {
      addManualAddition(addItemName, addQuantity)
    }
    setAddItemName('')
    setAddItemFilter('')
    setAddQuantity(1)
    setShowAddModal(false)
  }, [addItemName, addQuantity, addManualAddition])

  // --- Удалить manual addition ---
  const handleRemoveManual = useCallback((index) => {
    if (removeManualAddition) {
      removeManualAddition(index)
    }
  }, [removeManualAddition])

  return (
    <>
      {/* Хедер Advanced: C / R / P */}
      <section className="glass controls" style={{ display: 'flex', gap: 16, padding: '12px 16px', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '1.1rem' }}>C</span>
            <span style={{ color: '#ff6b6b', fontWeight: 600, fontSize: '1.05rem' }}>
              {formatNumberRounded(Math.round(costDisplay))}
            </span>

            <span style={{ color: '#ff6b6b', fontSize: '0.85rem', opacity: 0.7 }}>{currencySuffix}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ color: '#e9ecf1', fontWeight: 700, fontSize: '1.1rem' }}>R</span>
            <span style={{ color: '#e9ecf1', fontWeight: 600, fontSize: '1.05rem' }}>
              {formatNumberRounded(Math.round(revenueDisplay))}
            </span>

            <span style={{ color: '#e9ecf1', fontSize: '0.85rem', opacity: 0.7 }}>{currencySuffix}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ color: '#51cf66', fontWeight: 700, fontSize: '1.1rem' }}>P</span>
            <span style={{ color: '#51cf66', fontWeight: 600, fontSize: '1.05rem' }}>
              {formatNumberRounded(Math.round(profitDisplay))}
            </span>

            <span style={{ color: '#51cf66', fontSize: '0.85rem', opacity: 0.7 }}>{currencySuffix}</span>
          </div>
        </div>
      </section>

      {/* Таблица трат (Spent) — сгруппирована по цепочкам */}
      {spentChains.length > 0 && (
        <section className="glass card">
          <h2>📊 Spent ({spentByCraft.length} crafts, {spentChains.length} chains)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
            {spentChains.map((chainGroup, chainIdx) => {
              const isExpanded = expandedChains.has(chainIdx)
              const chainNames = chainGroup.chain.map(c => c.craftName).join(' → ')
              const totalCrafts = chainGroup.chain.length

              return (
                <div key={chainIdx} style={{
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                }}>
                  {/* Заголовок цепочки — кликабельный */}
                  <div
                    onClick={() => toggleChain(chainIdx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      marginBottom: isExpanded ? 8 : 0,
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Chain:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e9ecf1' }}>
                      {chainNames}
                    </span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>
                      ({totalCrafts} steps)
                    </span>
                  </div>

                  {/* Детали цепочки (разворачиваются) */}
                  {isExpanded && chainGroup.chain.map((craft, idx) => (
                    <div key={idx} style={{
                      padding: '6px 0 6px 20px',
                      borderLeft: '1px solid rgba(255,255,255,0.08)',
                      marginLeft: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>Step {idx + 1}:</span>
                        <ItemDisplay itemName={craft.craftName} itemsData={STATIC_ITEMS_MAP} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e9ecf1' }}>
                          ×{formatNumberRounded(craft.craftQty)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', paddingLeft: 8 }}>
                        {craft.ingredients.map((ing, iIdx) => (
                          <div key={iIdx} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                            <ItemDisplay itemName={ing.name} itemsData={STATIC_ITEMS_MAP} />
                            <span style={{ color: '#ff6b6b', fontWeight: 600 }}>
                              -{formatNumberRounded(ing.needed)}
                            </span>
                            {ing.compensated > 0 && (
                              <span style={{ color: '#51cf66', fontSize: '0.75rem' }}>
                                ✅ {formatNumberRounded(ing.compensated)}
                              </span>
                            )}
                            {ing.deficit > 0 && (
                              <span style={{ color: '#ff6b6b', fontSize: '0.75rem', opacity: 0.7 }}>
                                ⚠️ -{formatNumberRounded(ing.deficit)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Дефицит (если есть) — с учётом manualAdditions */}
      {mergedDeficit.length > 0 && (
        <section className="glass card" style={{ borderLeft: '3px solid #ff6b6b' }}>
          <h2 style={{ color: '#ff6b6b' }}>⚠️ Deficit ({mergedDeficit.length})</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', padding: '8px 0' }}>
            {mergedDeficit.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
                <ItemDisplay itemName={item.name} itemsData={STATIC_ITEMS_MAP} />
                <span style={{ color: '#ff6b6b', fontWeight: 600 }}>
                  {formatNumberRounded(item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Список остатков */}
      <section className="glass card">
        <h2>📦 Leftovers {mergedLeftovers.length > 0 && `(${mergedLeftovers.length})`}</h2>
        {mergedLeftovers.length === 0 ? (
          <div className="empty-state" style={{ padding: '12px 16px', color: '#9aa' }}>
            No items in chain yet. Use Craft or Location mode to build a chain.
          </div>
        ) : (
          <ul className="list">
            {mergedLeftovers.map((item) => {
              const itemPrice = prices[item.name]
              const priceInCurrency = itemPrice
                ? getItemPrice(item.name, currency, prices, exchangeRates)
                : null
              const hasPrice = priceInCurrency != null && !isNaN(priceInCurrency)
              const usedIn = getUsedIn(item.name)
              const isExpanded = expandedItems.has(item.name)
              const hasUsedIn = usedIn.length > 0

              return (
                <li key={item.name} className="resource-item" style={{ flexDirection: 'column' }}>
                  <div
                    className="resource-content"
                    style={{
                      cursor: hasUsedIn ? 'pointer' : 'default',
                      width: '100%',
                    }}
                    onClick={() => { if (hasUsedIn) toggleExpand(item.name) }}
                  >
                    <span className="k">
                      <ItemDisplay itemName={item.name} itemsData={STATIC_ITEMS_MAP} />
                    </span>
                    <span className="v" style={{ color: '#51cf66' }}>
                      {formatNumberRounded(item.quantity)}
                    </span>
                    {hasPrice && (
                      <span className="v" style={{ fontSize: '0.85rem', opacity: 0.6, minWidth: 60, textAlign: 'right' }}>
                        {formatNumberRounded(Math.round(priceInCurrency))} {currencySuffix}
                      </span>
                    )}
                    {hasUsedIn && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.5, marginLeft: 4 }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    )}
                  </div>

                  {/* Раскрытый Used In */}
                  {isExpanded && hasUsedIn && (
                    <div style={{
                      width: '100%',
                      padding: '8px 0 4px 24px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      marginTop: 4,
                    }}>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 6 }}>Used In:</div>
                      {usedIn.map(recipe => {
                        const recipeData = recipes[recipe.name]
                        const ingredients = recipeData ? (recipeData.ingredients || recipeData.из || {}) : {}
                        const requiredPerCraft = ingredients[item.name] || 1
                        const currentCraftQty = craftInputs[item.name]?.[recipe.name] || 1

                        return (
                          <div key={recipe.name} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 0',
                            flexWrap: 'wrap',
                          }}>
                            <ItemDisplay itemName={recipe.name} itemsData={STATIC_ITEMS_MAP} />
                            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                              (÷{requiredPerCraft})
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={currentCraftQty}
                              onChange={e => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 1)
                                setCraftInputs(prev => ({
                                  ...prev,
                                  [item.name]: {
                                    ...(prev[item.name] || {}),
                                    [recipe.name]: val,
                                  }
                                }))
                              }}
                              style={{
                                width: '60px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'inherit',
                                fontSize: '0.8rem',
                                textAlign: 'center',
                                MozAppearance: 'textfield',
                              }}
                              className="no-spinner"
                            />
                            <button
                              type="button"
                              className="chip"
                              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                              onClick={() => handleCraftFromUsedIn(item.name, recipe.name, currentCraftQty)}
                            >
                              Craft
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Кнопка Add и список manual добавлений */}
      <section className="glass card" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h2 style={{ margin: 0, flex: 1 }}>➕ Add</h2>
          <button
            type="button"
            className="chip"
            onClick={() => setShowAddModal(true)}
          >
            + Add Item
          </button>
        </div>

        {/* Список manual добавлений */}
        {manualAdditions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {manualAdditions.map((add, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 6,
              }}>
                <ItemDisplay itemName={add.itemName} itemsData={STATIC_ITEMS_MAP} />
                <span style={{ color: '#51cf66', fontWeight: 600 }}>+{formatNumberRounded(add.quantity)}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.5, flex: 1 }}>
                  {new Date(add.timestamp || Date.now()).toLocaleTimeString()}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveManual(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff6b6b',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Модалка Add Item — с автокомплитом */}
      {showAddModal && (
        <div
          className="modal-wrapper"
          onClick={() => setShowAddModal(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="glass item-select-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 400, padding: 20 }}
          >
            <h2 style={{ margin: '0 0 12px 0' }}>Add Item to Leftovers</h2>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: 12 }}>
              Type to search and select an item from the list below
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                className="calc-input"
                placeholder="Search items..."
                value={addItemFilter}
                onChange={e => {
                  setAddItemFilter(e.target.value)
                  setAddItemName(e.target.value)
                }}
                autoFocus
                style={{ flex: 1, padding: '8px 12px' }}
              />
              <input
                type="number"
                min={1}
                value={addQuantity}
                onChange={e => setAddQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="no-spinner"
                style={{
                  width: '70px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.2)',
                  color: 'inherit',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  MozAppearance: 'textfield',
                }}
              />
            </div>
            {/* Выпадающий список автокомплита */}
            {addItemFilter && filteredAddItems.length > 0 && (
              <div style={{
                maxHeight: 250,
                overflowY: 'auto',
                marginBottom: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.3)',
              }}>
                {filteredAddItems.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setAddItemName(name)
                      setAddItemFilter(name)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '6px 10px',
                      border: 'none',
                      background: addItemName === name ? 'rgba(81, 207, 102, 0.15)' : 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      borderRadius: 0,
                      fontSize: '0.9rem',
                      textAlign: 'left',
                    }}
                  >
                    <ItemDisplay itemName={name} itemsData={STATIC_ITEMS_MAP} showName={false} />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            )}
            {addItemFilter && filteredAddItems.length === 0 && (
              <div style={{ padding: '8px 0', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginBottom: 8 }}>
                No items found
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setShowAddModal(false)
                  setAddItemName('')
                  setAddItemFilter('')
                  setAddQuantity(1)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="chip"
                style={{ background: 'rgba(81, 207, 102, 0.2)', color: '#51cf66' }}
                onClick={handleAddItem}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
