import React, { useState, useCallback, useMemo, useRef, memo } from 'react'
import { formatNumberRounded } from '../../../utils/formatters'
import { runAdvanced, getItemPrice } from '../utils/economyCalculator'

const CURRENCY_LABELS = {
  gold: 'G',
  ap: 'AP',
  oj: 'OJ',
}

/**
 * Получает все рецепты, в которых itemName используется как ингредиент.
 */
function getAvailableCrafts(itemName, combinedRecipes) {
  return Object.entries(combinedRecipes)
    .filter(([name, recipe]) => {
      const ingredients = recipe.из || recipe.ingredients || {}
      return itemName in ingredients
    })
    .map(([name, recipe]) => {
      const ingredients = recipe.из || recipe.ingredients || {}
      return {
        name,
        ingredients,
        output: recipe.amount || 1,
        requiredPerCraft: ingredients[itemName] || 1,
      }
    })
}

/**
 * Конвертирует рецепт {из: {Wood: 2, Nails: 1}} → [{name: "Wood", amount: 2}, {name: "Nails", amount: 1}]
 */
function recipeToArray(recipe) {
  const ings = recipe.из || recipe.ingredients || {}
  return Object.entries(ings).map(([name, amount]) => ({
    name,
    amount: typeof amount === 'number' ? amount : parseInt(amount, 10) || 1,
  }))
}

/**
 * Строит карту рецептов: recipeName → [{name, amount}]
 */
function buildRecipesMap(combinedRecipes) {
  const map = {}
  Object.entries(combinedRecipes).forEach(([name, recipe]) => {
    map[name] = recipeToArray(recipe)
  })
  return map
}

/**
 * Вычисляет минус-строки для конкретного предмета на основе advancedState.
 */
function getMinusLines(itemName, advancedState) {
  const entry = advancedState.find(e => e.itemName === itemName)
  if (!entry) return []
  return entry.crafts.map(c => ({
    recipeName: c.recipeName,
    quantity: c.quantity,
  }))
}

// ─── LeftoverRow (memo) ────────────────────────────────────────────────

const LeftoverRow = memo(function LeftoverRow({
  item,
  advancedState,
  combinedRecipes,
  prices,
  currency,
  exchangeRates,
  onUpdateCraft,
  onRemoveItem,
  itemIndex,
}) {
  const [expanded, setExpanded] = useState(false)
  const debounceRef = useRef(null)

  const currencyLabel = CURRENCY_LABELS[currency] || 'G'

  // Доступные крафты для этого предмета
  const availableCrafts = useMemo(
    () => getAvailableCrafts(item.name, combinedRecipes),
    [item.name, combinedRecipes]
  )

  // Текущие крафты из advancedState
  const currentCrafts = useMemo(() => {
    const entry = advancedState.find(e => e.itemName === item.name)
    return entry ? entry.crafts : []
  }, [advancedState, item.name])

  // Минус-строки
  const minusLines = useMemo(
    () => getMinusLines(item.name, advancedState),
    [item.name, advancedState]
  )

  // Breadcrumb: первый крафт (если есть)
  const breadcrumb = useMemo(() => {
    if (currentCrafts.length === 0) return null
    const first = currentCrafts[0]
    const recipe = combinedRecipes[first.recipeName]
    if (!recipe) return null
    const ings = recipe.из || recipe.ingredients || {}
    const required = ings[item.name] || 1
    const output = recipe.amount || 1
    return {
      recipeName: first.recipeName,
      fromQty: item.quantity,
      fromName: item.name,
      requiredPerCraft: required,
      outputQty: output,
    }
  }, [currentCrafts, item.name, item.quantity, combinedRecipes])

  // Обработчик ввода количества крафта
  const handleCraftInput = useCallback(
    (recipeName, value) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const qty = parseInt(value, 10)
        if (isNaN(qty) || qty < 0) return
        onUpdateCraft(item.name, recipeName, qty)
      }, 300)
    },
    [item.name, onUpdateCraft]
  )

  // Клик на элемент breadcrumb — откат
  const handleBreadcrumbClick = useCallback(
    (recipeName) => {
      const entry = advancedState.find(e => e.itemName === item.name)
      if (!entry) return
      const idx = entry.crafts.findIndex(c => c.recipeName === recipeName)
      if (idx < 0) return
      // Удаляем все крафты начиная с этого
      const removed = entry.crafts.slice(idx)
      removed.forEach(c => {
        onUpdateCraft(item.name, c.recipeName, 0)
      })
    },
    [item.name, advancedState, onUpdateCraft]
  )

  const isDeficit = item.quantity < 0

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 0',
      }}
    >
      {/* Основная строка — клик для разворота */}
      <div
        onClick={() => setExpanded(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          padding: '4px 0',
          color: isDeficit ? '#F44336' : 'inherit',
        }}
      >
        <span style={{ fontWeight: 500, fontSize: '0.95rem', flex: 1 }}>
          {item.name}
        </span>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #aaa)' }}>
          ×{formatNumberRounded(item.quantity)}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #aaa)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Breadcrumb */}
      {breadcrumb && (
        <div
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary, #aaa)',
            padding: '2px 0 4px 0',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
          }}
        >
          <span
            style={{ cursor: 'pointer', color: '#64B5F6', textDecoration: 'underline' }}
            onClick={(e) => {
              e.stopPropagation()
              handleBreadcrumbClick(breadcrumb.recipeName)
            }}
          >
            {breadcrumb.fromName}({breadcrumb.fromQty})
          </span>
          <span> → </span>
          <span
            style={{ cursor: 'pointer', color: '#81C784', textDecoration: 'underline' }}
            onClick={(e) => {
              e.stopPropagation()
              handleBreadcrumbClick(breadcrumb.recipeName)
            }}
          >
            {breadcrumb.recipeName}({breadcrumb.outputQty})
          </span>
        </div>
      )}

      {/* Развёрнутая секция */}
      {expanded && (
        <div style={{ padding: '8px 0 4px 12px', borderLeft: '2px solid rgba(255,255,255,0.1)', marginLeft: 4 }}>
          {/* Доступные крафты */}
          {availableCrafts.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #aaa)', marginBottom: 6 }}>
                Доступные крафты:
              </div>
              {availableCrafts.map(craft => {
                const currentCraft = currentCrafts.find(c => c.recipeName === craft.name)
                const currentQty = currentCraft ? currentCraft.quantity : 0
                const ingredientsStr = Object.entries(craft.ingredients)
                  .map(([ingName, ingQty]) => `${ingName} ×${ingQty}`)
                  .join(', ')
                return (
                  <div
                    key={craft.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 0',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      → {craft.name} ({ingredientsStr} → {craft.output})
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={currentQty > 0 ? currentQty : ''}
                      placeholder="0"
                      onChange={e => handleCraftInput(craft.name, e.target.value)}
                      style={{
                        width: '60px',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(0,0,0,0.2)',
                        color: 'inherit',
                        fontSize: '0.85rem',
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Минус-строки */}
          {minusLines.length > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#FFB74D', padding: '2px 0' }}>
              {minusLines.map((ml, i) => (
                <div key={i}>
                  -{ml.quantity} {item.name} (used for {ml.recipeName})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

// ─── EconomyAdvanced (основной компонент) ──────────────────────────────

export default function EconomyAdvanced({
  leftovers,
  advancedState,
  onUpdateCraft,
  onRemoveItem,
  onAddManualItem,
  manualAdditions,
  prices,
  currency,
  exchangeRates,
  combinedRecipes,
  getItemPrice: getItemPriceFn,
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [addItemName, setAddItemName] = useState('')
  const [addItemQuantity, setAddItemQuantity] = useState(1)
  const [showSaved, setShowSaved] = useState(false)

  const currencyLabel = CURRENCY_LABELS[currency] || 'G'

  // Карта рецептов для runAdvanced
  const recipesMap = useMemo(() => buildRecipesMap(combinedRecipes), [combinedRecipes])

  // Пересчёт через runAdvanced
  const calculation = useMemo(() => {
    return runAdvanced(leftovers, advancedState, prices, recipesMap)
  }, [leftovers, advancedState, prices, recipesMap])

  const { updatedLeftovers, cost, revenue, profit, deficitItems } = calculation

  // Обработчик Add
  const handleAddItem = useCallback(() => {
    const name = addItemName.trim()
    const qty = parseInt(addItemQuantity, 10) || 1
    if (!name) return
    onAddManualItem(name, qty)
    setAddItemName('')
    setAddItemQuantity(1)
    setAddOpen(false)
  }, [addItemName, addItemQuantity, onAddManualItem])

  // Pin/Save
  const handleSave = useCallback(() => {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px 0',
      }}
    >
      {/* Хедер C/R/P */}
      <div
        className="economy-advanced-header"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-around',
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}
      >
        <div className="economy-metric cost" style={{ textAlign: 'center' }}>
          <span className="metric-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #aaa)', display: 'block' }}>C</span>
          <span className="metric-value" style={{ color: '#F44336', fontWeight: 600, fontSize: '1rem' }}>
            {formatNumberRounded(cost)} {currencyLabel}
          </span>
        </div>
        <div className="economy-metric revenue" style={{ textAlign: 'center' }}>
          <span className="metric-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #aaa)', display: 'block' }}>R</span>
          <span className="metric-value" style={{ fontWeight: 600, fontSize: '1rem' }}>
            {formatNumberRounded(revenue)} {currencyLabel}
          </span>
        </div>
        <div className="economy-metric profit" style={{ textAlign: 'center' }}>
          <span className="metric-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #aaa)', display: 'block' }}>P</span>
          <span
            className="metric-value"
            style={{
              fontWeight: 700,
              fontSize: '1rem',
              color: profit >= 0 ? '#8BC34A' : '#F44336',
            }}
          >
            {formatNumberRounded(profit)} {currencyLabel}
          </span>
        </div>
      </div>

      {/* Список остатков */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {updatedLeftovers.map((item, idx) => (
          <LeftoverRow
            key={`${item.name}-${idx}`}
            item={item}
            advancedState={advancedState}
            combinedRecipes={combinedRecipes}
            prices={prices}
            currency={currency}
            exchangeRates={exchangeRates}
            onUpdateCraft={onUpdateCraft}
            onRemoveItem={onRemoveItem}
            itemIndex={idx}
          />
        ))}
      </div>

      {/* Кнопка Add */}
      <div style={{ flexShrink: 0 }}>
        {!addOpen ? (
          <button
            type="button"
            className="chip wide"
            onClick={() => setAddOpen(true)}
            style={{ width: '100%' }}
          >
            + Add
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <input
              type="text"
              placeholder="Item name"
              value={addItemName}
              onChange={e => setAddItemName(e.target.value)}
              style={{
                flex: '1 1 140px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.2)',
                color: 'inherit',
                fontSize: '0.85rem',
              }}
            />
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Qty"
              value={addItemQuantity}
              onChange={e => setAddItemQuantity(parseInt(e.target.value, 10) || 1)}
              style={{
                flex: '0 0 70px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.2)',
                color: 'inherit',
                fontSize: '0.85rem',
                textAlign: 'right',
              }}
            />
            <button
              type="button"
              className="chip"
              onClick={handleAddItem}
              disabled={!addItemName.trim()}
            >
              Add
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                setAddOpen(false)
                setAddItemName('')
                setAddItemQuantity(1)
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Журнал ручных добавлений */}
      {manualAdditions.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            fontSize: '0.8rem',
            color: 'var(--text-secondary, #aaa)',
            padding: '4px 0',
          }}
        >
          {manualAdditions.map((entry, i) => (
            <div key={i}>
              +{entry.quantity} {entry.itemName} (added manually)
            </div>
          ))}
        </div>
      )}

      {/* Кнопка Pin/Save */}
      <div style={{ flexShrink: 0 }}>
        <button
          type="button"
          className="chip wide"
          onClick={handleSave}
          style={{ width: '100%' }}
        >
          {showSaved ? 'Saved! (placeholder)' : 'Pin / Save'}
        </button>
      </div>
    </div>
  )
}
