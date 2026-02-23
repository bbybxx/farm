import { useState, useRef } from 'react'
import { isStorageAvailable } from '../utils/storage.js'
import { devLog } from '../utils/devLog.js'

export function useClearData({
  hapticFeedback,
  setItem,
  setAmount,
  setActivePerks,
  setCraftChain,
  setCraftHistory,
  setHistoryLimit,
  setPinnedResources,
  setUseThousandsFormat,
  setPinnedEnabled,
  setBuddyFarmLinksEnabled,
  setExploringMode,
  setHistoryEnabled,
  setItemsData,
  STATIC_ITEMS_MAP,
  setSidebarOpen,
  setSidebarActiveTab,
  setIsItemSelectOpen,
  setIsHistoryOpen,
  setRecentlyAddedItems,
  recentlyAddedTimersRef,
  updateService,
  mergeItemsData
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showClearSuccess, setShowClearSuccess] = useState(false)

  const handleClearData = () => {
    hapticFeedback('light')
    setShowClearConfirm(true)
  }

  const clearSavedData = () => {
    try {
      // Clear all localStorage keys related to the app (only if storage is available)
      if (isStorageAvailable()) {
        // Remove everything that starts with our app prefix
        const prefix = 'craftCalculator_'
        const keysToRemove = []
        const storage = window.localStorage
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i)
          if (!k) continue
          if (k.indexOf(prefix) === 0) keysToRemove.push(k)
        }
        // Also remove known keys from RecipeUpdateService/cache
        keysToRemove.push('lastRecipeUpdate')
        keysToRemove.push('cachedApiRecipes')
        keysToRemove.push('cachedApiItems')

        keysToRemove.forEach(k => {
          try { storage.removeItem(k) } catch (e) {}
        })

        // Also clear sessionStorage copies if used
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const sk = sessionStorage.key(i)
            if (!sk) continue
            if (sk.indexOf(prefix) === 0) sessionStorage.removeItem(sk)
          }
        } catch (e) {
          // ignore sessionStorage errors
        }
      }
      
      // Reset all state to defaults
      setItem('Board')
      setAmount(1)
      setActivePerks([])
      setCraftChain([{ name: 'Board', amount: 1 }])
      setCraftHistory([])
      setHistoryLimit(50)
      setPinnedResources([])
      setUseThousandsFormat(true)
      setPinnedEnabled(true)
      setBuddyFarmLinksEnabled(false)
      setExploringMode('Apple Cider')
      setHistoryEnabled(true)
      setItemsData({ ...STATIC_ITEMS_MAP })
      
      // Reset UI states
      setSidebarOpen(false)
      setSidebarActiveTab('perks')
      setIsItemSelectOpen(false)
      setIsHistoryOpen(false)
      setRecentlyAddedItems(new Set())
      if (typeof window !== 'undefined' && recentlyAddedTimersRef?.current) {
        recentlyAddedTimersRef.current.forEach(id => window.clearTimeout(id))
        recentlyAddedTimersRef.current.clear()
      }
      
      // Show confirmation
      hapticFeedback('heavy')
      setShowClearSuccess(true)
      setTimeout(() => {
        setShowClearSuccess(false)
      }, 3000)

      if (updateService && mergeItemsData) {
        updateService.forceUpdate().then((data) => {
          mergeItemsData(data?.items || data?.itemData || {})
        }).catch((err) => {
          if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
            devLog('Failed to refetch recipes after clearing data:', err)
          }
        })
      }
    } catch (error) {
      devLog('Failed to clear saved data:', error)
    }
  }

  const confirmClearData = () => {
    setShowClearConfirm(false)
    clearSavedData()
  }

  const cancelClearData = () => {
    hapticFeedback('light')
    setShowClearConfirm(false)
  }

  return {
    showClearConfirm,
    showClearSuccess,
    handleClearData,
    confirmClearData,
    cancelClearData
  }
}
