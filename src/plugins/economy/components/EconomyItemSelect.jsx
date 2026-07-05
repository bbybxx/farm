import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCombinedRecipes } from '../../../utils/recipeUtils'
import ItemDisplay from '../../../components/ItemDisplay'
import LocationImage from '../../../components/LocationImage'
import itemsAPI from '../../../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap } from '../../../utils/itemImageUtils'

const STATIC_ITEMS_MAP = normalizeItemsMap(itemsAPI)

/**
 * EconomyItemSelect — самодостаточный оверлей выбора предмета или локации
 * для экономического режима. Полная копия стиля ItemSelectModal.
 *
 * Пропсы:
 *   isOpen       — boolean
 *   mode         — 'craft' | 'location'
 *   onSelect     — (name: string, amount: number) => void
 *   onClose      — () => void
 */
export default function EconomyItemSelect({ isOpen, mode, onSelect, onClose }) {
  const [filter, setFilter] = useState('')
  const [quantity, setQuantity] = useState(1)
  const listRef = useRef(null)

  // Список предметов (craft) — получаем напрямую из recipeUtils
  const craftItems = useMemo(() => {
    const recipes = getCombinedRecipes()
    return Object.keys(recipes || {}).sort()
  }, [])

  // Список локаций — статический
  const locations = useMemo(() => [
    'Forest',
    'Small Cave',
    'Highland Hills',
    'Cane Pole Ridge',
    'Ember Lagoon',
    'Mount Banon',
    'Jundland Desert',
    'Black Rock Canyon',
    'Whispering Creek',
    'Misty Forest',
    'Haunted House',
    "Santa's Workshop",
    'Small Spring',
    'Garys Crushroom',
  ], [])

  const items = mode === 'craft' ? craftItems : locations
  const title = mode === 'craft' ? 'Select an item' : 'Select a location'
  const placeholder = mode === 'craft' ? 'Search items...' : 'Search locations...'

  const filtered = useMemo(() => {
    if (!filter) return items
    const lower = filter.toLowerCase()
    return items.filter(name => name.toLowerCase().includes(lower))
  }, [items, filter])

  const handleSelect = (name) => {
    const qty = parseInt(quantity, 10) || 1
    onSelect(name, Math.max(1, qty))
    setFilter('')
    setQuantity(1)
    onClose()
  }

  const handleBackdropClick = () => {
    setFilter('')
    setQuantity(1)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-wrapper"
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ zIndex: 9999 }}
        >
          <motion.div
            className="glass item-select-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="economy-item-select-title"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="item-select-header">
              <h2 id="economy-item-select-title" className="item-select-title">
                {title}
              </h2>
              <div className="item-select-search-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  className="calc-input item-select-search"
                  placeholder={placeholder}
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  aria-label={placeholder}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  aria-label="Quantity"
                  style={{
                    width: '70px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.2)',
                    color: 'inherit',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>
            <div ref={listRef} className="item-select-list">
              {filtered.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>
                  {mode === 'craft' ? 'No items found' : 'No locations found'}
                </div>
              ) : (
                filtered.map(name => (
                  <button
                    key={name}
                    className=""
                    onClick={() => handleSelect(name)}
                    type="button"
                  >
                    {mode === 'craft' ? (
                      <ItemDisplay itemName={name} itemsData={STATIC_ITEMS_MAP} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LocationImage name={name} size={22} />
                        <span>{name}</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
