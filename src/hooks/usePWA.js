import { useState, useEffect } from 'react'

// Helper function to detect if running as PWA
function isPWA() {
  if (typeof window === 'undefined') return false

  // Check for standalone mode (PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }

  // iOS Safari standalone mode
  if (window.navigator.standalone === true) {
    return true
  }

  // Fallback: check if app was launched from home screen (Android)
  // This is less reliable but can catch some cases
  if (window.performance && window.performance.getEntriesByType) {
    const entries = window.performance.getEntriesByType('navigation')
    if (entries.length > 0 && entries[0].type === 'navigate') {
      // Could add more sophisticated checks here
    }
  }

  return false
}

// Expose PWA detection to window for debugging
if (typeof window !== 'undefined') {
  window.isPWA = isPWA
  window.getPWAMode = () => ({
    isPWA: isPWA(),
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    navigatorStandalone: window.navigator.standalone,
    userAgent: navigator.userAgent
  })
}

export function usePWA() {
  const [isPWAMode, setIsPWAMode] = useState(false)

  useEffect(() => {
    const pwaMode = isPWA()
    setIsPWAMode(pwaMode)
  }, [])

  return isPWAMode
}

export { isPWA }