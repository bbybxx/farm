import { useState, useEffect } from 'react'
import { loadFromStorage, saveToStorage } from '../utils/storage'

export function useUIState() {
  const [locationsMode, setLocationsMode] = useState(() => loadFromStorage('craftCalculator_locationsMode', false))
  const [selectedLocation, setSelectedLocation] = useState(() => loadFromStorage('craftCalculator_selectedLocation', 'Forest'))
  const [questsMode, setQuestsMode] = useState(() => loadFromStorage('craftCalculator_questsMode', false))
  const [economyMode, setEconomyMode] = useState(() => loadFromStorage('craftCalculator_economyMode', false))
  
  const [craftBreadcrumbs, setCraftBreadcrumbs] = useState(() => loadFromStorage('craftCalculator_craftBreadcrumbs', []))
  const [locationsBreadcrumbs, setLocationsBreadcrumbs] = useState(() => loadFromStorage('craftCalculator_locationsBreadcrumbs', []))
  const [questsBreadcrumbs, setQuestsBreadcrumbs] = useState(() => loadFromStorage('craftCalculator_questsBreadcrumbs', []))
  
  const [resourcesSectionCollapsed, setResourcesSectionCollapsed] = useState(() => loadFromStorage('craftCalculator_resourcesSectionCollapsed', false))
  const [usedInSectionCollapsed, setUsedInSectionCollapsed] = useState(() => loadFromStorage('craftCalculator_usedInSectionCollapsed', true))

  useEffect(() => {
    saveToStorage('craftCalculator_economyMode', economyMode)
  }, [economyMode])

  useEffect(() => {
    saveToStorage('craftCalculator_locationsMode', locationsMode)
  }, [locationsMode])

  useEffect(() => {
    saveToStorage('craftCalculator_selectedLocation', selectedLocation)
  }, [selectedLocation])

  useEffect(() => {
    saveToStorage('craftCalculator_questsMode', questsMode)
  }, [questsMode])

  useEffect(() => {
    saveToStorage('craftCalculator_craftBreadcrumbs', craftBreadcrumbs)
  }, [craftBreadcrumbs])
  
  useEffect(() => {
    saveToStorage('craftCalculator_locationsBreadcrumbs', locationsBreadcrumbs)
  }, [locationsBreadcrumbs])
  
  useEffect(() => {
    saveToStorage('craftCalculator_questsBreadcrumbs', questsBreadcrumbs)
  }, [questsBreadcrumbs])

  useEffect(() => {
    saveToStorage('craftCalculator_resourcesSectionCollapsed', resourcesSectionCollapsed)
  }, [resourcesSectionCollapsed])
  
  useEffect(() => {
    saveToStorage('craftCalculator_usedInSectionCollapsed', usedInSectionCollapsed)
  }, [usedInSectionCollapsed])

  return {
    locationsMode, setLocationsMode,
    selectedLocation, setSelectedLocation,
    questsMode, setQuestsMode,
    economyMode, setEconomyMode,
    craftBreadcrumbs, setCraftBreadcrumbs,
    locationsBreadcrumbs, setLocationsBreadcrumbs,
    questsBreadcrumbs, setQuestsBreadcrumbs,
    resourcesSectionCollapsed, setResourcesSectionCollapsed,
    usedInSectionCollapsed, setUsedInSectionCollapsed
  }
}
