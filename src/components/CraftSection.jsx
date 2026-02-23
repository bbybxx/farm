import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemDisplay from './ItemDisplay'
import { formatNumberRounded } from '../utils/formatters'

export default function CraftSection({
  result,
  availableCrafts,
  resourcesSectionCollapsed,
  setResourcesSectionCollapsed,
  usedInSectionCollapsed,
  setUsedInSectionCollapsed,
  hasItemContent,
  navigateToItem,
  itemsData,
  buddyFarmLinksEnabled,
  pinnedEnabled,
  recentlyAddedItems,
  addToPinned,
  item,
  craftChain
}) {
  return (
    <>
      {/* Resources Section - What's needed to craft this item */}
      {result && Object.keys(result.filteredResources).length > 0 && (
        <section className="glass card">
          <h2 
            className="collapsible-header"
            onClick={() => setResourcesSectionCollapsed(!resourcesSectionCollapsed)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>Resources</span>
            <svg 
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: resourcesSectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </h2>
          <AnimatePresence>
            {!resourcesSectionCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ul className="list">
                  {Object.entries(result.filteredResources).map(([k, v]) => {
                    const isClickable = hasItemContent(k)
                    
                    return (
                      <li 
                        key={k}
                        className="resource-item"
                      >
                        <div 
                          className={`resource-content ${isClickable ? 'clickable' : ''}`}
                          onClick={() => {
                            if (!isClickable) return
                            navigateToItem(k, v)
                          }}
                          style={isClickable ? { cursor: 'pointer' } : {}}
                          title={isClickable ? `View ${k}` : undefined}
                        >
                          <span className="k">
                            <ItemDisplay itemName={k} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled}>
                              {isClickable && (
                                <span className="craft-indicator">
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path 
                                      d="M2 8L6 4L10 8" 
                                      stroke="currentColor" 
                                      strokeWidth="1.5" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                              )}
                            </ItemDisplay>
                          </span>
                          <span className="v">{formatNumberRounded(v)}</span>
                        </div>
                        {pinnedEnabled && (
                          <button
                            className={`pin-btn ${recentlyAddedItems.has(`${k}_${v}_${craftChain.length > 0 ? craftChain[0].name : item}`) ? 'success' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              addToPinned(k, v, craftChain.length > 0 ? craftChain[0].name : item, e)
                            }}
                            type="button"
                            title={`Pin ${k} from ${item}`}
                          >
                            <div className="pin-icon">
                              <div 
                                className={`pin-line pin-line-horizontal ${recentlyAddedItems.has(`${k}_${v}_${craftChain.length > 0 ? craftChain[0].name : item}`) ? 'checked' : ''}`}
                              ></div>
                              <div 
                                className={`pin-line pin-line-vertical ${recentlyAddedItems.has(`${k}_${v}_${craftChain.length > 0 ? craftChain[0].name : item}`) ? 'checked' : ''}`}
                              ></div>
                            </div>
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Used In Section - What can be crafted from this item */}
      {availableCrafts.length > 0 && (
        <section className="glass card">
          <h2 
            className="collapsible-header"
            onClick={() => setUsedInSectionCollapsed(!usedInSectionCollapsed)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>Used In</span>
            <svg 
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: usedInSectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </h2>
          <AnimatePresence>
            {!usedInSectionCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ul className="list">
                  {availableCrafts.map(c => {
                    const isClickable = hasItemContent(c.name)
                    const targetAmount = (typeof c.craftableCount === 'number') ? c.craftableCount : 1
                    return (
                      <li key={c.name} className="resource-item">
                        <div 
                          className={`resource-content ${isClickable ? 'clickable' : ''}`}
                          onClick={() => {
                            if (!isClickable) return
                            navigateToItem(c.name, targetAmount)
                          }}
                          style={isClickable ? { cursor: 'pointer' } : undefined}
                          title={isClickable ? `View ${c.name}` : undefined}
                        >
                          <span className="k">
                            <ItemDisplay itemName={c.name} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled}>
                              {isClickable && (
                                <span className="craft-indicator">
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              )}
                            </ItemDisplay>
                          </span>
                          <span className="v">{formatNumberRounded(c.craftableCount != null ? c.craftableCount : 0)}</span>
                        </div>

                        {pinnedEnabled && (() => {
                          const qtyForCraftPin = (typeof c.craftableCount === 'number' && c.craftableCount > 0)
                            ? Math.round(c.craftableCount * (c.outputQty || 1))
                            : (c.outputQty || 1)
                          return (
                            <button
                              className={`pin-btn ${recentlyAddedItems.has(`${c.name}_${qtyForCraftPin}_${item}`) ? 'success' : ''}`}
                              onClick={(e) => { e.stopPropagation(); addToPinned(c.name, qtyForCraftPin, item) }}
                              type="button"
                              title={`Pin ${c.name}`}
                            >
                              <div className="pin-icon">
                                <div className={`pin-line pin-line-horizontal ${recentlyAddedItems.has(`${c.name}_${qtyForCraftPin}_${item}`) ? 'checked' : ''}`}></div>
                                <div className={`pin-line pin-line-vertical ${recentlyAddedItems.has(`${c.name}_${qtyForCraftPin}_${item}`) ? 'checked' : ''}`}></div>
                              </div>
                            </button>
                          )
                        })()}
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}
    </>
  )
}
