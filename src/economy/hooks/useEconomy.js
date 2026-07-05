import { useState, useEffect, useCallback } from 'react'
import { loadFromStorage, saveToStorage } from '../../utils/storage'

export function useEconomy() {
  const [economyEnabled, setEconomyEnabledState] = useState(() => loadFromStorage('economy_enabled', false))
  const [economyChain, setEconomyChainState] = useState(() => loadFromStorage('economy_chain', []))
  const [prices, setPricesState] = useState(() => loadFromStorage('economy_prices', {}))
  const [currency, setCurrencyState] = useState(() => loadFromStorage('economy_currency', 'gold'))
  const [exchangeRates, setExchangeRatesState] = useState(() => loadFromStorage('economy_exchangeRates', { apToGold: null, ojToGold: null, ojToAp: null }))
  const [advancedState, setAdvancedStateState] = useState(() => loadFromStorage('economy_advancedState', []))
  const [manualAdditions, setManualAdditionsState] = useState(() => loadFromStorage('economy_manualAdditions', []))
  const [priceRefreshable, setPriceRefreshableState] = useState(() => loadFromStorage('economy_priceRefreshable', {}))
  const [simpleOverlayOpen, setSimpleOverlayOpen] = useState(false)
  const [advancedTabOpen, setAdvancedTabOpen] = useState(false)

  // Persist each state to localStorage
  useEffect(() => {
    saveToStorage('economy_enabled', economyEnabled)
  }, [economyEnabled])

  useEffect(() => {
    saveToStorage('economy_chain', economyChain)
  }, [economyChain])

  useEffect(() => {
    saveToStorage('economy_prices', prices)
  }, [prices])

  useEffect(() => {
    saveToStorage('economy_currency', currency)
  }, [currency])

  useEffect(() => {
    saveToStorage('economy_exchangeRates', exchangeRates)
  }, [exchangeRates])

  useEffect(() => {
    saveToStorage('economy_advancedState', advancedState)
  }, [advancedState])

  useEffect(() => {
    saveToStorage('economy_manualAdditions', manualAdditions)
  }, [manualAdditions])

  useEffect(() => {
    saveToStorage('economy_priceRefreshable', priceRefreshable)
  }, [priceRefreshable])

  // Wrapped setters
  const setEconomyEnabled = useCallback((bool) => {
    setEconomyEnabledState(bool)
    if (bool) {
      setEconomyChainState([])
      setAdvancedStateState([])
      setManualAdditionsState([])
    }
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

  const setPriceRefreshable = useCallback((itemName, bool) => {
    setPriceRefreshableState(prev => ({
      ...prev,
      [itemName]: bool
    }))
  }, [])

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
    updateAdvancedCraft,
    removeFromAdvancedState,
    manualAdditions,
    addManualAddition,
    priceRefreshable,
    setPriceRefreshable,
    simpleOverlayOpen,
    openSimpleOverlay,
    closeSimpleOverlay,
    advancedTabOpen,
    openAdvancedTab,
    closeAdvancedTab,
  }
}
