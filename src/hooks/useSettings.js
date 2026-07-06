import { useState, useEffect } from 'react'
import { loadFromStorage, saveToStorage } from '../utils/storage'

export function useSettings() {
  const [useThousandsFormat, setUseThousandsFormat] = useState(() => loadFromStorage('craftCalculator_useThousandsFormat', true))
  const [pinnedEnabled, setPinnedEnabled] = useState(() => loadFromStorage('craftCalculator_pinnedEnabled', true))
  const [buddyFarmLinksEnabled, setBuddyFarmLinksEnabled] = useState(() => loadFromStorage('craftCalculator_buddyFarmLinksEnabled', false))
  const [questItemSearchEnabled, setQuestItemSearchEnabled] = useState(() => loadFromStorage('craftCalculator_questItemSearchEnabled', false))
  
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
    saveToStorage('craftCalculator_exploringMode', exploringMode)
  }, [exploringMode])

  useEffect(() => {
    saveToStorage('craftCalculator_useThousandsFormat', useThousandsFormat)
  }, [useThousandsFormat])

  useEffect(() => {
    saveToStorage('craftCalculator_pinnedEnabled', pinnedEnabled)
  }, [pinnedEnabled])

  useEffect(() => {
    saveToStorage('craftCalculator_buddyFarmLinksEnabled', buddyFarmLinksEnabled)
  }, [buddyFarmLinksEnabled])

  useEffect(() => {
    saveToStorage('craftCalculator_questItemSearchEnabled', questItemSearchEnabled)
  }, [questItemSearchEnabled])

  return {
    useThousandsFormat,
    setUseThousandsFormat,
    pinnedEnabled,
    setPinnedEnabled,
    buddyFarmLinksEnabled,
    setBuddyFarmLinksEnabled,
    questItemSearchEnabled,
    setQuestItemSearchEnabled,
    exploringMode,
    setExploringMode
  }
}
