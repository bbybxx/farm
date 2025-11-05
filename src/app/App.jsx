import { devLog } from '../utils/devLog'
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateAllResources, getResourceSaverPercent } from '../utils/calculator'
import { getCombinedRecipes, findRecipesThatUse } from '../utils/recipeUtils'
import RecipeUpdateService from '../services/RecipeUpdateService'
import perks from '../data/perks.json'
import { useTelegram } from '../hooks/useTelegram'
import BugReportModal from '../components/BugReportModal'
import LocationConfigPanel from '../components/LocationConfigPanel'
import { APPLE_CIDER_REAL_DROP_RATES } from '../data/apple-cider-real-drop-rates.js'
import { computePinnedEstimate, getItemLocations } from '../utils/exploringUtils.js'
// Vercel Web Analytics (React)
import { Analytics } from '@vercel/analytics/react'
import PinnedLocationSelect from '../components/PinnedLocationSelect.jsx'
import ItemDisplay from '../components/ItemDisplay'
import itemsAPI from '../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap, normalizeItemRecord, areItemRecordsEqual } from '../utils/itemImageUtils.js'
import './app.css'
import LocationImage from '../components/LocationImage.jsx'

// Helper functions for localStorage
let storageAvailabilityCache = null
function isStorageAvailable() {
  if (storageAvailabilityCache !== null) {
    return storageAvailabilityCache
  }
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    storageAvailabilityCache = false
    return storageAvailabilityCache
  }
  try {
    const testKey = '__storage_test__'
    window.localStorage.setItem(testKey, 'test')
    window.localStorage.removeItem(testKey)
    storageAvailabilityCache = true
  } catch (error) {
    storageAvailabilityCache = false
  }
  return storageAvailabilityCache
}

function saveToStorage(key, data) {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    devLog('Failed to save to localStorage:', error)
  }
}

// Format numbers with spaces for better readability
function formatNumber(num) {
  if (num === null || num === undefined || num === '') return ''

  if (typeof num === 'string') {
    const trimmed = num.trim()
    if (!trimmed) return ''
    if (/[^\d\s.-]/.test(trimmed)) {
      return num
    }
    const normalized = trimmed.replace(/\s+/g, '')
    if (normalized === '' || normalized === '-' || normalized === '.') {
      return num
    }
    const numericFromString = Number(normalized)
    if (!Number.isFinite(numericFromString)) {
      return num
    }
    if (numericFromString === 0) return '0'
    return numericFromString.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  if (typeof num !== 'number' || Number.isNaN(num)) {
    return ''
  }
  if (num === 0) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function loadFromStorage(key, defaultValue) {
  if (!isStorageAvailable()) return defaultValue
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch (error) {
    devLog('Failed to load from localStorage:', error)
    return defaultValue
  }
}

const STATIC_ITEMS_MAP = normalizeItemsMap(itemsAPI)

const clipboardAvailable = () => typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function'

async function copyToClipboard(text) {
  if (clipboardAvailable() && (typeof window === 'undefined' || window.isSecureContext)) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      // fall through to manual fallback
    }
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  if (typeof document.execCommand !== 'function') {
    return false
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    const selection = typeof window !== 'undefined' && typeof window.getSelection === 'function' ? window.getSelection() : null
    const selected = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
    textarea.select()
    let successful = false
    try {
      successful = document.execCommand('copy')
    } finally {
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea)
      }
    }
    if (selected && selection) {
      selection.removeAllRanges()
      selection.addRange(selected)
    }
    return successful
  } catch (error) {
    return false
  }
}

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
  const [activePerks, setActivePerks] = useState(() => loadFromStorage('craftCalculator_activePerks', []));
  const [exploringMode, setExploringMode] = useState(() => {
    const stored = loadFromStorage('craftCalculator_exploringMode', null)
    if (!stored) return 'Apple Cider'
    // map legacy 'Manually' to 'Apple Cider' to preserve UI after removal
    if (stored === 'Manually') return 'Apple Cider'
    return stored
  })

  // persist exploringMode; also fix legacy saved values on first mount
  useEffect(() => {
    // if legacy value still present in storage, overwrite it with the mapped value
    try {
      const raw = loadFromStorage('craftCalculator_exploringMode', null)
      if (raw === 'Manually') {
        saveToStorage('craftCalculator_exploringMode', exploringMode)
      }
    } catch (e) {
      // ignore
    }
    saveToStorage('craftCalculator_exploringMode', exploringMode);
  }, [exploringMode]);

  const [showAllBase, setShowAllBase] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarActiveTab, setSidebarActiveTab] = useState('perks')
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isItemSelectOpen, setIsItemSelectOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [modeOpen, setModeOpen] = useState(false)
  const itemSelectListRef = useRef(null)
  
  const [craftChain, setCraftChain] = useState(() => {
    const storedChain = loadFromStorage('craftCalculator_craftChain', null)
    if (storedChain && storedChain.length > 0) {
      return storedChain
    }
    const storedItem = loadFromStorage('craftCalculator_item', 'Board')
    const storedAmount = loadFromStorage('craftCalculator_amount', 1)
    return [{ name: storedItem, amount: storedAmount }]
  })

  
  const [craftHistory, setCraftHistory] = useState(() => loadFromStorage('craftCalculator_craftHistory', []))
  const [historyLimit, setHistoryLimit] = useState(() => loadFromStorage('craftCalculator_historyLimit', 50))
  // Pinned resources system (replaces cart)
  const [pinnedResources, setPinnedResources] = useState(() => loadFromStorage('craftCalculator_pinnedResources', []))
  const [lastPinnedLocation, setLastPinnedLocation] = useState(() => loadFromStorage('craftCalculator_lastPinnedLocation', ''))
  const [isPinnedOpen, setIsPinnedOpen] = useState(false)
  
  // Pinned folders system
  const [pinnedFolders, setPinnedFolders] = useState(() => 
    loadFromStorage('craftCalculator_pinnedFolders', [{ id: 'default', name: 'Main', createdAt: Date.now() }])
  )
  const [activePinnedFolder, setActivePinnedFolder] = useState(() => 
    loadFromStorage('craftCalculator_activePinnedFolder', 'default')
  )
  const [isFolderConfigOpen, setIsFolderConfigOpen] = useState(false)
  const [folderNameInput, setFolderNameInput] = useState('')
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [isCreatingFolderInTabs, setIsCreatingFolderInTabs] = useState(false)
  const [deletingFolderId, setDeletingFolderId] = useState(null)
  const [isQuickPinModalOpen, setIsQuickPinModalOpen] = useState(false)
  const [quickPinSelectedItem, setQuickPinSelectedItem] = useState(null)
  const [quickPinQuantity, setQuickPinQuantity] = useState('')
  const [quickPinFilter, setQuickPinFilter] = useState('')
  const [useThousandsFormat, setUseThousandsFormat] = useState(() => loadFromStorage('craftCalculator_useThousandsFormat', true))
  const [recentlyAddedItems, setRecentlyAddedItems] = useState(new Set())
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showClearSuccess, setShowClearSuccess] = useState(false)
  const [isBugReportOpen, setIsBugReportOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiLoadStatus, setApiLoadStatus] = useState({ loading: false, error: null, lastUpdate: null })
  const recentlyAddedTimersRef = useRef(new Set())
  
  // Feature toggles
  const [pinnedEnabled, setPinnedEnabled] = useState(() => loadFromStorage('craftCalculator_pinnedEnabled', true))
  const [historyEnabled, setHistoryEnabled] = useState(() => loadFromStorage('craftCalculator_historyEnabled', true))
  const [isLocationConfigOpen, setIsLocationConfigOpen] = useState(false)

  // Reverse-craft mode: when true the UI lists "source" resources and shows available crafts for the selected resource
  const [reverseMode, setReverseMode] = useState(false)
  // Locations mode: show locations list and location-specific drops
  const [locationsMode, setLocationsMode] = useState(() => loadFromStorage('craftCalculator_locationsMode', false))
  const [selectedLocation, setSelectedLocation] = useState(() => loadFromStorage('craftCalculator_selectedLocation', 'Forest'))
  // Remember last selection per mode (modeKey -> { item, amount, craftChain, selectedLocation })
  const [lastSelectionByMode, setLastSelectionByMode] = useState(() => loadFromStorage('craftCalculator_lastSelectionByMode', {}))

  const getModeKeyFor = (rev, loc, exp) => {
    const modeName = loc ? 'locations' : (rev ? 'baseToCraft' : 'craftToBase')
    return `${modeName}|${exp || ''}`
  }

  const saveCurrentSelection = () => {
    try {
      const key = getModeKeyFor(reverseMode, locationsMode, exploringMode)
      const data = { item, amount, craftChain, selectedLocation }
      setLastSelectionByMode(prev => {
        const next = { ...(prev || {}), [key]: data }
        try { saveToStorage('craftCalculator_lastSelectionByMode', next) } catch (e) {}
        return next
      })
    } catch (e) {
      // ignore
    }
  }

  const restoreSelectionFor = (rev, loc, exp) => {
    try {
      const key = getModeKeyFor(rev, loc, exp)
      const stored = loadFromStorage('craftCalculator_lastSelectionByMode', lastSelectionByMode || {})
      const data = stored && stored[key]
      if (data) {
        if (data.item) setItem(data.item)
        if (data.amount !== undefined) setAmount(data.amount)
        if (data.craftChain) setCraftChain(data.craftChain)
        if (data.selectedLocation) setSelectedLocation(data.selectedLocation)
        return true
      }
    } catch (e) {}
    return false
  }
  // Reverse-craft mode: debug instrumentation removed

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
    const cleanAmount = typeof amount === 'string' ? amount.replace(/\s/g, '') : amount
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
      let needed = baseQuantity * amount
      if (resourceSaverPercent > 0) {
        needed = needed / (1 + resourceSaverPercent)
      }
      filteredResources[resourceName] = Math.ceil(needed)
    }
    
    return {
      ...fullResult,
      filteredResources
    }
  }, [item, amount, activePerks, combinedRecipes])

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

  const itemsForSelect = reverseMode ? sourceResources : items

  useEffect(() => {
    saveToStorage('craftCalculator_locationsMode', locationsMode)
  }, [locationsMode])

  useEffect(() => {
    saveToStorage('craftCalculator_selectedLocation', selectedLocation)
  }, [selectedLocation])

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

  // Helper to round to two decimals
  const roundToTwo = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return null
    return Math.round(Number(n) * 100) / 100
  }

  // Function to handle clicking on a craftable resource
  const handleResourceClick = (resourceName, quantity) => {
    if (isCraftable(resourceName)) {
      hapticFeedback('medium')
      
      // Add current item to history before navigating (only if history is enabled)
      if (historyEnabled) {
        const historyEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          fromItem: item,
          fromAmount: amount,
          toItem: resourceName,
          toAmount: quantity,
          chain: [...craftChain]
        }
        
        setCraftHistory(prev => [historyEntry, ...prev.slice(0, historyLimit - 1)]) // Keep configured limit
      }
      
      setItem(resourceName)
      setAmount(quantity)
      setCraftChain(prev => [...prev, { name: resourceName, amount: quantity }])
    }
  }

  // Breadcrumb navigation removed

  // Function to load a craft from history
  const handleHistoryClick = (historyEntry) => {
    setItem(historyEntry.toItem)
    setAmount(historyEntry.toAmount)
    setCraftChain([...historyEntry.chain, { name: historyEntry.toItem, amount: historyEntry.toAmount }])
    setIsHistoryOpen(false)
  }

  // Function to clear craft history
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

  // Function to generate shareable text
  const generateShareText = () => {
    if (!result) return ''
    
    const resourcesText = Object.entries(result.filteredResources)
      .map(([name, qty]) => `• ${name}: ${formatNumber(qty)}`)
      .join('\n')
    
    const perksText = activePerks.length > 0 
      ? `\n\nPerks:\n${activePerks.map(p => `• ${p}`).join('\n')}` 
      : ''
    
    return `🔨 Craft Calculator Results\n\n📦 Item: ${item} (×${formatNumber(typeof amount === 'string' ? amount.replace(/\s/g, '') : amount)})\n\n📋 Resources needed:\n${resourcesText}${perksText}\n\n🔗 Calculate your own: [Open Craft Calculator]`
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
    saveToStorage('craftCalculator_craftHistory', craftHistory)
  }, [craftHistory])

  useEffect(() => {
    saveToStorage('craftCalculator_historyLimit', historyLimit)
  }, [historyLimit])

  useEffect(() => {
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
        devLog('❌ API update error:', data.error)
        setApiLoadStatus({ loading: false, error: data.error, lastUpdate: new Date() })
        return
      }
      
      if (!data) {
        devLog('⚠️ No data received from API')
        setApiLoadStatus({ loading: false, error: 'No data received', lastUpdate: null })
        return
      }
      
      const nextItems = data.items || data.itemData || {}
      const itemsCount = Object.keys(nextItems).length
      
      if (itemsCount > 0) {
        devLog('✅ Successfully loaded', itemsCount, 'items from API')
        mergeItemsData(nextItems)
        setApiLoadStatus({ loading: false, error: null, lastUpdate: new Date() })
      } else {
        devLog('⚠️ Received empty items data')
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

  useEffect(() => {
    saveToStorage('craftCalculator_pinnedResources', pinnedResources)
  }, [pinnedResources])

  useEffect(() => {
    saveToStorage('craftCalculator_lastPinnedLocation', lastPinnedLocation)
  }, [lastPinnedLocation])

  useEffect(() => {
    saveToStorage('craftCalculator_pinnedFolders', pinnedFolders)
  }, [pinnedFolders])

  useEffect(() => {
    saveToStorage('craftCalculator_activePinnedFolder', activePinnedFolder)
  }, [activePinnedFolder])

  // Migration: some older pinned entries used `selectedLocation` key.
  // Normalize to `location` on first load to avoid mismatch between selector and estimate.
  // Also add default folderId for items without one.
  useEffect(() => {
    try {
      if (!pinnedResources || pinnedResources.length === 0) return
      let migrated = false
      const next = pinnedResources.map(p => {
        let updated = p
        
        // Migrate selectedLocation to location
        if (p.selectedLocation && !p.location) {
          migrated = true
          const { selectedLocation, ...rest } = updated
          updated = { ...rest, location: selectedLocation }
        }
        
        // Add default folderId if missing
        if (!updated.folderId) {
          migrated = true
          updated = { ...updated, folderId: 'default' }
        }
        
        return updated
      })
      if (migrated) setPinnedResources(next)
    } catch (e) {
      // ignore
    }
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  useEffect(() => {
    saveToStorage('craftCalculator_useThousandsFormat', useThousandsFormat)
  }, [useThousandsFormat])

  useEffect(() => {
    saveToStorage('craftCalculator_pinnedEnabled', pinnedEnabled)
  }, [pinnedEnabled])

  useEffect(() => {
    saveToStorage('craftCalculator_historyEnabled', historyEnabled)
  }, [historyEnabled])

  // Auto-switch tab if current tab is disabled
  useEffect(() => {
    if (sidebarActiveTab === 'pinned' && !pinnedEnabled) {
      setSidebarActiveTab('perks')
    } else if (sidebarActiveTab === 'history' && !historyEnabled) {
      setSidebarActiveTab('perks')
    }
  }, [pinnedEnabled, historyEnabled, sidebarActiveTab])

  // Pinned resources functions
  const addToPinned = (resourceName, quantity, parentRecipe = null) => {
    // Always add to the active folder
    addToPinnedWithFolder(resourceName, quantity, parentRecipe, activePinnedFolder || 'default')
  }

  const removeFromPinned = (index) => {
    hapticFeedback('light')
    setPinnedResources(prev => prev.filter((_, i) => i !== index))
  }

  // Folder management functions
  const createFolder = (folderName) => {
    const newFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: folderName.trim(),
      createdAt: Date.now()
    }
    setPinnedFolders(prev => [...prev, newFolder])
    return newFolder.id
  }

  const deleteFolder = (folderId) => {
    if (folderId === 'default') return // Cannot delete default folder
    
    // Remove all items in this folder
    setPinnedResources(prev => prev.filter(item => item.folderId !== folderId))
    
    // Remove the folder
    setPinnedFolders(prev => prev.filter(f => f.id !== folderId))
    
    // If active folder is deleted, switch to default
    if (activePinnedFolder === folderId) {
      setActivePinnedFolder('default')
    }
  }

  const renameFolder = (folderId, newName) => {
    setPinnedFolders(prev => prev.map(f => 
      f.id === folderId ? { ...f, name: newName.trim() } : f
    ))
  }

  const addToPinnedWithFolder = (resourceName, quantity, parentRecipe = null, folderId = null) => {
    const targetFolder = folderId || activePinnedFolder || 'default'
    
    hapticFeedback('light')
    
    setPinnedResources(prev => {
      let qty = quantity
      if (qty === null || qty === undefined || qty === '') qty = 1
      if (typeof qty === 'string') {
        const parsed = Number(qty.replace(/\s+/g, ''))
        qty = Number.isFinite(parsed) ? parsed : 1
      }
      if (typeof qty !== 'number' || Number.isNaN(qty) || !Number.isFinite(qty) || qty <= 0) qty = 1
      qty = Math.round(qty * 100) / 100

      const locs = getItemLocations(resourceName) || []
      const hasLast = lastPinnedLocation && locs.some(l => l.name === lastPinnedLocation)
      const newEntry = {
        name: resourceName,
        quantity: qty,
        parentRecipe: parentRecipe || item,
        folderId: targetFolder,
        ...(hasLast ? { location: lastPinnedLocation } : {})
      }
      return [...prev, newEntry]
    })
    
    // Show success animation
    const coercedQty = (() => {
      let q = quantity
      if (q === null || q === undefined || q === '') return 1
      if (typeof q === 'string') {
        const parsed = Number(q.replace(/\s+/g, ''))
        q = Number.isFinite(parsed) ? parsed : 1
      }
      if (typeof q !== 'number' || Number.isNaN(q) || !Number.isFinite(q) || q <= 0) q = 1
      return Math.round(q * 100) / 100
    })()
    const itemKey = `${resourceName}_${coercedQty}_${parentRecipe || item}`
    setRecentlyAddedItems(prev => {
      const next = new Set(prev)
      next.add(itemKey)
      return next
    })
    
    if (typeof window !== 'undefined') {
      const timerId = window.setTimeout(() => {
        setRecentlyAddedItems(prev => {
          const next = new Set(prev)
          next.delete(itemKey)
          return next
        })
        recentlyAddedTimersRef.current.delete(timerId)
      }, 2000)
      recentlyAddedTimersRef.current.add(timerId)
    }
  }

  // Quick pin handler - opens modal to select any item
  const handleQuickPin = (selectedItem) => {
    setQuickPinSelectedItem(selectedItem)
    setQuickPinQuantity('')
  }

  const confirmQuickPin = () => {
    if (quickPinQuantity && !isNaN(quickPinQuantity) && parseInt(quickPinQuantity) > 0) {
      addToPinnedWithFolder(
        quickPinSelectedItem,
        parseInt(quickPinQuantity),
        'Quick Pin',
        activePinnedFolder
      )
      hapticFeedback('success')
      setIsQuickPinModalOpen(false)
      setQuickPinSelectedItem(null)
      setQuickPinQuantity('')
      setQuickPinFilter('')
    }
  }

  const cancelQuickPin = () => {
    setQuickPinSelectedItem(null)
    setQuickPinQuantity('')
  }

  // Reset Quick Pin filter when modal closes
  useEffect(() => {
    if (!isQuickPinModalOpen) {
      setQuickPinFilter('')
      setQuickPinSelectedItem(null)
      setQuickPinQuantity('')
    }
  }, [isQuickPinModalOpen])

  // Save pinned resources to localStorage

  // Save pinned resources to localStorage

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

  // Function to handle clear data with confirmation
  const handleClearData = () => {
    hapticFeedback('light')
    setShowClearConfirm(true)
  }

  // Function to clear all saved data
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
      setHistoryEnabled(true)
  setItemsData({ ...STATIC_ITEMS_MAP })
      
      // Reset UI states
      setShowAllBase(false)
      setSidebarOpen(false)
      setSidebarActiveTab('perks')
      setIsItemSelectOpen(false)
      setIsHistoryOpen(false)
      setRecentlyAddedItems(new Set())
      if (typeof window !== 'undefined') {
        recentlyAddedTimersRef.current.forEach(id => window.clearTimeout(id))
      }
      recentlyAddedTimersRef.current.clear()

  // Also reset any saved-last-selection map in memory
  setLastSelectionByMode({})
      
      // Show confirmation
      hapticFeedback('heavy')
      setShowClearSuccess(true)
      setTimeout(() => {
        setShowClearSuccess(false)
      }, 3000)

      updateService.forceUpdate().then((data) => {
        mergeItemsData(data?.items || data?.itemData || {})
      }).catch((err) => {
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
          devLog('Failed to refetch recipes after clearing data:', err)
        }
      })
    } catch (error) {
      devLog('Failed to clear saved data:', error)
      // Could add error modal here too, but keeping minimal for now
    }
  }

  // Function to confirm data clearing
  const confirmClearData = () => {
    setShowClearConfirm(false)
    clearSavedData()
  }

  // Function to cancel data clearing
  const cancelClearData = () => {
    hapticFeedback('light')
    setShowClearConfirm(false)
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
        'Eagle Eye (Runecube)'
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
        'Sprint Shoes II'
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

  // refs for accessibility handling
  const sidebarRef = React.useRef(null)
  const menuBtnRef = React.useRef(null)
  const breadcrumbsRef = React.useRef(null)
  const modeRef = React.useRef(null)

  // Helper to determine overlay (mobile) layout
  const isOverlayNow = () => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 899px)').matches)

  // Breadcrumb logic removed

  // Manage inert/aria-hidden and focus when sidebar toggles to avoid hiding a focused element
  // Only apply inert/aria-hidden for overlay (mobile) layouts; desktop sidebar is sticky and must remain interactive
  useEffect(() => {
    const asideEl = sidebarRef.current
    const menuBtn = menuBtnRef.current || document.querySelector('[aria-controls="perks-sidebar"]')
    if (!asideEl) return

  const isOverlay = isOverlayNow()

  if (!isOverlay) {
      // Desktop: ensure sidebar is interactive and visible to AT
      try { asideEl.inert = false } catch (e) {}
      asideEl.removeAttribute('aria-hidden')
      return
    }

    if (sidebarOpen) {
      // opening on overlay: make interactive and visible to AT
      try { asideEl.inert = false } catch (e) {}
      asideEl.setAttribute('aria-hidden', 'false')
    } else {
      // closing on overlay: if focus is inside the aside, move it to the menu button first
      const active = document.activeElement
      if (active && asideEl.contains(active)) {
        try {
          if (menuBtn && typeof menuBtn.focus === 'function') menuBtn.focus()
          else (document.body && document.body.focus && document.body.focus())
        } catch (err) {}
      }
      try { asideEl.inert = true } catch (e) {}
      asideEl.setAttribute('aria-hidden', 'true')
    }
  }, [sidebarOpen])

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
                Pinned {pinnedResources.length > 0 && `(${pinnedResources.length})`}
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
            <>
              {perkCategories.map(category => (
                <div key={category.title} className="perk-group">
                  <h3 className="perk-group-title">{category.title}</h3>
                  {category.perks.map(p => (
                    <motion.button
                      layout
                      key={p}
                      whileTap={{ scale: 0.98 }}
                      className={"chip wide" + (activePerks.includes(p) ? ' active' : '')}
                      onClick={() => togglePerk(p)}
                      type="button"
                      aria-pressed={activePerks.includes(p)}
                    >{p}</motion.button>
                  ))}
                </div>
              ))}
            </>
          )}
          
          {sidebarActiveTab === 'history' && historyEnabled && (
            <div className="history-section">
              <div className="section-header">
                <h3>Craft History ({craftHistory.length})</h3>
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
              
              <div className="history-list-sidebar">
                {craftHistory.length === 0 ? (
                  <div className="empty-state">
                    <p>No craft history yet.</p>
                    <p>Navigate through intermediate resources to build your history.</p>
                  </div>
                ) : (
                  craftHistory.map(entry => (
                    <button
                      key={entry.id}
                      className="history-item-sidebar"
                      onClick={() => {
                        handleHistoryClick(entry)
                        setSidebarOpen(false)
                      }}
                      type="button"
                    >
                      <div className="history-main">
                        <span className="from">{entry.fromItem}</span>
                        <span className="arrow">→</span>
                        <span className="to">{entry.toItem}</span>
                        <span className="amount">×{entry.toAmount}</span>
                      </div>
                      <div className="history-time">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          
          {sidebarActiveTab === 'pinned' && pinnedEnabled && (
            <div className="pinned-section">
              {/* Folder tabs */}
              <div className="folder-tabs-container">
                <div className="folder-tabs">
                  {pinnedFolders.map(folder => {
                    const folderItems = pinnedResources.filter(item => (item.folderId || 'default') === folder.id)
                    return (
                      <button
                        key={folder.id}
                        className={`folder-tab ${activePinnedFolder === folder.id ? 'active' : ''}`}
                        onClick={() => setActivePinnedFolder(folder.id)}
                        type="button"
                      >
                        {folder.name}
                        <span className="folder-count">({folderItems.length})</span>
                      </button>
                    )
                  })}
                  {!isCreatingFolderInTabs ? (
                    <button
                      className="folder-tab new-folder"
                      onClick={() => {
                        setIsCreatingFolderInTabs(true)
                        setFolderNameInput('')
                      }}
                      type="button"
                      title="Create new folder"
                    >
                      + New Folder
                    </button>
                  ) : (
                    <div className="folder-tab-input-wrapper">
                      <input
                        type="text"
                        className="folder-name-input folder-tab-input"
                        value={folderNameInput}
                        onChange={(e) => setFolderNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && folderNameInput.trim()) {
                            const newId = createFolder(folderNameInput.trim())
                            setActivePinnedFolder(newId)
                            setIsCreatingFolderInTabs(false)
                            setFolderNameInput('')
                          } else if (e.key === 'Escape') {
                            setIsCreatingFolderInTabs(false)
                            setFolderNameInput('')
                          }
                        }}
                        placeholder="Folder name..."
                        autoFocus
                      />
                      <button
                        className="folder-input-btn folder-input-confirm"
                        onClick={() => {
                          if (folderNameInput.trim()) {
                            const newId = createFolder(folderNameInput.trim())
                            setActivePinnedFolder(newId)
                            setIsCreatingFolderInTabs(false)
                            setFolderNameInput('')
                          }
                        }}
                        disabled={!folderNameInput.trim()}
                        title="Create folder"
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </button>
                      <button
                        className="folder-input-btn folder-input-cancel"
                        onClick={() => {
                          setIsCreatingFolderInTabs(false)
                          setFolderNameInput('')
                        }}
                        title="Cancel"
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="section-header">
                <h3>Pinned Resources</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="chip"
                    onClick={() => {
                      hapticFeedback('light')
                      setIsQuickPinModalOpen(true)
                    }}
                    type="button"
                    title="Pin any item"
                  >
                    + Pin
                  </button>
                  {pinnedResources.filter(item => (item.folderId || 'default') === activePinnedFolder).length > 0 && (
                    <button 
                      className="chip danger"
                      onClick={() => {
                        hapticFeedback('medium')
                        setPinnedResources(prev => prev.filter(item => (item.folderId || 'default') !== activePinnedFolder))
                      }}
                      type="button"
                      title="Clear this folder"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              
              {pinnedResources.filter(item => (item.folderId || 'default') === activePinnedFolder).length === 0 ? (
                <div className="empty-state">
                  <p>No pinned resources in this folder.</p>
                  <p>Pin resources from any recipe by clicking the "+" button next to them.</p>
                </div>
              ) : (
                <div className="pinned-items">
                  {pinnedResources.map((pinnedItem, index) => {
                    // Only show items in the active folder
                    if ((pinnedItem.folderId || 'default') !== activePinnedFolder) return null
                    
                    // compute estimate once per pinned item so selector and estimate use same default
                    let est = null
                    try {
                      est = computePinnedEstimate(pinnedItem, pinnedItem.quantity, activePerks, exploringMode)
                    } catch (e) { est = null }

                    const locs = getItemLocations(pinnedItem.name) || []
                    // prefer explicit user-set `location`, then computed estimate location, then legacy `selectedLocation`, then first available
                    const selectorValue = pinnedItem.location || (est && est.location) || pinnedItem.selectedLocation || (locs[0] && locs[0].name) || ''

                    return (
                      <div key={index} className="pinned-card">
                        <button
                          className="pinned-close-btn"
                          onClick={() => removeFromPinned(index)}
                          type="button"
                          title="Remove from pinned"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>

                        <div className="pinned-card-content">
                          <div className="pinned-item-name">
                            {itemsData && itemsData[pinnedItem.name] ? (
                              <ItemDisplay itemName={pinnedItem.name} itemsData={itemsData} />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <LocationImage name={pinnedItem.name} size={24} />
                                <span style={{ fontWeight: 600 }}>{pinnedItem.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="pinned-item-details">
                            <span className="pinned-item-quantity">×{formatNumber(pinnedItem.quantity)}</span>
                            {pinnedItem.parentRecipe && <span className="parent-recipe">from {pinnedItem.parentRecipe}</span>}

                            {est && (() => {
                              if (typeof est.apNeeded !== 'undefined' && est.apNeeded !== null) {
                                return (<div className="pinned-ap-line">{`${formatNumber(est.apNeeded)} AP`}</div>)
                              }
                              if (est.mode === 'EXP') return (<div style={{ fontSize: 12, color: '#99a', marginTop: 6 }}>{formatNumber(est.explores)} EXP • {formatNumber(est.stamina)} STA</div>)
                              if (est.mode === 'AC') return (<div style={{ fontSize: 12, color: '#99a', marginTop: 6 }}>{formatNumber(est.cidersNeeded)} AC • {formatNumber(est.totalStamina)} STA</div>)
                              return null
                            })()}
                          </div>
                        </div>

                        <div className="pinned-loc-select">
                          {locs.length === 0 ? null : (
                            <PinnedLocationSelect
                              options={locs.map(l => l.name)}
                              value={selectorValue}
                              onChange={(newLoc) => {
                                setPinnedResources(prev => prev.map((p, i) => i === index ? { ...p, location: newLoc } : p))
                                // persist last-picked location so subsequent pins default to it
                                setLastPinnedLocation(newLoc)
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          
          {sidebarActiveTab === 'settings' && (
            <div className="settings-section">
              <h3 className="section-title">Display Settings</h3>
              
              <h3 className="section-title">Features</h3>
              
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={pinnedEnabled}
                    onChange={(e) => setPinnedEnabled(e.target.checked)}
                    className="setting-checkbox"
                  />
                  Enable Resource Pinning
                </label>
                <p className="setting-description">
                  Show pinned tab and pin buttons for resources
                </p>
              </div>

              {pinnedEnabled && (
                <div className="setting-item">
                  <button
                    className="chip wide"
                    onClick={() => setIsFolderConfigOpen(true)}
                    type="button"
                  >
                    Configure Pinning Folders
                  </button>
                  <p className="setting-description">
                    Manage folders for organizing pinned resources
                  </p>
                </div>
              )}
              
              
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={historyEnabled}
                    onChange={(e) => setHistoryEnabled(e.target.checked)}
                    className="setting-checkbox"
                  />
                  Enable History functionality
                </label>
                <p className="setting-description">
                  Track and save calculation history
                </p>
              </div>

              <h3 className="section-title">Exploring</h3>
              <div className="setting-item">
                <div className="setting-label" style={{ alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 600 }}>Mode</span>
                  <div className="exploring-chips">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className={`chip${exploringMode === 'Apple Cider' ? ' active' : ''}`}
                      onClick={() => setExploringMode('Apple Cider')}
                      type="button"
                    >
                      Apple Cider
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className={`chip${exploringMode === 'Arnold Palmer' ? ' active' : ''}`}
                      onClick={() => setExploringMode('Arnold Palmer')}
                      type="button"
                    >
                      Arnold Palmer
                    </motion.button>
                  </div>
                </div>
                <p className="setting-description">Select how exploring calculations should be performed.</p>
              </div>
              
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsLocationConfigOpen(true)}
                  className="small-btn"
                  style={{ padding: '6px 10px' }}
                >
                  Configure locations
                </button>
                <div style={{ fontSize: 12, color: '#666' }}>Set Exploring Effectiveness per location (affects cider explores)</div>
              </div>
              
              {historyEnabled && (
                <>
                  <h3 className="section-title">History Settings</h3>
                  
                  <div className="setting-item">
                    <label className="setting-label">
                      History limit
                      <input
                        type="number"
                        min="10"
                        max="200"
                        value={historyLimit}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10)
                          if (Number.isNaN(parsed)) {
                            setHistoryLimit(50)
                            return
                          }
                          const bounded = Math.min(200, Math.max(10, parsed))
                          setHistoryLimit(bounded)
                        }}
                        className="setting-input"
                      />
                    </label>
                    <p className="setting-description">
                      Maximum number of history entries to keep (10-200)
                    </p>
                  </div>
                </>
              )}
              
              <h3 className="section-title">Bug Report</h3>
              <button
                className="chip wide"
                onClick={handleBugReport}
                type="button"
                title="Report a bug or issue"
              >
                Report Bug
              </button>
              <div className="settings-info">
                <p>Found a bug or issue? Let us know and help improve the app.</p>
              </div>
              
              <h3 className="section-title">Data Management</h3>
              <button
                className="chip wide danger"
                onClick={handleClearData}
                type="button"
                title="Clear all saved data and reset to defaults"
              >
                Clear All Saved Data
              </button>
              
              <div className="settings-info">
                <p>This will remove all saved perks, craft history, settings, and current selection.</p>
              </div>
              
              {/* Social links */}
              <div className="social-links">
                <div className="social-link-wrapper">
                  <span className="social-label">Updates</span>
                  <a 
                    href="https://www.reddit.com/u/ConferenceSingle236" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="social-link"
                    title="Reddit"
                  >
                    <img src="/reddit-logo-2436.png" alt="Reddit" className="social-icon" />
                    Reddit
                  </a>
                </div>
                <div className="social-link-wrapper">
                  <span className="social-label">My Profile</span>
                  <a 
                    href="https://farmrpg.com/index.php#!/profile.php?user_name=bbybxx" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="social-link"
                    title="FarmRPG Profile"
                  >
                    <img src="/farmrpg_logo.png" alt="FarmRPG" className="social-icon" />
                    FarmRPG
                  </a>
                </div>
                <div className="social-link-wrapper">
                  <span className="social-label">Tip</span>
                  <a 
                    href="https://boosty.to/bbybxx/donate?forPost=9850758" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="social-link"
                    title="Support on Boosty"
                  >
                    <img src="/boosty-sign-logo.png" alt="Boosty" className="social-icon" />
                    Boosty
                  </a>
                </div>
              </div>
              
            </div>
          )}
          
          {/* Exploring perks now use existing perkCategories UI (chips) */}
        </div>
      </aside>

      <div className="main">
  <header className={"glass header" + (headerVisible ? '' : ' hidden')}>
          <button
            className="icon menu"
            ref={menuBtnRef}
            onClick={(e) => {
              e.stopPropagation()
              setSidebarOpen(true)
            }}
            aria-label="Open perks"
            aria-controls="perks-sidebar"
            aria-expanded={sidebarOpen}
          >☰</button>
          
          <div className="craft-chain" onClick={(e) => e.stopPropagation()}>
            {/* Show breadcrumbs only when chain has more than one node; otherwise show current mode */}
            {craftChain && craftChain.length > 1 ? (
              <nav ref={breadcrumbsRef} className="breadcrumbs" aria-label="Craft chain">
                {craftChain.slice(0, Math.max(0, craftChain.length - 1)).map((node, idx) => {
                  const displayName = (typeof node === 'string') ? node : (node && node.name) || ''
                  return (
                    <span key={idx}>
                      <button
                        type="button"
                        className="breadcrumb-item"
                        onClick={(e) => {
                          e.stopPropagation()
                          const newChain = craftChain.slice(0, idx + 1)
                          setCraftChain(newChain)
                          const target = newChain[idx]
                          // If this breadcrumb represents a location node, switch back into Locations mode
                          if (target && typeof target === 'object' && target.isLocation) {
                            setLocationsMode(true)
                            setReverseMode(false)
                            setSelectedLocation(target.name)
                            // restore amount user had while viewing this location, if saved
                            const restored = (typeof target.savedAmount !== 'undefined' && target.savedAmount !== null) ? target.savedAmount : 1
                            setItem('Board')
                            setAmount(restored)
                          } else {
                            const targetName = (typeof target === 'string') ? target : (target && target.name) || ''
                            const targetAmt = (typeof target === 'object' && target && target.amount) ? target.amount : 1
                            if (targetName) setItem(targetName)
                            setAmount(targetAmt)
                          }
                        }}
                      >
                        {typeof node === 'object' && node && node.isLocation ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LocationImage name={node.name} size={20} />
                            <span style={{ fontWeight: 600 }}>{node.name}</span>
                          </div>
                        ) : (
                          <ItemDisplay itemName={displayName} itemsData={itemsData} />
                        )}
                      </button>
                      <span className="breadcrumb-separator">›</span>
                    </span>
                  )
                })}

                {craftChain.length > 0 && (
                  <span className="breadcrumb-item current">
                    {(() => {
                      const last = craftChain[craftChain.length - 1]
                      const lastName = (typeof last === 'string') ? last : (last && last.name) || ''
                      if (typeof last === 'object' && last && last.isLocation) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LocationImage name={lastName} size={20} />
                            <span style={{ fontWeight: 600 }}>{lastName}</span>
                          </div>
                        )
                      }
                      return <ItemDisplay itemName={lastName} itemsData={itemsData} />
                    })()}
                  </span>
                )}
              </nav>
            ) : (
              <div className="breadcrumb-mode" aria-label="Mode">
                {locationsMode ? 'Locations' : (reverseMode ? 'Base to Craft' : 'Craft to Base')}
              </div>
            )}
          </div>
          {/* Header right controls: Mode button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', marginRight: 0 }}>
            <div style={{ position: 'relative' }} ref={modeRef}>
              <button
                className="chip"
                type="button"
                onClick={(e) => { e.stopPropagation(); setModeOpen(!modeOpen) }}
                aria-expanded={modeOpen}
              >
                mode
              </button>
              <AnimatePresence>
                {modeOpen && (
                  <motion.div className="mode-dropdown glass" style={{ position: 'absolute', right: 0, marginTop: 8, minWidth: 160, zIndex: 40 }}
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                  >
                  {locationsMode ? (
                    // When on Locations page: offer both craft↔base options
                    <>
                      <button
                        className={`mode-option`}
                        type="button"
                        onClick={() => {
                          saveCurrentSelection()
                          setReverseMode(true); setLocationsMode(false); setModeOpen(false);
                          // try to restore previous selection for new mode
                          if (!restoreSelectionFor(true, false, exploringMode)) {
                            // leave current selection as-is
                          }
                        }}
                      >
                        Base to Craft
                      </button>
                      <button
                        className={`mode-option`}
                        type="button"
                        onClick={() => {
                          saveCurrentSelection()
                          setReverseMode(false); setLocationsMode(false); setModeOpen(false);
                          if (!restoreSelectionFor(false, false, exploringMode)) {
                          }
                        }}
                      >
                        Craft to Base
                      </button>
                    </>
                  ) : reverseMode ? (
                    // When on Base to Craft: offer Craft to Base and Locations
                    <>
                      <button
                        className={`mode-option`}
                        type="button"
                        onClick={() => {
                          saveCurrentSelection()
                          setReverseMode(false); setLocationsMode(false); setModeOpen(false);
                          if (!restoreSelectionFor(false, false, exploringMode)) {
                          }
                        }}
                      >
                        Craft to Base
                      </button>
                        <button
                          className={`mode-option ${locationsMode ? 'active' : ''}`}
                          type="button"
                          onClick={() => {
                            saveCurrentSelection()
                            setLocationsMode(true); setReverseMode(false); setModeOpen(false);
                            // try to restore previous selection for locations mode
                            if (!restoreSelectionFor(false, true, exploringMode)) {
                              // if nothing saved, keep existing selections but ensure there's a selectedLocation
                              if (!selectedLocation) setSelectedLocation('Forest')
                            }
                          }}
                        >
                          Locations
                        </button>
                    </>
                  ) : (
                    // Default (Craft to Base): offer Base to Craft and Locations
                    <>
                      <button
                        className={`mode-option`}
                        type="button"
                        onClick={() => {
                          saveCurrentSelection()
                          setReverseMode(true); setLocationsMode(false); setModeOpen(false);
                          if (!restoreSelectionFor(true, false, exploringMode)) {
                          }
                        }}
                      >
                        Base to Craft
                      </button>
                      <button
                        className={`mode-option ${locationsMode ? 'active' : ''}`}
                        type="button"
                        onClick={() => {
                          saveCurrentSelection()
                          setLocationsMode(true); setReverseMode(false); setModeOpen(false);
                          if (!restoreSelectionFor(false, true, exploringMode)) {
                            if (!selectedLocation) setSelectedLocation('Forest')
                          }
                        }}
                      >
                        Locations
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        </header>

        <section className="glass controls">
          <label className="field">
            <span className="label">{locationsMode ? 'Location' : 'Item'}</span>
            { !locationsMode ? (
              <button className="input" onClick={() => setIsItemSelectOpen(true)} type="button">
                <ItemDisplay itemName={item} itemsData={itemsData} />
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
              className="input" 
              type="text" 
              min={1} 
              max={9999999999999999}
              value={formatNumber(amount)} 
              placeholder="Enter amount (e.g., 1 000)"
              onChange={e => {
                const inputValue = e.target.value
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
                    setCraftChain(prev => {
                      const updated = [...prev]
                      updated[updated.length - 1] = { ...updated[updated.length - 1], amount: 1 }
                      return updated
                    })
                    return
                  }
                  const numericValue = parseFloat(final)
                  const rounded = Math.round(numericValue * 100) / 100
                  setAmount(rounded)
                  setCraftChain(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { ...updated[updated.length - 1], amount: rounded || 1 }
                    return updated
                  })
                  return
                }

                // Non-locations mode (integer-only) - previous behavior
                const cleanValue = inputValue.replace(/\D/g, '')
                if (cleanValue === '') {
                  setAmount('')
                  setCraftChain(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { ...updated[updated.length - 1], amount: 1 }
                    return updated
                  })
                  return
                }
                const numericValue = parseInt(cleanValue)
                if (numericValue > 9999999999999999) return
                setAmount(cleanValue)
                setCraftChain(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...updated[updated.length - 1], amount: numericValue || 1 }
                  return updated
                })
              }} 
            />
          </label>
        </section>

        <AnimatePresence>
          {isItemSelectOpen && (
            <motion.div
              className="modal-wrapper"
              onClick={() => setIsItemSelectOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="glass item-select-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-select-title"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="item-select-header">
                  <h2 id="item-select-title" className="item-select-title">Select an Item</h2>
                  <div className="item-select-search-wrapper">
                    <input
                      className="calc-input item-select-search"
                      placeholder={locationsMode ? 'Search locations...' : 'Search items...'}
                      value={itemSelectFilter}
                      onChange={(e) => setItemSelectFilter(e.target.value)}
                      aria-label="Filter items"
                    />
                  </div>
                </div>
                <div ref={itemSelectListRef} className="item-select-list">
                  {(locationsMode ? (locationsForConfig || []) : (itemsForSelect || [])).filter(i => {
                    const label = locationsMode ? (i.name || '') : (i || '')
                    if (!itemSelectFilter) return true
                    return String(label).toLowerCase().includes(itemSelectFilter.toLowerCase())
                  }).map(i => {
                    const label = locationsMode ? i.name : i
                    const active = locationsMode ? selectedLocation === i.name : item === i
                    return (
                      <button
                        key={label}
                        className={active ? 'active' : ''}
                        onClick={() => {
                          if (locationsMode) {
                            setSelectedLocation(label)
                            setIsItemSelectOpen(false)
                          } else {
                            handleSelectItem(label)
                          }
                        }}
                        type="button"
                      >
                              {locationsMode ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <LocationImage name={label} size={22} />
                                  <span>{label}</span>
                                </div>
                              ) : <ItemDisplay itemName={i} itemsData={itemsData} />}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
          
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
                          <span className="from"><ItemDisplay itemName={entry.fromItem} itemsData={itemsData} /></span>
                          <span className="arrow">→</span>
                          <span className="to"><ItemDisplay itemName={entry.toItem} itemsData={itemsData} /></span>
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
            key={`${item}-${amount}-${activePerks.join(',')}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="stack"
          >
            {locationsMode && (
              <motion.section className="glass card">
                <h2>Drops {selectedLocation ? `@ ${selectedLocation}` : ''}</h2>
                <ul className="list">
                  {(!selectedLocation) && (
                    <li className="empty-state" style={{ padding: '12px 16px', color: '#9aa' }}>Select a location to see drops.</li>
                  )}
                  {selectedLocation && (() => {
                    const locObj = APPLE_CIDER_REAL_DROP_RATES.locations && APPLE_CIDER_REAL_DROP_RATES.locations[selectedLocation]
                    if (!locObj) return (<li className="empty-state" style={{ padding: '12px 16px', color: '#9aa' }}>No data for this location.</li>)
                    const itemSet = new Set()
                    Object.values(locObj).forEach(variant => {
                      if (variant && typeof variant === 'object') Object.keys(variant).forEach(k => itemSet.add(k))
                    })
                    // Sort items by drops-per-cider (best variant) descending
                    const itemsList = Array.from(itemSet)
                      .map(it => {
                        // find best dropsPerCider across variants for this location
                        let best = 0
                        Object.keys(locObj).forEach(vk => {
                          const part = locObj[vk]
                          if (!part) return
                          const entry = part[it]
                          if (!entry) return
                          const val = (typeof entry === 'object' && (entry.dropsPerCider || entry.cidersPerDrop)) ? (entry.dropsPerCider || (entry.cidersPerDrop ? 1 / entry.cidersPerDrop : 0)) : (typeof entry === 'number' ? entry : 0)
                          if (val && val > best) best = val
                        })
                        return { name: it, bestDrops: best }
                      })
                      .sort((a, b) => b.bestDrops - a.bestDrops)
                      .map(x => x.name)

                    return itemsList.map((it) => {
                        let est = null
                        try { est = computePinnedEstimate({ name: it, location: selectedLocation }, Number(amount) || 1, activePerks, exploringMode) } catch (e) { est = null }
                        // compute per-unit estimate (cost per 1 item) and invert using user's Amount as budget
                        let numericValue = null
                        try {
                          const perUnit = computePinnedEstimate({ name: it, location: selectedLocation }, 1, activePerks, exploringMode)
                          const budget = Number(amount) || 0
                          if (exploringMode === 'Apple Cider') {
                            // perUnit.effectiveDropsPerCider = drops per cider for 1 cider baseline
                            const perCider = perUnit && perUnit.mode === 'AC' && typeof perUnit.effectiveDropsPerCider === 'number' ? perUnit.effectiveDropsPerCider : null
                            if (perCider && budget > 0) {
                              numericValue = budget * perCider
                            } else {
                              // fallback to raw dropsPerCider from variants
                              const raw = locObj['rq0cs0'] && locObj['rq0cs0'][it]
                              // cidersPerDrop from API is actually exploresPerDrop (hits needed for 1 drop)
                              // To get dropsPerCider: divide base explores (1010) by exploresPerDrop
                              const rawVal = raw && (raw.dropsPerCider || (raw.cidersPerDrop ? 1010 / raw.cidersPerDrop : null) || raw)
                              if (rawVal && budget > 0) numericValue = budget * rawVal

                              // additional fallback: compute best dropsPerCider across all variants for this location
                              if ((numericValue == null || numericValue === 0) && budget > 0) {
                                let bestDrops = 0
                                Object.keys(locObj).forEach(vk => {
                                  const part = locObj[vk]
                                  if (!part) return
                                  const entry = part[it]
                                  if (!entry) return
                                  // cidersPerDrop from API is actually exploresPerDrop, convert to dropsPerCider
                                  const val = (typeof entry === 'object' && (entry.dropsPerCider || entry.cidersPerDrop)) ? (entry.dropsPerCider || (entry.cidersPerDrop ? 1010 / entry.cidersPerDrop : 0)) : (typeof entry === 'number' ? entry : 0)
                                  if (val && val > bestDrops) bestDrops = val
                                })
                                if (bestDrops > 0) numericValue = budget * bestDrops
                              }
                            }
                          } else if (exploringMode === 'Arnold Palmer') {
                            const perAP = perUnit && perUnit.mode === 'AP' && typeof perUnit.itemsPerAP === 'number' ? perUnit.itemsPerAP : null
                            if (perAP && budget > 0) {
                              numericValue = budget * perAP
                            }
                          }
                        } catch (e) {
                          numericValue = null
                        }
                        let display = numericValue != null ? roundToTwo(numericValue) : null
                        // fallback to est if computePinnedEstimate returned useful totals
                        if ((display === null || display === undefined || display === '') && est) {
                          if (est.mode === 'AC' && typeof est.effectiveDropsPerCider === 'number') {
                            display = roundToTwo((Number(amount) || 0) * est.effectiveDropsPerCider)
                          } else if (est.mode === 'AP' && typeof est.itemsPerAP === 'number') {
                            display = roundToTwo((Number(amount) || 0) * est.itemsPerAP)
                          } else if (est.mode === 'EXP' && typeof est.explores === 'number') {
                            // show explores-derived estimate as 1 / explores if possible
                            const unitCost = est.explores
                            if (unitCost && unitCost > 0) display = roundToTwo((Number(amount) || 0) / unitCost)
                          }
                        }
                        if (display === null || display === undefined) display = '—'
                      // clickable when item itself has a recipe OR there exist recipes that USE this drop as an ingredient
                      const craftable = isCraftable(it) || ((findRecipesThatUse(it) || []).length > 0)
                      return (
                        <motion.li layout key={it} className="resource-item">
                          <div
                            className={`resource-content ${craftable ? 'clickable' : ''}`}
                            onClick={() => {
                              if (!craftable) return
                              hapticFeedback('medium')
                              // switch into Base → Craft (reverse) mode
                              setLocationsMode(false)
                              setReverseMode(true)
                              // choose reasonable amount: use computed numericValue (budget result) rounded down, fallback to 1
                              const parsed = numericValue != null && !Number.isNaN(Number(numericValue)) ? Number(numericValue) : null
                              const targetAmount = parsed && parsed >= 1 ? Math.max(1, Math.floor(parsed)) : 1
                              // capture current amount (what user had in Locations view) so we can restore it if user returns
                              const savedAmountForLocation = amount
                              // include the selected location as the first node so breadcrumbs show source and remember the prior amount
                              const locNode = selectedLocation ? { name: selectedLocation, isLocation: true, savedAmount: savedAmountForLocation } : null
                              const baseNode = { name: it, amount: targetAmount }
                              setCraftChain(locNode ? [locNode, baseNode] : [baseNode])
                              // navigate to the craft target
                              setItem(it)
                              setAmount(targetAmount)
                            }}
                            style={craftable ? { cursor: 'pointer' } : undefined}
                            title={craftable ? `Open crafts that use ${it}` : undefined}
                          >
                            <span className="k">
                              <ItemDisplay itemName={it} itemsData={itemsData}>
                                {craftable && (
                                  <span className="craft-indicator">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                      <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </span>
                                )}
                              </ItemDisplay>
                            </span>
                            <span className="v">{display}</span>
                          </div>
                          {pinnedEnabled && (
                            (() => {
                              const qtyForPin = numericValue != null ? roundToTwo(numericValue) : 1
                              return (
                                <button
                                  className={`pin-btn ${recentlyAddedItems.has(`${it}_${qtyForPin}_${selectedLocation || item}`) ? 'success' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); addToPinned(it, qtyForPin, selectedLocation || item) }}
                                  type="button"
                                  title={`Pin ${it}`}
                                >
                                  <div className="pin-icon">
                                    <div className={`pin-line pin-line-horizontal ${recentlyAddedItems.has(`${it}_${qtyForPin}_${selectedLocation || item}`) ? 'checked' : ''}`}></div>
                                    <div className={`pin-line pin-line-vertical ${recentlyAddedItems.has(`${it}_${qtyForPin}_${selectedLocation || item}`) ? 'checked' : ''}`}></div>
                                  </div>
                                </button>
                              )
                            })()
                          )}
                          
                        </motion.li>
                      )
                    })
                  })()}
                </ul>
              </motion.section>
            )}
            {!locationsMode && !reverseMode && result && Object.keys(result.filteredResources).length > 0 && (
              <motion.section className="glass card">
                <h2>Resources</h2>
                <ul className="list">
                  {(showAllBase ? Object.entries(result.filteredResources) : Object.entries(result.filteredResources).slice(0, 8)).map(([k, v]) => {
                    const mailableItems = ['Acorn', 'Apple', 'Apple Cider', 'Aquamarine', 'Arnold Palmer', 'Arrowhead', 'Axe', 'Black Powder', 'Blue Dye', 'Blue Feathers', 'Bone', 'Bouquet of Flowers', 'Bucket', 'Carbon Sphere', 'Caterpillar', 'Coal', 'Eggs', 'Explosive', 'Feathers', 'Fern Leaf', 'Fire Ant', 'Fishing Net', 'Fruit Punch', 'Glass Orb', 'Grapes', 'Green Dye', 'Green Parchment', 'Grubs', 'Hammer', 'Heart Container', 'Hide', 'Horn', 'Iced Tea', 'Iron Cup', 'Ladder', 'Large Net', 'Leather', 'Leather Diary', 'Lemon', 'Lemonade', 'Milk', 'Minnows', 'Mushroom', 'Mushroom Paste', 'Oak', 'Old Boot', 'Orange', 'Orange Juice', 'Peach', 'Peach Juice', 'Potato', 'Purple Dye', 'Purple Flower', 'Purple Parchment', 'Red Dye', 'Rope', 'Scrap Metal', 'Scrap Wire', 'Shimmer Stone', 'Shovel', 'Slimestone', 'Spider', 'Stone', 'Twine', 'Unpolished Shimmer Stone', 'Wood', 'Wooden Box', 'Wooden Button', 'Wooden Table', 'Worms', 'Yarn']
                    const isMailable = mailableItems.includes(k)
                    
                    return (
                      <motion.li 
                        layout 
                        key={k}
                        className="resource-item"
                      >
                        <div 
                          className={`resource-content ${isCraftable(k) ? 'clickable' : ''}`}
                          onClick={() => isCraftable(k) && handleResourceClick(k, v)}
                          style={isCraftable(k) ? { cursor: 'pointer' } : {}}
                          title={isCraftable(k) ? `Click to craft ${k}` : undefined}
                        >
                          <span className="k">
                            <ItemDisplay itemName={k} itemsData={itemsData}>
                              {isCraftable(k) && (
                                <span className="craft-indicator">
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path 
                                      d="M2 8L6 4L10 8" 
                                      stroke="currentColor" 
                                      strokeWidth="1.5" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                              )}
                            </ItemDisplay>
                          </span>
                          <span className="v">{formatNumber(v)}</span>
                        </div>
                        {pinnedEnabled && (
                          <button
                            className={`pin-btn ${recentlyAddedItems.has(`${k}_${v}_${craftChain.length > 0 ? craftChain[0].name : item}`) ? 'success' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              addToPinned(k, v, craftChain.length > 0 ? craftChain[0].name : item, e)
                            }}
                            type="button"
                            title={`Pin ${k} from ${item}`}
                          >
                            <div className="pin-icon">
                              <div 
                                className={`pin-line pin-line-horizontal ${recentlyAddedItems.has(`${k}_${v}_${craftChain.length > 0 ? craftChain[0].name : item}`) ? 'checked' : ''}`}
                              ></div>
                              <div 
                                className={`pin-line pin-line-vertical ${recentlyAddedItems.has(`${k}_${v}_${craftChain.length > 0 ? craftChain[0].name : item}`) ? 'checked' : ''}`}
                              ></div>
                            </div>
                          </button>
                        )}
                      </motion.li>
                    )
                  })}
                </ul>
                {Object.keys(result.filteredResources).length > 8 && (
                  <button className="link" onClick={() => setShowAllBase(s => !s)}>
                    {showAllBase ? 'Show less' : `Show all (${Object.keys(result.filteredResources).length})`}
                  </button>
                )}
              </motion.section>
            )}

            { reverseMode && (
              <motion.section className="glass card">
                <h2>Crafts</h2>
                <ul className="list">
                  {availableCrafts.length === 0 && (
                    <li className="empty-state" style={{ padding: '12px 16px', color: '#9aa' }}>No crafts available for the current selection.</li>
                  )}
                  {availableCrafts.map(c => {
                    const further = findRecipesThatUse(c.name) || []
                    const canNavigate = further.length > 0
                    return (
                      <motion.li layout key={c.name} className="resource-item">
                        <div 
                          className={`resource-content ${canNavigate ? 'clickable' : ''}`}
                          onClick={() => {
                            if (!canNavigate) return
                            // Determine the sensible amount for the new craft node: how many of this craft
                            // can be made from the currently available ingredient amount (precomputed as craftableCount).
                            const targetAmount = (typeof c.craftableCount === 'number') ? c.craftableCount : (Number(amount) || 1)

                            // Add current navigation to craft history (same behavior as original mode)
                            if (historyEnabled) {
                              const historyEntry = {
                                  id: Date.now(),
                                  timestamp: new Date().toISOString(),
                                  fromItem: item,
                                  fromAmount: amount,
                                  toItem: c.name,
                                  toAmount: targetAmount,
                                  chain: [...craftChain]
                                }
                              setCraftHistory(prev => [historyEntry, ...prev.slice(0, historyLimit - 1)])
                            }

                            // Navigate to the craft (select the crafted item)
                            setItem(c.name)
                            // Set amount to how many of the crafted item can be made from current resources
                            setAmount(targetAmount)
                            // Append crafted item to existing chain with the computed amount
                            setCraftChain(prev => {
                              // If prev already ends with the crafted item, keep as-is
                              if (prev && prev.length > 0 && String(prev[prev.length - 1].name) === String(c.name)) return prev
                              return [...prev, { name: c.name, amount: targetAmount }]
                            })
                          }}
                          style={canNavigate ? { cursor: 'pointer' } : undefined}
                          title={canNavigate ? `Open recipe for ${c.name}` : undefined}
                        >
                          <span className="k">
                            <ItemDisplay itemName={c.name} itemsData={itemsData}>
                              {canNavigate && (
                                <span className="craft-indicator">
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              )}
                            </ItemDisplay>
                          </span>
                          <span className="v">{formatNumber(c.craftableCount != null ? c.craftableCount : 0)}</span>
                        </div>

                        {pinnedEnabled && (() => {
                          // If we can compute how many crafts are available, pin the full available amount
                          const qtyForCraftPin = (typeof c.craftableCount === 'number' && c.craftableCount > 0)
                            ? Math.round(c.craftableCount * (c.outputQty || 1))
                            : (c.outputQty || 1)
                          return (
                            <button
                              className={`pin-btn ${recentlyAddedItems.has(`${c.name}_${qtyForCraftPin}_${item}`) ? 'success' : ''}`}
                              onClick={(e) => { e.stopPropagation(); addToPinned(c.name, qtyForCraftPin, item) }}
                              type="button"
                              title={`Pin ${c.name}`}
                            >
                              <div className="pin-icon">
                                <div className={`pin-line pin-line-horizontal ${recentlyAddedItems.has(`${c.name}_${qtyForCraftPin}_${item}`) ? 'checked' : ''}`}></div>
                                <div className={`pin-line pin-line-vertical ${recentlyAddedItems.has(`${c.name}_${qtyForCraftPin}_${item}`) ? 'checked' : ''}`}></div>
                              </div>
                            </button>
                          )
                        })()}
                      </motion.li>
                    )
                  })}
                </ul>
              </motion.section>
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="spacer" />

        {/* Clear Data Confirmation Modal */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="modal-content"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="modal-header">
                  <h3>🗑️ Clear All Data</h3>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to clear all saved data?</p>
                  <p className="modal-warning">This will reset everything to default settings and cannot be undone.</p>
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={cancelClearData}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-danger" 
                    onClick={confirmClearData}
                  >
                    Clear All Data
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear Success Notification */}
        <AnimatePresence>
          {showClearSuccess && (
            <motion.div
              className="success-notification"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ 
                type: "spring", 
                damping: 20, 
                stiffness: 300 
              }}
            >
              <div className="notification-content">
                <span className="notification-icon">✅</span>
                <span>All data cleared! App reset to defaults.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Folder Configuration Modal */}
        <AnimatePresence>
          {isFolderConfigOpen && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsFolderConfigOpen(false)
                setEditingFolderId(null)
                setIsCreatingFolder(false)
                setFolderNameInput('')
              }}
            >
              <motion.div
                className="modal glass folder-config-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                transition={{ duration: 0.2 }}
              >
                <div className="modal-header">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Manage Pinning Folders
                  </h3>
                </div>
                <div className="modal-body">
                  <div className="folder-list">
                    {pinnedFolders.map(folder => (
                      <div key={folder.id} className="folder-config-item">
                        {editingFolderId === folder.id ? (
                          <div className="folder-edit-input-wrapper">
                            <input
                              type="text"
                              className="folder-name-input"
                              value={folderNameInput}
                              onChange={(e) => setFolderNameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && folderNameInput.trim()) {
                                  renameFolder(folder.id, folderNameInput)
                                  setEditingFolderId(null)
                                  setFolderNameInput('')
                                } else if (e.key === 'Escape') {
                                  setEditingFolderId(null)
                                  setFolderNameInput('')
                                }
                              }}
                              autoFocus
                              placeholder="Folder name"
                            />
                            <button
                              className="folder-input-btn confirm"
                              onClick={() => {
                                if (folderNameInput.trim()) {
                                  renameFolder(folder.id, folderNameInput)
                                  setEditingFolderId(null)
                                  setFolderNameInput('')
                                }
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </button>
                            <button
                              className="folder-input-btn cancel"
                              onClick={() => {
                                setEditingFolderId(null)
                                setFolderNameInput('')
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="folder-config-info">
                              <span className="folder-config-name">{folder.name}</span>
                              <span className="folder-config-count">
                                {pinnedResources.filter(item => (item.folderId || 'default') === folder.id).length} items
                              </span>
                            </div>
                            <div className="folder-config-actions">
                              <button
                                className="folder-config-btn"
                                onClick={() => {
                                  setEditingFolderId(folder.id)
                                  setFolderNameInput(folder.name)
                                }}
                                title="Rename folder"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              {folder.id !== 'default' && (
                                deletingFolderId === folder.id ? (
                                  <div className="folder-delete-confirm">
                                    <span className="folder-delete-message">Delete "{folder.name}"?</span>
                                    <button
                                      className="folder-input-btn folder-input-confirm"
                                      onClick={() => {
                                        deleteFolder(folder.id)
                                        setDeletingFolderId(null)
                                      }}
                                      title="Confirm delete"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    </button>
                                    <button
                                      className="folder-input-btn folder-input-cancel"
                                      onClick={() => setDeletingFolderId(null)}
                                      title="Cancel"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="folder-config-btn danger"
                                    onClick={() => setDeletingFolderId(folder.id)}
                                    title="Delete folder"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                )
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {/* Create new folder inline */}
                    {isCreatingFolder && (
                      <div className="folder-config-item creating">
                        <div className="folder-edit-input-wrapper">
                          <input
                            type="text"
                            className="folder-name-input"
                            value={folderNameInput}
                            onChange={(e) => setFolderNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && folderNameInput.trim()) {
                                createFolder(folderNameInput)
                                setIsCreatingFolder(false)
                                setFolderNameInput('')
                              } else if (e.key === 'Escape') {
                                setIsCreatingFolder(false)
                                setFolderNameInput('')
                              }
                            }}
                            autoFocus
                            placeholder="New folder name"
                          />
                          <button
                            className="folder-input-btn confirm"
                            onClick={() => {
                              if (folderNameInput.trim()) {
                                createFolder(folderNameInput)
                                setIsCreatingFolder(false)
                                setFolderNameInput('')
                              }
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </button>
                          <button
                            className="folder-input-btn cancel"
                            onClick={() => {
                              setIsCreatingFolder(false)
                              setFolderNameInput('')
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!isCreatingFolder && (
                    <button
                      className="chip wide"
                      onClick={() => {
                        setIsCreatingFolder(true)
                        setFolderNameInput('')
                      }}
                      type="button"
                    >
                      + Create New Folder
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Pin Modal */}
        <AnimatePresence>
          {isQuickPinModalOpen && (
            <motion.div
              className="modal-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickPinModalOpen(false)}
              style={{ zIndex: 50 }}
            >
              <motion.div
                className="item-select-content glass"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {!quickPinSelectedItem ? (
                  <>
                    <div className="item-select-header">
                      <h2 className="item-select-title">Quick Pin</h2>
                      <div className="item-select-search-wrapper">
                        <input
                          className="calc-input item-select-search"
                          placeholder="Search items..."
                          value={quickPinFilter}
                          onChange={(e) => setQuickPinFilter(e.target.value)}
                          aria-label="Filter items"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="item-select-list">
                      {items.filter(itm => {
                        if (!quickPinFilter) return true
                        return String(itm).toLowerCase().includes(quickPinFilter.toLowerCase())
                      }).map((itm) => (
                        <button
                          key={itm}
                          onClick={() => handleQuickPin(itm)}
                          type="button"
                        >
                          <ItemDisplay itemName={itm} itemsData={itemsData} />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px' }}>
                    <h2 className="item-select-title" style={{ marginBottom: '16px' }}>
                      Pin {quickPinSelectedItem}
                    </h2>
                    <div className="folder-edit-input-wrapper" style={{ marginBottom: '16px' }}>
                      <input
                        type="number"
                        className="folder-name-input"
                        value={quickPinQuantity}
                        onChange={(e) => setQuickPinQuantity(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            confirmQuickPin()
                          } else if (e.key === 'Escape') {
                            cancelQuickPin()
                          }
                        }}
                        placeholder="Quantity..."
                        autoFocus
                        min="1"
                      />
                      <button
                        className="folder-input-btn folder-input-confirm"
                        onClick={confirmQuickPin}
                        disabled={!quickPinQuantity || parseInt(quickPinQuantity) <= 0}
                        title="Pin item"
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </button>
                      <button
                        className="folder-input-btn folder-input-cancel"
                        onClick={cancelQuickPin}
                        title="Cancel"
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bug Report Modal */}
        <BugReportModal
          isOpen={isBugReportOpen}
          onClose={handleBugReportClose}
          onSubmit={handleBugReportSubmit}
        />
  {/* Vercel Web Analytics */}
  <Analytics />
  {/* debug overlay removed */}
      </div>
    </div>
  )
}


