import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateAllResources } from '../utils/calculator'
import { getCombinedRecipes } from '../utils/recipeUtils'
import RecipeUpdateService from '../services/RecipeUpdateService'
import perks from '../data/perks.json'
import { useTelegram } from '../hooks/useTelegram'
import BugReportModal from '../components/BugReportModal'
import './app.css'

// Helper functions for localStorage
const isStorageAvailable = () => {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch (error) {
    return false
  }
}

const saveToStorage = (key, data) => {
  try {
    if (!isStorageAvailable()) return
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

const loadFromStorage = (key, defaultValue) => {
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
  const [activePerks, setActivePerks] = useState(() => loadFromStorage('craftCalculator_activePerks', []))
  const [showAllBase, setShowAllBase] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarActiveTab, setSidebarActiveTab] = useState('perks')
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isItemSelectOpen, setIsItemSelectOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
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
  const [showTotalsCard, setShowTotalsCard] = useState(() => loadFromStorage('craftCalculator_showTotalsCard', true))
  const [cart, setCart] = useState(() => loadFromStorage('craftCalculator_cart', []))
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [useThousandsFormat, setUseThousandsFormat] = useState(() => loadFromStorage('craftCalculator_useThousandsFormat', true))
  const [itemCurrencies, setItemCurrencies] = useState(() => loadFromStorage('craftCalculator_itemCurrencies', {}))
  const [itemPrices, setItemPrices] = useState(() => loadFromStorage('craftCalculator_itemPrices', {}))
  const [openCurrencyDropdown, setOpenCurrencyDropdown] = useState(null)
  const [recentlyAddedItems, setRecentlyAddedItems] = useState(new Set())
  const [recentlyCopiedButtons, setRecentlyCopiedButtons] = useState(new Set())
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showClearSuccess, setShowClearSuccess] = useState(false)
  const [isBugReportOpen, setIsBugReportOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Feature toggles
  const [cartEnabled, setCartEnabled] = useState(() => loadFromStorage('craftCalculator_cartEnabled', true))
  const [historyEnabled, setHistoryEnabled] = useState(() => loadFromStorage('craftCalculator_historyEnabled', true))

  const result = useMemo(() => {
    if (!item || !combinedRecipes[item]) return null
    const fullResult = calculateAllResources(item, Number(amount) || 1, activePerks, combinedRecipes)
    
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

  // Function to navigate to a specific item in the chain
  const handleChainClick = (index) => {
    hapticFeedback('light')
    const targetItem = craftChain[index]
    setItem(targetItem.name)
    setAmount(targetItem.amount)
    setCraftChain(prev => prev.slice(0, index + 1))
  }

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
      .map(([name, qty]) => `• ${name}: ${qty}`)
      .join('\n')
    
    const perksText = activePerks.length > 0 
      ? `\n\nPerks:\n${activePerks.map(p => `• ${p}`).join('\n')}` 
      : ''
    
    return `🔨 Craft Calculator Results\n\n📦 Item: ${item} (×${amount})\n💰 Silver: ${result.silver}\n⭐ XP: ${result.xp}\n\n📋 Resources needed:\n${resourcesText}${perksText}\n\n🔗 Calculate your own: [Open Craft Calculator]`
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

  // Auto-scroll breadcrumbs to the end when chain changes
  useEffect(() => {
    if (craftChain.length > 1) {
      const breadcrumbsContainer = document.querySelector('.breadcrumbs')
      if (breadcrumbsContainer) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          breadcrumbsContainer.scrollTo({
            left: breadcrumbsContainer.scrollWidth,
            behavior: 'smooth'
          })
        }, 100)
      }
    }
  }, [craftChain])

  // Save state to localStorage when it changes
  useEffect(() => {
    saveToStorage('craftCalculator_item', item)
  }, [item])

  useEffect(() => {
    saveToStorage('craftCalculator_amount', amount)
  }, [amount])

  useEffect(() => {
    saveToStorage('craftCalculator_activePerks', activePerks)
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

  useEffect(() => {
    saveToStorage('craftCalculator_showTotalsCard', showTotalsCard)
  }, [showTotalsCard])

  // Запуск автообновления рецептов при загрузке приложения
  useEffect(() => {
    // Запускаем автообновление
    updateService.startAutoUpdate()
    
    // Логируем информацию о последнем обновлении
    const updateInfo = updateService.getUpdateInfo()
  }, [updateService])

  useEffect(() => {
    saveToStorage('craftCalculator_cart', cart)
  }, [cart])

  useEffect(() => {
    saveToStorage('craftCalculator_useThousandsFormat', useThousandsFormat)
  }, [useThousandsFormat])

  useEffect(() => {
    saveToStorage('craftCalculator_itemCurrencies', itemCurrencies)
  }, [itemCurrencies])

  useEffect(() => {
    saveToStorage('craftCalculator_itemPrices', itemPrices)
  }, [itemPrices])

  useEffect(() => {
    saveToStorage('craftCalculator_cartEnabled', cartEnabled)
  }, [cartEnabled])

  useEffect(() => {
    saveToStorage('craftCalculator_historyEnabled', historyEnabled)
  }, [historyEnabled])

  // Auto-switch tab if current tab is disabled
  useEffect(() => {
    if (sidebarActiveTab === 'cart' && !cartEnabled) {
      setSidebarActiveTab('perks')
    } else if (sidebarActiveTab === 'history' && !historyEnabled) {
      setSidebarActiveTab('perks')
    }
  }, [cartEnabled, historyEnabled, sidebarActiveTab])

  // Cart functions
  const formatQuantity = (quantity) => {
    if (!useThousandsFormat || !isFinite(quantity) || quantity < 0) return quantity.toString();
    return quantity.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  const addToCart = (resourceName, quantity) => {
    hapticFeedback('light')
    
    // Check if item is mailable by reading mailable.txt data
    const mailableItems = ['Acorn', 'Apple', 'Apple Cider', 'Aquamarine', 'Arnold Palmer', 'Arrowhead', 'Axe', 'Black Powder', 'Blue Dye', 'Blue Feathers', 'Bone', 'Bouquet of Flowers', 'Bucket', 'Carbon Sphere', 'Caterpillar', 'Coal', 'Eggs', 'Explosive', 'Feathers', 'Fern Leaf', 'Fire Ant', 'Fishing Net', 'Fruit Punch', 'Glass Orb', 'Grapes', 'Green Dye', 'Green Parchment', 'Grubs', 'Hammer', 'Heart Container', 'Hide', 'Horn', 'Iced Tea', 'Iron Cup', 'Ladder', 'Large Net', 'Leather', 'Leather Diary', 'Lemon', 'Lemonade', 'Milk', 'Minnows', 'Mushroom', 'Mushroom Paste', 'Oak', 'Old Boot', 'Orange', 'Orange Juice', 'Peach', 'Peach Juice', 'Potato', 'Purple Dye', 'Purple Flower', 'Purple Parchment', 'Red Dye', 'Rope', 'Scrap Metal', 'Scrap Wire', 'Shimmer Stone', 'Shovel', 'Slimestone', 'Spider', 'Stone', 'Twine', 'Unpolished Shimmer Stone', 'Wood', 'Wooden Box', 'Wooden Button', 'Wooden Table', 'Worms', 'Yarn']
    
    if (!mailableItems.includes(resourceName)) {
      showAlert ? showAlert(`${resourceName} cannot be mailed to other players`) : alert(`${resourceName} cannot be mailed to other players`)
      return
    }
    
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.name === resourceName)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex].quantity += quantity
        return updated
      }
      return [...prev, { name: resourceName, quantity, price: itemPrices[resourceName] || '', currency: itemCurrencies[resourceName] || 'g' }]
    })
    
    // Show success animation
    const itemKey = `${resourceName}_${quantity}`
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

  const removeFromCart = (index) => {
    hapticFeedback('light')
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const updateCartItem = (index, field, value) => {
    setCart(prev => {
      const updated = [...prev]
      updated[index][field] = value
      
      const itemName = updated[index].name
      
      // Save currency and price for this item
      if (field === 'currency') {
        setItemCurrencies(prevCurrencies => ({
          ...prevCurrencies,
          [itemName]: value
        }))
      } else if (field === 'price') {
        setItemPrices(prevPrices => ({
          ...prevPrices,
          [itemName]: value
        }))
      }
      
      return updated
    })
  }

  const clearCart = () => {
    hapticFeedback('medium')
    setCart([])
  }

  const generateWTBText = () => {
    if (cart.length === 0) return ''
    
    const wtbItems = cart.map(item => {
      const formattedQty = formatQuantity(item.quantity)
      const price = item.price || '?'
      const currency = item.currency
      const formattedCurrency = currency === 'g' ? currency : ` ${currency}`
      return `${formattedQty}((${item.name})) ${price}${formattedCurrency}/${useThousandsFormat && item.quantity >= 1000 ? 'k' : '1'}`
    }).join(', ')
    
    return `Wtb ${wtbItems}`
  }

  const generateLFText = () => {
    if (cart.length === 0) return ''
    
    const lfItems = cart.map(item => {
      const formattedQty = formatQuantity(item.quantity)
      return `${formattedQty}((${item.name}))`
    }).join(', ')
    
    return `LF ${lfItems}`
  }

  const handleCopyText = (text, buttonKey) => {
    navigator.clipboard?.writeText(text).then(() => {
      // Show success animation
      setRecentlyCopiedButtons(prev => new Set([...prev, buttonKey]))
      
      // Remove animation after 2 seconds
      setTimeout(() => {
        setRecentlyCopiedButtons(prev => {
          const newSet = new Set(prev)
          newSet.delete(buttonKey)
          return newSet
        })
      }, 2000)
    }).catch(() => {
      // Fallback if clipboard API fails
      showAlert ? showAlert(text) : alert(text)
    })
  }

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

  // Close currency dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openCurrencyDropdown !== null && !event.target.closest('.custom-currency-select')) {
        setOpenCurrencyDropdown(null)
      }
    }
    
    if (openCurrencyDropdown !== null) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openCurrencyDropdown])

  const items = Object.keys(combinedRecipes)
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
        localStorage.removeItem('craftCalculator_showTotalsCard')
        localStorage.removeItem('craftCalculator_cart')
        localStorage.removeItem('craftCalculator_useThousandsFormat')
        localStorage.removeItem('craftCalculator_itemCurrencies')
        localStorage.removeItem('craftCalculator_itemPrices')
        localStorage.removeItem('craftCalculator_cartEnabled')
        localStorage.removeItem('craftCalculator_historyEnabled')
      }
      
      // Reset all state to defaults
      setItem('Board')
      setAmount(1)
      setActivePerks([])
      setCraftChain([{ name: 'Board', amount: 1 }])
      setCraftHistory([])
      setHistoryLimit(50)
      setShowTotalsCard(true)
      setCart([])
      setUseThousandsFormat(true)
      setItemCurrencies({})
      setItemPrices({})
      setCartEnabled(true)
      setHistoryEnabled(true)
      
      // Reset UI states
      setShowAllBase(false)
      setSidebarOpen(false)
      setSidebarActiveTab('perks')
      setIsItemSelectOpen(false)
      setIsHistoryOpen(false)
      setOpenCurrencyDropdown(null)
      setRecentlyAddedItems(new Set())
      setRecentlyCopiedButtons(new Set())
      
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
    setCraftChain([{ name: selectedItem, amount: 1 }])
  }

  // Organized perks by category
  const perkCategories = [
    {
      title: 'Resource Saving',
      perks: ['Resource Saver I', 'Resource Saver II', 'Resource Saver III']
    },
    {
      title: 'Silver Discount', 
      perks: ['Artisan I', 'Artisan II', 'Artisan III', 'Artisan IV', 'Toolbox I', 'Steady Hands']
    },
    {
      title: 'Experience',
      perks: ['Crafting Primer', 'Crafting Primer II', 'Crafting Almanac']
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

  return (
    <div className="app layout">
      <aside id="perks-sidebar" className={"sidebar glass" + (sidebarOpen ? ' open' : '')} aria-hidden={!sidebarOpen}>
        <div className="side-head">
          <div className="sidebar-tabs">
            <button 
              className={`tab ${sidebarActiveTab === 'perks' ? 'active' : ''}`}
              onClick={() => setSidebarActiveTab('perks')}
              type="button"
            >
              Perks
            </button>
            {cartEnabled && (
              <button 
                className={`tab ${sidebarActiveTab === 'cart' ? 'active' : ''}`}
                onClick={() => setSidebarActiveTab('cart')}
                type="button"
              >
                Cart {cart.length > 0 && `(${cart.length})`}
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
          
          {sidebarActiveTab === 'cart' && cartEnabled && (
            <div className="cart-section">
              <div className="section-header">
                <h3>Shopping Cart ({cart.length})</h3>
                {cart.length > 0 && (
                  <button 
                    className="chip danger"
                    onClick={clearCart}
                    type="button"
                    title="Clear cart"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {cart.length === 0 ? (
                <div className="empty-state">
                  <p>Cart is empty.</p>
                  <p>Add resources from the main calculator by clicking the "+" button next to any mailable resource.</p>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cart.map((cartItem, index) => (
                      <div key={index} className="cart-item">
                        <div className="cart-item-header">
                          <span className="cart-item-name">{cartItem.name}</span>
                          <span className="cart-item-quantity">×{formatQuantity(cartItem.quantity)}</span>
                          <button
                            className="cart-remove-btn"
                            onClick={() => removeFromCart(index)}
                            type="button"
                            title="Remove from cart"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="cart-item-controls">
                          <input
                            type="text"
                            placeholder="Price"
                            value={cartItem.price}
                            onChange={(e) => updateCartItem(index, 'price', e.target.value)}
                            className="cart-price-input"
                          />
                          <div className="custom-currency-select">
                            <button
                              className="currency-button"
                              onClick={() => setOpenCurrencyDropdown(openCurrencyDropdown === index ? null : index)}
                              aria-expanded={openCurrencyDropdown === index}
                              type="button"
                            >
                              {cartItem.currency}
                              <svg width="12" height="12" viewBox="0 0 12 12" className="dropdown-arrow">
                                <path 
                                  d="M3 4.5L6 7.5L9 4.5" 
                                  stroke="currentColor" 
                                  strokeWidth="1.5" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            {openCurrencyDropdown === index && (
                              <div className="currency-dropdown">
                                {['g', 'OJ', 'AP', 'AC', 'LN'].map(currency => (
                                  <button
                                    key={currency}
                                    className={`currency-option ${cartItem.currency === currency ? 'active' : ''}`}
                                    onClick={() => {
                                      updateCartItem(index, 'currency', currency)
                                      setOpenCurrencyDropdown(null)
                                    }}
                                    type="button"
                                  >
                                    {currency}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="cart-output">
                    <h4>WTB Text:</h4>
                    <div className="output-text">
                      <pre>{generateWTBText()}</pre>
                      <button
                        className={`chip copy-btn ${recentlyCopiedButtons.has('wtb') ? 'copied' : ''}`}
                        onClick={() => handleCopyText(generateWTBText(), 'wtb')}
                        type="button"
                      >
                        {recentlyCopiedButtons.has('wtb') ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    
                    <h4>LF Text:</h4>
                    <div className="output-text">
                      <pre>{generateLFText()}</pre>
                      <button
                        className={`chip copy-btn ${recentlyCopiedButtons.has('lf') ? 'copied' : ''}`}
                        onClick={() => handleCopyText(generateLFText(), 'lf')}
                        type="button"
                      >
                        {recentlyCopiedButtons.has('lf') ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          {sidebarActiveTab === 'settings' && (
            <div className="settings-section">
              <h3 className="section-title">Display Settings</h3>
              
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={showTotalsCard}
                    onChange={(e) => setShowTotalsCard(e.target.checked)}
                    className="setting-checkbox"
                  />
                  Show XP and Silver card
                </label>
              </div>
              
              <h3 className="section-title">Features</h3>
              
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={cartEnabled}
                    onChange={(e) => setCartEnabled(e.target.checked)}
                    className="setting-checkbox"
                  />
                  Enable Cart functionality
                </label>
                <p className="setting-description">
                  Show cart tab and add-to-cart buttons
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
              
              {cartEnabled && (
                <>
                  <h3 className="section-title">Cart Settings</h3>
                  
                  <div className="setting-item">
                    <label className="setting-label">
                      <input
                        type="checkbox"
                        checked={useThousandsFormat}
                        onChange={(e) => setUseThousandsFormat(e.target.checked)}
                        className="setting-checkbox"
                      />
                      Round to thousands
                    </label>
                  </div>
                </>
              )}
              
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
        </div>
      </aside>

      <div className="main">
        <header 
          className={"glass header" + (headerVisible ? '' : ' hidden')}
          onClick={() => setSidebarOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          <button
            className="icon menu"
            onClick={(e) => {
              e.stopPropagation()
              setSidebarOpen(true)
            }}
            aria-label="Open perks"
            aria-controls="perks-sidebar"
            aria-expanded={sidebarOpen}
          >☰</button>
          
          <div className="craft-chain" onClick={(e) => e.stopPropagation()}>
            {craftChain.length === 1 ? (
              <div className="header-title">
                <h1>Craft</h1>
                {user && isInTelegram && (
                  <span className="user-greeting">Hi, {user.first_name}! 👋</span>
                )}
              </div>
            ) : (
              <div className="breadcrumbs">
                {craftChain.map((chainItem, index) => (
                  <span key={`${chainItem.name}-${index}`}>
                    <button 
                      className="breadcrumb-item" 
                      onClick={() => handleChainClick(index)}
                      type="button"
                    >
                      {chainItem.name}
                    </button>
                    {index < craftChain.length - 1 && <span className="breadcrumb-separator">→</span>}
                  </span>
                ))}
              </div>
            )}
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
              value={amount === null || amount === 0 ? '' : formatQuantity(amount)}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\s/g, '');
                if (numericValue === '') {
                  setAmount(null);
                } else if (!isNaN(numericValue) && isFinite(numericValue)) {
                  const num = Number(numericValue);
                  if (num >= 0 && num <= Number.MAX_SAFE_INTEGER) {
                    setAmount(num);
                  }
                }
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
                  {items.map(i => (
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

        <AnimatePresence initial={false} mode="popLayout">
          {sidebarOpen && (
            <motion.button
              className="scrim"
              aria-label="Close overlay"
              onClick={() => setSidebarOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          {result && (
            <motion.div
              key={`${item}-${amount}-${activePerks.join(',')}-${showTotalsCard}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="stack"
            >
              {showTotalsCard && (
                <motion.section 
                  className="glass card compact"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="totals-row">
                    <motion.div className="pill">Silver <span>{result.silver && isFinite(result.silver) ? formatQuantity(result.silver) : '0'}</span></motion.div>
                    <motion.div className="pill">XP <span>{result.xp && isFinite(result.xp) ? formatQuantity(result.xp) : '0'}</span></motion.div>
                  </div>
                </motion.section>
              )}

              {Object.keys(result.filteredResources).length > 0 && (
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
                            <span className="v">{formatQuantity(v)}</span>
                          </div>
                          {isMailable && cartEnabled && (
                            <button
                              className={`add-to-cart-btn ${recentlyAddedItems.has(`${k}_${v}`) ? 'success' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(k, v)
                              }}
                              type="button"
                              title={`Add ${k} to cart`}
                            >
                              {recentlyAddedItems.has(`${k}_${v}`) ? (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <path 
                                    d="M11.67 3.5L5.25 9.92L2.33 7" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : (
                                '+'
                              )}
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
            </motion.div>
          )}
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
      </div>
    </div>
  )
}
