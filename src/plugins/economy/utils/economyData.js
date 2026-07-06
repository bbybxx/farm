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
import { parseItemPrices, parsePriceString } from './parsePriceString'

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
      // Удаляем всю конструкцию (<i>meal</i>) целиком, а не только HTML-теги
      const name = item.name.replace(/\s*\(<i>meal<\/i>\)\s*/g, '').trim()
      const parsed = parseItemPrices(item)

      // Для крафтовых meal-предметов: если цена не содержит /k, /100 или [100], добавляем [100]
      // Дроповые meals (Acorn Pie, Crunchy Omelette, Fish and Chips) — цена за 1, [100] не добавляем
      if (item.name.includes('<i>meal</i>') && name in getRecipes()) {
        for (const currency of ['gold', 'ap', 'oj']) {
          const raw = item[currency]
          if (raw && typeof raw === 'string' && raw.trim()) {
            const lower = raw.toLowerCase()
            if (!lower.includes('/k') && !lower.includes('/100') && !lower.includes('[100]')) {
              // Перепарсиваем с добавленным [100]
              const newRaw = raw.trim() + ' [100]'
              parsed[currency] = parsePriceString(newRaw)
            }
          }
        }
      }

      result[name] = parsed
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
