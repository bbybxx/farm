import React, { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateAllResources, getResourceSaverPercent } from '../utils/calculator'
import { getCombinedRecipes, findRecipesThatUse } from '../utils/recipeUtils'
import RecipeUpdateService from '../services/RecipeUpdateService'
import perks from '../data/perks.json'
import { useTelegram } from '../hooks/useTelegram'
import BugReportModal from '../components/BugReportModal'
import LocationConfigPanel from '../components/LocationConfigPanel'
import APPLE_CIDER_REAL_DROP_RATES from '../data/apple-cider-real-drop-rates.js'
import { computePinnedEstimate, getItemLocations } from '../utils/exploringUtils.js'
import PinnedLocationSelect from '../components/PinnedLocationSelect.jsx'
// Vercel's `@vercel/analytics/next` is Next.js-specific and breaks Vite builds.
// Provide a safe no-op fallback when not running in Next.js.
let Analytics = () => null
try {
  // Only attempt to require the Next adapter at runtime if it's present.
  // This avoids static ESM import which Rollup/Vite will try to resolve.
  // eslint-disable-next-line no-undef
  const maybe = require('@vercel/analytics/next')
  if (maybe && maybe.Analytics) Analytics = maybe.Analytics
} catch (e) {
  // ignore - fallback no-op will be used
}
import './app.css'

// Helper functions for localStorage
function isStorageAvailable() {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch (error) {
    return false
  }
}

function saveToStorage(key, data) {
  try {
    if (!isStorageAvailable()) return
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

// Format numbers with spaces for better readability
function formatNumber(num) {
  if (num === null || num === undefined || num === '') return ''
  const number = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(number)) return num
  // Handle zero specifically
  if (number === 0) return '0'
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function loadFromStorage(key, defaultValue) {
  try {
    if (!isStorageAvailable()) return defaultValue
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch (error) {
    console.warn('Failed to load from localStorage:', error)
    return defaultValue
  }
}

export default function App() {
  // Получаем объединенные рецепты (API + локальные)
  const combinedRecipes = getCombinedRecipes();
    // items is declared earlier to be available for select lists
    const items = Object.keys(combinedRecipes || {})
  
  // Инициализируем сервис обновлений
  const [updateService] = useState(() => new RecipeUpdateService());
  
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
  const [exploringMode, setExploringMode] = useState(() => loadFromStorage('craftCalculator_exploringMode', 'Manually'));

  useEffect(() => {
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
  const [useThousandsFormat, setUseThousandsFormat] = useState(() => loadFromStorage('craftCalculator_useThousandsFormat', true))
  const [recentlyAddedItems, setRecentlyAddedItems] = useState(new Set())
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showClearSuccess, setShowClearSuccess] = useState(false)
  const [isBugReportOpen, setIsBugReportOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Feature toggles
  const [pinnedEnabled, setPinnedEnabled] = useState(() => loadFromStorage('craftCalculator_pinnedEnabled', true))
  const [historyEnabled, setHistoryEnabled] = useState(() => loadFromStorage('craftCalculator_historyEnabled', true))
  const [isLocationConfigOpen, setIsLocationConfigOpen] = useState(false)

  // Reverse-craft mode: when true the UI lists "source" resources and shows available crafts for the selected resource
  const [reverseMode, setReverseMode] = useState(false)
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
    
    // Filter resources to show only original recipe ingredients
    const filteredResources = {}
    
    // Check which resources are from original recipe
    for (const [resourceName, quantity] of Object.entries(originalIngredients)) {
      if (fullResult.base[resourceName]) {
        filteredResources[resourceName] = fullResult.base[resourceName]
      }
      if (fullResult.intermediate[resourceName]) {
        filteredResources[resourceName] = fullResult.intermediate[resourceName]
      }
    }
    
    return {
      ...fullResult,
      filteredResources
    }
  }, [item, amount, activePerks])

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
    localStorage.removeItem('craftCalculator_craftHistory')
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
    if (isInTelegram) {
      // In Telegram - could trigger share dialog or copy to clipboard
      navigator.clipboard?.writeText(shareText).then(() => {
        showAlert('Results copied to clipboard!')
      }).catch(() => {
        showAlert(shareText)
      })
    } else {
      // Outside Telegram - copy to clipboard or show alert
      navigator.clipboard?.writeText(shareText).then(() => {
        alert('Results copied to clipboard!')
      }).catch(() => {
        alert(shareText)
      })
    }
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

  useEffect(() => {
    saveToStorage('craftCalculator_craftHistory', craftHistory)
  }, [craftHistory])

  useEffect(() => {
    saveToStorage('craftCalculator_historyLimit', historyLimit)
  }, [historyLimit])

  // Запуск автообновления рецептов при загрузке приложения
  useEffect(() => {
    // Запускаем автообновление
    updateService.startAutoUpdate()
    
    // Логируем информацию о последнем обновлении
    const updateInfo = updateService.getUpdateInfo()
  }, [updateService])

  useEffect(() => {
    saveToStorage('craftCalculator_pinnedResources', pinnedResources)
  }, [pinnedResources])

  useEffect(() => {
    saveToStorage('craftCalculator_lastPinnedLocation', lastPinnedLocation)
  }, [lastPinnedLocation])

  // Migration: some older pinned entries used `selectedLocation` key.
  // Normalize to `location` on first load to avoid mismatch between selector and estimate.
  useEffect(() => {
    try {
      if (!pinnedResources || pinnedResources.length === 0) return
      let migrated = false
      const next = pinnedResources.map(p => {
        if (p.selectedLocation && !p.location) {
          migrated = true
          const { selectedLocation, ...rest } = p
          return { ...rest, location: selectedLocation }
        }
        return p
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

  useEffect(() => {
    saveToStorage('craftCalculator_useThousandsFormat', useThousandsFormat)
  }, [useThousandsFormat])

  useEffect(() => {
    saveToStorage('craftCalculator_pinnedResources', pinnedResources)
  }, [pinnedResources])

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
    hapticFeedback('light')
    
    setPinnedResources(prev => {
      // Always add as new entry to allow multiple instances with different parent recipes
      // But only inherit lastPinnedLocation if that location actually contains this item
      const locs = getItemLocations(resourceName) || []
      const hasLast = lastPinnedLocation && locs.some(l => l.name === lastPinnedLocation)
      const newEntry = {
        name: resourceName,
        quantity,
        parentRecipe: parentRecipe || item, // Use current item as parent if not specified
        ...(hasLast ? { location: lastPinnedLocation } : {})
      }
      return [...prev, newEntry]
    })
    
    // Show success animation
    const itemKey = `${resourceName}_${quantity}_${parentRecipe || item}`
    setRecentlyAddedItems(prev => new Set([...prev, itemKey]))
    
    // Remove animation after 2 seconds
    setTimeout(() => {
      setRecentlyAddedItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemKey)
        return newSet
      })
    }, 2000)
  }

  const removeFromPinned = (index) => {
    hapticFeedback('light')
    setPinnedResources(prev => prev.filter((_, i) => i !== index))
  }

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
        localStorage.removeItem('craftCalculator_item')
        localStorage.removeItem('craftCalculator_amount') 
        localStorage.removeItem('craftCalculator_activePerks')
        localStorage.removeItem('craftCalculator_craftChain')
        localStorage.removeItem('craftCalculator_craftHistory')
        localStorage.removeItem('craftCalculator_historyLimit')
        localStorage.removeItem('craftCalculator_pinnedResources')
        localStorage.removeItem('craftCalculator_useThousandsFormat')
        localStorage.removeItem('craftCalculator_pinnedEnabled')
        localStorage.removeItem('craftCalculator_historyEnabled')
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
      
      // Reset UI states
      setShowAllBase(false)
      setSidebarOpen(false)
      setSidebarActiveTab('perks')
      setIsItemSelectOpen(false)
      setIsHistoryOpen(false)
      setRecentlyAddedItems(new Set())
      
      // Show confirmation
      hapticFeedback('heavy')
      setShowClearSuccess(true)
      setTimeout(() => {
        setShowClearSuccess(false)
      }, 3000)
    } catch (error) {
      console.warn('Failed to clear saved data:', error)
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

  const handleBugReportSubmit = async (message) => {
    try {
      const result = await sendBugReport(message, user)
      
      if (result.success) {
        hapticFeedback('success')
        // Success is handled by the modal component itself
      } else {
        hapticFeedback('error')
        // Error will be handled by the modal component
      }
      
      return result
    } catch (error) {
      console.error('Error submitting bug report:', error)
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
              <div className="section-header">
                <h3>Pinned Resources ({pinnedResources.length})</h3>
                {pinnedResources.length > 0 && (
                  <button 
                    className="chip danger"
                    onClick={() => {
                      hapticFeedback('medium')
                      setPinnedResources([])
                    }}
                    type="button"
                    title="Clear all pinned resources"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {pinnedResources.length === 0 ? (
                <div className="empty-state">
                  <p>No pinned resources.</p>
                  <p>Pin resources from any recipe by clicking the "+" button next to them.</p>
                </div>
              ) : (
                <div className="pinned-items">
                  {pinnedResources.map((pinnedItem, index) => {
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
                          <div className="pinned-item-name">{pinnedItem.name}</div>
                          <div className="pinned-item-details">
                            <span className="pinned-item-quantity">×{formatNumber(pinnedItem.quantity)}</span>
                            {pinnedItem.parentRecipe && <span className="parent-recipe">from {pinnedItem.parentRecipe}</span>}

                            {est && (() => {
                              if (typeof est.apNeeded !== 'undefined' && est.apNeeded !== null) {
                                return (<div className="pinned-ap-line">{`${formatNumber(est.apNeeded)} AP${est.location ? ` @ ${est.location}` : ''}`}</div>)
                              }
                              if (est.mode === 'EXP') return (<div style={{ fontSize: 12, color: '#99a', marginTop: 6 }}>{formatNumber(est.explores)} EXP • {formatNumber(est.stamina)} STA @ {est.location}</div>)
                              if (est.mode === 'AC') return (<div style={{ fontSize: 12, color: '#99a', marginTop: 6 }}>{formatNumber(est.cidersNeeded)} AC • {formatNumber(est.totalStamina)} STA @ {est.location}</div>)
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
                      className={`chip${exploringMode === 'Manually' ? ' active' : ''}`}
                      onClick={() => setExploringMode('Manually')}
                      type="button"
                    >
                      Manually
                    </motion.button>

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
                        onChange={(e) => setHistoryLimit(parseInt(e.target.value) || 50)}
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
            <div className="header-title">
              <h1>Craft</h1>
              {user && isInTelegram && (
                <span className="user-greeting">Hi, {user.first_name}! 👋</span>
              )}
            </div>
          </div>
          {/* Header right controls: Mode button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8, width: '100%', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative' }} ref={modeRef}>
              <button
                className="chip"
                type="button"
                onClick={(e) => { e.stopPropagation(); setModeOpen(!modeOpen) }}
                aria-expanded={modeOpen}
              >
                mode
              </button>
              {modeOpen && (
                <div className="mode-dropdown glass" style={{ position: 'absolute', right: 0, marginTop: 8, minWidth: 160, zIndex: 40 }}>
                  {!reverseMode && (
                    <button
                      className={`mode-option`}
                      type="button"
                      onClick={() => { setReverseMode(true); setModeOpen(false); setItem('Board'); setAmount(1); setCraftChain([{ name: 'Board', amount: 1 }]) }}
                    >
                      Base to Craft
                    </button>
                  )}
                  {reverseMode && (
                    <>
                      <button
                        className="mode-option"
                        type="button"
                        onClick={() => { setReverseMode(false); setModeOpen(false); setItem('Board'); setAmount(1); setCraftChain([{ name: 'Board', amount: 1 }]) }}
                      >
                        Craft to base
                      </button>
                      <button
                        className={`mode-option ${!reverseMode ? 'active' : ''}`}
                        type="button"
                        onClick={() => { setReverseMode(false); setModeOpen(false); setItem('Board'); setAmount(1); setCraftChain([{ name: 'Board', amount: 1 }]) }}
                      >
                        INACTIVE
                      </button>
                    </>
                  )}
                  {/* single Location button is rendered above (inside reverseMode block or as default) */}
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="glass controls">
          <label className="field">
            <span className="label">Item</span>
            <button className="input" onClick={() => setIsItemSelectOpen(true)} type="button">
              {item}
            </button>
          </label>
          <label className="field">
            <span className="label">Amount</span>
            <input 
              className="input" 
              type="text" 
              min={1} 
              max={9999999999999999}
              value={formatNumber(amount)} 
              placeholder="Enter amount (e.g., 1 000)"
              onChange={e => {
                const inputValue = e.target.value
                
                // Remove spaces and keep only digits
                const cleanValue = inputValue.replace(/\D/g, '')
                
                // Check if empty or if number is within limit
                if (cleanValue === '') {
                  setAmount('')
                  setCraftChain(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { ...updated[updated.length - 1], amount: 1 }
                    return updated
                  })
                  return
                }
                
                // Convert to number and check limit
                const numericValue = parseInt(cleanValue)
                if (numericValue > 9999999999999999) {
                  return // Don't update if exceeds limit
                }
                
                setAmount(cleanValue)
                // Update the last item in chain with new amount
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
                <h2 id="item-select-title" className="item-select-title">Select an Item</h2>
                <div className="item-select-list">
                  {(itemsForSelect || []).map(i => (
                    <button 
                      key={i} 
                      className={item === i ? 'active' : ''}
                      onClick={() => handleSelectItem(i)}
                      type="button"
                    >
                      {i}
                    </button>
                  ))}
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
                          <span className="from">{entry.fromItem}</span>
                          <span className="arrow">→</span>
                          <span className="to">{entry.toItem}</span>
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
            { !reverseMode && result && Object.keys(result.filteredResources).length > 0 && (
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
                            {k}
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
                          </span>
                          <span className="v">{formatNumber(v)}</span>
                        </div>
                        {pinnedEnabled && (
                          <button
                            className={`pin-btn ${recentlyAddedItems.has(`${k}_${v}_${craftChain.length > 0 ? craftChain[0].name : item}`) ? 'success' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              addToPinned(k, v, craftChain.length > 0 ? craftChain[0].name : item)
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

            { reverseMode && availableCrafts.length > 0 && (
              <motion.section className="glass card">
                <h2>Crafts</h2>
                <ul className="list">
                  {availableCrafts.map(c => {
                    const further = findRecipesThatUse(c.name) || []
                    const canNavigate = further.length > 0
                    return (
                      <motion.li layout key={c.name} className="resource-item">
                        <div 
                          className={`resource-content ${canNavigate ? 'clickable' : ''}`}
                          onClick={() => {
                            if (!canNavigate) return
                            // Add current navigation to craft history (same behavior as original mode)
                            if (historyEnabled) {
                              const historyEntry = {
                                id: Date.now(),
                                timestamp: new Date().toISOString(),
                                fromItem: item,
                                fromAmount: amount,
                                toItem: c.name,
                                toAmount: c.outputQty || 1,
                                chain: [...craftChain]
                              }
                              setCraftHistory(prev => [historyEntry, ...prev.slice(0, historyLimit - 1)])
                            }

                            // Navigate to the craft (select the crafted item)
                            setItem(c.name)
                            setAmount(c.outputQty || 1)
                            // Append crafted item to existing chain (preserve navigation history)
                            setCraftChain(prev => {
                              // If prev already ends with the crafted item, keep as-is
                              if (prev && prev.length > 0 && String(prev[prev.length - 1].name) === String(c.name)) return prev
                              return [...prev, { name: c.name, amount: c.outputQty || 1 }]
                            })
                          }}
                          style={canNavigate ? { cursor: 'pointer' } : undefined}
                          title={canNavigate ? `Open recipe for ${c.name}` : undefined}
                        >
                          <span className="k">
                            {c.name}
                            {canNavigate && (
                              <span className="craft-indicator">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                          </span>
                          <span className="v">{formatNumber(c.craftableCount != null ? c.craftableCount : 0)}</span>
                        </div>

                        {pinnedEnabled && (
                          <button
                            className={`pin-btn ${recentlyAddedItems.has(`${c.name}_${c.outputQty}_${item}`) ? 'success' : ''}`}
                            onClick={(e) => { e.stopPropagation(); addToPinned(c.name, c.outputQty || 1, item) }}
                            type="button"
                            title={`Pin ${c.name}`}
                          >
                            <div className="pin-icon">
                              <div className={`pin-line pin-line-horizontal ${recentlyAddedItems.has(`${c.name}_${c.outputQty}_${item}`) ? 'checked' : ''}`}></div>
                              <div className={`pin-line pin-line-vertical ${recentlyAddedItems.has(`${c.name}_${c.outputQty}_${item}`) ? 'checked' : ''}`}></div>
                            </div>
                          </button>
                        )}
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

        {/* Bug Report Modal */}
        <BugReportModal
          isOpen={isBugReportOpen}
          onClose={handleBugReportClose}
          onSubmit={handleBugReportSubmit}
        />
  {/* debug overlay removed */}
      </div>
    </div>
  )
}

