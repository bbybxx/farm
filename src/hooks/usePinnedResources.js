import { useState, useEffect, useRef } from 'react'
import { loadFromStorage, saveToStorage } from '../utils/storage.js'
import { getItemLocations } from '../utils/exploringUtils.js'

export function usePinnedResources({ 
  hapticFeedback, 
  item, 
  amount, 
  craftChain, 
  questsMode, 
  locationsMode 
}) {
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
  const [recentlyAddedItems, setRecentlyAddedItems] = useState(new Set())
  const recentlyAddedTimersRef = useRef(new Set())

  // Save to localStorage
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
    setPinnedResources(prev => {
      let changed = false
      const migrated = prev.map(p => {
        let updated = { ...p }
        if (updated.selectedLocation) {
          updated.location = updated.selectedLocation
          delete updated.selectedLocation
          changed = true
        }
        if (!updated.folderId) {
          updated.folderId = 'default'
          changed = true
        }
        return updated
      })
      return changed ? migrated : prev
    })
    
    setPinnedQuests(prev => {
      let changed = false
      const migrated = prev.map(q => {
        let updated = { ...q }
        if (!updated.folderId) {
          updated.folderId = 'quests'
          changed = true
        }
        return updated
      })
      return changed ? migrated : prev
    })
  }, [])

  // Reset Quick Pin filter when modal closes
  useEffect(() => {
    if (!isQuickPinModalOpen) {
      setQuickPinFilter('')
      setQuickPinSelectedItem(null)
      setQuickPinQuantity('')
    }
  }, [isQuickPinModalOpen])

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

  const addToPinned = (resourceName, quantity, parentRecipe = null, event = null) => {
    // Stop propagation if event is provided
    if (event) {
      event.stopPropagation()
    }
    // If active folder is 'quests', fallback to 'default' for regular items
    const targetFolder = activePinnedFolder === 'quests' ? 'default' : (activePinnedFolder || 'default')
    addToPinnedWithFolder(resourceName, quantity, parentRecipe, targetFolder)
  }

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

  return {
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
  }
}
