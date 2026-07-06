/**
 * economyData.js
 * Shared singleton for heavy data used across economy plugin components.
 * Computed once on first access, cached forever.
 *
 * This eliminates 4× redundant normalizeItemsMap(itemsAPI) calls
 * and 2× redundant getCombinedRecipes() calls.
 */
import itemsAPI from '../../../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap } from '../../../utils/itemImageUtils'
import { getCombinedRecipes } from '../../../utils/recipeUtils'
import communityPrices from '../../../../prices.json'
import { parseItemPrices } from './parsePriceString'

let cache = null

export function getEconomyData() {
  if (cache) return cache
  cache = {
    itemsMap: normalizeItemsMap(itemsAPI),
    combinedRecipes: getCombinedRecipes(),
  }
  return cache
}

/**
 * Returns only the itemsMap (lighter accessor if recipes aren't needed).
 */
export function getItemsMap() {
  return getEconomyData().itemsMap
}

/**
 * Returns only combinedRecipes.
 */
export function getRecipes() {
  return getEconomyData().combinedRecipes
}

/**
 * Precomputed Set of item names that appear as ingredients in any recipe.
 * Used to avoid O(n²) lookups in EconomyItemSelectModal.
 * Built once, cached forever.
 */
let usedItemsSetCache = null

function buildUsedItemsSet(recipes) {
  const set = new Set()
  Object.values(recipes).forEach(recipe => {
    const ingredients = recipe.ingredients || recipe.из || {}
    Object.keys(ingredients).forEach(ing => set.add(ing))
  })
  return set
}

export function getUsedItemsSet() {
  if (!usedItemsSetCache) {
    usedItemsSetCache = buildUsedItemsSet(getRecipes())
  }
  return usedItemsSetCache
}

/**
 * Builtin prices parsed from prices.json (community prices).
 * Cached forever after first access.
 * Skips PC items.
 */
let _builtinPrices = null

function ensureBuiltinPrices() {
  if (_builtinPrices) return
  const result = {}
  if (communityPrices?.items) {
    for (const item of communityPrices.items) {
      if (item.PC) continue
      const name = item.name.replace(/<[^>]*>/g, '').trim()
      result[name] = parseItemPrices(item)
    }
  }
  _builtinPrices = result
}

/**
 * Returns the parsed builtin prices object.
 * @returns {Object<string, {gold: {value: number|null, divisor: number}, ap: ..., oj: ...}>}
 */
export function getBuiltinPrices() {
  ensureBuiltinPrices()
  return _builtinPrices || {}
}
