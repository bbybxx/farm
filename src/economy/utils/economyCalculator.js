/**
 * economyCalculator.js
 * Чистые функции для экономических расчётов.
 * Ни одна функция не мутирует входные данные.
 */

/**
 * Общая стоимость всех ресурсов в цепочке.
 * @param {Array<{name: string, amount: number, fixed?: boolean}>} chain — economyChain
 * @param {Object<string, {gold?: number, ap?: number, oj?: number}>} prices — объект цен
 * @returns {number}
 */
export function calculateCost(chain, prices) {
  return chain.reduce((sum, item) => {
    const price = prices[item.name]
    const goldPrice = price?.gold ?? 0
    return sum + goldPrice * item.amount
  }, 0)
}

/**
 * Выручка от продажи всех остатков.
 * @param {Array<{name: string, quantity: number, price?: {gold?: number}}>} leftovers
 * @param {Object<string, {gold?: number}>} prices
 * @returns {number}
 */
export function calculateRevenue(leftovers, prices) {
  return leftovers.reduce((sum, item) => {
    const price = prices[item.name]
    const goldPrice = price?.gold ?? 0
    return sum + goldPrice * item.quantity
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
 * @param {Object<string, {gold?: number}>} prices
 * @param {(name: string) => boolean} isTradableFn — функция проверки торгуемости
 * @returns {Array<{name: string, quantity: number, price: {gold?: number}|null, isTradable: boolean}>}
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
  // Копируем leftovers в Map для удобства
  const map = new Map()
  for (const item of leftovers) {
    map.set(item.name, { ...item })
  }

  // Вычитаем ингредиенты
  for (const ingredient of craftRecipe) {
    const needed = ingredient.amount * quantity
    const existing = map.get(ingredient.name)
    if (existing) {
      existing.quantity -= needed
    } else {
      map.set(ingredient.name, { name: ingredient.name, quantity: -needed })
    }
  }

  // Добавляем результат крафта
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

  // Сначала конвертируем в gold
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

  // Из gold в целевую валюту
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
 * Возвращает цену предмета в указанной валюте.
 * @param {string} itemName
 * @param {'gold'|'ap'|'oj'} currency
 * @param {Object<string, {gold?: number, ap?: number, oj?: number}>} prices
 * @param {{apToGold?: number|null, ojToGold?: number|null, ojToAp?: number|null}} exchangeRates
 * @returns {number|null}
 */
export function getItemPrice(itemName, currency, prices, exchangeRates) {
  const price = prices[itemName]
  if (!price) return null

  // Если цена прямо в этой валюте — возвращаем
  if (price[currency] != null) return price[currency]

  // Ищем любую доступную валюту для конвертации
  if (price.gold != null) {
    return convertPrice(price.gold, 'gold', currency, exchangeRates)
  }
  if (price.ap != null) {
    return convertPrice(price.ap, 'ap', currency, exchangeRates)
  }
  if (price.oj != null) {
    return convertPrice(price.oj, 'oj', currency, exchangeRates)
  }

  return null
}

/**
 * Простой расчёт для Simple-режима.
 * @param {Array<{name: string, amount: number}>} chain
 * @param {Object<string, {gold?: number}>} prices
 * @returns {{ cost: number, revenue: number, profit: number, leftovers: Array, warnings: string[], optimalPath: Array }}
 */
export function runSimple(chain, prices) {
  const cost = calculateCost(chain, prices)

  // isTradableFn — пока все предметы считаем торгуемыми (заглушка)
  const leftovers = calculateLeftovers(chain, prices, () => true)

  const revenue = calculateRevenue(leftovers, prices)
  const profit = calculateProfit(cost, revenue)

  // Предупреждения: предметы без цен
  const warnings = chain
    .filter(item => !prices[item.name]?.gold)
    .map(item => item.name)

  return {
    cost,
    revenue,
    profit,
    leftovers,
    warnings,
    optimalPath: [...chain], // заглушка
  }
}

/**
 * Расчёт для Advanced-режима с крафтами.
 * @param {Array<{name: string, quantity: number}>} leftovers — начальные остатки
 * @param {Array<{itemName: string, crafts: Array<{recipeName: string, quantity: number}>}>} advancedState
 * @param {Object<string, {gold?: number}>} prices
 * @param {Object<string, Array<{name: string, amount: number}>>} recipes — все рецепты (recipeName -> ингредиенты)
 * @returns {{ updatedLeftovers: Array, cost: number, revenue: number, profit: number, deficitItems: string[] }}
 */
export function runAdvanced(leftovers, advancedState, prices, recipes) {
  let updatedLeftovers = leftovers.map(item => ({ ...item }))

  // Применяем все крафты
  for (const entry of advancedState) {
    for (const craft of entry.crafts) {
      const recipe = recipes[craft.recipeName]
      if (!recipe) continue
      updatedLeftovers = applyCraft(updatedLeftovers, entry.itemName, craft.quantity, recipe)
    }
  }

  // Стоимость: сумма цен всех предметов с положительным количеством (как если бы мы их купили)
  const cost = updatedLeftovers.reduce((sum, item) => {
    if (item.quantity <= 0) return sum
    const price = prices[item.name]?.gold ?? 0
    return sum + price * item.quantity
  }, 0)

  // Выручка: сумма цен всех предметов с положительным количеством (как если бы мы их продали)
  const revenue = updatedLeftovers.reduce((sum, item) => {
    if (item.quantity <= 0) return sum
    const price = prices[item.name]?.gold ?? 0
    return sum + price * item.quantity
  }, 0)

  const profit = calculateProfit(cost, revenue)

  // Дефицитные предметы (отрицательное количество)
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

/**
 * Поиск оптимального пути (ЗАГЛУШКА).
 * В будущем — комбинаторная оптимизация.
 * @param {Array} chain
 * @param {Object} prices
 * @param {Object} recipes
 * @param {Object} exchangeRates
 * @returns {Array} — та же цепочка без изменений
 */
export function findOptimalPath(chain, prices, recipes, exchangeRates) {
  return chain
}
