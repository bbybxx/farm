import React from 'react'

// Map a human name to a filename used in the repo
function toFileName(name) {
  if (!name) return ''
  return name.toString().trim().replace(/\s+/g, '_').replace(/[’'`]/g, '').replace(/[^A-Za-z0-9_]/g, '') + '.png'
}

// Preload all images from locations_img using Vite's glob so they become build assets.
// This returns an object whose keys are the relative paths and values are import functions.
let imagesMap = null
try {
  // eslint-disable-next-line no-undef
  const modules = import.meta.glob('/src/../locations_img/*.{png,jpg,jpeg,svg}', { eager: true, as: 'url' })
  imagesMap = {}
  Object.keys(modules).forEach(k => {
    const fileName = k.split('/').pop()
    imagesMap[fileName] = modules[k]
  })
} catch (e) {
  // In non-Vite or test environments, import.meta.glob may not exist; leave imagesMap null
  imagesMap = null
}

export default function LocationImage({ name, size = 20, className = '', alt = '' }) {
  if (!name) return null
  const file = toFileName(name)

  // Prefer the bundled asset URL if available
  let src = null
  if (imagesMap && imagesMap[file]) src = imagesMap[file]

  // Fallback to a public path (useful during dev server or when assets are served from repo root)
  if (!src) src = `/locations_img/${file}`

  // Debug info: helps when running the dev server to see whether the lookup succeeded
  if (typeof console !== 'undefined' && console.debug) {
    try {} catch (e) {
      // ignore
    }
  }

  return (
    <img
      src={src}
      alt={alt || name}
      title={name}
      width={size}
      height={size}
      className={`location-image ${className}`}
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: 4, marginRight: 8 }}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}

