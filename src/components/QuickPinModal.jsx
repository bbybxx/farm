import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemDisplay from './ItemDisplay'
import questsApiData from '../data/quests-api.json'

export default function QuickPinModal({
  isOpen,
  onClose,
  quickPinSelectedItem,
  quickPinFilter,
  setQuickPinFilter,
  quickPinQuantity,
  setQuickPinQuantity,
  handleQuickPin,
  confirmQuickPin,
  cancelQuickPin,
  activePinnedFolder,
  allItems,
  itemsData,
  buddyFarmLinksEnabled,
  addQuestToPinned,
  hapticFeedback
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ zIndex: 50 }}
        >
          <motion.div
            className="item-select-content glass"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {!quickPinSelectedItem ? (
              <>
                <div className="item-select-header">
                  <h2 className="item-select-title">Quick Pin {activePinnedFolder === 'quests' ? 'Questline' : 'Item'}</h2>
                  <div className="item-select-search-wrapper">
                    <input
                      className="calc-input item-select-search"
                      placeholder={activePinnedFolder === 'quests' ? "Search questlines..." : "Search items..."}
                      value={quickPinFilter}
                      onChange={(e) => setQuickPinFilter(e.target.value)}
                      aria-label="Filter items"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="item-select-list">
                  {activePinnedFolder === 'quests' ? (
                    // Show questlines for Quests folder
                    (() => {
                      try {
                        const questlines = questsApiData?.data?.questlines || []
                        return questlines
                          .filter(chain => {
                            if (!quickPinFilter) return true
                            return String(chain.title).toLowerCase().includes(quickPinFilter.toLowerCase())
                          })
                          .map((chain) => (
                            <button
                              key={chain.id}
                              onClick={() => {
                                // Directly add questline without quantity selection
                                const totals = {
                                  requirements: { items: {}, silver: 0, levels: {} },
                                  rewards: { items: {}, silver: 0 }
                                }
                                
                                // Calculate totals
                                chain.steps?.forEach(step => {
                                  const quest = step.quest
                                  if (quest) {
                                    // Requirements
                                    quest.requiredItems?.forEach(req => {
                                      if (req.item?.name) {
                                        totals.requirements.items[req.item.name] = 
                                          (totals.requirements.items[req.item.name] || 0) + (req.quantity || 1)
                                      }
                                    })
                                    if (quest.requiredSilver) {
                                      totals.requirements.silver += quest.requiredSilver
                                    }
                                    quest.levels?.forEach(lvl => {
                                      if (lvl.skill && lvl.level) {
                                        totals.requirements.levels[lvl.skill] = Math.max(
                                          totals.requirements.levels[lvl.skill] || 0,
                                          lvl.level
                                        )
                                      }
                                    })
                                    
                                    // Rewards
                                    quest.rewardItems?.forEach(rew => {
                                      if (rew.item?.name) {
                                        totals.rewards.items[rew.item.name] = 
                                          (totals.rewards.items[rew.item.name] || 0) + (rew.quantity || 1)
                                      }
                                    })
                                    if (quest.rewardSilver) {
                                      totals.rewards.silver += quest.rewardSilver
                                    }
                                  }
                                })
                                
                                addQuestToPinned({
                                  type: 'questline',
                                  id: chain.id,
                                  name: chain.title,
                                  description: chain.description || '',
                                  requirements: totals.requirements,
                                  rewards: totals.rewards
                                })
                                hapticFeedback('success')
                                onClose()
                                setQuickPinFilter('')
                              }}
                              type="button"
                            >
                              <span>{chain.title}</span>
                            </button>
                          ))
                      } catch (e) {
                        return <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                          Failed to load questlines: {e.message}
                        </div>
                      }
                    })()
                  ) : (
                    // Show items for other folders
                    allItems.filter(itm => {
                      if (!quickPinFilter) return true
                      return String(itm).toLowerCase().includes(quickPinFilter.toLowerCase())
                    }).map((itm) => (
                      <button
                        key={itm}
                        onClick={() => handleQuickPin(itm)}
                        type="button"
                      >
                        <ItemDisplay itemName={itm} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div style={{ padding: '20px' }}>
                <h2 className="item-select-title" style={{ marginBottom: '16px' }}>
                  Pin {quickPinSelectedItem}
                </h2>
                <div className="folder-edit-input-wrapper" style={{ marginBottom: '16px' }}>
                  <input
                    type="number"
                    className="folder-name-input"
                    value={quickPinQuantity}
                    onChange={(e) => setQuickPinQuantity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        confirmQuickPin()
                      } else if (e.key === 'Escape') {
                        cancelQuickPin()
                      }
                    }}
                    placeholder="Quantity..."
                    autoFocus
                    min="1"
                  />
                  <button
                    className="folder-input-btn folder-input-confirm"
                    onClick={confirmQuickPin}
                    disabled={!quickPinQuantity || parseInt(quickPinQuantity) <= 0}
                    title="Pin item"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <button
                    className="folder-input-btn folder-input-cancel"
                    onClick={cancelQuickPin}
                    title="Cancel"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
