import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemDisplay from './ItemDisplay'
import LocationImage from './LocationImage'

export default function ItemSelectModal({
  isOpen,
  onClose,
  locationsMode,
  selectedLocation,
  setSelectedLocation,
  item,
  itemSelectFilter,
  setItemSelectFilter,
  handleSelectItem,
  itemSelectListRef,
  itemsForSelect,
  locationsForConfig,
  itemsData,
  buddyFarmLinksEnabled
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-wrapper"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="glass item-select-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-select-title"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="item-select-header">
              <h2 id="item-select-title" className="item-select-title">Select an Item</h2>
              <div className="item-select-search-wrapper">
                <input
                  className="calc-input item-select-search"
                  placeholder={locationsMode ? 'Search locations...' : 'Search items...'}
                  value={itemSelectFilter}
                  onChange={(e) => setItemSelectFilter(e.target.value)}
                  aria-label="Filter items"
                />
              </div>
            </div>
            <div ref={itemSelectListRef} className="item-select-list">
              {(locationsMode ? (locationsForConfig || []) : (itemsForSelect || [])).filter(i => {
                const label = locationsMode ? (i.name || '') : (i || '')
                if (!itemSelectFilter) return true
                return String(label).toLowerCase().includes(itemSelectFilter.toLowerCase())
              }).map(i => {
                const label = locationsMode ? i.name : i
                const active = locationsMode ? selectedLocation === i.name : item === i
                return (
                  <button
                    key={label}
                    className={active ? 'active' : ''}
                    onClick={() => {
                      if (locationsMode) {
                        setSelectedLocation(label)
                        onClose()
                      } else {
                        handleSelectItem(label)
                      }
                    }}
                    type="button"
                  >
                    {locationsMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LocationImage name={label} size={22} />
                        <span>{label}</span>
                      </div>
                    ) : <ItemDisplay itemName={i} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
