import React from 'react'

function toFileName(name) {
  if (!name) return ''
  // Replace spaces with underscores, remove punctuation, keep alphanumerics and underscores
  return name.toString().trim().replace(/\s+/g, '_').replace(/[’'`]/g, '').replace(/[^A-Za-z0-9_]/g, '') + '.png'
}

export default function LocationImage({ name, size = 20, className = '', alt = '' }) {
  if (!name) return null
  const file = toFileName(name)
  // Try to load from a project-root `locations_img/` folder which is available in this repo.
  const src = `/locations_img/${file}`

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
