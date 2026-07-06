import { APPLE_CIDER_DATA, AppleCiderCalculator } from '../data/apple-cider-complete-data.js'
import { APPLE_CIDER_REAL_DROP_RATES } from '../data/apple-cider-real-drop-rates.js'
import { ArnoldPalmerDropCalculator } from '../data/arnold-palmer-drop-rates.js'
import {
  getLocationConfig,
  applyLocationOverrides
} from '../data/location-config.js'

// Cache for computePinnedEstimate results - limited size LRU-like cache
const estimateCache = new Map()
const CACHE_MAX_SIZE = 500

function getCacheKey(pinnedItem, quantity, activePerks, exploringMode) {
  const loc = pinnedItem.location || pinnedItem.selectedLocation || ''
  return `${pinnedItem.name}|${loc}|${quantity}|${activePerks.sort().join(',')}|${exploringMode}`
}

function cacheSet(key, value) {
  if (estimateCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest entry (first key)
    const firstKey = estimateCache.keys().next().value
    estimateCache.delete(firstKey)
  }
  estimateCache.set(key, value)
}

// Helpers to interpret activePerks
function parsePerks(activePerks = []) {
  // normalize perk names (strip parenthesis suffixes like "(Farm Supply)")
  // normalize perk names: strip parenthesis suffixes like "(Farm Supply)" but keep important suffixes like (Runecube)
  const normalize = (s = '') => String(s).replace(/\s*\((?!Runecube\b).*?\)\s*/g, '').trim()
  const has = (name) => activePerks.some(p => normalize(p) === normalize(name))
  const wandererPerks = []
  if (has('Wanderer I')) wandererPerks.push(1)
  if (has('Wanderer II')) wandererPerks.push(2)
  if (has('Wanderer III')) wandererPerks.push(3)
  if (has('Wanderer IV')) wandererPerks.push(4)
  return {
    hasCinnamon: has('Cinnamon Sticks'),
    hasNeigh: has('Neigh'),
    hasLemonSqueezer: has('Lemon Squeezer'),
    // New Runecube-related perk: Eagle Eye (Runecube)
    hasEagleEyeRunecube: has('Eagle Eye (Runecube)'),
    // Cockatrice Ether Source - doubles drop rate for specific insects
    hasCockatriceEtherSource: has('Cockatrice Ether Source'),
    // Arnold Palmer meals
    hasLemonSeltzerMeal: has('Lemon Seltzer'),
    hasQuandaryChowderMeal: has('Quandary Chowder'),
    wandererPerks
  }
}

// Find locations where item exists in apple-cider data
export function getItemLocations(itemName) {
  const res = []
  const locs = APPLE_CIDER_REAL_DROP_RATES.locations || {}
  for (const [locName, variants] of Object.entries(locs)) {
    // find any variant containing the item
  const hasItem = ['rq0cs0','rq0cs1','rq1cs0','rq1cs1'].some(k => variants[k] && (itemName in variants[k]))
    if (hasItem) res.push({ name: locName, variants })
  }
  return res
}

// Keep backward-compatible local name
const findItemLocations = getItemLocations

// Compute manual exploring numbers for item in a location
function manualForLocation(quantity, locName, perksParsed, itemName = null) {
  const zone = APPLE_CIDER_DATA.zoneDropRates.base[locName]
  if (!zone) return null
  const exploresPerItem = zone.exploresPerItem || (1 / zone.rate)
  let adjustedExploresPerItem = exploresPerItem
  // If Runecube perk is active and we have real-drop variants, adjust manual explores
  try {
    if (perksParsed.hasEagleEyeRunecube && itemName) {
      const locObj = APPLE_CIDER_REAL_DROP_RATES.locations && APPLE_CIDER_REAL_DROP_RATES.locations[locName]
      if (locObj) {
        // prefer comparing rq1 vs rq0 for same cinnamon state
        const cs = perksParsed.hasCinnamon ? 'cs1' : 'cs0'
        const rq0 = locObj[`rq0${cs}`] && locObj[`rq0${cs}`][itemName]
        const rq1 = locObj[`rq1${cs}`] && locObj[`rq1${cs}`][itemName]
        const drops0 = rq0 && (typeof rq0 === 'object' ? rq0.dropsPerCider || rq0.cidersPerDrop : rq0)
        const drops1 = rq1 && (typeof rq1 === 'object' ? rq1.dropsPerCider || rq1.cidersPerDrop : rq1)
        if (drops0 && drops1 && drops1 > 0) {
          // If rq1 gives more drops per cider, reduce explores per item proportionally
          // We assume drops values are comparable; compute factor to scale explores
          const factor = (drops0 / drops1)
          adjustedExploresPerItem = exploresPerItem * factor
        }
      }
    }
  } catch (e) {
    // ignore and fall back to unadjusted
  }
  const requiredExplores = Math.ceil(quantity * adjustedExploresPerItem)
  const stamina = AppleCiderCalculator.calculateStamina(requiredExplores, perksParsed.wandererPerks, perksParsed.hasNeigh)
  return { explores: requiredExplores, stamina }
}

// Compute apple cider numbers for item in a location
function ciderForLocation(quantity, locEntry, perksParsed) {
  const locName = locEntry.name
  // get location config and apply overrides
  const rawVariants = locEntry.variants
  const cfg = getLocationConfig(locName) || {}
  const adjusted = applyLocationOverrides(rawVariants, locName)

  // choose variant depending on cinnamon perk
  const variantKey = perksParsed.hasCinnamon ? 'rq0cs1' : 'rq0cs0'
  // prefer rq1 (runecube) if present? For cider, runecube doesn't apply; use cs1/cs0 from rq0 maybe but we check both rq0/1 for best
  let candidate = null
  // try rq1cs1/rq0cs1 depending on perk presence of runecube? We don't have runecube state in UI; assume no runecube (rq0)
  // choose cs1 if hasCinnamon else cs0
  for (const rq of ['rq1','rq0']) {
    const key = rq + (perksParsed.hasCinnamon ? 'cs1' : 'cs0')
    if (adjusted[key] && adjusted[key][quantity ? Object.keys(adjusted[key])[0] : null] !== undefined) {
      // nothing, fallback; we'll just try to read item below
    }
  }

  // try to read dropsPerCider for the item
  const itemName = null // caller will supply itemName via closure; here we instead let caller pass the itemName and locEntry
  return null
}

// General compute function: returns best estimate across locations
export function computePinnedEstimate(pinnedItem, quantity, activePerks, exploringMode) {
  // Check cache first
  const cacheKey = getCacheKey(pinnedItem, quantity, activePerks, exploringMode)
  if (estimateCache.has(cacheKey)) {
    return estimateCache.get(cacheKey)
  }

  // pinnedItem: { name, quantity, parentRecipe }
  const perks = parsePerks(activePerks)
  const itemName = pinnedItem.name
  let locations = findItemLocations(itemName)
  // If caller supplied a pinned location override, narrow to that location only
  const overrideLoc = pinnedItem && (pinnedItem.location || pinnedItem.selectedLocation)
  if (overrideLoc) {
    locations = locations.filter(l => l.name === overrideLoc)
    // if override doesn't match any known location, keep original list
    if (!locations || locations.length === 0) {
      locations = findItemLocations(itemName)
    }
  }
  if (!locations || locations.length === 0) return null

  // For manual and cider we compute minimal across locations
  let bestManual = null
  let bestCider = null
  let bestAP = null

  for (const loc of locations) {
  const manual = manualForLocation(quantity, loc.name, perks, itemName)
    if (manual) {
      if (!bestManual || manual.explores < bestManual.explores) bestManual = Object.assign({ location: loc.name }, manual)
    }

    // cider: need dropsPerCider for the item in appropriate variant
    const adjustedVariants = applyLocationOverrides(loc.variants, loc.name)
    // Determine variant preference based on Runecube perk
    let variantsToTry
    if (perks.hasEagleEyeRunecube) {
      variantsToTry = ['rq1cs1','rq1cs0','rq0cs1','rq0cs0']
    } else {
      variantsToTry = ['rq0cs1','rq0cs0','rq1cs1','rq1cs0']
    }
    for (const vKey of variantsToTry) {
      const v = adjustedVariants[vKey]
      if (!v) continue
      const itemEntry = v[itemName]
      if (!itemEntry) continue
      // Convert cidersPerDrop to dropsPerCider if needed
      let dropsPerCider = null
      if (typeof itemEntry === 'object') {
        if (itemEntry.dropsPerCider) {
          dropsPerCider = itemEntry.dropsPerCider
        } else if (itemEntry.cidersPerDrop) {
          // IMPORTANT: cidersPerDrop from API is actually "exploresPerDrop" (hits needed for 1 drop)
          // To get dropsPerCider: divide base explores (1010) by exploresPerDrop
          // Example: if exploresPerDrop = 8.98, then dropsPerCider = 1010 / 8.98 ≈ 112.5
          const baseExplores = APPLE_CIDER_DATA.basic.baseExplores || 1010
          dropsPerCider = baseExplores / itemEntry.cidersPerDrop
        }
      } else if (typeof itemEntry === 'number') {
        dropsPerCider = itemEntry
      }
      if (!dropsPerCider) continue
      
      // Apply Cockatrice Ether Source perk - doubles drop rate for specific insects
      if (perks.hasCockatriceEtherSource) {
        const cockatriceItems = [
          'Fire Ant', 'Caterpillar', 'Spider', 'Horned Beetle', 
          'Shiny Beetle', 'Snail', 'Giant Centipede', 
          'Ruby Scorpion', 'Onyx Scorpion'
        ]
        if (cockatriceItems.includes(itemName)) {
          dropsPerCider *= 2
        }
      }
      
  // computes explores per cider for this location: we need EE from location config
  const locCfg = getLocationConfig(loc.name) || { exploringEffectiveness: 1, multiplier: 1 }
  const ee = locCfg.exploringEffectiveness || 0
  // Cinnamon should increase explores (so more drops per cider) but should NOT increase stamina per cider.
  // Compute explores used for drop-scaling with cinnamon (if present), but compute stamina using the non-cinnamon explores
  const exploresPerCider = AppleCiderCalculator.calculateExplores(ee, false, false, false, perks.hasCinnamon)
  const exploresPerCiderForStamina = AppleCiderCalculator.calculateExplores(ee, false, false, false, false)
  // Scale dropsPerCider by explores scaling factor so Cinnamon / Sprint increase effective drops per cider
  const baseExplores = APPLE_CIDER_DATA.basic.baseExplores || 1010
  const scalingFactor = exploresPerCider / baseExplores
  const effectiveDropsPerCider = dropsPerCider * scalingFactor
  if (!effectiveDropsPerCider) continue
  const cidersNeeded = Math.ceil(quantity / effectiveDropsPerCider)
  // stamina per cider is computed from the non-cinnamon explores so Cinnamon only affects drops, not stamina cost
  const staminaPerCider = AppleCiderCalculator.calculateStamina(exploresPerCiderForStamina, perks.wandererPerks, perks.hasNeigh)
  // IMPORTANT: Cinnamon increases EE (reduces clicks/ciders) but should NOT reduce total stamina.
  // Compute what cidersNeeded would be WITHOUT Cinnamon and use that to compute totalStamina.
  const scalingNoCinnamon = exploresPerCiderForStamina / baseExplores
  const effectiveDropsNoCinnamon = dropsPerCider * scalingNoCinnamon
  const cidersNeededNoCinnamon = effectiveDropsNoCinnamon ? Math.ceil(quantity / effectiveDropsNoCinnamon) : cidersNeeded
  const totalStamina = cidersNeededNoCinnamon * staminaPerCider
  const candidate = { location: loc.name, variant: vKey, dropsPerCider, effectiveDropsPerCider, cidersNeeded, exploresPerCider, totalStamina }
      if (!bestCider || cidersNeeded < bestCider.cidersNeeded) bestCider = candidate
      break
    }

    // Arnold Palmer: use ArnoldPalmerDropCalculator.getItemDropRate
    try {
  // Pass runecube flag into ArnoldPalmer lookup when Eagle Eye (Runecube) perk is active
  const apInfo = ArnoldPalmerDropCalculator.getItemDropRate(loc.name, itemName, perks.hasLemonSqueezer, perks.hasEagleEyeRunecube)
      const itemsPerAPBase = apInfo && apInfo.itemsPerArnoldPalmer ? apInfo.itemsPerArnoldPalmer : null
      if (itemsPerAPBase && itemsPerAPBase > 0) {
        // Apply Arnold Palmer meals:
        // - Lemon Seltzer (+50%) and Quandary Chowder (+10%) increase items per AP (affect apNeeded)
        let apItemMultiplier = 1
        if (perks.hasLemonSeltzerMeal) apItemMultiplier *= 1.5
        if (perks.hasQuandaryChowderMeal) apItemMultiplier *= 1.10

        const itemsPerAP = itemsPerAPBase * apItemMultiplier
        const apNeeded = Math.ceil(quantity / itemsPerAP)
        const candidateAP = { location: loc.name, itemsPerAP, apNeeded, apItemMultiplier }
        if (!bestAP || apNeeded < bestAP.apNeeded) bestAP = candidateAP
      }
    } catch (e) {
      // ignore lookup errors
    }
  }

  // Return depending on exploringMode
  let result
  if (exploringMode === 'Manually') {
    result = bestManual ? { mode: 'EXP', ...bestManual } : null
  } else if (exploringMode === 'Apple Cider') {
    result = bestCider ? { mode: 'AC', ...bestCider } : null
  } else if (exploringMode === 'Arnold Palmer') {
    result = bestAP ? { mode: 'AP', ...bestAP } : null
  } else {
    // default: return all three
    result = { manual: bestManual, cider: bestCider, ap: bestAP }
  }
  cacheSet(cacheKey, result)
  return result
}
