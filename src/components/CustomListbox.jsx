import React, { useEffect, useRef, useState } from 'react'

// Accessible custom listbox
export default function CustomListbox({ options = [], value = '', onChange, ariaLabel = '' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() => Math.max(0, options.indexOf(value)))
  const ref = useRef(null)
  const listRef = useRef(null)

  useEffect(() => setActive(Math.max(0, options.indexOf(value))), [value, options])

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return
      if (!ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector('[data-index="' + active + '"]')
      el && el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [open, active])

  // Scroll to selected element when opening
  useEffect(() => {
    if (open && listRef.current && value) {
      const selectedIdx = options.indexOf(value)
      if (selectedIdx >= 0) {
        const el = listRef.current.querySelector('[data-index="' + selectedIdx + '"]')
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }, 50)
        }
      }
    }
  }, [open])

  function toggle() {
    setOpen(o => !o)
  }

  function commitSelection(idx) {
    const v = options[idx]
    if (v === undefined) return
    onChange && onChange(v)
    setOpen(false)
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setActive(a => Math.min(a + 1, options.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) setOpen(true)
      setActive(a => Math.max(a - 1, 0))
      return
    }
    if (e.key === 'Home') { e.preventDefault(); setActive(0); return }
    if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commitSelection(active); return }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return }
  }

  return (
    <div className={`custom-listbox ${open ? 'open' : ''}`} ref={ref} onKeyDown={onKey}>
      <button
        type="button"
        className="custom-listbox-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={toggle}
      >
        <span className="custom-listbox-label">{value || options[0] || ''}</span>
        <span className="custom-listbox-caret">{open ? '▴' : '▾'}</span>
      </button>

      <div
        ref={listRef}
        role="listbox"
        tabIndex={-1}
        aria-hidden={!open}
        className="custom-listbox-list"
      >
        {options.map((opt, i) => (
          <div
            key={`${opt}-${i}`}
            role="option"
            aria-selected={opt === value}
            data-index={i}
            className={`custom-listbox-item ${opt === value ? 'selected' : ''} ${i === active ? 'active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => commitSelection(i)}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  )
}
