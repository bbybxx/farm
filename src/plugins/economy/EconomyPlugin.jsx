import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { useEconomyContext } from './EconomyContext'
import { useActivePerks } from './hooks/useActivePerks'
import { getItemLocations } from '../../utils/exploringUtils'
import { calculateAllResources, getResourceSaverPercent } from '../../utils/calculator'
import { APPLE_CIDER_REAL_DROP_RATES } from '../../data/apple-cider-real-drop-rates'
import { computePinnedEstimate } from '../../utils/exploringUtils'
import ItemDisplay from '../../components/ItemDisplay'
import LocationImage from '../../components/LocationImage'
import { formatNumberRounded, roundToTwo } from '../../utils/formatters'
import { getItemsMap, getRecipes, getUsedItemsSet } from './utils/economyData'
import EconomyItemSelectModal from './components/EconomyItemSelectModal'
import EconomyAppHeader from './components/EconomyAppHeader'
import './styles/economy.css'

// Lazy-load EconomyAdvancedView — only loaded when user enters Advanced mode
const LazyEconomyAdvancedView = lazy(() => import('./components/EconomyAdvancedView'))

const STATIC_ITEMS_MAP = getItemsMap()
const combinedRecipesSingleton = getRecipes()

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
 * Пересчитывает количество для узла craftChain по индексу,
 * исходя из корневого (первого) узла цепочки.
 * Возвращает массив с обновлёнными amount для всех узлов.
 */
function recalcChainFromRoot(chain, activePerks, exploringMode, combinedRecipes) {
  if (!chain || chain.length === 0) return chain

  const result = chain.map((node, idx) => ({ ...node }))

  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1]
    const curr = result[i]

    if (prev.isLocation) {
      // Предыдущий — локация. Вычисляем дроп для curr.name от prev.amount (budget)
      const budget = Number(prev.amount) || 0
      if (budget <= 0) {
        curr.amount = 0
        continue
      }
      const display = computeDisplayValue(curr.name, budget, prev.name, activePerks, exploringMode)
      const parsed = typeof display === 'number' && !Number.isNaN(Number(display)) ? Number(display) : null
      curr.amount = parsed && parsed >= 1 ? Math.floor(parsed) : 0
    } else {
      // Предыдущий — крафт. Вычисляем craftableCount для curr.name от prev.amount
      // Ищем рецепт curr.name, в котором prev.name является ингредиентом
      const availableAmount = Number(prev.amount) || 0
      if (availableAmount <= 0) {
        curr.amount = 0
        continue
      }
      const resourceSaverPercent = getResourceSaverPercent(activePerks || [])
      const prevNameNorm = String(prev.name).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
      const currNameNorm = String(curr.name).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
      let craftable = 0
      // Ищем рецепт с именем curr.name
      const recipe = combinedRecipes[curr.name]
      if (recipe) {
        const ing = recipe?.из || recipe?.ingredients || {}
        // Ищем в ингредиентах prev.name
        let requiredPerCraft = null
        const keys = Object.keys(ing || {})
        for (const k of keys) {
          const normalizedK = String(k).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
          if (normalizedK === prevNameNorm) {
            const val = ing[k]; requiredPerCraft = (typeof val === 'number') ? val : 1; break
          }
          const v = ing[k]
          if (v && typeof v === 'object') {
            const nestedKeys = Object.keys(v)
            for (const nk of nestedKeys) {
              const normalizedNk = String(nk).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
              if (normalizedNk === prevNameNorm) {
                const nestedVal = v[nk]; requiredPerCraft = (typeof nestedVal === 'number') ? nestedVal : 1; break
              }
            }
            if (requiredPerCraft != null) break
          }
        }
        if (requiredPerCraft != null) {
          const adjustedRequired = resourceSaverPercent > 0 ? (requiredPerCraft / (1 + resourceSaverPercent)) : requiredPerCraft
          const finalRequired = adjustedRequired > 0 ? adjustedRequired : requiredPerCraft
          craftable = finalRequired > 0 ? Math.floor(availableAmount / finalRequired) : 0
        }
      }
      curr.amount = craftable
    }
  }

  return result
}

/**
 * EconomyPlugin — простое зеркало режимов крафта и локаций.
 * Рендерится внутри .main, не использует createPortal.
 * Не имеет своего хедера, breadcrumbs, цепочек — только чистая логика.
 */
export default function EconomyPlugin({ setSidebarOpen, onExit }) {

  const {
    economyEnabled,
    economyChain,
    setEconomyChain,
    prices,
    currency,
    exchangeRates,
    advancedState,
    setAdvancedState,
    manualAdditions,
    addManualAddition,
    removeManualAddition,
    clearManualAdditions,
    staminaSource,
    cranberryStamina,
    clearEconomyChain,
  } = useEconomyContext()
  const { activePerks, exploringMode } = useActivePerks()

  const [view, setView] = useState('start') // 'start' | 'craft' | 'location' | 'advanced'
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

  // Используем синглтон из economyData — вычисляется 1 раз при первом обращении
  const combinedRecipes = combinedRecipesSingleton

  // --- Полный пересчёт цепочки при изменении перков или exploringMode ---
  // Пересчитываем все узлы цепочки от корня
  const recalculatedChain = useMemo(() => {
    return recalcChainFromRoot(craftChain, activePerks, exploringMode, combinedRecipes)
  }, [craftChain, activePerks, exploringMode, combinedRecipes])

  // Синхронизируем amount/locationAmount с пересчитанной цепочкой
  // для текущего отображаемого узла
  useEffect(() => {
    if (recalculatedChain.length === 0) return
    const lastNode = recalculatedChain[recalculatedChain.length - 1]
    if (lastNode.isLocation) {
      // Для локации обновляем locationAmount только если это корневой узел
      // (первый в цепочке) — он editable
      if (recalculatedChain.length === 1) {
        setLocationAmount(Number(lastNode.amount) || 1)
      }
    } else {
      setAmount(Number(lastNode.amount) || 1)
    }
  }, [recalculatedChain])

  // --- Craft logic (копия из App.jsx) ---
  const result = useMemo(() => {
    if (!selectedItem || !combinedRecipes[selectedItem]) return null
    const cleanAmount = typeof amount === 'string' ? amount.replace(/\s/g, '') : amount
    return calculateAllResources(selectedItem, Number(cleanAmount) || 1, activePerks, combinedRecipes)
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

  // Прекомпьютированный Set предметов, используемых как ингредиенты
  const usedItemsSet = useMemo(() => getUsedItemsSet(), [])

  const hasItemContent = useCallback((itemName) => {
    if (isCraftable(itemName)) return true
    // O(1) проверка через прекомпьютированный Set вместо O(n) findRecipesThatUse
    if (usedItemsSet.has(itemName)) return true
    const locations = getItemLocations(itemName) || []
    if (locations.length > 0) return true
    return false
  }, [isCraftable, usedItemsSet])

  const navigateToItem = useCallback((itemName, quantity) => {
    if (!hasItemContent(itemName)) return
    setSelectedItem(itemName)
    setAmount(quantity)
    setView('craft')
    // Если мы в локации — сохраняем локацию как корень цепочки
    if (view === 'location') {
      setCraftChain(prev => {
        if (prev.length === 0 || !prev[0]?.isLocation) {
          return [
            { name: selectedLocation, amount: locationAmount, isLocation: true, savedAmount: locationAmount, editable: true },
            { name: itemName, amount: quantity, editable: false }
          ]
        }
        return [...prev, { name: itemName, amount: quantity, editable: false }]
      })
    } else {
      // Берём количество из пересчитанной цепочки для текущего узла
      const currentAmount = recalculatedChain.length > 0
        ? Number(recalculatedChain[recalculatedChain.length - 1]?.amount) || 1
        : quantity
      setCraftChain(prev => [...prev, { name: itemName, amount: currentAmount, editable: false }])
    }
  }, [hasItemContent, setCraftChain, view, selectedLocation, locationAmount, recalculatedChain])

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

  // Auto-scroll breadcrumbs to the rightmost (latest) node when chain updates
  useEffect(() => {
    try {
      if (breadcrumbsRef && breadcrumbsRef.current) {
        const el = breadcrumbsRef.current
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
      }
    } catch (e) {
      // ignore
    }
  }, [craftChain])

  // --- Handlers ---
  const handleCraftSelect = (name, qty) => {
    setSelectedItem(name)
    setAmount(qty)
    setItemSelectMode(null)
    setView('craft')
    if (setCraftChain) {
      setCraftChain([{ name, amount: qty, editable: true }])
    }
    // При выборе нового предмета очищаем advancedState и manualAdditions,
    // чтобы в Advanced режиме не отображались данные от предыдущего выбора
    setAdvancedState([])
    clearManualAdditions()
  }

  const handleLocationSelect = (name, qty) => {
    setSelectedLocation(name)
    setLocationAmount(qty)
    setItemSelectMode(null)
    setView('location')
    if (setCraftChain) {
      setCraftChain([{ name, amount: qty, isLocation: true, savedAmount: qty, editable: true }])
    }
    // При выборе новой локации очищаем advancedState и manualAdditions
    setAdvancedState([])
    clearManualAdditions()
  }

  // --- Колбэк для крафта из leftovers (добавляет ноду в цепочку) ---
  const handleCraftFromLeftover = useCallback((itemName, quantity) => {
    setCraftChain(prev => [...prev, { name: itemName, amount: quantity, editable: false }])
  }, [setCraftChain])

  // --- getLocationDrops — колбэк для получения всех дропов локации ---
  const getLocationDrops = useCallback((locationName, budget) => {
    if (!locationName || !budget || budget <= 0) return []
    const locObj = APPLE_CIDER_REAL_DROP_RATES.locations?.[locationName]
    if (!locObj) return []

    const itemSet = new Set()
    Object.values(locObj).forEach(variant => {
      if (variant && typeof variant === 'object') Object.keys(variant).forEach(k => itemSet.add(k))
    })

    return Array.from(itemSet).map(it => {
      const display = computeDisplayValue(it, budget, locationName, activePerks, exploringMode)
      const parsed = typeof display === 'number' && !Number.isNaN(Number(display)) ? Number(display) : 0
      return { name: it, amount: parsed >= 1 ? Math.floor(parsed) : 0 }
    }).filter(d => d.amount > 0)
  }, [activePerks, exploringMode])

  // Close sidebar when item select modal opens
  useEffect(() => {
    if (itemSelectMode !== null && setSidebarOpen) {
      setSidebarOpen(false)
    }
  }, [itemSelectMode, setSidebarOpen])

  // Определяем, является ли текущий узел редактируемым

  const isCurrentEditable = recalculatedChain.length <= 1 ||
    (recalculatedChain[recalculatedChain.length - 1]?.editable !== false)

  // Не размонтируем компонент при выключении — скрываем через CSS.
  // Это сохраняет состояние (selectedItem, amount, craftChain, view) в памяти,
  // и при повторном включении не происходит пересоздания всех useMemo/useEffect.
  return (
    <div className="economy-plugin" style={{ display: economyEnabled ? '' : 'none' }}>
      <EconomyAppHeader
        headerVisible={true}
        isCaching={false}
        cachingProgress={0}
        isOffline={false}
        craftChain={recalculatedChain}
        setCraftChain={setCraftChain}
        breadcrumbsRef={breadcrumbsRef}
        setSelectedItem={setSelectedItem}
        setAmount={setAmount}
        itemsData={STATIC_ITEMS_MAP}
        buddyFarmLinksEnabled={false}
        onExit={onExit}
        view={view}
        setView={setView}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        locationAmount={locationAmount}
        setLocationAmount={setLocationAmount}
        setSidebarOpen={setSidebarOpen}
        onClearAdvancedState={() => { setAdvancedState([]); clearManualAdditions() }}
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
              {isCurrentEditable ? (
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
                    // Обновляем корневой узел цепочки
                    setCraftChain(prev => {
                      if (prev.length === 0) return prev
                      const updated = [...prev]
                      updated[0] = { ...updated[0], amount: numericValue || 1 }
                      return updated
                    })
                  }}
                />
              ) : (
                <input
                  className="input amount-input" type="text"
                  value={formatNumberRounded(Number(amount) || 0)}
                  readOnly
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              )}
            </label>
          </section>

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

      {/* Advanced mode — экономический расчёт (ленивая загрузка) */}
      {view === 'advanced' && (
        <Suspense fallback={<div className="glass card" style={{ padding: '1rem', textAlign: 'center', opacity: 0.6 }}>Loading Advanced...</div>}>
          <LazyEconomyAdvancedView
            chain={recalculatedChain}
            prices={prices}
            currency={currency}
            exchangeRates={exchangeRates}
            advancedState={advancedState}
            setAdvancedState={setAdvancedState}
            manualAdditions={manualAdditions}
            addManualAddition={addManualAddition}
            removeManualAddition={removeManualAddition}
            recipes={combinedRecipes}
            resourceSaverPercent={getResourceSaverPercent(activePerks || [])}
            getLocationDrops={getLocationDrops}
            onCraftFromLeftover={handleCraftFromLeftover}
            exploringMode={exploringMode}
            staminaSource={staminaSource}
            cranberryStamina={cranberryStamina}
            activePerks={activePerks}
          />
        </Suspense>
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
                  const newVal = Math.round(parseFloat(final) * 100) / 100
                  setLocationAmount(newVal)
                  // Обновляем корневой узел цепочки
                  setCraftChain(prev => {
                    if (prev.length === 0) return prev
                    const updated = [...prev]
                    updated[0] = { ...updated[0], amount: newVal || 1, savedAmount: newVal || 1 }
                    return updated
                  })
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
                        {/* В режиме локации дропы только для чтения — показываем значение без input */}
                        <span className="v">{formatNumberRounded(parsed != null ? parsed : 0)}</span>
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
