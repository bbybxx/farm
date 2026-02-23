import React, { useState, useRef, useCallback, memo } from 'react'
import { formatNumberRounded } from '../utils/formatters.js'

/**
 * Input for location item quantities.
 * Manages its own editing state locally — no parent re-renders during typing.
 * Calls onCommit(itemName, numericValue) on blur / Enter so the parent can
 * recompute the consumable budget and update all items at once.
 */
const LocationItemInput = memo(function LocationItemInput({
  itemName,
  display,
  onCommit,
}) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState('')
  const skipCommitRef = useRef(false)

  const formattedDisplay = display !== '—' ? formatNumberRounded(display) : ''

  const handleFocus = useCallback((e) => {
    const rawVal = display !== '—' ? String(display).replace(/\s/g, '') : ''
    setEditing(true)
    setLocalValue(rawVal)
    setTimeout(() => e.target.select(), 0)
  }, [display])

  const handleChange = useCallback((e) => {
    const val = e.target.value.replace(/\s/g, '')
    if (val === '' || !isNaN(val)) {
      setLocalValue(val)
    }
  }, [])

  const handleBlur = useCallback(() => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false
      setEditing(false)
      setLocalValue('')
      return
    }
    const raw = localValue.replace(/\s/g, '')
    const numVal = raw === '' ? 0 : parseFloat(raw)
    setEditing(false)
    setLocalValue('')
    if (!isNaN(numVal) && numVal > 0) {
      onCommit(itemName, numVal)
    }
  }, [itemName, localValue, onCommit])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    } else if (e.key === 'Escape') {
      skipCommitRef.current = true
      e.target.blur()
    }
  }, [])

  return (
    <input
      type="text"
      inputMode="decimal"
      className="location-item-input"
      value={editing ? localValue : formattedDisplay}
      data-item-name={itemName}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={formattedDisplay || '0'}
    />
  )
})

export default LocationItemInput
