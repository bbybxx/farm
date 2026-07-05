import { useState, useEffect, useCallback } from 'react'
import { loadFromStorage } from '../../../utils/storage'

/**
 * useActivePerks — читает activePerks и exploringMode из localStorage.
 *
 * Подписывается на кастомное событие 'storage-update', которое
 * диспатчится из saveToStorage в storage.js при каждом изменении.
 *
 * Возвращает:
 *   { activePerks: string[], exploringMode: string }
 */
export function useActivePerks() {
  const [activePerks, setActivePerks] = useState(() =>
    loadFromStorage('craftCalculator_activePerks', [])
  )
  const [exploringMode, setExploringMode] = useState(() => {
    const stored = loadFromStorage('craftCalculator_exploringMode', null)
    if (!stored) return 'Apple Cider'
    if (stored === 'Manually') return 'Apple Cider'
    return stored
  })

  const handleStorageUpdate = useCallback((e) => {
    const key = e.detail?.key
    if (!key || key === 'craftCalculator_activePerks') {
      setActivePerks(loadFromStorage('craftCalculator_activePerks', []))
    }
    if (!key || key === 'craftCalculator_exploringMode') {
      const stored = loadFromStorage('craftCalculator_exploringMode', null)
      setExploringMode(stored === 'Manually' ? 'Apple Cider' : (stored || 'Apple Cider'))
    }
  }, [])

  useEffect(() => {
    window.addEventListener('storage-update', handleStorageUpdate)
    return () => window.removeEventListener('storage-update', handleStorageUpdate)
  }, [handleStorageUpdate])

  return { activePerks, exploringMode }
}
