import { devLog } from '../utils/devLog'
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
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
import questsApiData from '../data/quests-api.json'
// Vercel Web Analytics (React)
import { Analytics } from '@vercel/analytics/react'
import PinnedLocationSelect from '../components/PinnedLocationSelect.jsx'
import ItemDisplay from '../components/ItemDisplay'
import itemsAPI from '../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap, normalizeItemRecord, areItemRecordsEqual } from '../utils/itemImageUtils.js'
import './app.css'
import LocationImage from '../components/LocationImage.jsx'
import * as serviceWorkerRegistration from '../serviceWorkerRegistration'
import { usePWA } from '../hooks/usePWA'

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

// Format numbers with spaces for thousands separator and dot for decimals
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
    num = numericFromString
  }

  if (typeof num !== 'number' || Number.isNaN(num)) {
    return ''
  }
  if (num === 0) return '0'
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = num.toString().split('.')
  
  // Format integer part with spaces
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  
  // Return with dot as decimal separator if there's a decimal part
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
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

// Global set to track which inputs are being actively edited (survives re-renders)
const editingInputsSet = new Set()

// Isolated input component with realtime updates via DOM manipulation
const LocationItemInput = React.memo(function LocationItemInput({ 
  itemName, 
  display, 
  onCommit,
  onPreview,
  formatNumber 
}) {
  const inputRef = useRef(null)
  const lastSetValueRef = useRef(null) // Track last value we set via preview
  
  // On mount/update, restore value if it was set by preview (not React)
  useEffect(() => {
    if (inputRef.current && !editingInputsSet.has(itemName) && lastSetValueRef.current !== null) {
      inputRef.current.value = lastSetValueRef.current
    }
  })
  
  const handleFocus = (e) => {
    editingInputsSet.add(itemName)
    // Set raw value without formatting for editing
    const currentVal = display !== '—' ? String(display).replace(/\s/g, '') : ''
    e.target.value = currentVal
    lastSetValueRef.current = null // Clear preview value
    setTimeout(() => e.target.select(), 0)
  }

  const handleChange = (e) => {
    const val = e.target.value.replace(/\s/g, '')
    console.log('handleChange called:', val)
    if (val === '' || !isNaN(val)) {
      const numVal = val === '' ? 0 : parseFloat(val)
      if (!isNaN(numVal) && numVal > 0) {
        // Call preview to update other fields without losing focus
        console.log('calling onPreview:', itemName, numVal)
        onPreview(itemName, numVal)
      }
    }
  }

  const handleBlur = (e) => {
    editingInputsSet.delete(itemName)
    const val = e.target.value.replace(/\s/g, '')
    const numVal = val === '' ? 0 : parseFloat(val)
    lastSetValueRef.current = null
    
    if (!isNaN(numVal) && numVal > 0) {
      onCommit(itemName, numVal)
    } else {
      // Reset to display value and sync other fields
      const resetVal = display !== '—' ? parseFloat(String(display).replace(/\s/g, '')) : 0
      e.target.value = display !== '—' ? formatNumber(display) : ''
      // Call preview with display value to sync other fields back
      if (!isNaN(resetVal) && resetVal > 0) {
        onPreview(itemName, resetVal)
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    } else if (e.key === 'Escape') {
      e.target.value = display !== '—' ? formatNumber(display) : ''
      editingInputsSet.delete(itemName)
      lastSetValueRef.current = null
      e.target.blur()
    }
  }
  
  // Store ref for external access (preview updates)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current._lastSetValueRef = lastSetValueRef
    }
  }, [])

  // Initial value
  const initialValue = display !== '—' ? formatNumber(display) : ''

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className="location-item-input"
      defaultValue={initialValue}
      data-item-name={itemName}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={display !== '—' ? formatNumber(display) : '0'}
    />
  )
}, (prevProps, nextProps) => {
  // Never re-render - we handle everything via DOM
  return true
})

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
  const [isOffline, setIsOffline] = useState(false)
  const [isCaching, setIsCaching] = useState(false)
  const [cachingProgress, setCachingProgress] = useState(0)
  
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

  
  const [craftHistory, setCraftHistory] = useState(() => loadFromStorage('craftCalculator_craftHistory', []))
  const [historyLimit, setHistoryLimit] = useState(() => loadFromStorage('craftCalculator_historyLimit', 50))
  // Pinned resources system (replaces cart)
  const [pinnedResources, setPinnedResources] = useState(() => loadFromStorage('craftCalculator_pinnedResources', []))
  const [pinnedQuests, setPinnedQuests] = useState(() => loadFromStorage('craftCalculator_pinnedQuests', []))
  const [expandedPinnedQuests, setExpandedPinnedQuests] = useState(new Set())
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
  const [isDevLogsOpen, setIsDevLogsOpen] = useState(false)
  const [isQuestsPanelOpen, setIsQuestsPanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiLoadStatus, setApiLoadStatus] = useState({ loading: false, error: null, lastUpdate: null })
  const recentlyAddedTimersRef = useRef(new Set())
  
  // Feature toggles
  const [pinnedEnabled, setPinnedEnabled] = useState(() => loadFromStorage('craftCalculator_pinnedEnabled', true))
  const [historyEnabled, setHistoryEnabled] = useState(() => loadFromStorage('craftCalculator_historyEnabled', true))
  const [buddyFarmLinksEnabled, setBuddyFarmLinksEnabled] = useState(() => loadFromStorage('craftCalculator_buddyFarmLinksEnabled', false))
  const [isLocationConfigOpen, setIsLocationConfigOpen] = useState(false)

  // Locations mode: show locations list and location-specific drops
  const [locationsMode, setLocationsMode] = useState(() => loadFromStorage('craftCalculator_locationsMode', false))
  const [selectedLocation, setSelectedLocation] = useState(() => loadFromStorage('craftCalculator_selectedLocation', 'Forest'))
  // Quests mode: show quests and quest chains
  const [questsMode, setQuestsMode] = useState(() => loadFromStorage('craftCalculator_questsMode', false))
  
  // Collapsible sections state for unified item view
  const [resourcesSectionCollapsed, setResourcesSectionCollapsed] = useState(() => loadFromStorage('craftCalculator_resourcesSectionCollapsed', false))
  const [usedInSectionCollapsed, setUsedInSectionCollapsed] = useState(() => loadFromStorage('craftCalculator_usedInSectionCollapsed', true))

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

  // Items for select: show all items (both craftable and source resources)
  const itemsForSelect = items

  useEffect(() => {
    saveToStorage('craftCalculator_locationsMode', locationsMode)
  }, [locationsMode])
  
  // Save collapsible section states
  useEffect(() => {
    saveToStorage('craftCalculator_resourcesSectionCollapsed', resourcesSectionCollapsed)
  }, [resourcesSectionCollapsed])
  
  useEffect(() => {
    saveToStorage('craftCalculator_usedInSectionCollapsed', usedInSectionCollapsed)
  }, [usedInSectionCollapsed])

  useEffect(() => {
    saveToStorage('craftCalculator_selectedLocation', selectedLocation)
  }, [selectedLocation])

  useEffect(() => {
    saveToStorage('craftCalculator_questsMode', questsMode)
  }, [questsMode])

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
    if (historyEnabled && item && item !== itemName) {
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        fromItem: item,
        fromAmount: amount,
        toItem: itemName,
        toAmount: quantity,
        chain: [...craftChain]
      }
      setCraftHistory(prev => [historyEntry, ...prev.slice(0, historyLimit - 1)])
    }
    
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

  // Helper to round to two decimals
  const roundToTwo = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return null
    return Math.round(Number(n) * 100) / 100
  }

  // Format number with thousand separators (spaces) and dot for decimals
  const formatNumber = (n) => {
    if (n === null || n === undefined || n === '') return ''
    const num = Number(n)
    if (Number.isNaN(num)) return n
    // Round to 2 decimals
    const rounded = roundToTwo(num)
    if (rounded === null) return ''
    
    // Split into integer and decimal parts
    const [integerPart, decimalPart] = rounded.toString().split('.')
    
    // Format integer part with spaces
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    
    // Return with dot as decimal separator if there's a decimal part
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
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
    
    return `Craft Calculator Results\n\nItem: ${item} (×${formatNumber(typeof amount === 'string' ? amount.replace(/\s/g, '') : amount)})\n\nResources needed:\n${resourcesText}${perksText}\n\nCalculate your own: [Open Craft Calculator]`
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

  useEffect(() => {
    saveToStorage('craftCalculator_pinnedResources', pinnedResources)
  }, [pinnedResources])

  useEffect(() => {
    saveToStorage('craftCalculator_pinnedQuests', pinnedQuests)
  }, [pinnedQuests])

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

  // Pre-load all data for instant access
  useEffect(() => {
    const preloadData = async () => {
      try {
        // Pre-load recipes data
        if (!combinedRecipes || Object.keys(combinedRecipes).length === 0) {
          const recipesModule = await import('../data/recipes-api.json');
          const recipesData = recipesModule.default;
          // Process recipes data here if needed
          console.log('Recipes data pre-loaded');
        }

        // Pre-load items data
        if (!itemsData || Object.keys(itemsData).length === 0) {
          const itemsModule = await import('../data/items-api.json');
          const itemsDataRaw = itemsModule.default;
          // Process items data here if needed
          console.log('Items data pre-loaded');
        }

        console.log('All data pre-loaded for instant access');
      } catch (error) {
        console.log('Data preloading failed:', error);
      }
    };

    // Start preloading after a short delay
    setTimeout(preloadData, 500);
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

  useEffect(() => {
    saveToStorage('craftCalculator_buddyFarmLinksEnabled', buddyFarmLinksEnabled)
  }, [buddyFarmLinksEnabled])

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

  // Pinned resources functions
  const addToPinned = (resourceName, quantity, parentRecipe = null, event = null) => {
    // Stop propagation if event is provided
    if (event) {
      event.stopPropagation()
    }
    // If active folder is 'quests', fallback to 'default' for regular items
    const targetFolder = activePinnedFolder === 'quests' ? 'default' : (activePinnedFolder || 'default')
    addToPinnedWithFolder(resourceName, quantity, parentRecipe, targetFolder)
  }

  // Function to add quests/questlines to pinned
  const addQuestToPinned = (questData, event = null) => {
    if (event) {
      event.stopPropagation()
    }
    
    hapticFeedback('light')
    
    // Ensure Quests folder exists
    let questsFolderId = pinnedFolders.find(f => f.id === 'quests')?.id
    if (!questsFolderId) {
      const questsFolder = {
        id: 'quests',
        name: 'Quests',
        createdAt: Date.now(),
        isSystemFolder: true
      }
      setPinnedFolders(prev => {
        // Insert after 'default' (Main) folder
        const defaultIndex = prev.findIndex(f => f.id === 'default')
        if (defaultIndex !== -1) {
          return [
            ...prev.slice(0, defaultIndex + 1),
            questsFolder,
            ...prev.slice(defaultIndex + 1)
          ]
        }
        return [questsFolder, ...prev]
      })
      questsFolderId = 'quests'
    }
    
    // Always add quest to 'quests' folder regardless of active folder
    setPinnedQuests(prev => [...prev, { ...questData, folderId: 'quests' }])
    
    // Show success animation
    const itemKey = `quest_${questData.type}_${questData.id}`
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

  const removeFromPinned = (index) => {
    hapticFeedback('light')
    setPinnedResources(prev => prev.filter((_, i) => i !== index))
  }

  const removeQuestFromPinned = (index) => {
    hapticFeedback('light')
    setPinnedQuests(prev => prev.filter((_, i) => i !== index))
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
    
    // Remove all quests in this folder
    if (folderId === 'quests') {
      setPinnedQuests(prev => prev.filter(quest => quest.folderId !== folderId))
    }
    
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
      
      // Determine the origin mode (simplified: only 'craft', 'locations', 'quests', 'quick-pin')
      let originMode = 'quick-pin' // default for quick pin
      if (questsMode) {
        originMode = 'quests'
      } else if (locationsMode) {
        originMode = 'locations'
      } else {
        originMode = 'craft'
      }
      
      const newEntry = {
        name: resourceName,
        quantity: qty,
        parentRecipe: parentRecipe || item,
        folderId: targetFolder,
        craftChain: craftChain && craftChain.length > 0 ? [...craftChain] : [],
        originMode: originMode, // Save the mode from which it was pinned
        ...(hasLast ? { location: lastPinnedLocation } : {}),
        // Save current amount (consumable quantity) if in locations mode
        ...(locationsMode ? { savedAmount: amount } : {})
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
    const itemKey = `${resourceName}_${coercedQty}_${parentRecipe || item || 'unknown'}`
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

  // Handle item click from quests - uses unified navigation
  const handleQuestItemClick = (itemName, quantity, questName) => {
    navigateToItem(itemName, quantity, questName || 'Quests')
  }

  // Reset Quick Pin filter when modal closes
  useEffect(() => {
    if (!isQuickPinModalOpen) {
      setQuickPinFilter('')
      setQuickPinSelectedItem(null)
      setQuickPinQuantity('')
    }
  }, [isQuickPinModalOpen])

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

  // Preview handler - updates other fields via DOM without React re-render
  const handleLocationItemPreview = useCallback((editingItemName, targetQuantity) => {
    if (!targetQuantity || targetQuantity <= 0) return
    
    console.log('handleLocationItemPreview called:', editingItemName, targetQuantity)
    
    try {
      // Calculate what amount would be needed
      const perUnit = computePinnedEstimate(
        { name: editingItemName, location: selectedLocation },
        1,
        activePerks,
        exploringMode
      )
      
      console.log('perUnit:', perUnit)
      
      let newAmount = null
      if (exploringMode === 'Apple Cider' && perUnit && perUnit.mode === 'AC' && typeof perUnit.effectiveDropsPerCider === 'number') {
        const dropsPerCider = perUnit.effectiveDropsPerCider
        if (dropsPerCider > 0) {
          newAmount = Math.ceil(targetQuantity / dropsPerCider)
        }
      } else if (exploringMode === 'Arnold Palmer' && perUnit && perUnit.mode === 'AP' && typeof perUnit.itemsPerAP === 'number') {
        const itemsPerAP = perUnit.itemsPerAP
        if (itemsPerAP > 0) {
          newAmount = Math.ceil(targetQuantity / itemsPerAP)
        }
      }
      
      console.log('newAmount:', newAmount)
      
      if (newAmount === null) return
      
      // Get location data for calculating other items
      const locObj = APPLE_CIDER_REAL_DROP_RATES.locations && APPLE_CIDER_REAL_DROP_RATES.locations[selectedLocation]
      if (!locObj) return
      
      // Find all location-item-input elements and update them via DOM
      const inputs = document.querySelectorAll('.location-item-input[data-item-name]')
      console.log('Found inputs:', inputs.length)
      
      inputs.forEach(input => {
        const itemName = input.dataset.itemName
        console.log('Processing input:', itemName, 'editing:', editingInputsSet.has(itemName))
        if (itemName === editingItemName) return // Skip the one being edited
        if (editingInputsSet.has(itemName)) return // Skip if also being edited
        
        // Calculate new value for this item
        try {
          const itemPerUnit = computePinnedEstimate(
            { name: itemName, location: selectedLocation },
            1,
            activePerks,
            exploringMode
          )
          
          let newValue = null
          if (exploringMode === 'Apple Cider' && itemPerUnit && itemPerUnit.mode === 'AC' && typeof itemPerUnit.effectiveDropsPerCider === 'number') {
            newValue = newAmount * itemPerUnit.effectiveDropsPerCider
          } else if (exploringMode === 'Arnold Palmer' && itemPerUnit && itemPerUnit.mode === 'AP' && typeof itemPerUnit.itemsPerAP === 'number') {
            newValue = newAmount * itemPerUnit.itemsPerAP
          }
          
          console.log('Setting value for', itemName, ':', newValue)
          if (newValue !== null) {
            const formattedValue = formatNumber(roundToTwo(newValue))
            input.value = formattedValue
            // Store in ref so it survives React re-render
            if (input._lastSetValueRef) {
              input._lastSetValueRef.current = formattedValue
            }
            // Trigger update animation
            input.classList.remove('value-updated')
            void input.offsetWidth // Force reflow to restart animation
            input.classList.add('value-updated')
            console.log('Set to:', input.value)
          }
        } catch (e) {
          console.error('Error for', itemName, e)
        }
      })
      
      // Also update the amount input field
      const amountInput = document.querySelector('.amount-input')
      if (amountInput) {
        amountInput.value = formatNumber(newAmount)
      }
    } catch (e) {
      console.error('Preview error:', e)
    }
  }, [selectedLocation, activePerks, exploringMode, formatNumber])

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
                    const folderQuests = folder.id === 'quests' ? pinnedQuests.filter(q => (q.folderId || 'quests') === 'quests') : []
                    const totalCount = folderItems.length + folderQuests.length
                    return (
                      <button
                        key={folder.id}
                        className={`folder-tab ${activePinnedFolder === folder.id ? 'active' : ''}`}
                        onClick={() => setActivePinnedFolder(folder.id)}
                        type="button"
                      >
                        {folder.name}
                        <span className="folder-count">({totalCount})</span>
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
                  {(pinnedResources.filter(item => (item.folderId || 'default') === activePinnedFolder).length > 0 ||
                    (activePinnedFolder === 'quests' && pinnedQuests.filter(q => (q.folderId || 'quests') === 'quests').length > 0)) && (
                    <button 
                      className="chip danger"
                      onClick={() => {
                        hapticFeedback('medium')
                        setPinnedResources(prev => prev.filter(item => (item.folderId || 'default') !== activePinnedFolder))
                        if (activePinnedFolder === 'quests') {
                          setPinnedQuests([])
                        }
                      }}
                      type="button"
                      title="Clear this folder"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              
              {(pinnedResources.filter(item => (item.folderId || 'default') === activePinnedFolder).length === 0 &&
                (activePinnedFolder !== 'quests' || pinnedQuests.filter(q => (q.folderId || 'quests') === 'quests').length === 0)) ? (
                <div className="empty-state">
                  <p>No pinned {activePinnedFolder === 'quests' ? 'quests' : 'resources'} in this folder.</p>
                  <p>{activePinnedFolder === 'quests' 
                    ? 'Pin quests or questlines from the Quests mode.' 
                    : 'Pin resources from any recipe by clicking the "+" button next to them.'}</p>
                </div>
              ) : (
                <div className="pinned-items">
                  {/* Show pinned quests if in Quests folder */}
                  {activePinnedFolder === 'quests' && pinnedQuests.map((quest, index) => (
                    <div key={`quest-${index}`} className="pinned-card">
                      <button
                        className="pinned-close-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeQuestFromPinned(index)
                        }}
                        type="button"
                        title="Remove from pinned"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>

                      <div className="pinned-card-content">
                        <div 
                          onClick={() => {
                            // Save the quest info to localStorage so QuestsPanel can restore it
                            if (quest.type === 'questline') {
                              localStorage.setItem('selectedQuestlineId', quest.id)
                              localStorage.setItem('selectedQuestId', '')
                            } else if (quest.type === 'quest') {
                              localStorage.setItem('selectedQuestlineId', quest.questlineId || '')
                              localStorage.setItem('selectedQuestId', quest.id)
                            }
                            
                            // Force QuestsPanel to reload by toggling questsMode
                            const wasInQuestsMode = questsMode
                            if (wasInQuestsMode) {
                              setQuestsMode(false)
                              setTimeout(() => {
                                setQuestsMode(true)
                              }, 0)
                            } else {
                              // Switch to quests mode
                              setQuestsMode(true)
                              setLocationsMode(false)
                            }
                            
                            // Close sidebar on mobile
                            if (window.innerWidth <= 768) {
                              setSidebarOpen(false)
                            }
                            
                            hapticFeedback('light')
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="pinned-item-name">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 600 }}>{quest.name.replace(/<br\s*\/?>/gi, ' ')}</span>
                            </div>
                          </div>
                          <div className="pinned-item-details">
                            {quest.type === 'quest' && quest.questlineName && (
                              <div style={{
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.35)',
                                marginTop: '6px',
                                padding: '4px 8px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '4px',
                                borderLeft: '2px solid rgba(255,255,255,0.1)',
                                fontStyle: 'italic',
                                letterSpacing: '0.3px'
                              }}>
                                {quest.questlineName.replace(/<br\s*\/?>/gi, ' ')}
                              </div>
                            )}
                            {quest.description && (
                              <div style={{
                                fontSize: '12px',
                                color: 'rgba(255,255,255,0.6)',
                                marginTop: '4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {quest.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Toggle button for requirements/rewards */}
                        {((quest.requirements?.items && (Array.isArray(quest.requirements.items) ? quest.requirements.items.length > 0 : Object.keys(quest.requirements.items).length > 0)) ||
                          (quest.rewards?.items && (Array.isArray(quest.rewards.items) ? quest.rewards.items.length > 0 : Object.keys(quest.rewards.items).length > 0)) ||
                          quest.requirements?.silver > 0 ||
                          quest.rewards?.silver > 0) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const questKey = `${quest.type}_${quest.id}`
                              setExpandedPinnedQuests(prev => {
                                const next = new Set(prev)
                                if (next.has(questKey)) {
                                  next.delete(questKey)
                                } else {
                                  next.add(questKey)
                                }
                                return next
                              })
                              hapticFeedback('light')
                            }}
                            style={{
                              marginTop: '8px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              color: 'rgba(255,255,255,0.4)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                            type="button"
                          >
                            <svg 
                              width="10" 
                              height="10" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              style={{
                                transform: expandedPinnedQuests.has(`${quest.type}_${quest.id}`) ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                              }}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                            {expandedPinnedQuests.has(`${quest.type}_${quest.id}`) ? 'Hide items' : 'Show items'}
                          </button>
                        )}

                        {/* Display requirements */}
                        <AnimatePresence>
                          {expandedPinnedQuests.has(`${quest.type}_${quest.id}`) && quest.requirements && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              style={{ overflow: 'hidden', marginTop: '12px' }}
                            >
                            {/* Items */}
                            {(() => {
                              // Handle both formats: object {itemName: quantity} or array [{name, quantity, image}]
                              const itemsToDisplay = quest.requirements.items
                              const itemsArray = Array.isArray(itemsToDisplay) 
                                ? itemsToDisplay.map(item => [item.name, item.quantity])
                                : Object.entries(itemsToDisplay || {})
                              
                              if (itemsArray.length === 0) return null
                              
                              return (
                                <div style={{ marginBottom: '8px' }}>
                                  <div style={{ 
                                    fontSize: '11px', 
                                    color: 'rgba(255,255,255,0.5)', 
                                    marginBottom: '4px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    Requirements
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {itemsArray.map(([itemName, quantity]) => {
                                      const isClickable = hasItemContent(itemName)

                                      return (
                                        <div
                                          key={itemName}
                                          onClick={(e) => {
                                            if (isClickable) {
                                              e.stopPropagation()
                                              handleQuestItemClick(itemName, quantity, quest.name)
                                              // Close sidebar on mobile
                                              if (window.innerWidth <= 768) {
                                                setSidebarOpen(false)
                                              }
                                            }
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '13px',
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            cursor: isClickable ? 'pointer' : 'default',
                                            transition: 'background-color 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (isClickable) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                                          }}
                                          onMouseLeave={(e) => {
                                            if (isClickable) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
                                          }}
                                        >
                                          <ItemDisplay itemName={itemName} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>×{formatNumber(quantity)}</span>
                                            {isClickable && (
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A9EFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                              </svg>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })()}

                            {/* Silver */}
                            {quest.requirements.silver > 0 && (
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                fontSize: '13px',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                marginTop: '4px'
                              }}>
                                <ItemDisplay itemName="Silver" itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)' }}>
                                  ×{formatNumber(quest.requirements.silver)}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                        </AnimatePresence>

                        {/* Display rewards */}
                        <AnimatePresence>
                          {expandedPinnedQuests.has(`${quest.type}_${quest.id}`) && quest.rewards && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              style={{ overflow: 'hidden', marginTop: '12px' }}
                            >
                            {/* Items */}
                            {(() => {
                              // Handle both formats: object {itemName: quantity} or array [{name, quantity, image}]
                              const itemsToDisplay = quest.rewards.items
                              const itemsArray = Array.isArray(itemsToDisplay) 
                                ? itemsToDisplay.map(item => [item.name, item.quantity])
                                : Object.entries(itemsToDisplay || {})
                              
                              if (itemsArray.length === 0) return null
                              
                              return (
                                <div style={{ marginBottom: '8px' }}>
                                  <div style={{ 
                                    fontSize: '11px', 
                                    color: 'rgba(255,255,255,0.5)', 
                                    marginBottom: '4px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    Rewards
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {itemsArray.map(([itemName, quantity]) => {
                                      const isClickable = hasItemContent(itemName)

                                      return (
                                        <div
                                          key={itemName}
                                          onClick={(e) => {
                                            if (isClickable) {
                                              e.stopPropagation()
                                              handleQuestItemClick(itemName, quantity, quest.name)
                                              // Close sidebar on mobile
                                              if (window.innerWidth <= 768) {
                                                setSidebarOpen(false)
                                              }
                                            }
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '13px',
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            cursor: isClickable ? 'pointer' : 'default',
                                            transition: 'background-color 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (isClickable) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                                          }}
                                          onMouseLeave={(e) => {
                                            if (isClickable) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
                                          }}
                                        >
                                          <ItemDisplay itemName={itemName} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>×{formatNumber(quantity)}</span>
                                            {isClickable && (
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A9EFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                              </svg>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })()}

                            {/* Silver */}
                            {quest.rewards.silver > 0 && (
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                fontSize: '13px',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                marginTop: '4px'
                              }}>
                                <ItemDisplay itemName="Silver" itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)' }}>
                                  ×{formatNumber(quest.rewards.silver)}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show pinned resources */}
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

                        {(() => {
                          // Check if item has content to show
                          const isClickable = hasItemContent(pinnedItem.name)

                          return (
                            <>
                              <div 
                                className="pinned-card-content"
                                onClick={() => {
                                  if (!isClickable) return
                                  
                                  // Use unified navigation - always go to item page
                                  navigateToItem(pinnedItem.name, pinnedItem.quantity, pinnedItem.parentRecipe || null)
                                  
                                  // Close sidebar on mobile
                                  if (window.innerWidth <= 768) {
                                    setSidebarOpen(false)
                                  }
                                }}
                                style={{ 
                                  cursor: isClickable ? 'pointer' : 'default',
                                  opacity: isClickable ? 1 : 0.6
                                }}
                              >
                                <div className="pinned-item-name">
                                  {itemsData && itemsData[pinnedItem.name] ? (
                                    <ItemDisplay itemName={pinnedItem.name} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
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
                            </>
                          )
                        })()}
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

              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={buddyFarmLinksEnabled}
                    onChange={(e) => setBuddyFarmLinksEnabled(e.target.checked)}
                    className="setting-checkbox"
                  />
                  Enable buddy.farm Links
                </label>
                <p className="setting-description">
                  Make item icons clickable to open buddy.farm pages
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
                  <button
                    onClick={() => setIsDevLogsOpen(true)}
                    className="social-link"
                    title="Development Logs"
                    type="button"
                    style={{ cursor: 'pointer' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Dev Logs
                  </button>
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
  <header className={"glass header" + (headerVisible ? '' : ' hidden') + (isCaching ? ' caching' : '')} style={isCaching ? { '--caching-progress': `${cachingProgress}%` } : {}}>
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
          >≡</button>
          
          {/* PWA indicator hidden intentionally (kept for caching logic) */}

          {/* Offline indicator */}
          {isOffline && (
            <div className="offline-indicator" title="Working offline - all data cached locally">
              OFFLINE
            </div>
          )}
          
          <div className="craft-chain" onClick={(e) => e.stopPropagation()}>
            {/* Show breadcrumbs only when chain has more than one node; otherwise show current mode */}
            {craftChain && craftChain.length > 1 ? (
              <nav ref={breadcrumbsRef} className="breadcrumbs" aria-label="Craft chain">
                {craftChain.slice(0, Math.max(0, craftChain.length - 1)).map((node, idx) => {
                  const displayName = (typeof node === 'string') ? node : (node && node.name) || ''
                  // Truncate long names: first 5 + ... + last 5 chars
                  const truncatedName = displayName.length > 13 
                    ? `${displayName.substring(0, 5)}...${displayName.substring(displayName.length - 5)}`
                    : displayName
                  
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
                          
                          // If this breadcrumb is a placeholder (quest/questline), go back to Quests mode
                          if (target && typeof target === 'object' && target.isPlaceholder) {
                            setQuestsMode(true)
                            setLocationsMode(false)
                          }
                          // If this breadcrumb represents a location node, switch back into Locations mode
                          else if (target && typeof target === 'object' && target.isLocation) {
                            setQuestsMode(false)
                            setLocationsMode(true)
                            setSelectedLocation(target.name)
                            
                            // Restore saved amount if available
                            if (target.savedAmount !== undefined && target.savedAmount !== null) {
                              setAmount(target.savedAmount)
                            }
                            
                            // Restore the target item and quantity if saved
                            if (target.targetItem && target.targetQuantity) {
                              // Don't call handleLocationItemCommit if we have savedAmount
                              if (target.savedAmount === undefined || target.savedAmount === null) {
                                handleLocationItemCommit(target.targetItem, target.targetQuantity)
                              }
                            }
                          } else {
                            // Regular craft mode navigation - unified view shows both sections
                            setQuestsMode(false)
                            setLocationsMode(false)
                            
                            const targetName = (typeof target === 'string') ? target : (target && target.name) || ''
                            const targetAmt = (typeof target === 'object' && target && target.amount) ? target.amount : 1
                            if (targetName) setItem(targetName)
                            setAmount(targetAmt)
                          }
                        }}
                      >
                        {typeof node === 'object' && node && node.isPlaceholder ? (
                          <span style={{ fontWeight: 600 }}>{truncatedName}</span>
                        ) : typeof node === 'object' && node && node.isLocation ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LocationImage name={node.name} size={20} />
                            <span style={{ fontWeight: 600 }}>{truncatedName}</span>
                          </div>
                        ) : (
                          <ItemDisplay itemName={displayName} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
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
                      return <ItemDisplay itemName={lastName} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                    })()}
                  </span>
                )}
              </nav>
            ) : (
              <div className="breadcrumb-mode" aria-label="Mode">
                {questsMode ? 'Quests' : (locationsMode ? 'Locations' : 'Crafts')}
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
                  <motion.div className="mode-dropdown glass" style={{ position: 'absolute', right: 0, marginTop: 8, minWidth: 160, zIndex: 9999 }}
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                  >
                    {/* Show only modes that are not currently active */}
                    {(questsMode || locationsMode) && (
                      <button
                        className="mode-option"
                        type="button"
                        onClick={() => {
                          setQuestsMode(false)
                          setLocationsMode(false)
                          setModeOpen(false)
                        }}
                      >
                        Crafts
                      </button>
                    )}
                    {!locationsMode && (
                      <button
                        className="mode-option"
                        type="button"
                        onClick={() => {
                          setQuestsMode(false)
                          setLocationsMode(true)
                          setModeOpen(false)
                          if (!selectedLocation) setSelectedLocation('Forest')
                        }}
                      >
                        Locations
                      </button>
                    )}
                    {!questsMode && (
                      <button
                        className="mode-option"
                        type="button"
                        onClick={() => {
                          setQuestsMode(true)
                          setLocationsMode(false)
                          setModeOpen(false)
                        }}
                      >
                        Quests
                      </button>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        </header>

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

        </>
        )}

        {/* Modals - accessible in all modes */}
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
                              ) : <ItemDisplay itemName={i} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />}
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
                      // clickable when there is any content to show for this item
                      const isClickable = hasItemContent(it)
                      // compute target amount for navigation
                      const parsed = numericValue != null && !Number.isNaN(Number(numericValue)) ? Number(numericValue) : null
                      const targetAmount = parsed && parsed >= 1 ? Math.max(1, Math.floor(parsed)) : 1
                      return (
                        <li key={it} className="resource-item">
                          <div
                            className={`resource-content ${isClickable ? 'clickable' : ''}`}
                            onClick={() => {
                              if (!isClickable) return
                              // create location source node for breadcrumbs
                              const locNode = selectedLocation 
                                ? { name: selectedLocation, isLocation: true, savedAmount: amount } 
                                : null
                              navigateToItem(it, targetAmount, locNode)
                            }}
                            style={isClickable ? { cursor: 'pointer' } : undefined}
                            title={isClickable ? `View ${it}` : undefined}
                          >
                            <span className="k">
                              <ItemDisplay itemName={it} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled}>
                                {isClickable && (
                                  <span className="craft-indicator">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                      <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </span>
                                )}
                              </ItemDisplay>
                            </span>
                            <LocationItemInput
                              itemName={it}
                              display={display}
                              onCommit={handleLocationItemCommit}
                              onPreview={handleLocationItemPreview}
                              formatNumber={formatNumber}
                            />
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
                          
                        </li>
                      )
                    })
                  })()}
                </ul>
              </motion.section>
            )}
            
            {/* Unified Item View - shows both Resources (ingredients) and Used In (crafts) */}
            {!questsMode && !locationsMode && (
              <>
                {/* Resources Section - What's needed to craft this item */}
                {result && Object.keys(result.filteredResources).length > 0 && (
                  <motion.section className="glass card">
                    <h2 
                      className="collapsible-header"
                      onClick={() => setResourcesSectionCollapsed(!resourcesSectionCollapsed)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span>Resources</span>
                      <svg 
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: resourcesSectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </h2>
                    <AnimatePresence>
                      {!resourcesSectionCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ul className="list">
                            {(showAllBase ? Object.entries(result.filteredResources) : Object.entries(result.filteredResources).slice(0, 8)).map(([k, v]) => {
                              const mailableItems = ['Acorn', 'Apple', 'Apple Cider', 'Aquamarine', 'Arnold Palmer', 'Arrowhead', 'Axe', 'Black Powder', 'Blue Dye', 'Blue Feathers', 'Bone', 'Bouquet of Flowers', 'Bucket', 'Carbon Sphere', 'Caterpillar', 'Coal', 'Eggs', 'Explosive', 'Feathers', 'Fern Leaf', 'Fire Ant', 'Fishing Net', 'Fruit Punch', 'Glass Orb', 'Grapes', 'Green Dye', 'Green Parchment', 'Grubs', 'Hammer', 'Heart Container', 'Hide', 'Horn', 'Iced Tea', 'Iron Cup', 'Ladder', 'Large Net', 'Leather', 'Leather Diary', 'Lemon', 'Lemonade', 'Milk', 'Minnows', 'Mushroom', 'Mushroom Paste', 'Oak', 'Old Boot', 'Orange', 'Orange Juice', 'Peach', 'Peach Juice', 'Potato', 'Purple Dye', 'Purple Flower', 'Purple Parchment', 'Red Dye', 'Rope', 'Scrap Metal', 'Scrap Wire', 'Shimmer Stone', 'Shovel', 'Slimestone', 'Spider', 'Stone', 'Twine', 'Unpolished Shimmer Stone', 'Wood', 'Wooden Box', 'Wooden Button', 'Wooden Table', 'Worms', 'Yarn']
                              const isMailable = mailableItems.includes(k)
                              const isClickable = hasItemContent(k)
                              
                              return (
                                <li 
                                  key={k}
                                  className="resource-item"
                                >
                                  <div 
                                    className={`resource-content ${isClickable ? 'clickable' : ''}`}
                                    onClick={() => {
                                      if (!isClickable) return
                                      navigateToItem(k, v)
                                    }}
                                    style={isClickable ? { cursor: 'pointer' } : {}}
                                    title={isClickable ? `View ${k}` : undefined}
                                  >
                                    <span className="k">
                                      <ItemDisplay itemName={k} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled}>
                                        {isClickable && (
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
                                </li>
                              )
                            })}
                          </ul>
                          {Object.keys(result.filteredResources).length > 8 && (
                            <button className="link" onClick={() => setShowAllBase(s => !s)}>
                              {showAllBase ? 'Show less' : `Show all (${Object.keys(result.filteredResources).length})`}
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.section>
                )}

                {/* Used In Section - What can be crafted from this item */}
                {availableCrafts.length > 0 && (
                  <motion.section className="glass card">
                    <h2 
                      className="collapsible-header"
                      onClick={() => setUsedInSectionCollapsed(!usedInSectionCollapsed)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span>Used In</span>
                      <svg 
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: usedInSectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </h2>
                    <AnimatePresence>
                      {!usedInSectionCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ul className="list">
                            {availableCrafts.map(c => {
                              const isClickable = hasItemContent(c.name)
                              const targetAmount = (typeof c.craftableCount === 'number') ? c.craftableCount : (Number(amount) || 1)
                              return (
                                <li key={c.name} className="resource-item">
                                  <div 
                                    className={`resource-content ${isClickable ? 'clickable' : ''}`}
                                    onClick={() => {
                                      if (!isClickable) return
                                      navigateToItem(c.name, targetAmount)
                                    }}
                                    style={isClickable ? { cursor: 'pointer' } : undefined}
                                    title={isClickable ? `View ${c.name}` : undefined}
                                  >
                                    <span className="k">
                                      <ItemDisplay itemName={c.name} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled}>
                                        {isClickable && (
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
                                </li>
                              )
                            })}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.section>
                )}
              </>
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
                  <h3>Clear All Data</h3>
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
                <span className="notification-icon">[OK]</span>
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
                                {folder.id === 'quests' 
                                  ? `${pinnedQuests.filter(q => (q.folderId || 'quests') === 'quests').length} quests`
                                  : `${pinnedResources.filter(item => (item.folderId || 'default') === folder.id).length} items`
                                }
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
                              {folder.id !== 'default' && !folder.isSystemFolder && (
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
                      <h2 className="item-select-title">Quick Pin {activePinnedFolder === 'quests' ? 'Questline' : 'Item'}</h2>
                      <div className="item-select-search-wrapper">
                        <input
                          className="calc-input item-select-search"
                          placeholder={activePinnedFolder === 'quests' ? "Search questlines..." : "Search items..."}
                          value={quickPinFilter}
                          onChange={(e) => setQuickPinFilter(e.target.value)}
                          aria-label="Filter items"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="item-select-list">
                      {activePinnedFolder === 'quests' ? (
                        // Show questlines for Quests folder
                        (() => {
                          try {
                            const questlines = questsApiData?.data?.questlines || []
                            return questlines
                              .filter(chain => {
                                if (!quickPinFilter) return true
                                return String(chain.title).toLowerCase().includes(quickPinFilter.toLowerCase())
                              })
                              .map((chain) => (
                                <button
                                  key={chain.id}
                                  onClick={() => {
                                    // Directly add questline without quantity selection
                                    const totals = {
                                      requirements: { items: {}, silver: 0, levels: {} },
                                      rewards: { items: {}, silver: 0 }
                                    }
                                    
                                    // Calculate totals
                                    chain.steps?.forEach(step => {
                                      const quest = step.quest
                                      if (quest) {
                                        // Requirements
                                        quest.requiredItems?.forEach(req => {
                                          if (req.item?.name) {
                                            totals.requirements.items[req.item.name] = 
                                              (totals.requirements.items[req.item.name] || 0) + (req.quantity || 1)
                                          }
                                        })
                                        if (quest.requiredSilver) {
                                          totals.requirements.silver += quest.requiredSilver
                                        }
                                        quest.levels?.forEach(lvl => {
                                          if (lvl.skill && lvl.level) {
                                            totals.requirements.levels[lvl.skill] = Math.max(
                                              totals.requirements.levels[lvl.skill] || 0,
                                              lvl.level
                                            )
                                          }
                                        })
                                        
                                        // Rewards
                                        quest.rewardItems?.forEach(rew => {
                                          if (rew.item?.name) {
                                            totals.rewards.items[rew.item.name] = 
                                              (totals.rewards.items[rew.item.name] || 0) + (rew.quantity || 1)
                                          }
                                        })
                                        if (quest.rewardSilver) {
                                          totals.rewards.silver += quest.rewardSilver
                                        }
                                      }
                                    })
                                    
                                    addQuestToPinned({
                                      type: 'questline',
                                      id: chain.id,
                                      name: chain.title,
                                      description: chain.description || '',
                                      requirements: totals.requirements,
                                      rewards: totals.rewards
                                    })
                                    hapticFeedback('success')
                                    setIsQuickPinModalOpen(false)
                                    setQuickPinFilter('')
                                  }}
                                  type="button"
                                >
                                  <span>{chain.title}</span>
                                </button>
                              ))
                          } catch (e) {
                            console.error('Failed to load questlines:', e)
                            return <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                              Failed to load questlines: {e.message}
                            </div>
                          }
                        })()
                      ) : (
                        // Show items for other folders
                        allItems.filter(itm => {
                          if (!quickPinFilter) return true
                          return String(itm).toLowerCase().includes(quickPinFilter.toLowerCase())
                        }).map((itm) => (
                          <button
                            key={itm}
                            onClick={() => handleQuickPin(itm)}
                            type="button"
                          >
                            <ItemDisplay itemName={itm} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                          </button>
                        ))
                      )}
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
      </div>
    </div>
  )
}


