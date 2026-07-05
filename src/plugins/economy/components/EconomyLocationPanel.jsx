import React, { useState, useMemo, useCallback } from 'react'
import { APPLE_CIDER_REAL_DROP_RATES } from '../../../data/apple-cider-real-drop-rates'
import { useEconomyContext } from '../EconomyContext'
import LocationImage from '../../../components/LocationImage'
import ItemDisplay from '../../../components/ItemDisplay'
import itemsAPI from '../../../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap } from '../../../utils/itemImageUtils'
import { formatNumberRounded, roundToTwo } from '../../../utils/formatters'
import { computePinnedEstimate } from '../../../utils/exploringUtils'

const STATIC_ITEMS_MAP = normalizeItemsMap(itemsAPI)

/**
 * Compute display value (expected yield) for an item given a consumable budget.
 * Полная копия из LocationDropsSection.jsx
 */
function computeDisplayValue(itemName, budget, location) {
  const locObj = APPLE_CIDER_REAL_DROP_RATES.locations?.[location]
  if (!locObj || !budget || budget <= 0) return '—'

  let numericValue = null
  try {
    const perUnit = computePinnedEstimate({ name: itemName, location }, 1, [], 'Apple Cider')

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
  } catch (_) { /* ignore */ }

  if (numericValue != null) return roundToTwo(numericValue)

  try {
    const est = computePinnedEstimate({ name: itemName, location }, budget, [], 'Apple Cider')
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
 * Вместо pin-кнопок — "Add to Economy Chain".
 *
 * Пропсы:
 *   selectedLocation — string | null
 *   onOpenSelect     — () => void (открыть EconomyItemSelect)
 */
export default function EconomyLocationPanel({ selectedLocation, onOpenSelect }) {
  const { addToEconomyChain } = useEconomyContext()

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

  // Добавление предмета в экономическую цепочку
  const handleAddToChain = useCallback((name, qty) => {
    addToEconomyChain(name, qty || numericAmount)
  }, [addToEconomyChain, numericAmount])

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
          <span className="label">Apple Cider</span>
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
              const display = computeDisplayValue(it, numericAmount, selectedLocation)
              const numericValue = typeof display === 'number' ? display : null
              const parsed = numericValue != null && !Number.isNaN(Number(numericValue)) ? Number(numericValue) : null
              const targetAmount = parsed && parsed >= 1 ? Math.max(1, Math.floor(parsed)) : 1

              return (
                <li key={it} className="resource-item">
                  <div className="resource-content" style={{ cursor: 'default' }}>
                    <span className="k">
                      <ItemDisplay itemName={it} itemsData={STATIC_ITEMS_MAP} />
                    </span>
                    <span className="v">{display !== '—' ? formatNumberRounded(display) : display}</span>
                  </div>
                  <button
                    type="button"
                    className="chip economy-add-chain-btn"
                    onClick={() => handleAddToChain(it, targetAmount)}
                  >
                    + Add
                  </button>
                </li>
              )
            })
          })()}
        </ul>
      </section>
    </>
  )
}
