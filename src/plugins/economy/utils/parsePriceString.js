/**
 * parsePriceString.js
 * Парсит строку цены из prices.json (buddy.farm community prices).
 *
 * Форматы:
 *   "" / "PC" / "Country Store" / "Free" → null
 *   "5g" → { value: 5, divisor: 1 }
 *   "30g" → { value: 30, divisor: 1 }
 *   "250-300g" → { value: 275, divisor: 1 }
 *   "17.5-20g/k" → { value: 18.75, divisor: 1000 }
 *   "4-6/k" → { value: 5, divisor: 1000 }
 *   ".5-.75g" → { value: 0.625, divisor: 1 }
 *   "15-25g [100]" → { value: 20, divisor: 100 }
 *   "40-50g/100" → { value: 45, divisor: 100 }
 *   "0/k" → { value: 0, divisor: 1000 }
 *   "5-10g/k" → { value: 7.5, divisor: 1000 }
 *   "500-1,000g" → { value: 750, divisor: 1 }
 *   "1-1.5g/k" → { value: 1.25, divisor: 1000 }
 *   "166-333/k" → { value: 249.5, divisor: 1000 }
 *   "30-50" → { value: 40, divisor: 1 }
 *   "100-200" → { value: 150, divisor: 1 }
 *   "0-10/k" → { value: 5, divisor: 1000 }
 */

const NULL_VALUES = new Set(['', 'pc', 'country store', 'free'])

/**
 * @param {string} str - Сырая строка цены (например "17.5-20g/k")
 * @returns {{ value: number|null, divisor: number }} - { value: средняя цена, divisor: 1|100|1000 }
 */
export function parsePriceString(str) {
  if (!str || typeof str !== 'string') return { value: null, divisor: 1 }

  const trimmed = str.trim()
  if (!trimmed) return { value: null, divisor: 1 }

  const lower = trimmed.toLowerCase()
  if (NULL_VALUES.has(lower)) return { value: null, divisor: 1 }

  let raw = trimmed

  // Определяем делитель: /k → 1000, [100] или /100 → 100
  let divisor = 1
  if (/\/k/i.test(raw)) {
    divisor = 1000
    raw = raw.replace(/\/k/gi, '')
  } else if (/\[100\]/.test(raw)) {
    divisor = 100
    raw = raw.replace(/\[100\]/g, '')
  } else if (/\/100/.test(raw)) {
    divisor = 100
    raw = raw.replace(/\/100/g, '')
  }

  // Убираем суффикс g (gold marker)
  raw = raw.replace(/g$/i, '').trim()

  // Убираем запятые в числах (1,000 → 1000)
  raw = raw.replace(/,/g, '')

  // Парсим диапазон "min-max" или одиночное число
  let value
  const dashMatch = raw.match(/^([\d.]+)\s*-\s*([\d.]+)$/)
  if (dashMatch) {
    const min = parseFloat(dashMatch[1])
    const max = parseFloat(dashMatch[2])
    if (isNaN(min) || isNaN(max)) return { value: null, divisor }
    value = (min + max) / 2
  } else {
    value = parseFloat(raw)
  }

  if (isNaN(value)) return { value: null, divisor }

  // Возвращаем сырое значение (без деления на divisor)
  return { value, divisor }
}

/**
 * Парсит все три валюты из объекта item prices.json
 * @param {{ gold?: string, ap?: string, oj?: string }} item
 * @returns {{ gold: { value: number|null, divisor: number }, ap: { value: number|null, divisor: number }, oj: { value: number|null, divisor: number } }}
 */
export function parseItemPrices(item) {
  return {
    gold: parsePriceString(item.gold),
    ap: parsePriceString(item.ap),
    oj: parsePriceString(item.oj),
  }
}

/**
 * Возвращает per-unit цену из результата parsePriceString.
 * @param {{ value: number|null, divisor: number }} parsed
 * @returns {number|null}
 */
export function getPerUnitPrice(parsed) {
  if (parsed == null || parsed.value == null) return null
  return parsed.value / parsed.divisor
}
