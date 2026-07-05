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
