export let storageAvailabilityCache = null

export function isStorageAvailable() {
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

export function saveToStorage(key, data) {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(data))
    window.dispatchEvent(new CustomEvent('storage-update', { detail: { key } }))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

export function loadFromStorage(key, defaultValue) {
  if (!isStorageAvailable()) return defaultValue
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return defaultValue
  }
}
