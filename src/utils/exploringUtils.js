import { APPLE_CIDER_DATA, AppleCiderCalculator } from '../data/apple-cider-complete-data.js'
import APPLE_CIDER_REAL_DROP_RATES from '../data/apple-cider-real-drop-rates.js'
import { ArnoldPalmerDropCalculator } from '../data/arnold-palmer-drop-rates.js'
import {
  getLocationConfig,
  applyLocationOverrides
} from '../data/location-config.js'

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
    hasSprintI: has('Sprint Shoes I'),
    hasSprintII: has('Sprint Shoes II'),
    hasNeigh: has('Neigh'),
    hasCabbage: has('Cabbage Stew'),
  hasLemonSqueezer: has('Lemon Squeezer'),
  // New Runecube-related perk: Eagle Eye (Runecube)
  hasEagleEyeRunecube: has('Eagle Eye (Runecube)'),
  // Arnold Palmer meals
  hasLemonSeltzerMeal: has('Lemon Seltzer'),
  hasQuandaryChowderMeal: has('Quandary Chowder'),
  hasLemonCreamPieMeal: has('Lemon Cream Pie'),
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
function manualForLocation(quantity, locName, perksParsed) {
  const zone = APPLE_CIDER_DATA.zoneDropRates.base[locName]
  if (!zone) return null
  const exploresPerItem = zone.exploresPerItem || (1 / zone.rate)
  const requiredExplores = Math.ceil(quantity * exploresPerItem)
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
    const manual = manualForLocation(quantity, loc.name, perks)
    if (manual) {
      if (!bestManual || manual.explores < bestManual.explores) bestManual = Object.assign({ location: loc.name }, manual)
    }

    // cider: need dropsPerCider for the item in appropriate variant
    const adjustedVariants = applyLocationOverrides(loc.variants, loc.name)
    // prefer rq1 or rq0? use rq1 if exists for item in rq1cs1/rq1cs0 else use rq0
    const variantsToTry = ['rq1cs1','rq1cs0','rq0cs1','rq0cs0']
    for (const vKey of variantsToTry) {
      const v = adjustedVariants[vKey]
      if (!v) continue
      const itemEntry = v[itemName]
      if (!itemEntry) continue
  const dropsPerCider = (typeof itemEntry === 'object' && itemEntry.dropsPerCider) ? itemEntry.dropsPerCider : (typeof itemEntry === 'number' ? itemEntry : null)
  if (!dropsPerCider) continue
  // computes explores per cider for this location: we need EE from location config
  const locCfg = getLocationConfig(loc.name) || { exploringEffectiveness: 1, multiplier: 1 }
  const ee = locCfg.exploringEffectiveness || 0
  // Cinnamon should increase explores (so more drops per cider) but should NOT increase stamina per cider.
  // Compute explores used for drop-scaling with cinnamon (if present), but compute stamina using the non-cinnamon explores
  const exploresPerCider = AppleCiderCalculator.calculateExplores(ee, perks.hasSprintI, perks.hasSprintII, perks.hasCinnamon)
  const exploresPerCiderForStamina = AppleCiderCalculator.calculateExplores(ee, perks.hasSprintI, perks.hasSprintII, false)
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
        // - Lemon Cream Pie does NOT reduce AP needed; it allows using multiple AP per click (speed)
        let apItemMultiplier = 1
        if (perks.hasLemonSeltzerMeal) apItemMultiplier *= 1.5
        if (perks.hasQuandaryChowderMeal) apItemMultiplier *= 1.10
        const clickMultiplier = perks.hasLemonCreamPieMeal ? 5 : 1

        const itemsPerAP = itemsPerAPBase * apItemMultiplier
        const apNeeded = Math.ceil(quantity / itemsPerAP)
        const actionsNeeded = Math.ceil(apNeeded / clickMultiplier)
        const candidateAP = { location: loc.name, itemsPerAP, apNeeded, actionsNeeded, apItemMultiplier, clickMultiplier }
        if (!bestAP || apNeeded < bestAP.apNeeded) bestAP = candidateAP
      }
    } catch (e) {
      // ignore lookup errors
    }
  }

  // Return depending on exploringMode
  if (exploringMode === 'Manually') {
    return bestManual ? { mode: 'EXP', ...bestManual } : null
  }
  if (exploringMode === 'Apple Cider') {
    return bestCider ? { mode: 'AC', ...bestCider } : null
  }
  if (exploringMode === 'Arnold Palmer') {
    return bestAP ? { mode: 'AP', ...bestAP } : null
  }
  // default: return all three
  return { manual: bestManual, cider: bestCider, ap: bestAP }
}
