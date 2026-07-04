import { useState, useCallback } from 'react'

const PRICES_STORAGE_KEY = 'dynamicPrices'
const PRICES_TIMESTAMP_KEY = 'dynamicPricesTimestamp'

/**
 * Хук для работы с динамическими ценами через /api/prices.
 * 
 * Как работает:
 * 1. При вызове refreshPrices() делает GET-запрос к /api/prices
 * 2. Сохраняет полученные цены в localStorage
 * 3. Возвращает prices — объект с ценами (или null, если нет данных)
 * 4. Приоритет: динамические цены > статические JSON из репозитория
 * 
 * Использование:
 *   const { prices, refreshPrices, isLoading, lastUpdated } = usePrices()
 *   // prices — { "itemName": { buy: 100, sell: 50 }, ... } или null
 *   // refreshPrices() — вызвать по кнопке "Обновить цены"
 */
export function usePrices() {
  const [prices, setPrices] = useState(() => {
    try {
      const stored = localStorage.getItem(PRICES_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [lastUpdated, setLastUpdated] = useState(() => {
    try {
      return localStorage.getItem(PRICES_TIMESTAMP_KEY) || null
    } catch {
      return null
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshPrices = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/prices')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch prices')
      }

      const data = result.data || {}

      if (Object.keys(data).length === 0) {
        setError('No prices available yet. Use POST to set prices first.')
        setIsLoading(false)
        return false
      }

      // Сохраняем в localStorage
      try {
        localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(data))
        const now = new Date().toISOString()
        localStorage.setItem(PRICES_TIMESTAMP_KEY, now)
        setLastUpdated(now)
      } catch (e) {
        console.warn('[usePrices] Failed to save to localStorage:', e)
      }

      setPrices(data)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('[usePrices] Error fetching prices:', err)
      setError(err.message || 'Failed to fetch prices')
      setIsLoading(false)
      return false
    }
  }, [])

  const clearPrices = useCallback(() => {
    try {
      localStorage.removeItem(PRICES_STORAGE_KEY)
      localStorage.removeItem(PRICES_TIMESTAMP_KEY)
    } catch {}
    setPrices(null)
    setLastUpdated(null)
    setError(null)
  }, [])

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    refreshPrices,
    clearPrices,
  }
}
