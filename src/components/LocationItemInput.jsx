import React, { useRef, useEffect } from 'react'
import { formatNumberRounded } from '../utils/formatters.js'

// Global set to track which inputs are being actively edited (survives re-renders)
export const editingInputsSet = new Set()

// Isolated input component with realtime updates via DOM manipulation
export default function LocationItemInput({ 
  itemName, 
  display, 
  onCommit,
  onPreview
}) {
  const inputRef = useRef(null)
  const lastSetValueRef = useRef(null) // Track last value we set via preview
  
  // Update input value when display prop changes (and user is not editing)
  useEffect(() => {
    if (inputRef.current && !editingInputsSet.has(itemName)) {
      const newValue = display !== '—' ? formatNumberRounded(display) : ''
      inputRef.current.value = newValue
    }
  }, [display, itemName])
  
  const handleFocus = (e) => {
    editingInputsSet.add(itemName)
    // Set raw value without formatting for editing
    const currentVal = display !== '—' ? String(display).replace(/\s/g, '') : ''
    e.target.value = currentVal
    lastSetValueRef.current = null // Clear preview value
    setTimeout(() => e.target.select(), 0)
  }

  const handleChange = (e) => {
    const val = e.target.value.replace(/\s/g, '')
    if (val === '' || !isNaN(val)) {
      const numVal = val === '' ? 0 : parseFloat(val)
      if (!isNaN(numVal) && numVal > 0) {
        // Call preview to update other fields without losing focus
        onPreview(itemName, numVal)
      }
    }
  }

  const handleBlur = (e) => {
    editingInputsSet.delete(itemName)
    const val = e.target.value.replace(/\s/g, '')
    const numVal = val === '' ? 0 : parseFloat(val)
    lastSetValueRef.current = null
    
    if (!isNaN(numVal) && numVal > 0) {
      onCommit(itemName, numVal)
    } else {
      // Reset to display value and sync other fields
      const resetVal = display !== '—' ? parseFloat(String(display).replace(/\s/g, '')) : 0
      e.target.value = display !== '—' ? formatNumberRounded(display) : ''
      // Call preview with display value to sync other fields back
      if (!isNaN(resetVal) && resetVal > 0) {
        onPreview(itemName, resetVal)
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    } else if (e.key === 'Escape') {
      e.target.value = display !== '—' ? formatNumberRounded(display) : ''
      editingInputsSet.delete(itemName)
      lastSetValueRef.current = null
      e.target.blur()
    }
  }
  
  // Store ref for external access (preview updates)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current._lastSetValueRef = lastSetValueRef
    }
  }, [])

  // Initial value
  const initialValue = display !== '—' ? formatNumberRounded(display) : ''

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className="location-item-input"
      defaultValue={initialValue}
      data-item-name={itemName}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={display !== '—' ? formatNumberRounded(display) : '0'}
    />
  )
}
