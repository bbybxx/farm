import { devLog } from '../utils/devLog'
import React, { useCallback, useEffect, useMemo, useState, useRef, useDeferredValue } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateAllResources, getResourceSaverPercent } from '../utils/calculator'
import { getCombinedRecipes, findRecipesThatUse } from '../utils/recipeUtils'
import RecipeUpdateService from '../services/RecipeUpdateService'
import perks from '../data/perks.json'
import { useTelegram } from '../hooks/useTelegram'
import BugReportModal from '../components/BugReportModal'
import DevLogs from '../components/DevLogs'
import QuestsPanel from '../components/QuestsPanel'
import LocationConfigPanel from '../components/LocationConfigPanel'
import { APPLE_CIDER_REAL_DROP_RATES } from '../data/apple-cider-real-drop-rates.js'
import { computePinnedEstimate, getItemLocations } from '../utils/exploringUtils.js'
// Vercel Web Analytics (React)
import { Analytics } from '@vercel/analytics/react'
import ItemDisplay from '../components/ItemDisplay'
import itemsAPI from '../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap, normalizeItemRecord, areItemRecordsEqual } from '../utils/itemImageUtils.js'
import { isStorageAvailable, saveToStorage, loadFromStorage } from '../utils/storage.js'
import { copyToClipboard, clipboardAvailable } from '../utils/clipboard.js'
import { formatNumberRounded } from '../utils/formatters.js'
import './app.css'
import LocationImage from '../components/LocationImage.jsx'
import * as serviceWorkerRegistration from '../serviceWorkerRegistration'
import { usePWA } from '../hooks/usePWA'
import { useCraftHistory } from '../hooks/useCraftHistory.js'
import { usePinnedResources } from '../hooks/usePinnedResources.js'
import { useClearData } from '../hooks/useClearData.js'
import { useSettings } from '../hooks/useSettings.js'
import { useUIState } from '../hooks/useUIState.js'
import { usePrices } from '../hooks/usePrices.js'
import { useEconomyContext } from '../plugins/economy/EconomyContext'

import SettingsTab from '../components/Sidebar/SettingsTab.jsx'

import PerksTab from '../components/Sidebar/PerksTab.jsx'
import HistoryTab from '../components/Sidebar/HistoryTab.jsx'
import PinnedTab from '../components/Sidebar/PinnedTab.jsx'
import AppHeader from '../components/AppHeader.jsx'
import ItemSelectModal from '../components/ItemSelectModal.jsx'
import CraftSection from '../components/CraftSection.jsx'
import LocationDropsSection from '../components/LocationDropsSection.jsx'
import ClearDataModals from '../components/ClearDataModals.jsx'
import FolderConfigModal from '../components/FolderConfigModal.jsx'
import QuickPinModal from '../components/QuickPinModal.jsx'
import PluginsRenderer from '../plugins'

const STATIC_ITEMS_MAP = normalizeItemsMap(itemsAPI)

export default function App() {
  const [itemSelectFilter, setItemSelectFilter] = useState('')
  // Получаем объединенные рецепты (API + локальные)
  const combinedRecipes = getCombinedRecipes();
    // items is declared earlier to be available for select lists
    const items = Object.keys(combinedRecipes || {})
  
  // Инициализируем сервис обновлений
  const [updateService] = useState(() => new RecipeUpdateService());

  const [itemsData, setItemsData] = useState(() => {
    const baseItems = { ...STATIC_ITEMS_MAP }
    try {
      const cached = typeof updateService.getCachedRecipes === 'function'
        ? updateService.getCachedRecipes()
        : null
      if (cached?.items) {
        const normalizedCache = normalizeItemsMap(cached.items, { baseMap: STATIC_ITEMS_MAP })
        return { ...baseItems, ...normalizedCache }
      }
    } catch (error) {
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
        devLog('Failed to initialize cached items:', error)
      }
    }
    return baseItems
  })

  const mergeItemsData = useCallback((incoming) => {
    if (!incoming || Object.keys(incoming).length === 0) return
    setItemsData(prev => {
      let updated = false
      const next = { ...prev }
      Object.entries(incoming).forEach(([name, info]) => {
        const normalized = normalizeItemRecord(name, info, {
          previous: prev[name],
          base: STATIC_ITEMS_MAP[name]
        })
        if (!prev[name] || !areItemRecordsEqual(prev[name], normalized)) {
          next[name] = normalized
          updated = true
        }
      })
      return updated ? next : prev
    })
  }, [])

  // Combine all items (recipes + base resources) for Quick Pin
  const allItems = useMemo(() => {
    const itemsSet = new Set()
    
    // Add all recipe results (craft items)
    Object.keys(combinedRecipes || {}).forEach(itemName => {
      itemsSet.add(itemName)
    })
    
    // Add all resources used in any recipe (base resources)
    Object.values(combinedRecipes || {}).forEach(recipe => {
      // Check both "ingredients" (API format) and "из" (local format)
      const resources = recipe.ingredients || recipe.из
      if (resources) {
        Object.keys(resources).forEach(resource => {
          itemsSet.add(resource)
        })
      }
    })
    
    return Array.from(itemsSet).sort()
  }, [combinedRecipes])
  
  const { 
    isReady, 
    user, 
    themeParams, 
    showMainButton, 
    hideMainButton, 
    setMainButtonCallback, 
    hapticFeedback, 
    showAlert,
    showConfirm,
    sendBugReport,
    isInTelegram 
  } = useTelegram()
  
  const [item, setItem] = useState(() => loadFromStorage('craftCalculator_item', 'Board'))
  const [amount, setAmount] = useState(() => loadFromStorage('craftCalculator_amount', 1))
  // Deferred amount for heavy calculations - prevents UI jank during typing
  const deferredAmount = useDeferredValue(amount)
  const [activePerks, setActivePerks] = useState(() => loadFromStorage('craftCalculator_activePerks', []));

  const {
    useThousandsFormat,
    setUseThousandsFormat,
    pinnedEnabled,
    setPinnedEnabled,
    buddyFarmLinksEnabled,
    setBuddyFarmLinksEnabled,
    exploringMode,
    setExploringMode
  } = useSettings()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarActiveTab, setSidebarActiveTab] = useState('perks')
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isItemSelectOpen, setIsItemSelectOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [modeOpen, setModeOpen] = useState(false)
  const sidebarRef = useRef(null)
  const menuBtnRef = useRef(null)
  const breadcrumbsRef = useRef(null)
  const modeRef = useRef(null)
  const itemSelectListRef = useRef(null)
  const [isOffline, setIsOffline] = useState(false)
  const [isCaching, setIsCaching] = useState(false)
  const [cachingProgress, setCachingProgress] = useState(0)
  
  // Helper to determine overlay (mobile) layout
  const isOverlayNow = () => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 899px)').matches)
  
  // Debounce ref for craftChain updates during typing
  const craftChainDebounceRef = useRef(null)
  
  // PWA detection using hook
  const isPWAMode = usePWA()
  
  // PWA caching logic
  useEffect(() => {
    if (isPWAMode) {
      setIsCaching(true)
      serviceWorkerRegistration.cacheAllResources((progress) => {
        setCachingProgress(progress)
      }).then(() => {
        setIsCaching(false)
        setCachingProgress(100)
      }).catch((error) => {
        console.error('Failed to cache resources:', error)
        setIsCaching(false)
      })
    }
  }, [isPWAMode])

  const [craftChain, setCraftChain] = useState(() => {
    const storedChain = loadFromStorage('craftCalculator_craftChain', null)
    if (storedChain && storedChain.length > 0) {
      return storedChain
    }
    const storedItem = loadFromStorage('craftCalculator_item', 'Board')
    const storedAmount = loadFromStorage('craftCalculator_amount', 1)
    return [{ name: storedItem, amount: storedAmount }]
  })

  const {
    craftHistory,
    setCraftHistory,
    historyLimit,
    setHistoryLimit,
    historyEnabled,
    setHistoryEnabled,
    clearHistory,
    addToHistory
  } = useCraftHistory()

  const {
    locationsMode, setLocationsMode,
    selectedLocation, setSelectedLocation,
    questsMode, setQuestsMode,
    economyMode, setEconomyMode,
    craftBreadcrumbs, setCraftBreadcrumbs,
    locationsBreadcrumbs, setLocationsBreadcrumbs,
    questsBreadcrumbs, setQuestsBreadcrumbs,
    resourcesSectionCollapsed, setResourcesSectionCollapsed,
    usedInSectionCollapsed, setUsedInSectionCollapsed
  } = useUIState()

  const { economyEnabled, setEconomyEnabled } = useEconomyContext()

  // Pinned resources system (replaces cart)
  const {
    pinnedResources, setPinnedResources,
    pinnedQuests, setPinnedQuests,
    expandedPinnedQuests, setExpandedPinnedQuests,
    lastPinnedLocation, setLastPinnedLocation,
    isPinnedOpen, setIsPinnedOpen,
    pinnedFolders, setPinnedFolders,
    activePinnedFolder, setActivePinnedFolder,
    isFolderConfigOpen, setIsFolderConfigOpen,
    folderNameInput, setFolderNameInput,
    editingFolderId, setEditingFolderId,
    isCreatingFolder, setIsCreatingFolder,
    isCreatingFolderInTabs, setIsCreatingFolderInTabs,
    deletingFolderId, setDeletingFolderId,
    isQuickPinModalOpen, setIsQuickPinModalOpen,
    quickPinSelectedItem, setQuickPinSelectedItem,
    quickPinQuantity, setQuickPinQuantity,
    quickPinFilter, setQuickPinFilter,
    recentlyAddedItems, setRecentlyAddedItems,
    recentlyAddedTimersRef,
    addToPinned,
    addQuestToPinned,
    removeFromPinned,
    removeQuestFromPinned,
    createFolder,
    deleteFolder,
    renameFolder,
    addToPinnedWithFolder,
    handleQuickPin,
    confirmQuickPin,
    cancelQuickPin
  } = usePinnedResources({
    hapticFeedback,
    item,
    amount,
    craftChain,
    questsMode,
    locationsMode
  })

  const [isBugReportOpen, setIsBugReportOpen] = useState(false)
  const [isDevLogsOpen, setIsDevLogsOpen] = useState(false)
  const [isQuestsPanelOpen, setIsQuestsPanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiLoadStatus, setApiLoadStatus] = useState({ loading: false, error: null, lastUpdate: null })
  
  const [isLocationConfigOpen, setIsLocationConfigOpen] = useState(false)

  // Dynamic Prices
  const {
    prices,
    isLoading: isPricesLoading,
    error: pricesError,
    lastUpdated: pricesLastUpdated,
    refreshPrices,
    clearPrices,
  } = usePrices()

  const {

    showClearConfirm,
    showClearSuccess,
    handleClearData,
    confirmClearData,
    cancelClearData
  } = useClearData({
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
  })

  const locationsForConfig = useMemo(() => {
    try {
      const locObj = APPLE_CIDER_REAL_DROP_RATES && APPLE_CIDER_REAL_DROP_RATES.locations
      if (!locObj) return []
      return Object.keys(locObj).map((name) => {
        const loc = locObj[name] || {}
        const itemsSet = new Set()
        ;['rq0cs0','rq0cs1','rq1cs0','rq1cs1'].forEach((k) => {
          const part = loc[k]
          if (part && typeof part === 'object') Object.keys(part).forEach(i => itemsSet.add(i))
        })
        return { name, items: Array.from(itemsSet).sort() }
      })
    } catch (e) {
      return []
    }
  }, [APPLE_CIDER_REAL_DROP_RATES])

  const result = useMemo(() => {
    if (!item || !combinedRecipes[item]) return null
    // Clean amount from spaces before converting to number
    const cleanAmount = typeof deferredAmount === 'string' ? deferredAmount.replace(/\s/g, '') : deferredAmount
    const fullResult = calculateAllResources(item, Number(cleanAmount) || 1, activePerks, combinedRecipes)
    
    // Get original recipe ingredients
    const originalRecipe = combinedRecipes[item]
    const originalIngredients = originalRecipe?.из || originalRecipe?.ingredients || {}
    
    // Calculate ONLY the direct ingredients from the original recipe
    // Do NOT use fullResult.base which contains ALL materials including sub-ingredients
    const filteredResources = {}
    const resourceSaverPercent = getResourceSaverPercent(activePerks)
    
    for (const [resourceName, baseQuantity] of Object.entries(originalIngredients)) {
      // Apply the same resource saver logic as in calculator
      let needed = baseQuantity * deferredAmount
      if (resourceSaverPercent > 0) {
        needed = needed / (1 + resourceSaverPercent)
      }
      filteredResources[resourceName] = Math.ceil(needed)
    }
    
    return {
      ...fullResult,
      filteredResources
    }
  }, [item, deferredAmount, activePerks, combinedRecipes])

  // Compute distinct resources that are used as ingredients across recipes (sources for reverse crafting)
  const sourceResources = useMemo(() => {
    // Recursive extractor: collect all ingredient keys from possibly nested ingredient objects
    function collectIngredientKeys(obj, set) {
      if (!obj || typeof obj !== 'object') return
      Object.entries(obj).forEach(([k, v]) => {
        // key may be an ingredient name
        if (typeof k === 'string' && k.trim()) set.add(k.trim())
        // value may itself be an object containing more ingredient names
        if (v && typeof v === 'object') collectIngredientKeys(v, set)
      })
    }

    try {
      if (!combinedRecipes) return []
      const s = new Set()
      Object.values(combinedRecipes).forEach((rec) => {
        const ing = rec?.из || rec?.ingredients || {}
        collectIngredientKeys(ing, s)
      })
      return Array.from(s).sort()
    } catch (e) {
      return []
    }
  }, [combinedRecipes])

  // Items for select: show all items (both craftable and source resources)
  const itemsForSelect = items

  // Sync craftChain to mode-specific breadcrumbs storage
  useEffect(() => {
    if (questsMode) {
      setQuestsBreadcrumbs(craftChain)
    } else if (locationsMode) {
      setLocationsBreadcrumbs(craftChain)
    } else {
      setCraftBreadcrumbs(craftChain)
    }
  }, [craftChain, questsMode, locationsMode])

  // When in reverse mode, compute crafts that use the currently selected `item` as an ingredient
  const availableCrafts = useMemo(() => {
    // Normalizer for names to cover spacing/casing/unicode variants
    function normalizeName(s) {
      if (!s && s !== 0) return ''
      return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
    }

    try {
      if (!combinedRecipes || !item) return []
      const target = normalizeName(item)
      const results = []

      // available amount of the target resource (from current selection)
      const availableAmount = Number(amount) || 0
      const resourceSaverPercent = getResourceSaverPercent(activePerks || [])

      Object.entries(combinedRecipes).forEach(([name, recipe]) => {
        const ing = recipe?.из || recipe?.ingredients || {}
        // check top-level keys of ingredients
        const keys = Object.keys(ing || {})
        let found = false
        let requiredPerCraft = null

        for (const k of keys) {
          if (normalizeName(k) === target) {
            const val = ing[k]
            requiredPerCraft = (typeof val === 'number') ? val : 1
            found = true
            break
          }
          // if value is object, check nested keys as fallback
          const v = ing[k]
          if (v && typeof v === 'object') {
            const nestedKeys = Object.keys(v)
            for (const nk of nestedKeys) {
              if (normalizeName(nk) === target) {
                const nestedVal = v[nk]
                requiredPerCraft = (typeof nestedVal === 'number') ? nestedVal : 1
                found = true
                break
              }
            }
            if (found) break
          }
        }

        if (found) {
          // apply Resource Saver: reduce required per craft by dividing by (1 + percent)
          // (this keeps the same behavior as calculateAllResources)
          const adjustedRequired = requiredPerCraft && resourceSaverPercent > 0 ? (requiredPerCraft / (1 + resourceSaverPercent)) : requiredPerCraft

          // avoid zero or NaN
          const finalRequired = adjustedRequired && adjustedRequired > 0 ? adjustedRequired : requiredPerCraft || 1

          // compute how many crafts can be made from availableAmount
          const craftable = finalRequired > 0 ? Math.floor(availableAmount / finalRequired) : 0

          results.push({ name, outputQty: recipe?.amount || 1, requiredPerCraft, craftableCount: craftable })
        }
      })

      // dedupe by name and sort alphabetically
      const uniq = Array.from(new Map(results.map(r => [r.name, r])).values())
      uniq.sort((a, b) => a.name.localeCompare(b.name))
      return uniq
    } catch (e) {
      return []
    }
  }, [combinedRecipes, item, amount, activePerks])

  // Function to check if a resource can be crafted (has a recipe)
  const isCraftable = (resourceName) => {
    const recipe = combinedRecipes[resourceName];
    return recipe && (recipe.из || recipe.ingredients);
  }

  // Check if an item has any content to show (recipe, used in recipes, or found at locations)
  const hasItemContent = (itemName) => {
    // Has its own recipe
    if (isCraftable(itemName)) return true
    // Is used as ingredient in other recipes
    const usedIn = findRecipesThatUse(itemName) || []
    if (usedIn.length > 0) return true
    // Can be found at locations
    const locations = getItemLocations(itemName) || []
    if (locations.length > 0) return true
    return false
  }

  // Unified navigation to item page - simplified click handler
  const navigateToItem = (itemName, quantity = 1, source = null) => {
    if (!hasItemContent(itemName)) return
    
    hapticFeedback('medium')
    
    // Add to history if enabled

    addToHistory(item, amount, itemName, quantity, craftChain)
    
    // Set item and amount
    setItem(itemName)
    setAmount(quantity)
    
    // Build craft chain
    if (source) {
      // If source is a string (quest name, location name, etc.), create placeholder
      if (typeof source === 'string') {
        setCraftChain([
          { name: source, amount: 1, isPlaceholder: true },
          { name: itemName, amount: quantity }
        ])
      } else {
        // Source is an object with more context
        setCraftChain([source, { name: itemName, amount: quantity }])
      }
    } else if (craftChain.length > 0) {
      // Append to existing chain
      setCraftChain(prev => [...prev, { name: itemName, amount: quantity }])
    } else {
      // Start new chain
      setCraftChain([{ name: itemName, amount: quantity }])
    }
    
    // Always go to unified item view
    setQuestsMode(false)
    setLocationsMode(false)
  }

  // Function to handle clicking on a resource - now uses unified navigation
  const handleResourceClick = (resourceName, quantity) => {
    navigateToItem(resourceName, quantity)
  }

  // Breadcrumb navigation removed

  // Function to load a craft from history
  const handleHistoryClick = (historyEntry) => {
    setItem(historyEntry.toItem)
    setAmount(historyEntry.toAmount)
    setCraftChain([...historyEntry.chain, { name: historyEntry.toItem, amount: historyEntry.toAmount }])
    setIsHistoryOpen(false)
  }

  // Function to generate shareable text
  const generateShareText = () => {
    if (!result) return ''
    
    const resourcesText = Object.entries(result.filteredResources)
      .map(([name, qty]) => `• ${name}: ${formatNumberRounded(qty)}`)
      .join('\n')
    
    const perksText = activePerks.length > 0 
      ? `\n\nPerks:\n${activePerks.map(p => `• ${p}`).join('\n')}` 
      : ''
    
    return `Craft Calculator Results\n\nItem: ${item} (×${formatNumberRounded(typeof amount === 'string' ? amount.replace(/\s/g, '') : amount)})\n\nResources needed:\n${resourcesText}${perksText}\n\nCalculate your own: [Open Craft Calculator]`
  }

  // Function to handle main button click (share results)
  const handleShare = () => {
    const shareText = generateShareText()
    if (!shareText) return

    copyToClipboard(shareText).then((copied) => {
      if (isInTelegram) {
        if (copied) {
          showAlert('Results copied to clipboard!')
        } else {
          showAlert(shareText)
        }
      } else if (typeof window !== 'undefined') {
        if (copied) {
          window.alert('Results copied to clipboard!')
        } else {
          window.alert(shareText)
        }
      }
    })
  }

  // Breadcrumb scrolling removed

  // Save state to localStorage when it changes
  useEffect(() => {
    saveToStorage('craftCalculator_item', item)
  }, [item])

  useEffect(() => {
    saveToStorage('craftCalculator_amount', amount)
  }, [amount])

  useEffect(() => {
    saveToStorage('craftCalculator_activePerks', activePerks);
  }, [activePerks])

  useEffect(() => {
    saveToStorage('craftCalculator_craftChain', craftChain)
  }, [craftChain])

  // Auto-scroll breadcrumbs to the rightmost (latest) node when chain updates
  useEffect(() => {
    try {
      if (breadcrumbsRef && breadcrumbsRef.current) {
        const el = breadcrumbsRef.current
        // scroll to far right smoothly
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
      }
    } catch (e) {
      // ignore
    }
  }, [craftChain])

  useEffect(() => {
    // ...
    return () => {
      if (typeof window !== 'undefined') {
        recentlyAddedTimersRef.current.forEach(id => {
          window.clearTimeout(id)
        })
      }
      recentlyAddedTimersRef.current.clear()
    }
  }, [])

  // Запуск автообновления рецептов при загрузке приложения и синхронизация данных предметов
  useEffect(() => {
    let isMounted = true

    const hydrateFromCache = () => {
      try {
        const cached = updateService.getCachedRecipes()
        if (cached?.items) {
          mergeItemsData(cached.items)
        }
      } catch (error) {
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
          devLog('Failed to hydrate cached items:', error)
        }
      }
    }

    hydrateFromCache()

    setApiLoadStatus(prev => ({ ...prev, loading: true, error: null }))

    // Таймаут на случай если API не ответит
    const loadingTimeout = setTimeout(() => {
      setApiLoadStatus(prev => {
        if (prev.loading) {
          devLog('⏰ API loading timeout - using cached data')
          return { loading: false, error: 'Loading timeout - using cached data', lastUpdate: null }
        }
        return prev
      })
    }, 30000) // 30 секунд

    const stop = updateService.startAutoUpdate((data) => {
      if (!isMounted) return
      
      clearTimeout(loadingTimeout)
      
      if (data && data.error) {
        devLog('[ERROR] API update error:', data.error)
        setApiLoadStatus({ loading: false, error: data.error, lastUpdate: new Date() })
        return
      }
      
      if (!data) {
        devLog('[WARNING] No data received from API')
        setApiLoadStatus({ loading: false, error: 'No data received', lastUpdate: null })
        return
      }
      
      const nextItems = data.items || data.itemData || {}
      const itemsCount = Object.keys(nextItems).length
      
      if (itemsCount > 0) {
        devLog('[SUCCESS] Successfully loaded', itemsCount, 'items from API')
        mergeItemsData(nextItems)
        setApiLoadStatus({ loading: false, error: null, lastUpdate: new Date() })
      } else {
        devLog('[WARNING] Received empty items data')
        setApiLoadStatus({ loading: false, error: 'Empty data received', lastUpdate: null })
      }
    })

    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      const info = updateService.getUpdateInfo()
      devLog('Recipe update info:', info)
    }

    return () => {
      isMounted = false
      clearTimeout(loadingTimeout)
      if (typeof stop === 'function') stop()
    }
  }, [mergeItemsData, updateService])

  // Close mode dropdown on outside click or ESC
  useEffect(() => {
    function onDoc(e) {
      if (!modeRef.current) return
      if (!modeRef.current.contains(e.target)) setModeOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setModeOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Close inline inputs on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setIsCreatingFolderInTabs(false)
        setDeletingFolderId(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    // Set initial state
    setIsOffline(!navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Pre-load all images for instant access
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const preloadImages = async () => {
        try {
          // Send message to service worker to cache all images
          const registration = await navigator.serviceWorker.ready;
          if (registration.active) {
            registration.active.postMessage({
              type: 'CACHE_ALL_IMAGES'
            });
          }
        } catch (error) {
          console.log('Service worker not ready for image preloading:', error);
        }
      };

      // Delay preloading slightly to not block initial render
      setTimeout(preloadImages, 1000);
    }
  }, [])

  // Auto-switch tab if current tab is disabled
  useEffect(() => {
    if (sidebarActiveTab === 'pinned' && !pinnedEnabled) {
      setSidebarActiveTab('perks')
    } else if (sidebarActiveTab === 'history' && !historyEnabled) {
      setSidebarActiveTab('perks')
    }
  }, [pinnedEnabled, historyEnabled, sidebarActiveTab])

  // Cache images for offline use
  useEffect(() => {
    // Collect common location images that are likely to be used
    const commonLocations = [
      'Apple Cider',
      'Forest',
      'Small Cave',
      'Highland Hills',
      'Cane Pole Ridge',
      'Ember Lagoon',
      'Mount Banon',
      'Jundland Desert',
      'Black Rock Canyon',
      'Whispering Creek',
      'Misty Forest',
      'Haunted House',
      'Santa\'s Workshop'
    ]

    // Get correct image URLs using the same logic as LocationImage component
    let locationImagesMap = null
    try {
      const modules = import.meta.glob('/src/../locations_img/*.{png,jpg,jpeg,svg}', { eager: true, query: '?url', import: 'default' })
      locationImagesMap = {}
      Object.keys(modules).forEach(k => {
        const fileName = k.split('/').pop()
        locationImagesMap[fileName] = modules[k]
      })
    } catch (e) {
      locationImagesMap = null
    }

    const imageUrls = commonLocations.map(location => `/locations_img/${location.replace(/\s+/g, '_').replace(/[''`]/g, '').replace(/[^A-Za-z0-9_]/g, '')}.png`)

    // Add logo and favicon
    imageUrls.push('/logo192.png', '/logo512.png', '/favicon.ico')

    // Cache images after a short delay to not interfere with initial load
    const timer = setTimeout(() => {
      serviceWorkerRegistration.cacheImages(imageUrls)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Handle item click from quests - uses unified navigation
  const handleQuestItemClick = (itemName, quantity, questName) => {
    navigateToItem(itemName, quantity, questName || 'Quests')
  }

  // Handle location item commit - calculate and update amount based on target quantity
  const handleLocationItemCommit = useCallback((itemName, targetQuantity) => {
    if (!targetQuantity || targetQuantity <= 0) {
      return
    }

    // Calculate required amount (consumables) based on target quantity
    try {
      const perUnit = computePinnedEstimate(
        { name: itemName, location: selectedLocation },
        1,
        activePerks,
        exploringMode
      )

      if (exploringMode === 'Apple Cider' && perUnit && perUnit.mode === 'AC' && typeof perUnit.effectiveDropsPerCider === 'number') {
        const dropsPerCider = perUnit.effectiveDropsPerCider
        if (dropsPerCider > 0) {
          const requiredAmount = targetQuantity / dropsPerCider
          setAmount(Math.ceil(requiredAmount))
        }
      } else if (exploringMode === 'Arnold Palmer' && perUnit && perUnit.mode === 'AP' && typeof perUnit.itemsPerAP === 'number') {
        const itemsPerAP = perUnit.itemsPerAP
        if (itemsPerAP > 0) {
          const requiredAmount = targetQuantity / itemsPerAP
          setAmount(Math.ceil(requiredAmount))
        }
      } else {
        // Fallback: try to get raw drop rate from location data
        const locObj = APPLE_CIDER_REAL_DROP_RATES.locations && APPLE_CIDER_REAL_DROP_RATES.locations[selectedLocation]
        if (locObj) {
          const raw = locObj['rq0cs0'] && locObj['rq0cs0'][itemName]
          if (raw) {
            let dropsPerConsumable = null
            if (typeof raw === 'object') {
              dropsPerConsumable = raw.dropsPerCider || (raw.cidersPerDrop ? 1010 / raw.cidersPerDrop : null)
            } else if (typeof raw === 'number') {
              dropsPerConsumable = raw
            }
            if (dropsPerConsumable && dropsPerConsumable > 0) {
              const requiredAmount = targetQuantity / dropsPerConsumable
              setAmount(Math.ceil(requiredAmount))
            }
          }
        }
      }
    } catch (e) {
      console.error('Error calculating required amount:', e)
    }
  }, [selectedLocation, activePerks, exploringMode])

  // Telegram integration effects
  useEffect(() => {
    if (isReady && result) {
      showMainButton()
      setMainButtonCallback(handleShare)
      
      return () => {
        hideMainButton()
      }
    }
  }, [isReady, result, item, amount, activePerks])

  // Apply Telegram theme if available
  useEffect(() => {
    if (themeParams && isInTelegram) {
      const root = document.documentElement
      root.style.setProperty('--tg-bg', themeParams.bg_color || '#0b1020')
      root.style.setProperty('--tg-text', themeParams.text_color || '#e9ecf1')
      root.style.setProperty('--tg-hint', themeParams.hint_color || '#aab3c2')
      root.style.setProperty('--tg-accent', themeParams.button_color || '#79c0ff')
      root.style.setProperty('--tg-secondary', themeParams.secondary_bg_color || '#121a2e')
    }
  }, [themeParams, isInTelegram])

  const togglePerk = (p) => {
    hapticFeedback('light')
    setActivePerks(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  // Bug report functions
  const handleBugReport = () => {
    hapticFeedback('light')
    setIsBugReportOpen(true)
  }

  // Accept either a string message or an object { message, files }
  const handleBugReportSubmit = async (payload) => {
    try {
      const message = typeof payload === 'string' ? payload : (payload?.message || '');
      const files = typeof payload === 'object' ? payload.files || [] : [];

      const result = await sendBugReport(message, user, files)
      
      if (result.success) {
        hapticFeedback('success')
        // Success is handled by the modal component itself
      } else {
        hapticFeedback('error')
        // Error will be handled by the modal component
      }
      
  return result
    } catch (error) {
      devLog('Error submitting bug report:', error)
      hapticFeedback('error')
      return { success: false, error: error.message }
    }
  }

  const handleBugReportClose = () => {
    setIsBugReportOpen(false)
  }

  const handleSelectItem = (selectedItem) => {
    hapticFeedback('medium')
    setItem(selectedItem)
    setAmount(1)
    setIsItemSelectOpen(false)
    // buildCraftChain was removed from recipeUtils; use a simple fallback chain
    setCraftChain([{ name: selectedItem, amount: 1 }])
  }

  // Display chain for header: only previous recipe names (exclude current target)
  // Header breadcrumb display removed

  // Organized perks by category
  // Organize perks into explicit categories so sidebar groups match feature sets
  const perkCategories = [
    {
      title: 'Crafting Perks',
      perks: [
        'Resource Saver I',
        'Resource Saver II',
        'Resource Saver III'
      ]
    },
    {
      title: 'Exploring',
      perks: [
        'Eagle Eye (Runecube)',
        'Cockatrice Ether Source'
      ]
    },
    {
      title: 'Apple Cider Perks',
      perks: [
        'Cinnamon Sticks',
        'Wanderer I',
        'Wanderer II',
        'Wanderer III',
        'Wanderer IV',
        'Sprint Shoes I',
        'Sprint Shoes II',
        'Sprint Shoes III'
      ]
    },
    {
      title: 'Arnold Palmer Perks',
      perks: ['Lemon Squeezer']
    },
    {
      title: 'Apple Cider Meals',
      perks: ['Cabbage Stew', 'Neigh']
    },
    {
      title: 'Arnold Palmer Meals',
      perks: ['Lemon Cream Pie', 'Lemon Seltzer', 'Quandary Chowder']
    }
  ]

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => { 
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        setIsItemSelectOpen(false)
        setIsHistoryOpen(false)
        setIsBugReportOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Prevent background scroll when sidebar or modal is open
  useEffect(() => {
    const body = document.body
    if (sidebarOpen || isItemSelectOpen || isHistoryOpen || isBugReportOpen) body.classList.add('no-scroll')
    else body.classList.remove('no-scroll')
    return () => body.classList.remove('no-scroll')
  }, [sidebarOpen, isItemSelectOpen, isHistoryOpen, isBugReportOpen])

  // Scroll to selected item when item select modal opens
  useEffect(() => {
    if (isItemSelectOpen && itemSelectListRef.current) {
      setTimeout(() => {
        const activeButton = itemSelectListRef.current?.querySelector('button.active')
        if (activeButton) {
          activeButton.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
      }, 100)
    }
  }, [isItemSelectOpen])

  // Hide visual scrollbars site-wide and for sidebar/lists (user requested)
  useEffect(() => {
    const body = document.body
    try { body.classList.add('no-visual-scrollbar') } catch (e) {}
    return () => { try { body.classList.remove('no-visual-scrollbar') } catch (e) {} }
  }, [])

  // Header auto-hide on scroll
  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < 10) {
        setHeaderVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setHeaderVisible(false)
      } else if (currentScrollY < lastScrollY) {
        setHeaderVisible(true)
      }
      setLastScrollY(currentScrollY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastScrollY])

  return (
  <div className="app layout">
      <aside id="perks-sidebar" ref={sidebarRef} className={"sidebar glass" + (sidebarOpen ? ' open' : '')}>
        <div className="side-head">
          <div className="sidebar-tabs">
            <button 
              className={`tab ${sidebarActiveTab === 'perks' ? 'active' : ''}`}
              onClick={() => setSidebarActiveTab('perks')}
              type="button"
            >
              Perks
            </button>
            {pinnedEnabled && (
              <button 
                className={`tab ${sidebarActiveTab === 'pinned' ? 'active' : ''}`}
                onClick={() => setSidebarActiveTab('pinned')}
                type="button"
              >
                Pinned {(pinnedResources.length + pinnedQuests.length) > 0 && `(${pinnedResources.length + pinnedQuests.length})`}
              </button>
            )}
            {historyEnabled && (
              <button 
                className={`tab ${sidebarActiveTab === 'history' ? 'active' : ''}`}
                onClick={() => setSidebarActiveTab('history')}
                type="button"
              >
                History
              </button>
            )}
            <button 
              className={`tab ${sidebarActiveTab === 'settings' ? 'active' : ''}`}
              onClick={() => setSidebarActiveTab('settings')}
              type="button"
            >
              Settings
            </button>
          </div>
        </div>
        
        <div className="side-content">
          {sidebarActiveTab === 'perks' && (
            <PerksTab
              perkCategories={perkCategories}
              activePerks={activePerks}
              togglePerk={togglePerk}
            />
          )}
          
          {sidebarActiveTab === 'history' && historyEnabled && (
            <HistoryTab
              craftHistory={craftHistory}
              clearHistory={clearHistory}
              handleHistoryClick={handleHistoryClick}
              setSidebarOpen={setSidebarOpen}
            />
          )}
          
          {sidebarActiveTab === 'pinned' && pinnedEnabled && (
            <PinnedTab
              pinnedFolders={pinnedFolders}
              pinnedResources={pinnedResources}
              setPinnedResources={setPinnedResources}
              pinnedQuests={pinnedQuests}
              setPinnedQuests={setPinnedQuests}
              activePinnedFolder={activePinnedFolder}
              setActivePinnedFolder={setActivePinnedFolder}
              isCreatingFolderInTabs={isCreatingFolderInTabs}
              setIsCreatingFolderInTabs={setIsCreatingFolderInTabs}
              folderNameInput={folderNameInput}
              setFolderNameInput={setFolderNameInput}
              createFolder={createFolder}
              hapticFeedback={hapticFeedback}
              setIsQuickPinModalOpen={setIsQuickPinModalOpen}
              removeFromPinned={removeFromPinned}
              removeQuestFromPinned={removeQuestFromPinned}
              expandedPinnedQuests={expandedPinnedQuests}
              setExpandedPinnedQuests={setExpandedPinnedQuests}
              questsMode={questsMode}
              setQuestsMode={setQuestsMode}
              locationsMode={locationsMode}
              setLocationsMode={setLocationsMode}
              setSidebarOpen={setSidebarOpen}
              hasItemContent={hasItemContent}
              handleQuestItemClick={handleQuestItemClick}
              navigateToItem={navigateToItem}
              itemsData={itemsData}
              buddyFarmLinksEnabled={buddyFarmLinksEnabled}
              activePerks={activePerks}
              exploringMode={exploringMode}
              setLastPinnedLocation={setLastPinnedLocation}
            />
          )}
          
          {sidebarActiveTab === 'settings' && (
            <SettingsTab
              pinnedEnabled={pinnedEnabled}
              setPinnedEnabled={setPinnedEnabled}
              setIsFolderConfigOpen={setIsFolderConfigOpen}
              historyEnabled={historyEnabled}
              setHistoryEnabled={setHistoryEnabled}
              buddyFarmLinksEnabled={buddyFarmLinksEnabled}
              setBuddyFarmLinksEnabled={setBuddyFarmLinksEnabled}
              exploringMode={exploringMode}
              setExploringMode={setExploringMode}
              setIsLocationConfigOpen={setIsLocationConfigOpen}
              historyLimit={historyLimit}
              setHistoryLimit={setHistoryLimit}
              handleBugReport={handleBugReport}
              handleClearData={handleClearData}
              setIsDevLogsOpen={setIsDevLogsOpen}
              // Dynamic Prices
              prices={prices}
              isPricesLoading={isPricesLoading}
              pricesError={pricesError}
              pricesLastUpdated={pricesLastUpdated}
              onRefreshPrices={refreshPrices}
              onClearPrices={clearPrices}
            />
          )}

          
          {/* Exploring perks now use existing perkCategories UI (chips) */}
        </div>
      </aside>

      <div className="main">
        <AppHeader
          headerVisible={headerVisible}
          isCaching={isCaching}
          cachingProgress={cachingProgress}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          menuBtnRef={menuBtnRef}
          isOffline={isOffline}
          craftChain={craftChain}
          setCraftChain={setCraftChain}
          breadcrumbsRef={breadcrumbsRef}
          questsMode={questsMode}
          setQuestsMode={setQuestsMode}
          locationsMode={locationsMode}
          setLocationsMode={setLocationsMode}
          setSelectedLocation={setSelectedLocation}
          setItem={setItem}
          setAmount={setAmount}
          handleLocationItemCommit={handleLocationItemCommit}
          modeRef={modeRef}
          modeOpen={modeOpen}
          setModeOpen={setModeOpen}
          craftBreadcrumbs={craftBreadcrumbs}
          setCraftBreadcrumbs={setCraftBreadcrumbs}
          locationsBreadcrumbs={locationsBreadcrumbs}
          setLocationsBreadcrumbs={setLocationsBreadcrumbs}
          questsBreadcrumbs={questsBreadcrumbs}
          setQuestsBreadcrumbs={setQuestsBreadcrumbs}
          item={item}
          amount={amount}
          selectedLocation={selectedLocation}
          itemsData={itemsData}
          buddyFarmLinksEnabled={buddyFarmLinksEnabled}
          economyEnabled={economyEnabled}
          setEconomyEnabled={setEconomyEnabled}
        />


        {questsMode ? (


          <QuestsPanel 
            itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled}
            savedQuestlineId={localStorage.getItem('selectedQuestlineId')}
            savedQuestId={localStorage.getItem('selectedQuestId')}
            onQuestlineChange={(id) => localStorage.setItem('selectedQuestlineId', id || '')}
            onQuestChange={(id) => localStorage.setItem('selectedQuestId', id || '')}
            pinnedEnabled={pinnedEnabled}
            addToPinned={addToPinned}
            addQuestToPinned={addQuestToPinned}
            recentlyAddedItems={recentlyAddedItems}
            onItemClick={handleQuestItemClick}
            hasItemContent={hasItemContent}
          />
        ) : (
          <>
        <section className="glass controls">
          <label className="field">
            <span className="label">{locationsMode ? 'Location' : 'Item'}</span>
            { !locationsMode ? (
              <button className="input" onClick={() => setIsItemSelectOpen(true)} type="button">
                <ItemDisplay itemName={item} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
              </button>
            ) : (
              <button className="input" onClick={() => setIsItemSelectOpen(true)} type="button" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LocationImage name={selectedLocation} size={18} />
                <span>{selectedLocation || 'Select location'}</span>
              </button>
            ) }
          </label>
            <label className="field">
            <span className="label">{locationsMode ? (exploringMode === 'Apple Cider' ? 'Apple Cider' : 'Arnold Palmer') : 'Amount'}</span>
            <input 
              className="input amount-input" 
              type="text" 
              min={1} 
              max={9999999999999999}
              value={locationsMode && typeof amount === 'number' ? String(Math.ceil(amount)) : String(amount)} 
              placeholder="Enter amount (e.g., 1 000)"
              onChange={e => {
                const inputValue = e.target.value
                
                // Helper to debounce craftChain updates
                const debouncedSetCraftChain = (newAmount) => {
                  if (craftChainDebounceRef.current) {
                    clearTimeout(craftChainDebounceRef.current)
                  }
                  craftChainDebounceRef.current = setTimeout(() => {
                    setCraftChain(prev => {
                      const updated = [...prev]
                      updated[updated.length - 1] = { ...updated[updated.length - 1], amount: newAmount || 1 }
                      return updated
                    })
                  }, 300)
                }
                
                if (locationsMode) {
                  // allow decimals, normalize comma to dot
                  const normalized = inputValue.replace(',', '.')
                  // keep digits and at most one dot
                  const cleaned = normalized.replace(/[^\d.]/g, '')
                  const parts = cleaned.split('.')
                  const integer = parts[0] || '0'
                  const frac = parts[1] ? parts[1].slice(0,2) : ''
                  const final = frac ? `${integer}.${frac}` : integer
                  if (final === '' || final === '.' ) {
                    setAmount('')
                    debouncedSetCraftChain(1)
                    return
                  }
                  const numericValue = parseFloat(final)
                  const rounded = Math.round(numericValue * 100) / 100
                  setAmount(rounded)
                  debouncedSetCraftChain(rounded)
                  return
                }

                // Non-locations mode (integer-only) - previous behavior
                const cleanValue = inputValue.replace(/\D/g, '')
                if (cleanValue === '') {
                  setAmount('')
                  debouncedSetCraftChain(1)
                  return
                }
                const numericValue = parseInt(cleanValue)
                if (numericValue > 9999999999999999) return
                setAmount(cleanValue)
                debouncedSetCraftChain(numericValue)
              }} 
            />
          </label>
        </section>

        </>
        )}

        {/* Modals - accessible in all modes */}
        <ItemSelectModal
          isOpen={isItemSelectOpen}
          onClose={() => setIsItemSelectOpen(false)}
          locationsMode={locationsMode}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          item={item}
          itemSelectFilter={itemSelectFilter}
          setItemSelectFilter={setItemSelectFilter}
          handleSelectItem={handleSelectItem}
          itemSelectListRef={itemSelectListRef}
          itemsForSelect={itemsForSelect}
          locationsForConfig={locationsForConfig}
          itemsData={itemsData}
          buddyFarmLinksEnabled={buddyFarmLinksEnabled}
        />

        <AnimatePresence>
          {isHistoryOpen && (
            <motion.div
              className="modal-wrapper"
              onClick={() => setIsHistoryOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="glass history-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="history-title"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="history-header">
                  <h2 id="history-title">Craft History</h2>
                  {craftHistory.length > 0 && (
                    <button 
                      className="chip danger"
                      onClick={clearHistory}
                      type="button"
                      title="Clear all history"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div className="history-list">
                  {craftHistory.length === 0 ? (
                    <div className="empty-state">
                      <p>No craft history yet.</p>
                      <p>Navigate through intermediate resources to build your history.</p>
                    </div>
                  ) : (
                    craftHistory.map(entry => (
                      <button
                        key={entry.id}
                        className="history-item"
                        onClick={() => handleHistoryClick(entry)}
                        type="button"
                      >
                        <div className="history-main">
                          <span className="from"><ItemDisplay itemName={entry.fromItem} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} /></span>
                          <span className="arrow">→</span>
                          <span className="to"><ItemDisplay itemName={entry.toItem} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} /></span>
                          <span className="amount">×{entry.toAmount}</span>
                        </div>
                        <div className="history-time">
                          {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isLocationConfigOpen && (
            <motion.div
              className="modal-wrapper"
              onClick={() => setIsLocationConfigOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="glass history-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="location-config-title"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 920 }}
              >
                <h2 id="location-config-title">Configure locations</h2>
                <LocationConfigPanel
                  locations={locationsForConfig}
                  onClose={() => setIsLocationConfigOpen(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false} mode="popLayout">
          {sidebarOpen && isOverlayNow() && (
            <motion.button
              className="scrim"
              aria-label="Close overlay"
              onClick={() => setSidebarOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          <motion.div
            key={`${item}-${activePerks.join(',')}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="stack"
          >
            {locationsMode && (
              <LocationDropsSection
                selectedLocation={selectedLocation}
                amount={amount}
                activePerks={activePerks}
                exploringMode={exploringMode}
                hasItemContent={hasItemContent}
                navigateToItem={navigateToItem}
                itemsData={itemsData}
                buddyFarmLinksEnabled={buddyFarmLinksEnabled}
                pinnedEnabled={pinnedEnabled}
                recentlyAddedItems={recentlyAddedItems}
                addToPinned={addToPinned}
                item={item}
                handleLocationItemCommit={handleLocationItemCommit}
              />
            )}
            
            {/* Unified Item View - shows both Resources (ingredients) and Used In (crafts) */}
            {!questsMode && !locationsMode && (
              <CraftSection
                result={result}
                availableCrafts={availableCrafts}
                resourcesSectionCollapsed={resourcesSectionCollapsed}
                setResourcesSectionCollapsed={setResourcesSectionCollapsed}
                usedInSectionCollapsed={usedInSectionCollapsed}
                setUsedInSectionCollapsed={setUsedInSectionCollapsed}
                hasItemContent={hasItemContent}
                navigateToItem={navigateToItem}
                itemsData={itemsData}
                buddyFarmLinksEnabled={buddyFarmLinksEnabled}
                pinnedEnabled={pinnedEnabled}
                recentlyAddedItems={recentlyAddedItems}
                addToPinned={addToPinned}
                item={item}
                craftChain={craftChain}
                amount={amount}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="spacer" />

        <ClearDataModals
          showClearConfirm={showClearConfirm}
          showClearSuccess={showClearSuccess}
          cancelClearData={cancelClearData}
          confirmClearData={confirmClearData}
        />

        <FolderConfigModal
          isOpen={isFolderConfigOpen}
          onClose={() => setIsFolderConfigOpen(false)}
          pinnedFolders={pinnedFolders}
          pinnedResources={pinnedResources}
          pinnedQuests={pinnedQuests}
          editingFolderId={editingFolderId}
          setEditingFolderId={setEditingFolderId}
          folderNameInput={folderNameInput}
          setFolderNameInput={setFolderNameInput}
          renameFolder={renameFolder}
          deletingFolderId={deletingFolderId}
          setDeletingFolderId={setDeletingFolderId}
          deleteFolder={deleteFolder}
          isCreatingFolder={isCreatingFolder}
          setIsCreatingFolder={setIsCreatingFolder}
          createFolder={createFolder}
        />

        <QuickPinModal
          isOpen={isQuickPinModalOpen}
          onClose={() => setIsQuickPinModalOpen(false)}
          quickPinSelectedItem={quickPinSelectedItem}
          quickPinFilter={quickPinFilter}
          setQuickPinFilter={setQuickPinFilter}
          quickPinQuantity={quickPinQuantity}
          setQuickPinQuantity={setQuickPinQuantity}
          handleQuickPin={handleQuickPin}
          confirmQuickPin={confirmQuickPin}
          cancelQuickPin={cancelQuickPin}
          activePinnedFolder={activePinnedFolder}
          allItems={allItems}
          itemsData={itemsData}
          buddyFarmLinksEnabled={buddyFarmLinksEnabled}
          addQuestToPinned={addQuestToPinned}
          hapticFeedback={hapticFeedback}
        />

        {/* Bug Report Modal */}
        <BugReportModal
          isOpen={isBugReportOpen}
          onClose={handleBugReportClose}
          onSubmit={handleBugReportSubmit}
        />
        
        {/* Dev Logs Modal */}
        <AnimatePresence>
          {isDevLogsOpen && (
            <DevLogs
              isOpen={isDevLogsOpen}
              onClose={() => setIsDevLogsOpen(false)}
            />
          )}
        </AnimatePresence>
  {/* Vercel Web Analytics */}
  <Analytics />
  {/* debug overlay removed */}
        <PluginsRenderer />
      </div>
    </div>
  )
}


