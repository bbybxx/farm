import { APPLE_CIDER_REAL_DROP_RATES } from '../data/apple-cider-real-drop-rates.js'
import { computePinnedEstimate, getItemLocations } from '../utils/exploringUtils.js'
import { getRecipe } from '../utils/recipeUtils.js'
import { getResourceSaverPercent, getSilverDiscountPercent } from '../utils/calculator.js'

// Phase 1+small: wrapper that queries computePinnedEstimate per-location and
// also considers single-step craft chains (recipes that directly produce the target).
// For craft chains we pick best per-ingredient sources (globally) and sum their
// required budgets as a simple aggregated cost. This is approximate but useful
// for ranking one-step craft options alongside direct location sources.
export default function findBestSources(resourceName, requiredAmount, { activePerks = [], exploringMode = 'Apple Cider', ignoreIronNailsInFindSources = true } = {}) {
  const locationsObj = (APPLE_CIDER_REAL_DROP_RATES && APPLE_CIDER_REAL_DROP_RATES.locations) || {}
  const results = []
  const resourceSaver = getResourceSaverPercent(activePerks)
  const silverDiscount = getSilverDiscountPercent(activePerks)

  // memoization for recursive search: key = `${item}|${qty}|${mode}`
  const memo = {}

  function computeMinForItem(item, qty) {
  const key = `${item}|${qty}|${exploringMode}|ignoreIron=${ignoreIronNailsInFindSources}`
    if (memo[key]) return memo[key]

    const qtyNum = Math.max(1, Math.ceil(Number(qty) || 0))

    // Option 1: farm directly from locations
    let bestFarm = null
    const locs = getItemLocations(item) || []
    for (const loc of locs) {
      try {
        // ask computePinnedEstimate for the desired quantity to get accurate stamina totals
        const est = computePinnedEstimate({ name: item, location: loc.name }, qtyNum, activePerks, exploringMode)
        if (!est) continue
        // extract perUnit based on mode
        let requiredBudget = null
        let staminaBudget = null
        if (est.mode === 'AC') {
          // computePinnedEstimate returns totalStamina for the requested quantity
          staminaBudget = typeof est.totalStamina === 'number' ? est.totalStamina : null
          requiredBudget = typeof est.cidersNeeded === 'number' ? est.cidersNeeded : null
        } else if (est.mode === 'EXP') {
          staminaBudget = typeof est.stamina === 'number' ? est.stamina : (typeof est.explores === 'number' ? est.explores : null)
          requiredBudget = staminaBudget
        } else if (est.mode === 'AP') {
          // Ignore AP routes unless user asked for Arnold Palmer mode
          if (exploringMode !== 'Arnold Palmer') continue
          // For AP mode we keep apNeeded as requiredBudget
          requiredBudget = typeof est.apNeeded === 'number' ? est.apNeeded : null
          staminaBudget = null
        }
        if ((staminaBudget == null) && (requiredBudget == null)) continue
        // prefer lower staminaBudget when available, else lower requiredBudget
        const compareKey = staminaBudget != null ? staminaBudget : requiredBudget
        // also capture per-unit and explicit AP/AC totals so the UI can label correctly
        const { perUnit } = perUnitFromEst(est, exploringMode)
        const apNeeded = typeof est.apNeeded === 'number' ? est.apNeeded : null
        const cidersNeeded = typeof est.cidersNeeded === 'number' ? est.cidersNeeded : null
        const totalStamina = typeof est.totalStamina === 'number' ? est.totalStamina : (typeof est.stamina === 'number' ? est.stamina : (typeof est.explores === 'number' ? est.explores : null))
        if (!bestFarm || (bestFarm.compareKey == null) || compareKey < bestFarm.compareKey) {
          bestFarm = { method: 'farm', item, qty: qtyNum, location: loc.name, perUnit, requiredBudget, staminaBudget, compareKey, mode: est.mode, apNeeded, cidersNeeded, totalStamina }
        }
      } catch (e) {
        // skip
      }
    }

    // Option 2: craft (if recipe exists)
    let bestCraft = null
  const recipe = getRecipe(item)
    if (recipe) {
      const ingredients = recipe.ingredients || recipe['из'] || {}
      let totalBudget = 0
      let totalSilver = 0
      const children = []
      let allHave = true
      for (const [ing, ingQtyRaw] of Object.entries(ingredients)) {
        const perCraftQty = Number(ingQtyRaw || 0)
        // apply resource saver: reduce required quantity proportionally
        const needed = Math.ceil((perCraftQty * qtyNum) / (1 + resourceSaver))
        const child = computeMinForItem(ing, needed)
          if (!child || child.budget == null) {
          allHave = false
          children.push({ ingredient: ing, qtyNeeded: needed, chosen: null })
          } else {
            // If child is an AP-based farm but user isn't in AP mode, treat as missing
            if (child.method === 'farm' && child.mode === 'AP' && exploringMode !== 'Arnold Palmer') {
              allHave = false
              children.push({ ingredient: ing, qtyNeeded: needed, chosen: null })
            } else {
              // Optionally ignore Iron and Nails in aggregated cost for Find sources
              // treat 'iron' and 'nail' variants as ignorable when setting enabled
              const ingLower = String(ing || '').toLowerCase()
              const isIronOrNails = /iron|nail/.test(ingLower)
              if (ignoreIronNailsInFindSources && isIronOrNails) {
                // treat as base, don't add its budget
                children.push({ ingredient: ing, qtyNeeded: needed, chosen: Object.assign({}, child, { method: 'base', budget: 0 }) })
              } else {
                totalBudget += (child.budget || 0)
                totalSilver += (child.silver || 0)
                children.push({ ingredient: ing, qtyNeeded: needed, chosen: child })
              }
            }
        }
      }
      // include this recipe's silver cost (per craft) with discount
      if (recipe.Silver) {
        totalSilver += Math.ceil((recipe.Silver || 0) * (1 - silverDiscount)) * qtyNum
      }
      if (allHave) {
        // totalBudget is sum of children's budgets (stamina or requiredBudget depending on child)
        bestCraft = { method: 'craft', item, qty: qtyNum, requiredBudget: totalBudget, budget: totalBudget, silver: totalSilver, children }
      }
    }

    // choose best: prefer minimal staminaBudget when available, otherwise minimal requiredBudget
    let chosen = null
    if (bestFarm && bestCraft) {
      const farmKey = bestFarm.compareKey != null ? bestFarm.compareKey : (bestFarm.requiredBudget != null ? bestFarm.requiredBudget : Infinity)
      const craftKey = bestCraft.budget != null ? bestCraft.budget : Infinity
      if (farmKey <= craftKey) chosen = Object.assign({}, bestFarm, { budget: farmKey })
      else chosen = Object.assign({}, bestCraft, { budget: craftKey })
    } else if (bestFarm) {
      chosen = Object.assign({}, bestFarm, { budget: bestFarm.compareKey != null ? bestFarm.compareKey : bestFarm.requiredBudget })
    } else if (bestCraft) {
      chosen = Object.assign({}, bestCraft, { budget: bestCraft.budget })
    } else {
      // If there are no locations and no craft, treat as base material (gathered outside exploring)
  const locsForItem = getItemLocations(item) || []
  if ((!locsForItem || locsForItem.length === 0) && !getRecipe(item)) {
        chosen = { method: 'base', item, qty: qtyNum, budget: 0 }
      } else {
        chosen = { method: 'unknown', item, qty: qtyNum, budget: null }
      }
    }

    memo[key] = chosen
    return chosen
  }

  // helper: normalize computePinnedEstimate result -> perUnit and modeKey
  function perUnitFromEst(est, mode) {
    if (!est) return { perUnit: null, modeKey: null, extra: {} }
    if (mode === 'Apple Cider' || est.mode === 'AC') {
      const perUnit = est.effectiveDropsPerCider || est.dropsPerCider || null
      return { perUnit: perUnit || null, modeKey: 'AC', extra: { totalStamina: est.totalStamina, variant: est.variant } }
    }
    if (mode === 'Arnold Palmer' || est.mode === 'AP') {
      const perUnit = est.itemsPerAP || est.itemsPerArnoldPalmer || null
      return { perUnit: perUnit || null, modeKey: 'AP', extra: { apNeeded: est.apNeeded } }
    }
    // Manual / stamina fallback
    if (est.mode === 'EXP' || mode === 'Manually' || mode === 'Manual') {
      const staminaPerItem = (typeof est.stamina === 'number' && est.stamina > 0) ? est.stamina : (typeof est.explores === 'number' ? est.explores : null)
      return { perUnit: staminaPerItem || null, modeKey: 'EXP', extra: {} }
    }
    return { perUnit: null, modeKey: mode, extra: {} }
  }

  // compute direct per-location estimates for the requested resource
    Object.keys(locationsObj).forEach(locName => {
    try {
  // skip locations that don't contain this resource (avoid computePinnedEstimate falling back to other locations)
  const locRaw = locationsObj[locName]
  const hasItemHere = locRaw && Object.values(locRaw).some(v => v && (resourceName in v))
  if (!hasItemHere) return

  // compute estimate for the requested total amount so we can include totals like cidersNeeded/apNeeded/totalStamina
  const qtyForEstimate = Math.max(1, Math.ceil(Number(requiredAmount) || 0))
  const est = computePinnedEstimate({ name: resourceName, location: locName }, qtyForEstimate, activePerks, exploringMode)
  if (!est) return
      const { perUnit, modeKey, extra } = perUnitFromEst(est, exploringMode)
      if (perUnit && perUnit > 0) {
        const requiredBudget = Math.ceil((Number(requiredAmount) || 0) / perUnit)
        const apNeeded = typeof est.apNeeded === 'number' ? est.apNeeded : null
        const cidersNeeded = typeof est.cidersNeeded === 'number' ? est.cidersNeeded : null
        const totalStamina = extra && extra.totalStamina != null ? extra.totalStamina : (typeof est.stamina === 'number' ? est.stamina : (typeof est.explores === 'number' ? est.explores : null))
        results.push(Object.assign({ kind: 'location', location: locName, mode: modeKey, perUnit, requiredBudget, hasData: true, apNeeded, cidersNeeded, totalStamina }, extra))
      }
    } catch (e) {
      // ignore failing locations for now
    }
  })

  // Helper: find best location for an arbitrary item and required total qty
  function findBestLocationForItem(itemName, totalQty) {
    let best = null
    Object.keys(locationsObj).forEach(locName => {
      try {
        // request estimate for the total needed quantity so totals like apNeeded/cidersNeeded are accurate
        const qtyForEstimate = Math.max(1, Math.ceil(Number(totalQty) || 0))
        const est = computePinnedEstimate({ name: itemName, location: locName }, qtyForEstimate, activePerks, exploringMode)
        if (!est) return
        const { perUnit, modeKey, extra } = perUnitFromEst(est, exploringMode)
        if (perUnit && perUnit > 0) {
          const requiredBudget = Math.ceil((Number(totalQty) || 0) / perUnit)
          const apNeeded = typeof est.apNeeded === 'number' ? est.apNeeded : null
          const cidersNeeded = typeof est.cidersNeeded === 'number' ? est.cidersNeeded : null
          const totalStamina = extra && extra.totalStamina != null ? extra.totalStamina : (typeof est.stamina === 'number' ? est.stamina : (typeof est.explores === 'number' ? est.explores : null))
          if (!best || requiredBudget < best.requiredBudget) {
            best = { item: itemName, location: locName, perUnit, requiredBudget, mode: modeKey, apNeeded, cidersNeeded, totalStamina }
          }
        }
      } catch (e) {
        // skip
      }
    })
    return best
  }

  // Find single-step recipes that produce the resource and compute aggregated cost
  // compute full best plan for the requested resource (recursive)
  const topPlan = computeMinForItem(resourceName, Number(requiredAmount) || 1)

  const craftResults = []
  if (topPlan) {
    if (topPlan.method === 'craft') {
      // enrich breakdown entries with best farm location for each base ingredient
      const breakdown = (topPlan.children || []).map(entry => {
        const e = Object.assign({}, entry)
        try {
          if (e.chosen) {
            // if chosen has no explicit location, try to find the best location for this ingredient
            const chosenItem = e.chosen.item || e.ingredient
            if (!e.chosen.location) {
              const best = findBestLocationForItem(chosenItem, e.qtyNeeded)
              if (best) e.chosen.bestLocation = best
            } else {
              // still attempt to find a bestLocation for display (may provide stamina/AP totals)
              const best = findBestLocationForItem(chosenItem, e.qtyNeeded)
              if (best) e.chosen.bestLocation = best
            }
          } else {
            // no chosen plan — attempt to find a farm location
            const best = findBestLocationForItem(e.ingredient, e.qtyNeeded)
            if (best) e.chosen = { method: 'farm', item: e.ingredient, bestLocation: best }
          }
        } catch (err) {
          // ignore
        }
        return e
      })
      craftResults.push({ kind: 'craft', recipe: resourceName, breakdown, requiredBudget: topPlan.budget, hasData: true })
    }
    if (topPlan.method === 'farm') {
      // pass through ap/cider/stamina totals if available so the UI can label correctly
      craftResults.push(Object.assign({ kind: 'location', location: topPlan.location, perUnit: topPlan.perUnit, requiredBudget: topPlan.requiredBudget, hasData: true },
        topPlan.apNeeded != null ? { apNeeded: topPlan.apNeeded } : {},
        topPlan.cidersNeeded != null ? { cidersNeeded: topPlan.cidersNeeded } : {},
        topPlan.totalStamina != null ? { totalStamina: topPlan.totalStamina } : {},
        topPlan.staminaBudget != null ? { staminaBudget: topPlan.staminaBudget } : {},
        topPlan.mode != null ? { mode: topPlan.mode } : {}
      ))
    }
  }

  // Merge and sort: location entries first by requiredBudget, then craft entries
  const allResults = []
  // push location results (already in `results`)
  results.forEach(r => allResults.push(r))
  // push craft results
  craftResults.forEach(c => allResults.push(c))

  // remove duplicate location entries (same kind='location' and same location)
  const deduped = []
  const seen = new Set()
  allResults.forEach(r => {
    if (r.kind === 'location') {
      const key = `loc:${r.location}:${r.mode || ''}`
      if (!seen.has(key)) { seen.add(key); deduped.push(r) }
    } else {
      deduped.push(r)
    }
  })

  deduped.sort((a, b) => {
    const aHas = a.hasData !== false && typeof a.requiredBudget === 'number'
    const bHas = b.hasData !== false && typeof b.requiredBudget === 'number'
    if (aHas && bHas) return a.requiredBudget - b.requiredBudget
    if (aHas) return -1
    if (bHas) return 1
    // deterministic fallback
    const aLabel = a.kind === 'location' ? (a.location || '') : (a.recipe || '')
    const bLabel = b.kind === 'location' ? (b.location || '') : (b.recipe || '')
    return aLabel.localeCompare(bLabel)
  })
  // If the item is only obtainable from a single location (only one location result),
  // and there are no meaningful craft results, prefer returning just that location
  const locationOnly = deduped.filter(r => r.kind === 'location' && r.hasData)
  const craftHas = allResults.some(r => r.kind === 'craft' && r.hasData)
  if (locationOnly.length === 1 && !craftHas) {
    return [locationOnly[0]]
  }

  return deduped
}
