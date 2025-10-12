const BUDDY_FARM_BASE_URL = 'https://buddy.farm'

const hasProtocol = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim())
const hasNetworkPrefix = (value) => typeof value === 'string' && /^\/\//.test(value.trim())

const normalizeLocalPath = (value) => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (hasProtocol(trimmed) || hasNetworkPrefix(trimmed)) {
    return null
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const normalizeRemoteUrl = (value) => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (hasProtocol(trimmed)) {
    return trimmed
  }
  if (hasNetworkPrefix(trimmed)) {
    return `https:${trimmed}`
  }
  return null
}

const buildRemoteFromLocal = (localPath) => {
  if (!localPath) return null
  return `${BUDDY_FARM_BASE_URL}${localPath.startsWith('/') ? localPath : `/${localPath}`}`
}

const collectCandidates = (values, normalizer) => {
  for (const value of values) {
    const normalized = normalizer(value)
    if (normalized) return normalized
  }
  return null
}

const dedupeSources = (sources) => {
  const result = []
  sources.forEach((src) => {
    if (src && !result.includes(src)) {
      result.push(src)
    }
  })
  return result
}

export function normalizeItemRecord(name, sourceData = {}, options = {}) {
  const { previous = null, base = null } = options
  const merged = {
    ...(base || {}),
    ...(previous || {}),
    ...(sourceData || {})
  }

  const candidateValues = [
    sourceData.imageLocal,
    sourceData.image,
    sourceData.imageFallback,
    previous?.imageLocal,
    previous?.image,
    previous?.imageFallback,
    base?.imageLocal,
    base?.image,
    base?.imageFallback
  ]
  const localPath = collectCandidates(candidateValues, normalizeLocalPath)

  const remoteCandidateValues = [
    sourceData.imageRemote,
    sourceData.imageFallback,
    sourceData.image,
    previous?.imageRemote,
    previous?.imageFallback,
    previous?.image,
    base?.imageRemote,
    base?.imageFallback,
    base?.image
  ]
  let remoteUrl = collectCandidates(remoteCandidateValues, normalizeRemoteUrl)
  if (!remoteUrl && localPath) {
    remoteUrl = buildRemoteFromLocal(localPath)
  }

  const primaryImage = localPath || remoteUrl || null
  let fallbackImage = null

  if (remoteUrl && remoteUrl !== primaryImage) {
    fallbackImage = remoteUrl
  } else if (localPath && localPath !== primaryImage) {
    fallbackImage = localPath
  }

  const imageSources = dedupeSources([
    primaryImage,
    fallbackImage,
    remoteUrl,
    localPath
  ])

  return {
    ...merged,
    name: merged.name || name,
    image: primaryImage,
    imageLocal: localPath || null,
    imageRemote: remoteUrl || null,
    imageFallback: fallbackImage && fallbackImage !== primaryImage ? fallbackImage : null,
    imageSources
  }
}

export function normalizeItemsMap(map = {}, options = {}) {
  const { baseMap = {} } = options
  const entries = Object.entries(map || {})
  return entries.reduce((acc, [itemName, data]) => {
    acc[itemName] = normalizeItemRecord(itemName, data, {
      base: baseMap[itemName]
    })
    return acc
  }, {})
}

export function areItemRecordsEqual(a, b) {
  if (a === b) return true
  if (!a || !b) return false

  const fieldsToCompare = ['name', 'type', 'image', 'imageFallback', 'imageLocal', 'imageRemote', 'canCraft', 'craftingLevel']
  for (const field of fieldsToCompare) {
    const valA = a[field] ?? null
    const valB = b[field] ?? null
    if (valA !== valB) return false
  }

  const sourcesA = Array.isArray(a.imageSources) ? a.imageSources : []
  const sourcesB = Array.isArray(b.imageSources) ? b.imageSources : []
  if (sourcesA.length !== sourcesB.length) return false
  for (let i = 0; i < sourcesA.length; i += 1) {
    if (sourcesA[i] !== sourcesB[i]) return false
  }

  return true
}

export default {
  normalizeItemRecord,
  normalizeItemsMap,
  areItemRecordsEqual
}
