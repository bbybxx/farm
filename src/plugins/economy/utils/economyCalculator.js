/**
 * economyCalculator.js
 * Чистые функции для экономических расчётов.
 * Ни одна функция не мутирует входные данные.
 *
 * Формат цен: { gold: { value: number|null, divisor: number }, ap: ..., oj: ... }
 * Для per-unit цены используем value / divisor.
 */

import { getPerUnitPrice } from './parsePriceString'

/**
 * Общая стоимость всех ресурсов в цепочке.
 * @param {Array<{name: string, amount: number, fixed?: boolean}>} chain — economyChain
 * @param {Object<string, {gold?: {value: number|null, divisor: number}, ap?: ..., oj?: ...}>} prices — объект цен
 * @returns {number}
 */
export function calculateCost(chain, prices) {
  return chain.reduce((sum, item) => {
    const price = prices[item.name]
    const goldPrice = price?.gold ? getPerUnitPrice(price.gold) : 0
    return sum + (goldPrice ?? 0) * item.amount
  }, 0)
}

/**
 * Выручка от продажи всех остатков.
 * @param {Array<{name: string, quantity: number, price?: {gold?: {value: number|null, divisor: number}}}>} leftovers
 * @param {Object<string, {gold?: {value: number|null, divisor: number}}>} prices
 * @returns {number}
 */
export function calculateRevenue(leftovers, prices) {
  return leftovers.reduce((sum, item) => {
    const price = prices[item.name]
    const goldPrice = price?.gold ? getPerUnitPrice(price.gold) : 0
    return sum + (goldPrice ?? 0) * item.quantity
  }, 0)
}

/**
 * Прибыль = revenue - cost.
 * @param {number} cost
 * @param {number} revenue
 * @returns {number}
 */
export function calculateProfit(cost, revenue) {
  return revenue - cost
}

/**
 * Собирает торгуемые остатки из цепочки.
 * @param {Array<{name: string, amount: number}>} chain
 * @param {Object<string, {gold?: {value: number|null, divisor: number}}>} prices
 * @param {(name: string) => boolean} isTradableFn — функция проверки торгуемости
 * @returns {Array<{name: string, quantity: number, price: {gold?: {value: number|null, divisor: number}}|null, isTradable: boolean}>}
 */
export function calculateLeftovers(chain, prices, isTradableFn) {
  const map = new Map()

  for (const item of chain) {
    if (!isTradableFn(item.name)) continue

    const existing = map.get(item.name)
    if (existing) {
      existing.quantity += item.amount
    } else {
      map.set(item.name, {
        name: item.name,
        quantity: item.amount,
        price: prices[item.name] ?? null,
        isTradable: true,
      })
    }
  }

  return Array.from(map.values())
}

/**
 * Применяет крафт к списку остатков.
 * Может уйти в минус — это нормально (симуляция докупки).
 * @param {Array<{name: string, quantity: number}>} leftovers — текущие остатки
 * @param {string} itemName — что крафтим
 * @param {number} quantity — сколько крафтим
 * @param {Array<{name: string, amount: number}>} craftRecipe — рецепт (ингредиенты)
 * @returns {Array<{name: string, quantity: number}>} — новый массив остатков
 */
export function applyCraft(leftovers, itemName, quantity, craftRecipe) {
  const map = new Map()
  for (const item of leftovers) {
    map.set(item.name, { ...item })
  }

  for (const ingredient of craftRecipe) {
    const needed = ingredient.amount * quantity
    const existing = map.get(ingredient.name)
    if (existing) {
      existing.quantity -= needed
    } else {
      map.set(ingredient.name, { name: ingredient.name, quantity: -needed })
    }
  }

  const result = map.get(itemName)
  if (result) {
    result.quantity += quantity
  } else {
    map.set(itemName, { name: itemName, quantity })
  }

  return Array.from(map.values())
}

/**
 * Конвертирует значение из одной валюты в другую.
 * @param {number} value
 * @param {'gold'|'ap'|'oj'} fromCurrency
 * @param {'gold'|'ap'|'oj'} toCurrency
 * @param {{apToGold?: number|null, ojToGold?: number|null, ojToAp?: number|null}} exchangeRates
 * @returns {number|null}
 */
export function convertPrice(value, fromCurrency, toCurrency, exchangeRates) {
  if (fromCurrency === toCurrency) return value

  let inGold
  switch (fromCurrency) {
    case 'gold':
      inGold = value
      break
    case 'ap':
      if (exchangeRates.apToGold == null) return null
      inGold = (value / 1000) * exchangeRates.apToGold
      break
    case 'oj':
      if (exchangeRates.ojToGold == null) return null
      inGold = (value / 1000) * exchangeRates.ojToGold
      break
    default:
      return null
  }

  switch (toCurrency) {
    case 'gold':
      return inGold
    case 'ap':
      if (exchangeRates.apToGold == null || exchangeRates.apToGold === 0) return null
      return (inGold / exchangeRates.apToGold) * 1000
    case 'oj':
      if (exchangeRates.ojToGold == null || exchangeRates.ojToGold === 0) return null
      return (inGold / exchangeRates.ojToGold) * 1000
    default:
      return null
  }
}

/**
 * Возвращает per-unit цену предмета в указанной валюте.
 * @param {string} itemName
 * @param {'gold'|'ap'|'oj'} currency
 * @param {Object<string, {gold?: {value: number|null, divisor: number}, ap?: ..., oj?: ...}>} prices
 * @param {{apToGold?: number|null, ojToGold?: number|null, ojToAp?: number|null}} exchangeRates
 * @returns {number|null}
 */
export function getItemPrice(itemName, currency, prices, exchangeRates) {
  const price = prices[itemName]
  if (!price) return null

  if (price[currency] != null) {
    return getPerUnitPrice(price[currency])
  }

  if (price.gold != null) {
    const perUnit = getPerUnitPrice(price.gold)
    if (perUnit != null) return convertPrice(perUnit, 'gold', currency, exchangeRates)
  }
  if (price.ap != null) {
    const perUnit = getPerUnitPrice(price.ap)
    if (perUnit != null) return convertPrice(perUnit, 'ap', currency, exchangeRates)
  }
  if (price.oj != null) {
    const perUnit = getPerUnitPrice(price.oj)
    if (perUnit != null) return convertPrice(perUnit, 'oj', currency, exchangeRates)
  }

  return null
}

/**
 * Простой расчёт для Simple-режима.
 */
export function runSimple(chain, prices) {
  const cost = calculateCost(chain, prices)
  const leftovers = calculateLeftovers(chain, prices, () => true)
  const revenue = calculateRevenue(leftovers, prices)
  const profit = calculateProfit(cost, revenue)

  const warnings = chain
    .filter(item => {
      const p = prices[item.name]?.gold
      return !p || p.value == null
    })
    .map(item => item.name)

  return {
    cost,
    revenue,
    profit,
    leftovers,
    warnings,
    optimalPath: [...chain],
  }
}

/**
 * Расчёт для Advanced-режима с крафтами.
 */
export function runAdvanced(leftovers, advancedState, prices, recipes) {
  let updatedLeftovers = leftovers.map(item => ({ ...item }))

  for (const entry of advancedState) {
    for (const craft of entry.crafts) {
      const recipe = recipes[craft.recipeName]
      if (!recipe) continue
      updatedLeftovers = applyCraft(updatedLeftovers, entry.itemName, craft.quantity, recipe)
    }
  }

  const cost = updatedLeftovers.reduce((sum, item) => {
    if (item.quantity <= 0) return sum
    const price = prices[item.name]?.gold
    const goldPrice = price ? getPerUnitPrice(price) : 0
    return sum + (goldPrice ?? 0) * item.quantity
  }, 0)

  const revenue = updatedLeftovers.reduce((sum, item) => {
    if (item.quantity <= 0) return sum
    const price = prices[item.name]?.gold
    const goldPrice = price ? getPerUnitPrice(price) : 0
    return sum + (goldPrice ?? 0) * item.quantity
  }, 0)

  const profit = calculateProfit(cost, revenue)

  const deficitItems = updatedLeftovers
    .filter(item => item.quantity < 0)
    .map(item => item.name)

  return {
    updatedLeftovers,
    cost,
    revenue,
    profit,
    deficitItems,
  }
}

export function findOptimalPath(chain, prices, recipes, exchangeRates) {
  return chain
}

// ============================================================
// НОВЫЕ ФУНКЦИИ для правильного расчёта остатков и трат
// ============================================================

function getRecipeIngredients(recipe) {
  if (!recipe) return null
  if (recipe.ingredients) return recipe.ingredients
  if (recipe.из) return recipe.из
  return null
}

/**
 * Разбирает цепочку (chain) на три компонента:
 * - gathered: что добыто из локаций
 * - consumed: что потрачено на крафт (ингредиенты)
 * - produced: что произведено крафтом (результаты)
 *
 * ВАЖНО: после локации ВСЕ узлы считаются gathered, пока не встретится первый крафт.
 * Это исправляет проблему, когда после локации идёт несколько предметов (wood, straw, antler),
 * но только первый попадал в gathered.
 *
 * @param {Array<{name: string, amount: number, isLocation?: boolean}>} chain
 * @param {Object<string, {ingredients?: Object, из?: Object}>} recipes
 * @param {number} resourceSaverPercent — процент экономии ресурсов (0..1)
 * @param {(locationName: string, budget: number) => Array<{name: string, amount: number}>} [getLocationDrops]
 *        колбэк, возвращающий все дропы локации с их estimated amounts.
 *        Если передан, при встрече isLocation все дропы локации добавляются в gathered.
 * @returns {{ gathered: Object<string,number>, consumed: Object<string,number>, produced: Object<string,number> }}
 */
export function decomposeChain(chain, recipes, resourceSaverPercent = 0, getLocationDrops) {
  const gathered = {}
  const consumed = {}
  const produced = {}

  if (!chain || chain.length === 0) return { gathered, consumed, produced }

  let isInGatherMode = false // true после локации, пока не встретим крафт

  for (let i = 0; i < chain.length; i++) {
    const node = chain[i]

    if (node.isLocation) {
      isInGatherMode = true
      // Если есть колбэк для дропов локации — добавляем все дропы в gathered
      if (typeof getLocationDrops === 'function') {
        const budget = Number(node.amount) || 0
        if (budget > 0) {
          const drops = getLocationDrops(node.name, budget)
          if (drops && drops.length > 0) {
            for (const drop of drops) {
              gathered[drop.name] = (gathered[drop.name] || 0) + drop.amount
            }
          }
        }
      }
      continue
    }

    const recipe = recipes[node.name]
    const ingredients = recipe ? getRecipeIngredients(recipe) : null

    if (ingredients) {
      // Это крафт — выходим из gather mode
      isInGatherMode = false
      const craftQty = Number(node.amount) || 0
      for (const [ingName, ingQty] of Object.entries(ingredients)) {
        const adjustedQty = resourceSaverPercent > 0 ? (ingQty / (1 + resourceSaverPercent)) : ingQty
        const totalIngredientQty = adjustedQty * craftQty
        consumed[ingName] = (consumed[ingName] || 0) + totalIngredientQty
      }
      produced[node.name] = (produced[node.name] || 0) + craftQty
    } else {
      // Нет рецепта — это gathered (либо из локации, либо базовый предмет)
      gathered[node.name] = (gathered[node.name] || 0) + (Number(node.amount) || 0)
    }
  }

  return { gathered, consumed, produced }
}

/**
 * Вычисляет реальные остатки на основе цепочки.
 * leftovers = gathered - consumed + produced
 * leftovers НИКОГДА не бывают отрицательными — дефицит показывается отдельно.
 *
 * @param {Array<{name: string, amount: number, isLocation?: boolean}>} chain
 * @param {Object<string, {ingredients?: Object, из?: Object}>} recipes
 * @param {Object<string, {gold?: {value: number|null, divisor: number}}>} prices
 * @param {(name: string) => boolean} isTradableFn
 * @param {number} resourceSaverPercent — процент экономии ресурсов (0..1)
 * @param {(locationName: string, budget: number) => Array<{name: string, amount: number}>} [getLocationDrops]
 * @returns {{ leftovers: Array, deficit: Array }}
 *   leftovers — предметы с quantity >= 0
 *   deficit — предметы с quantity < 0 (чего не хватило)
 */
export function computeActualLeftovers(chain, recipes, prices, isTradableFn, resourceSaverPercent = 0, getLocationDrops) {
  const { gathered, consumed, produced } = decomposeChain(chain, recipes, resourceSaverPercent, getLocationDrops)

  const allNames = new Set([
    ...Object.keys(gathered),
    ...Object.keys(consumed),
    ...Object.keys(produced),
  ])

  const leftovers = []
  const deficit = []

  for (const name of allNames) {
    const g = gathered[name] || 0
    const c = consumed[name] || 0
    const p = produced[name] || 0
    const quantity = g - c + p

    if (quantity === 0) continue

    const entry = {
      name,
      quantity,
      price: prices[name] ?? null,
      isTradable: isTradableFn ? isTradableFn(name) : true,
    }

    if (quantity < 0) {
      deficit.push(entry)
    } else {
      leftovers.push(entry)
    }
  }

  // Сортируем по убыванию количества
  leftovers.sort((a, b) => b.quantity - a.quantity)
  deficit.sort((a, b) => a.quantity - b.quantity) // сначала самый дефицитный

  return { leftovers, deficit }
}

/**
 * Разбирает цепочку пошагово для Spent — группирует траты по крафту
 * с указанием компенсации/дефицита.
 *
 * @param {Array<{name: string, amount: number, isLocation?: boolean}>} chain
 * @param {Object<string, {ingredients?: Object, из?: Object}>} recipes
 * @param {number} resourceSaverPercent — процент экономии ресурсов (0..1)
 * @returns {Array<{craftName: string, craftQty: number, ingredients: Array<{name: string, needed: number, compensated: number, deficit: number}>}>}
 */
export function computeSpentByCraft(chain, recipes, resourceSaverPercent = 0) {
  if (!chain || chain.length === 0) return []

  // Сначала собираем всё что есть в наличии (gathered + produced) до каждого шага
  const available = {} // name -> количество доступно на данный момент
  const result = []

  for (let i = 0; i < chain.length; i++) {
    const node = chain[i]

    if (node.isLocation) {
      continue
    }

    // Это крафт?
    const recipe = recipes[node.name]
    const ingredients = recipe ? getRecipeIngredients(recipe) : null
    if (!ingredients) {
      // Базовый предмет без рецепта — добавляем в available
      const name = node.name
      const qty = Number(node.amount) || 0
      available[name] = (available[name] || 0) + qty
      continue
    }

    const craftQty = Number(node.amount) || 0
    if (craftQty <= 0) continue

    const craftEntry = {
      craftName: node.name,
      craftQty,
      ingredients: [],
    }

    for (const [ingName, ingQty] of Object.entries(ingredients)) {
      const adjustedQty = resourceSaverPercent > 0 ? (ingQty / (1 + resourceSaverPercent)) : ingQty
      const needed = adjustedQty * craftQty
      const have = available[ingName] || 0
      const compensated = Math.min(have, needed)
      const deficit = needed - compensated

      // Вычитаем из available то что использовали
      available[ingName] = have - compensated

      craftEntry.ingredients.push({
        name: ingName,
        needed,
        compensated,
        deficit,
      })
    }

    // Результат крафта добавляем в available
    available[node.name] = (available[node.name] || 0) + craftQty

    result.push(craftEntry)
  }

  return result
}

/**
 * Группирует последовательные крафты в цепочки.
 * Например: [Board, Wooden Plank] — это одна цепочка, если Board используется в Wooden Plank.
 *
 * @param {Array<{craftName: string, craftQty: number, ingredients: Array}>} spentByCraft
 * @returns {Array<{chain: Array, isExpanded?: boolean}>}
 */
export function groupSpentByChain(spentByCraft) {
  if (!spentByCraft || spentByCraft.length === 0) return []

  const chains = []
  let currentChain = [spentByCraft[0]]

  for (let i = 1; i < spentByCraft.length; i++) {
    const prev = spentByCraft[i - 1]
    const curr = spentByCraft[i]

    // Проверяем, используется ли prev.craftName как ингредиент в curr
    const isConnected = curr.ingredients.some(ing => ing.name === prev.craftName)

    if (isConnected) {
      currentChain.push(curr)
    } else {
      chains.push({ chain: currentChain })
      currentChain = [curr]
    }
  }

  if (currentChain.length > 0) {
    chains.push({ chain: currentChain })
  }

  return chains
}

/**
 * Мерджит manualAdditions в массив остатков.
 */
export function mergeManualAdditions(leftovers, manualAdditions, prices) {
  const map = new Map()
  for (const item of leftovers) {
    map.set(item.name, { ...item })
  }
  for (const add of manualAdditions) {
    const existing = map.get(add.itemName)
    if (existing) {
      existing.quantity += add.quantity
    } else {
      map.set(add.itemName, {
        name: add.itemName,
        quantity: add.quantity,
        price: prices[add.itemName] ?? null,
        isTradable: true,
      })
    }
  }
  return Array.from(map.values())
}
