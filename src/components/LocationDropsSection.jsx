import React, { useMemo } from 'react'
import { APPLE_CIDER_REAL_DROP_RATES } from '../data/apple-cider-real-drop-rates.js'
import { computePinnedEstimate } from '../utils/exploringUtils.js'
import { roundToTwo, formatNumberRounded } from '../utils/formatters.js'
import ItemDisplay from './ItemDisplay'
import LocationItemInput from './LocationItemInput'

/**
 * Compute display value (expected yield) for an item given a consumable budget.
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

  // Fallback via full estimate
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

export default function LocationDropsSection({
  selectedLocation,
  amount,
  activePerks,
  exploringMode,
  hasItemContent,
  navigateToItem,
  itemsData,
  buddyFarmLinksEnabled,
  pinnedEnabled,
  recentlyAddedItems,
  addToPinned,
  item,
  handleLocationItemCommit,
}) {
  const locObj = APPLE_CIDER_REAL_DROP_RATES.locations?.[selectedLocation]
  const numericAmount = Number(amount) || 0

  // Sorted item list for the location (memoised on location data)
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

  return (
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

            const isClickable = hasItemContent(it)
            const parsed = numericValue != null && !Number.isNaN(Number(numericValue)) ? Number(numericValue) : null
            const targetAmount = parsed && parsed >= 1 ? Math.max(1, Math.floor(parsed)) : 1

            return (
              <li key={it} className="resource-item">
                <div
                  className={`resource-content ${isClickable ? 'clickable' : ''}`}
                  onClick={() => {
                    if (!isClickable) return
                    const locNode = selectedLocation 
                      ? { name: selectedLocation, isLocation: true, savedAmount: amount } 
                      : null
                    navigateToItem(it, targetAmount, locNode)
                  }}
                  style={isClickable ? { cursor: 'pointer' } : undefined}
                  title={isClickable ? `View ${it}` : undefined}
                >
                  <span className="k">
                    <ItemDisplay itemName={it} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled}>
                      {isClickable && (
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
                {pinnedEnabled && (
                  (() => {
                    const qtyForPin = numericValue != null ? roundToTwo(numericValue) : 1
                    return (
                      <button
                        className={`pin-btn ${recentlyAddedItems.has(`${it}_${qtyForPin}_${selectedLocation || item}`) ? 'success' : ''}`}
                        onClick={(e) => { e.stopPropagation(); addToPinned(it, qtyForPin, selectedLocation || item) }}
                        type="button"
                        title={`Pin ${it}`}
                      >
                        <div className="pin-icon">
                          <div className={`pin-line pin-line-horizontal ${recentlyAddedItems.has(`${it}_${qtyForPin}_${selectedLocation || item}`) ? 'checked' : ''}`}></div>
                          <div className={`pin-line pin-line-vertical ${recentlyAddedItems.has(`${it}_${qtyForPin}_${selectedLocation || item}`) ? 'checked' : ''}`}></div>
                        </div>
                      </button>
                    )
                  })()
                )}
              </li>
            )
          })
        })()}
      </ul>
    </section>
  )
}
