import React, { useState, useMemo, useCallback } from 'react'
import { APPLE_CIDER_REAL_DROP_RATES } from '../../../data/apple-cider-real-drop-rates'
import { useEconomyContext } from '../EconomyContext'
import { useActivePerks } from '../hooks/useActivePerks'
import { findRecipesThatUse } from '../../../utils/recipeUtils'
import { getItemLocations } from '../../../utils/exploringUtils'
import { computePinnedEstimate } from '../../../utils/exploringUtils'
import LocationImage from '../../../components/LocationImage'
import ItemDisplay from '../../../components/ItemDisplay'
import LocationItemInput from '../../../components/LocationItemInput'
import itemsAPI from '../../../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap } from '../../../utils/itemImageUtils'
import { formatNumberRounded, roundToTwo } from '../../../utils/formatters'

const STATIC_ITEMS_MAP = normalizeItemsMap(itemsAPI)

/**
 * Compute display value (expected yield) for an item given a consumable budget.
 * Полная копия из LocationDropsSection.jsx с поддержкой activePerks и exploringMode.
 */
function computeDisplayValue(itemName, budget, location, activePerks, exploringMode) {
  const locObj = APPLE_CIDER_REAL_DROP_RATES.locations?.[location]
  if (!locObj || !budget || budget <= 0) return '—'

  let numericValue = null
  try {
    const perUnit = computePinnedEstimate({ name: itemName, location }, 1, activePerks, exploringMode)

    if (exploringMode === 'Apple Cider') {
      const perCider = perUnit?.mode === 'AC' && typeof perUnit.effectiveDropsPerCider === 'number'
        ? perUnit.effectiveDropsPerCider : null
      if (perCider && budget > 0) {
        numericValue = budget * perCider
      } else {
        const raw = locObj['rq0cs0']?.[itemName]
        const rawVal = raw && (raw.dropsPerCider || (raw.cidersPerDrop ? 1010 / raw.cidersPerDrop : null) || raw)
        if (rawVal && budget > 0) numericValue = budget * rawVal

        if ((numericValue == null || numericValue === 0) && budget > 0) {
          let bestDrops = 0
          Object.keys(locObj).forEach(vk => {
            const part = locObj[vk]
            if (!part) return
            const entry = part[itemName]
            if (!entry) return
            const val = (typeof entry === 'object' && (entry.dropsPerCider || entry.cidersPerDrop))
              ? (entry.dropsPerCider || (entry.cidersPerDrop ? 1010 / entry.cidersPerDrop : 0))
              : (typeof entry === 'number' ? entry : 0)
            if (val && val > bestDrops) bestDrops = val
          })
          if (bestDrops > 0) numericValue = budget * bestDrops
        }
      }
    } else if (exploringMode === 'Arnold Palmer') {
      const perAP = perUnit?.mode === 'AP' && typeof perUnit.itemsPerAP === 'number'
        ? perUnit.itemsPerAP : null
      if (perAP && budget > 0) numericValue = budget * perAP
    }
  } catch (_) { /* ignore */ }

  if (numericValue != null) return roundToTwo(numericValue)

  try {
    const est = computePinnedEstimate({ name: itemName, location }, budget, activePerks, exploringMode)
    if (est) {
      if (est.mode === 'AC' && typeof est.effectiveDropsPerCider === 'number') return roundToTwo(budget * est.effectiveDropsPerCider)
      if (est.mode === 'AP' && typeof est.itemsPerAP === 'number') return roundToTwo(budget * est.itemsPerAP)
      if (est.mode === 'EXP' && typeof est.explores === 'number' && est.explores > 0) return roundToTwo(budget / est.explores)
    }
  } catch (_) { /* ignore */ }

  return '—'
}

/**
 * EconomyLocationPanel — изолированная панель локаций для экономического режима.
 *
 * Полная копия LocationDropsSection + controls из App.jsx.
 * Рендерится на странице (не оверлей), как оригинальный режим локаций.
 * Перки применяются через useActivePerks (чтение из localStorage).
 * Дропы кликабельны, с LocationItemInput для ввода целевого количества.
 *
 * Пропсы:
 *   selectedLocation — string | null
 *   onOpenSelect     — () => void (открыть EconomyItemSelect)
 */
export default function EconomyLocationPanel({ selectedLocation, onOpenSelect }) {
  const { addToEconomyChain } = useEconomyContext()
  const { activePerks, exploringMode } = useActivePerks()

  const [amount, setAmount] = useState(1)

  const locObj = APPLE_CIDER_REAL_DROP_RATES.locations?.[selectedLocation]
  const numericAmount = Number(amount) || 0

  // Sorted item list for the location (копия из LocationDropsSection)
  const itemsList = useMemo(() => {
    if (!locObj) return []
    const itemSet = new Set()
    Object.values(locObj).forEach(variant => {
      if (variant && typeof variant === 'object') Object.keys(variant).forEach(k => itemSet.add(k))
    })
    return Array.from(itemSet)
      .map(it => {
        let best = 0
        Object.keys(locObj).forEach(vk => {
          const part = locObj[vk]
          if (!part) return
          const entry = part[it]
          if (!entry) return
          const val = (typeof entry === 'object' && (entry.dropsPerCider || entry.cidersPerDrop))
            ? (entry.dropsPerCider || (entry.cidersPerDrop ? 1 / entry.cidersPerDrop : 0))
            : (typeof entry === 'number' ? entry : 0)
          if (val && val > best) best = val
        })
        return { name: it, bestDrops: best }
      })
      .sort((a, b) => b.bestDrops - a.bestDrops)
      .map(x => x.name)
  }, [locObj])

  // Проверка, есть ли контент у предмета
  const hasItemContent = useCallback((itemName) => {
    const recipe = APPLE_CIDER_REAL_DROP_RATES.locations?.[selectedLocation]
    if (recipe) return true
    const usedIn = findRecipesThatUse(itemName) || []
    if (usedIn.length > 0) return true
    const locations = getItemLocations(itemName) || []
    if (locations.length > 0) return true
    return false
  }, [selectedLocation])

  // Обработчик клика по дропу — навигация внутри плагина
  const handleDropClick = useCallback((itemName, targetAmount) => {
    if (!hasItemContent(itemName)) return
    addToEconomyChain({ name: selectedLocation, amount: Number(amount) || 1, isLocation: true })
    onOpenSelect(itemName)
  }, [hasItemContent, selectedLocation, amount, addToEconomyChain, onOpenSelect])

  // Обработчик LocationItemInput — пересчёт расходника
  const handleLocationItemCommit = useCallback((itemName, targetQuantity) => {
    if (!targetQuantity || targetQuantity <= 0 || !selectedLocation) return
    try {
      const perUnit = computePinnedEstimate(
        { name: itemName, location: selectedLocation },
        1,
        activePerks,
        exploringMode
      )

      if (exploringMode === 'Apple Cider' && perUnit && perUnit.mode === 'AC' && typeof perUnit.effectiveDropsPerCider === 'number') {
        const dropsPerCider = perUnit.effectiveDropsPerCider
        if (dropsPerCider > 0) {
          setAmount(Math.ceil(targetQuantity / dropsPerCider))
        }
      } else if (exploringMode === 'Arnold Palmer' && perUnit && perUnit.mode === 'AP' && typeof perUnit.itemsPerAP === 'number') {
        const itemsPerAP = perUnit.itemsPerAP
        if (itemsPerAP > 0) {
          setAmount(Math.ceil(targetQuantity / itemsPerAP))
        }
      } else {
        // Fallback: raw drop rate
        const locObj = APPLE_CIDER_REAL_DROP_RATES.locations?.[selectedLocation]
        if (locObj) {
          const raw = locObj['rq0cs0']?.[itemName]
          if (raw) {
            let dropsPerConsumable = null
            if (typeof raw === 'object') {
              dropsPerConsumable = raw.dropsPerCider || (raw.cidersPerDrop ? 1010 / raw.cidersPerDrop : null)
            } else if (typeof raw === 'number') {
              dropsPerConsumable = raw
            }
            if (dropsPerConsumable && dropsPerConsumable > 0) {
              setAmount(Math.ceil(targetQuantity / dropsPerConsumable))
            }
          }
        }
      }
    } catch (e) {
      console.error('Error calculating required amount:', e)
    }
  }, [selectedLocation, activePerks, exploringMode])

  // Обработчик изменения amount (как в App.jsx — decimal для локаций)
  const handleAmountChange = useCallback((e) => {
    const inputValue = e.target.value
    const normalized = inputValue.replace(',', '.')
    const cleaned = normalized.replace(/[^\d.]/g, '')
    const parts = cleaned.split('.')
    const integer = parts[0] || '0'
    const frac = parts[1] ? parts[1].slice(0, 2) : ''
    const final = frac ? `${integer}.${frac}` : integer
    if (final === '' || final === '.') {
      setAmount('')
      return
    }
    const numericValue = parseFloat(final)
    const rounded = Math.round(numericValue * 100) / 100
    setAmount(rounded)
  }, [])

  return (
    <>
      {/* Controls bar — копия из App.jsx (locations mode) */}
      <section className="glass controls">
        <label className="field">
          <span className="label">Location</span>
          <button className="input" onClick={onOpenSelect} type="button" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LocationImage name={selectedLocation} size={18} />
            <span>{selectedLocation || 'Select location'}</span>
          </button>
        </label>
        <label className="field">
          <span className="label">{exploringMode === 'Apple Cider' ? 'Apple Cider' : 'Arnold Palmer'}</span>
          <input
            className="input amount-input"
            type="text"
            min={1}
            max={9999999999999999}
            value={typeof amount === 'number' ? String(Math.ceil(amount)) : String(amount)}
            placeholder="Enter amount (e.g., 1 000)"
            onChange={handleAmountChange}
          />
        </label>
      </section>

      {/* Drops Section — копия из LocationDropsSection.jsx */}
      <section className="glass card">
        <h2>Drops {selectedLocation ? `@ ${selectedLocation}` : ''}</h2>
        <ul className="list">
          {(!selectedLocation) && (
            <li className="empty-state" style={{ padding: '12px 16px', color: '#9aa' }}>Select a location to see drops.</li>
          )}
          {selectedLocation && (() => {
            if (!locObj) return (<li className="empty-state" style={{ padding: '12px 16px', color: '#9aa' }}>No data for this location.</li>)

            return itemsList.map((it) => {
              const display = computeDisplayValue(it, numericAmount, selectedLocation, activePerks, exploringMode)
              const numericValue = typeof display === 'number' ? display : null
              const clickable = hasItemContent(it)
              const parsed = numericValue != null && !Number.isNaN(Number(numericValue)) ? Number(numericValue) : null
              const targetAmount = parsed && parsed >= 1 ? Math.max(1, Math.floor(parsed)) : 1

              return (
                <li key={it} className="resource-item">
                  <div
                    className={`resource-content ${clickable ? 'clickable' : ''}`}
                    onClick={() => {
                      if (!clickable) return
                      handleDropClick(it, targetAmount)
                    }}
                    style={clickable ? { cursor: 'pointer' } : { cursor: 'default' }}
                    title={clickable ? `View ${it}` : undefined}
                  >
                    <span className="k">
                      <ItemDisplay itemName={it} itemsData={STATIC_ITEMS_MAP}>
                        {clickable && (
                          <span className="craft-indicator">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </ItemDisplay>
                    </span>
                    <LocationItemInput
                      itemName={it}
                      display={display}
                      onCommit={handleLocationItemCommit}
                    />
                  </div>
                </li>
              )
            })
          })()}
        </ul>
      </section>
    </>
  )
}
