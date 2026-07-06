import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemDisplay from '../../../components/ItemDisplay'
import LocationImage from '../../../components/LocationImage'
import { getItemsMap, getRecipes, getUsedItemsSet } from '../utils/economyData'

const STATIC_ITEMS_MAP = getItemsMap()

export default function EconomyItemSelectModal({ isOpen, mode, onSelect, onClose }) {
  const [filter, setFilter] = useState('')
  const listRef = useRef(null)

  // Ленивый useMemo — вычисляем craftItems только когда модалка открыта
  const craftItems = useMemo(() => {
    if (!isOpen) return []
    const recipes = getRecipes()
    const itemsSet = new Set()

    // Все крафтовые предметы (у кого есть рецепт)
    Object.keys(recipes || {}).forEach(itemName => {
      itemsSet.add(itemName)
    })

    // Все ингредиенты (базовые ресурсы)
    Object.values(recipes || {}).forEach(recipe => {
      const resources = recipe.ingredients || recipe.из
      if (resources) {
        Object.keys(resources).forEach(resource => {
          itemsSet.add(resource)
        })
      }
    })

    // Оставляем только те, что используются в других рецептах
    // Используем прекомпьютированный Set — O(1) на проверку вместо O(n)
    const usedSet = getUsedItemsSet()
    return Array.from(itemsSet)
      .filter(itemName => usedSet.has(itemName))
      .sort()
  }, [isOpen])

  const locations = useMemo(() => [
    'Forest', 'Small Cave', 'Highland Hills', 'Cane Pole Ridge',
    'Ember Lagoon', 'Mount Banon', 'Jundland Desert', 'Black Rock Canyon',
    'Whispering Creek', 'Misty Forest', 'Haunted House', "Santa's Workshop",
    'Small Spring', 'Garys Crushroom',
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
    onSelect(name, 1)
    setFilter('')
    onClose()
  }

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [filter])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{ zIndex: 9999 }}
        >
          <motion.div
            className="glass item-select-content"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="item-select-header">
              <h2 className="item-select-title">{title}</h2>
              <div className="item-select-search-wrapper">
                <input
                  className="calc-input item-select-search"
                  placeholder={placeholder}
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  autoFocus
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
                  <button key={name} onClick={() => handleSelect(name)} type="button">
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
