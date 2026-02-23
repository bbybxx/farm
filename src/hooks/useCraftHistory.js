import { useState, useEffect } from 'react'
import { loadFromStorage, saveToStorage, isStorageAvailable } from '../utils/storage.js'
import { devLog } from '../utils/devLog.js'

export function useCraftHistory() {
  const [craftHistory, setCraftHistory] = useState(() => loadFromStorage('craftCalculator_craftHistory', []))
  const [historyLimit, setHistoryLimit] = useState(() => loadFromStorage('craftCalculator_historyLimit', 50))
  const [historyEnabled, setHistoryEnabled] = useState(() => loadFromStorage('craftCalculator_historyEnabled', true))

  useEffect(() => {
    saveToStorage('craftCalculator_craftHistory', craftHistory)
  }, [craftHistory])

  useEffect(() => {
    saveToStorage('craftCalculator_historyLimit', historyLimit)
  }, [historyLimit])

  useEffect(() => {
    saveToStorage('craftCalculator_historyEnabled', historyEnabled)
  }, [historyEnabled])

  const clearHistory = () => {
    setCraftHistory([])
    if (isStorageAvailable()) {
      try {
        window.localStorage.removeItem('craftCalculator_craftHistory')
      } catch (error) {
        devLog('Failed to clear craft history from storage:', error)
      }
    }
  }

  const addToHistory = (fromItem, fromAmount, toItem, toAmount, chain) => {
    if (!historyEnabled || !fromItem || fromItem === toItem) return
    
    const historyEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      fromItem,
      fromAmount,
      toItem,
      toAmount,
      chain: [...chain]
    }
    setCraftHistory(prev => [historyEntry, ...prev.slice(0, historyLimit - 1)])
  }

  return {
    craftHistory,
    setCraftHistory,
    historyLimit,
    setHistoryLimit,
    historyEnabled,
    setHistoryEnabled,
    clearHistory,
    addToHistory
  }
}
