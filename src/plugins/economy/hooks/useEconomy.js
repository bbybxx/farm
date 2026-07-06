import { useState, useEffect, useCallback, useRef } from 'react'
import { loadFromStorage, saveToStorage } from '../../../utils/storage'
import { parseItemPrices } from '../utils/parsePriceString'

/**
 * Batched localStorage persistence.
 * Instead of 9 separate useEffect + saveToStorage calls,
 * we batch all state into one object and write it via requestIdleCallback.
 */
function useBatchedStorage(states) {
  const prevRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const current = {}
    for (const [key, value] of Object.entries(states)) {
      current[key] = value
    }

    // Skip if nothing changed
    const prev = prevRef.current
    if (prev) {
      let changed = false
      for (const key of Object.keys(current)) {
        if (prev[key] !== current[key]) { changed = true; break }
      }
      if (!changed) return
    }
    prevRef.current = current

    // Debounce + batch via requestIdleCallback
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => {
          for (const [key, value] of Object.entries(current)) {
            saveToStorage(key, value)
          }
        }, { timeout: 500 })
      } else {
        for (const [key, value] of Object.entries(current)) {
          saveToStorage(key, value)
        }
      }
    }, 300)
  }, [states])
}

export function useEconomy() {
  const [economyEnabled, setEconomyEnabledState] = useState(() => loadFromStorage('economy_enabled', false))
  const [economyChain, setEconomyChainState] = useState(() => loadFromStorage('economy_chain', []))
  const [prices, setPricesState] = useState(() => loadFromStorage('economy_prices', {}))
  const [currency, setCurrencyState] = useState(() => loadFromStorage('economy_currency', 'gold'))
  const [exchangeRates, setExchangeRatesState] = useState(() => loadFromStorage('economy_exchangeRates', { apToGold: null, ojToGold: null, ojToAp: null }))
  const [advancedState, setAdvancedStateState] = useState(() => loadFromStorage('economy_advancedState', []))
  const [manualAdditions, setManualAdditionsState] = useState(() => loadFromStorage('economy_manualAdditions', []))
  const [priceRefreshable, setPriceRefreshableState] = useState(() => loadFromStorage('economy_priceRefreshable', {}))
  const [staminaSource, setStaminaSourceState] = useState(() => loadFromStorage('economy_staminaSource', 'apple'))
  const [cranberryStamina, setCranberryStaminaState] = useState(() => loadFromStorage('economy_cranberryStamina', 2700000))
  const [simpleOverlayOpen, setSimpleOverlayOpen] = useState(false)
  const [advancedTabOpen, setAdvancedTabOpen] = useState(false)
  const [isPriceConfigOpen, setIsPriceConfigOpen] = useState(false)

  // Batched localStorage persistence — replaces 9 separate useEffect
  useBatchedStorage({
    economy_enabled: economyEnabled,
    economy_chain: economyChain,
    economy_prices: prices,
    economy_currency: currency,
    economy_exchangeRates: exchangeRates,
    economy_advancedState: advancedState,
    economy_manualAdditions: manualAdditions,
    economy_priceRefreshable: priceRefreshable,
  })

  // Wrapped setters
  const setEconomyEnabled = useCallback((bool) => {
    setEconomyEnabledState(bool)
    // Больше не очищаем данные при включении — сохраняем состояние между сессиями
  }, [])

  const addToEconomyChain = useCallback((name, amount) => {
    setEconomyChainState(prev => [...prev, { name, amount, fixed: true }])
  }, [])

  const setEconomyChain = useCallback((array) => {
    setEconomyChainState(array)
  }, [])

  const clearEconomyChain = useCallback(() => {
    setEconomyChainState([])
  }, [])

  const setPrices = useCallback((newPrices) => {
    setPricesState(newPrices)
  }, [])

  const setPrice = useCallback((itemName, currencyType, value) => {
    // value может быть { value: number|null, divisor: number } или null
    setPricesState(prev => ({
      ...prev,
      [itemName]: {
        ...prev[itemName],
        [currencyType]: value
      }
    }))
  }, [])

  const setCurrency = useCallback((newCurrency) => {
    setCurrencyState(newCurrency)
  }, [])

  const setExchangeRates = useCallback((rates) => {
    setExchangeRatesState(rates)
  }, [])

  const addManualAddition = useCallback((itemName, quantity) => {
    setManualAdditionsState(prev => [
      ...prev,
      { itemName, quantity, timestamp: Date.now() }
    ])
  }, [])

  const removeManualAddition = useCallback((index) => {
    setManualAdditionsState(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearAdvancedData = useCallback(() => {
    setAdvancedStateState([])
    setManualAdditionsState([])
  }, [])

  const setAdvancedState = useCallback((state) => {
    setAdvancedStateState(state)
  }, [])

  const updateAdvancedCraft = useCallback((itemName, recipeName, quantity) => {
    setAdvancedStateState(prev => {
      const existingIndex = prev.findIndex(entry => entry.itemName === itemName)
      if (existingIndex >= 0) {
        const entry = prev[existingIndex]
        const craftIndex = entry.crafts.findIndex(c => c.recipeName === recipeName)
        let newCrafts
        if (craftIndex >= 0) {
          if (quantity === 0) {
            newCrafts = entry.crafts.filter((_, i) => i !== craftIndex)
          } else {
            newCrafts = entry.crafts.map((c, i) =>
              i === craftIndex ? { ...c, quantity } : c
            )
          }
        } else {
          if (quantity === 0) {
            newCrafts = entry.crafts
          } else {
            newCrafts = [...entry.crafts, { recipeName, quantity }]
          }
        }
        if (newCrafts.length === 0) {
          return prev.filter((_, i) => i !== existingIndex)
        }
        return prev.map((entry, i) =>
          i === existingIndex ? { ...entry, crafts: newCrafts } : entry
        )
      } else {
        if (quantity === 0) return prev
        return [...prev, { itemName, crafts: [{ recipeName, quantity }] }]
      }
    })
  }, [])

  const removeFromAdvancedState = useCallback((itemIndex) => {
    setAdvancedStateState(prev => prev.filter((_, i) => i !== itemIndex))
  }, [])

  const setStaminaSource = useCallback((source) => {
    setStaminaSourceState(source)
    saveToStorage('economy_staminaSource', source)
  }, [])

  const setCranberryStamina = useCallback((value) => {
    setCranberryStaminaState(value)
    saveToStorage('economy_cranberryStamina', value)
  }, [])

  const setPriceRefreshable = useCallback((itemName, bool) => {
    setPriceRefreshableState(prev => ({
      ...prev,
      [itemName]: bool
    }))
  }, [])

  /**
   * Мержит цены с сервера в локальное хранилище.
   * Уважает priceRefreshable — если для предмета стоит false, цена не перезаписывается.
   * @param {Object<string, {gold?: number, ap?: number, oj?: number}>} serverPrices
   */
  const mergeServerPrices = useCallback((serverPrices) => {
    setPricesState(prev => {
      const merged = { ...prev }
      for (const [itemName, priceData] of Object.entries(serverPrices)) {
        if (priceRefreshable[itemName] === false) continue
        merged[itemName] = {
          ...merged[itemName],
          ...priceData,
        }
      }
      return merged
    })
  }, [priceRefreshable])

  /**
   * Применяет цены из prices.json (built-in) для предметов с Auto=true.
   * Используется кнопкой "Update" в EconomyPriceConfigModal.
   * @param {Object<string, {gold?: number, ap?: number, oj?: number}>} builtinPrices
   */
  const applyBuiltinPrices = useCallback((builtinPrices) => {
    setPricesState(prev => {
      const updated = { ...prev }
      for (const [itemName, priceData] of Object.entries(builtinPrices)) {
        if (priceRefreshable[itemName] === false) continue
        updated[itemName] = {
          ...updated[itemName],
          ...priceData,
        }
      }
      return updated
    })
  }, [priceRefreshable])

  const openSimpleOverlay = useCallback(() => setSimpleOverlayOpen(true), [])
  const closeSimpleOverlay = useCallback(() => setSimpleOverlayOpen(false), [])

  const openAdvancedTab = useCallback(() => setAdvancedTabOpen(true), [])
  const closeAdvancedTab = useCallback(() => setAdvancedTabOpen(false), [])

  return {
    economyEnabled,
    setEconomyEnabled,
    economyChain,
    addToEconomyChain,
    setEconomyChain,
    clearEconomyChain,
    prices,
    setPrices,
    setPrice,
    currency,
    setCurrency,
    exchangeRates,
    setExchangeRates,
    advancedState,
    setAdvancedState,
    clearAdvancedData,
    updateAdvancedCraft,
    removeFromAdvancedState,
    manualAdditions,
    addManualAddition,
    removeManualAddition,
    priceRefreshable,
    setPriceRefreshable,
    staminaSource,
    setStaminaSource,
    cranberryStamina,
    setCranberryStamina,
    mergeServerPrices,
    applyBuiltinPrices,
    simpleOverlayOpen,
    openSimpleOverlay,
    closeSimpleOverlay,
    advancedTabOpen,
    openAdvancedTab,
    closeAdvancedTab,
    isPriceConfigOpen,
    setIsPriceConfigOpen,
  }
}
