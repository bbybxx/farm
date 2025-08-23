import React, { useEffect, useRef, useState } from 'react'

export default function PinnedLocationSelect({ options = [], value = '', onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return
      if (!ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const label = value || options[0] || ''

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(o => !o)
    }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className={`pinned-loc-select ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`pinned-loc-btn ${open ? 'open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKey}
      >
        <div className="pinned-loc-btn-row">
          <span className="pinned-loc-label">{label}</span>
          <span className="pinned-loc-arrow">{open ? '▴' : '▾'}</span>
        </div>
      </button>

      <div className="pinned-loc-list" role="listbox" aria-hidden={!open}>
        {options.map((opt, idx) => {
          return (
            <button
              key={`${opt}-${idx}`}
              type="button"
              role="option"
              aria-selected={opt === value}
              className={`pinned-loc-item ${opt === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt); setOpen(false) }}
              tabIndex={open ? 0 : -1}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
