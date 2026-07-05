import React, { useState, useMemo, useCallback, useRef } from 'react'
import { useEconomyContext } from './EconomyContext'
import { useActivePerks } from './hooks/useActivePerks'
import { getCombinedRecipes, findRecipesThatUse } from '../../utils/recipeUtils'
import { getItemLocations } from '../../utils/exploringUtils'
import { calculateAllResources, getResourceSaverPercent } from '../../utils/calculator'
import { APPLE_CIDER_REAL_DROP_RATES } from '../../data/apple-cider-real-drop-rates'
import { computePinnedEstimate } from '../../utils/exploringUtils'
import ItemDisplay from '../../components/ItemDisplay'
import LocationImage from '../../components/LocationImage'
import LocationItemInput from '../../components/LocationItemInput'
import itemsAPI from '../../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap } from '../../utils/itemImageUtils'
import { formatNumberRounded, roundToTwo } from '../../utils/formatters'
import EconomyItemSelectModal from './components/EconomyItemSelectModal'
import EconomyAppHeader from './components/EconomyAppHeader'
import './styles/economy.css'

const STATIC_ITEMS_MAP = normalizeItemsMap(itemsAPI)

// ---------- helpers (копия из App.jsx) ----------

function computeDisplayValue(itemName, budget, location, activePerks, exploringMode) {
  const locObj = APPLE_CIDER_REAL_DROP_RATES.locations?.[location]
  if (!locObj || !budget || budget <= 0) return '—'
  let numericValue = null
  try {
    const perUnit = computePinnedEstimate({ name: itemName, location }, 1, activePerks, exploringMode)
    if (exploringMode === 'Apple Cider') {
      const perCider = perUnit?.mode === 'AC' && typeof perUnit.effectiveDropsPerCider === 'number' ? perUnit.effectiveDropsPerCider : null
      if (perCider && budget > 0) { numericValue = budget * perCider }
      else {
        const raw = locObj['rq0cs0']?.[itemName]
        const rawVal = raw && (raw.dropsPerCider || (raw.cidersPerDrop ? 1010 / raw.cidersPerDrop : null) || raw)
        if (rawVal && budget > 0) numericValue = budget * rawVal
        if ((numericValue == null || numericValue === 0) && budget > 0) {
          let bestDrops = 0
          Object.keys(locObj).forEach(vk => {
            const part = locObj[vk]; if (!part) return
            const entry = part[itemName]; if (!entry) return
            const val = (typeof entry === 'object' && (entry.dropsPerCider || entry.cidersPerDrop))
              ? (entry.dropsPerCider || (entry.cidersPerDrop ? 1010 / entry.cidersPerDrop : 0))
              : (typeof entry === 'number' ? entry : 0)
            if (val && val > bestDrops) bestDrops = val
          })
          if (bestDrops > 0) numericValue = budget * bestDrops
        }
      }
    } else if (exploringMode === 'Arnold Palmer') {
      const perAP = perUnit?.mode === 'AP' && typeof perUnit.itemsPerAP === 'number' ? perUnit.itemsPerAP : null
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
 * EconomyPlugin — простое зеркало режимов крафта и локаций.
 * Рендерится внутри .main, не использует createPortal.
 * Не имеет своего хедера, breadcrumbs, цепочек — только чистая логика.
 */
export default function EconomyPlugin() {
  const { economyEnabled, setEconomyEnabled } = useEconomyContext()
  const { activePerks, exploringMode } = useActivePerks()

  const [view, setView] = useState('start') // 'start' | 'craft' | 'location'
  const [itemSelectMode, setItemSelectMode] = useState(null) // null | 'craft' | 'location'

  // Craft state
  const [selectedItem, setSelectedItem] = useState(null)
  const [amount, setAmount] = useState(1)

  // Location state
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [locationAmount, setLocationAmount] = useState(1)

  // Breadcrumbs (свой собственный craftChain, не из App.jsx)
  const [craftChain, setCraftChain] = useState([])
  const breadcrumbsRef = useRef(null)

  const combinedRecipes = useMemo(() => getCombinedRecipes(), [])

  // --- Craft logic (копия из App.jsx) ---
  const result = useMemo(() => {
    if (!selectedItem || !combinedRecipes[selectedItem]) return null
    const cleanAmount = typeof amount === 'string' ? amount.replace(/\s/g, '') : amount
    return calculateAllResources(selectedItem, Number(cleanAmount) || 1, activePerks, combinedRecipes)
  }, [selectedItem, amount, activePerks, combinedRecipes])

  const directIngredients = useMemo(() => {
    if (!selectedItem || !combinedRecipes[selectedItem]) return {}
    const recipe = combinedRecipes[selectedItem]
    const originalIngredients = recipe.из || recipe.ingredients || {}
    const resourceSaverPercent = getResourceSaverPercent(activePerks)
    const cleanAmount = typeof amount === 'string' ? amount.replace(/\s/g, '') : amount
    const numAmount = Number(cleanAmount) || 1
    const filtered = {}
    for (const [resourceName, baseQuantity] of Object.entries(originalIngredients)) {
      let needed = baseQuantity * numAmount
      if (resourceSaverPercent > 0) needed = needed / (1 + resourceSaverPercent)
      filtered[resourceName] = Math.ceil(needed)
    }
    return filtered
  }, [selectedItem, amount, activePerks, combinedRecipes])

  const availableCrafts = useMemo(() => {
    function normalizeName(s) {
      if (!s && s !== 0) return ''
      return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
    }
    try {
      if (!combinedRecipes || !selectedItem) return []
      const target = normalizeName(selectedItem)
      const results = []
      const availableAmount = Number(amount) || 0
      const resourceSaverPercent = getResourceSaverPercent(activePerks || [])
      Object.entries(combinedRecipes).forEach(([name, recipe]) => {
        const ing = recipe?.из || recipe?.ingredients || {}
        const keys = Object.keys(ing || {})
        let found = false, requiredPerCraft = null
        for (const k of keys) {
          if (normalizeName(k) === target) {
            const val = ing[k]; requiredPerCraft = (typeof val === 'number') ? val : 1; found = true; break
          }
          const v = ing[k]
          if (v && typeof v === 'object') {
            const nestedKeys = Object.keys(v)
            for (const nk of nestedKeys) {
              if (normalizeName(nk) === target) {
                const nestedVal = v[nk]; requiredPerCraft = (typeof nestedVal === 'number') ? nestedVal : 1; found = true; break
              }
            }
            if (found) break
          }
        }
        if (found) {
          const adjustedRequired = requiredPerCraft && resourceSaverPercent > 0 ? (requiredPerCraft / (1 + resourceSaverPercent)) : requiredPerCraft
          const finalRequired = adjustedRequired && adjustedRequired > 0 ? adjustedRequired : requiredPerCraft || 1
          const craftable = finalRequired > 0 ? Math.floor(availableAmount / finalRequired) : 0
          results.push({ name, outputQty: recipe?.amount || 1, requiredPerCraft, craftableCount: craftable })
        }
      })
      return Array.from(new Map(results.map(r => [r.name, r])).values()).sort((a, b) => a.name.localeCompare(b.name))
    } catch (e) { return [] }
  }, [combinedRecipes, selectedItem, amount, activePerks])

  const isCraftable = useCallback((name) => {
    const recipe = combinedRecipes[name]
    return recipe && (recipe.из || recipe.ingredients)
  }, [combinedRecipes])

  const hasItemContent = useCallback((itemName) => {
    if (isCraftable(itemName)) return true
    const usedIn = findRecipesThatUse(itemName) || []
    if (usedIn.length > 0) return true
    const locations = getItemLocations(itemName) || []
    if (locations.length > 0) return true
    return false
  }, [isCraftable])

  const navigateToItem = useCallback((itemName, quantity) => {
    if (!hasItemContent(itemName)) return
    setSelectedItem(itemName)
    setAmount(quantity)
    setView('craft')
    setCraftChain(prev => [...prev, { name: itemName, amount: quantity }])
  }, [hasItemContent, setCraftChain])

  // --- Location logic (копия из App.jsx) ---
  const locObj = APPLE_CIDER_REAL_DROP_RATES.locations?.[selectedLocation]
  const numericLocationAmount = Number(locationAmount) || 0

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
          const part = locObj[vk]; if (!part) return
          const entry = part[it]; if (!entry) return
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

  const handleLocationItemCommit = useCallback((itemName, targetQuantity) => {
    if (!targetQuantity || targetQuantity <= 0 || !selectedLocation) return
    try {
      const perUnit = computePinnedEstimate({ name: itemName, location: selectedLocation }, 1, activePerks, exploringMode)
      if (exploringMode === 'Apple Cider' && perUnit && perUnit.mode === 'AC' && typeof perUnit.effectiveDropsPerCider === 'number') {
        if (perUnit.effectiveDropsPerCider > 0) setLocationAmount(Math.ceil(targetQuantity / perUnit.effectiveDropsPerCider))
      } else if (exploringMode === 'Arnold Palmer' && perUnit && perUnit.mode === 'AP' && typeof perUnit.itemsPerAP === 'number') {
        if (perUnit.itemsPerAP > 0) setLocationAmount(Math.ceil(targetQuantity / perUnit.itemsPerAP))
      } else {
        const locObj = APPLE_CIDER_REAL_DROP_RATES.locations?.[selectedLocation]
        if (locObj) {
          const raw = locObj['rq0cs0']?.[itemName]
          if (raw) {
            let dropsPerConsumable = null
            if (typeof raw === 'object') dropsPerConsumable = raw.dropsPerCider || (raw.cidersPerDrop ? 1010 / raw.cidersPerDrop : null)
            else if (typeof raw === 'number') dropsPerConsumable = raw
            if (dropsPerConsumable && dropsPerConsumable > 0) setLocationAmount(Math.ceil(targetQuantity / dropsPerConsumable))
          }
        }
      }
    } catch (e) { console.error('Error calculating required amount:', e) }
  }, [selectedLocation, activePerks, exploringMode])

  // --- Handlers ---
  const handleCraftSelect = (name, qty) => {
    setSelectedItem(name)
    setAmount(qty)
    setItemSelectMode(null)
    setView('craft')
    if (setCraftChain) {
      setCraftChain([{ name, amount: qty }])
    }
  }

  const handleLocationSelect = (name, qty) => {
    setSelectedLocation(name)
    setLocationAmount(qty)
    setItemSelectMode(null)
    setView('location')
    if (setCraftChain) {
      setCraftChain([{ name, amount: qty, isLocation: true }])
    }
  }

  if (!economyEnabled) return null

  return (
    <div className="economy-plugin">
      <EconomyAppHeader
        headerVisible={true}
        isCaching={false}
        cachingProgress={0}
        isOffline={false}
        craftChain={craftChain}
        setCraftChain={setCraftChain}
        breadcrumbsRef={breadcrumbsRef}
        setSelectedItem={setSelectedItem}
        setAmount={setAmount}
        itemsData={STATIC_ITEMS_MAP}
        buddyFarmLinksEnabled={false}
        onExit={() => setEconomyEnabled(false)}
      />
      <EconomyItemSelectModal
        isOpen={itemSelectMode !== null}
        mode={itemSelectMode}
        onSelect={itemSelectMode === 'craft' ? handleCraftSelect : handleLocationSelect}
        onClose={() => setItemSelectMode(null)}
      />

      {/* Стартовый экран — две простые кнопки */}
      {view === 'start' && (
        <div className="economy-start">
          <button className="glass economy-mode-btn" onClick={() => setItemSelectMode('craft')} type="button">
            🔧 Craft
          </button>
          <button className="glass economy-mode-btn" onClick={() => setItemSelectMode('location')} type="button">
            📍 Locations
          </button>
        </div>
      )}

      {/* Craft mode — controls + ресурсы */}
      {view === 'craft' && (
        <>
          <section className="glass controls">
            <label className="field">
              <span className="label">Item</span>
              <button className="input" onClick={() => setItemSelectMode('craft')} type="button">
                <ItemDisplay itemName={selectedItem} itemsData={STATIC_ITEMS_MAP} />
              </button>
            </label>
            <label className="field">
              <span className="label">Amount</span>
              <input
                className="input amount-input" type="text" min={1} max={9999999999999999}
                value={String(amount)}
                placeholder="Enter amount (e.g., 1 000)"
                onChange={e => {
                  const cleanValue = e.target.value.replace(/\D/g, '')
                  if (cleanValue === '') { setAmount(''); return }
                  const numericValue = parseInt(cleanValue)
                  if (numericValue > 9999999999999999) return
                  setAmount(cleanValue)
                }}
              />
            </label>
          </section>

          {/* Resources */}
          {Object.keys(directIngredients).length > 0 && (
            <section className="glass card">
              <h2>Resources</h2>
              <ul className="list">
                {Object.entries(directIngredients).map(([name, qty]) => (
                  <li key={name} className="resource-item">
                    <div
                      className={`resource-content ${hasItemContent(name) ? 'clickable' : ''}`}
                      onClick={() => { if (hasItemContent(name)) navigateToItem(name, qty) }}
                      style={hasItemContent(name) ? { cursor: 'pointer' } : { cursor: 'default' }}
                    >
                      <span className="k"><ItemDisplay itemName={name} itemsData={STATIC_ITEMS_MAP} /></span>
                      <span className="v">{formatNumberRounded(qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* All Base Resources */}
          {result && Object.keys(result.base).length > 0 && (
            <section className="glass card">
              <h2>All Base Resources</h2>
              <ul className="list">
                {Object.entries(result.base).map(([name, qty]) => (
                  <li key={name} className="resource-item">
                    <div
                      className={`resource-content ${hasItemContent(name) ? 'clickable' : ''}`}
                      onClick={() => { if (hasItemContent(name)) navigateToItem(name, qty) }}
                      style={hasItemContent(name) ? { cursor: 'pointer' } : { cursor: 'default' }}
                    >
                      <span className="k"><ItemDisplay itemName={name} itemsData={STATIC_ITEMS_MAP} /></span>
                      <span className="v">{formatNumberRounded(qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Used In */}
          {availableCrafts.length > 0 && (
            <section className="glass card">
              <h2>Used In</h2>
              <ul className="list">
                {availableCrafts.map(c => (
                  <li key={c.name} className="resource-item">
                    <div
                      className={`resource-content ${hasItemContent(c.name) ? 'clickable' : ''}`}
                      onClick={() => { if (hasItemContent(c.name)) navigateToItem(c.name, c.craftableCount || 1) }}
                      style={hasItemContent(c.name) ? { cursor: 'pointer' } : undefined}
                    >
                      <span className="k"><ItemDisplay itemName={c.name} itemsData={STATIC_ITEMS_MAP} /></span>
                      <span className="v">{formatNumberRounded(c.craftableCount != null ? c.craftableCount : 0)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Location mode — controls + drops */}
      {view === 'location' && (
        <>
          <section className="glass controls">
            <label className="field">
              <span className="label">Location</span>
              <button className="input" onClick={() => setItemSelectMode('location')} type="button" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LocationImage name={selectedLocation} size={18} />
                <span>{selectedLocation || 'Select location'}</span>
              </button>
            </label>
            <label className="field">
              <span className="label">{exploringMode === 'Apple Cider' ? 'Apple Cider' : 'Arnold Palmer'}</span>
              <input
                className="input amount-input" type="text" min={1} max={9999999999999999}
                value={typeof locationAmount === 'number' ? String(Math.ceil(locationAmount)) : String(locationAmount)}
                placeholder="Enter amount (e.g., 1 000)"
                onChange={e => {
                  const inputValue = e.target.value
                  const normalized = inputValue.replace(',', '.')
                  const cleaned = normalized.replace(/[^\d.]/g, '')
                  const parts = cleaned.split('.')
                  const integer = parts[0] || '0'
                  const frac = parts[1] ? parts[1].slice(0, 2) : ''
                  const final = frac ? `${integer}.${frac}` : integer
                  if (final === '' || final === '.') { setLocationAmount(''); return }
                  setLocationAmount(Math.round(parseFloat(final) * 100) / 100)
                }}
              />
            </label>
          </section>

          <section className="glass card">
            <h2>Drops {selectedLocation ? `@ ${selectedLocation}` : ''}</h2>
            <ul className="list">
              {!selectedLocation && (
                <li className="empty-state" style={{ padding: '12px 16px', color: '#9aa' }}>Select a location to see drops.</li>
              )}
              {selectedLocation && (!locObj ? (
                <li className="empty-state" style={{ padding: '12px 16px', color: '#9aa' }}>No data for this location.</li>
              ) : (
                itemsList.map(it => {
                  const display = computeDisplayValue(it, numericLocationAmount, selectedLocation, activePerks, exploringMode)
                  const clickable = hasItemContent(it)
                  const parsed = typeof display === 'number' && !Number.isNaN(Number(display)) ? Number(display) : null
                  const targetAmount = parsed && parsed >= 1 ? Math.max(1, Math.floor(parsed)) : 1
                  return (
                    <li key={it} className="resource-item">
                      <div
                        className={`resource-content ${clickable ? 'clickable' : ''}`}
                        onClick={() => { if (clickable) navigateToItem(it, targetAmount) }}
                        style={clickable ? { cursor: 'pointer' } : { cursor: 'default' }}
                      >
                        <span className="k"><ItemDisplay itemName={it} itemsData={STATIC_ITEMS_MAP} /></span>
                        <LocationItemInput itemName={it} display={display} onCommit={handleLocationItemCommit} />
                      </div>
                    </li>
                  )
                })
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
