import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemDisplay from '../ItemDisplay'
import LocationImage from '../LocationImage'
import PinnedLocationSelect from '../PinnedLocationSelect'
import { computePinnedEstimate, getItemLocations } from '../../utils/exploringUtils.js'
import { formatNumberRounded } from '../../utils/formatters.js'

// Reusable component for quest item lists (requirements / rewards)
function QuestItemsList({ title, items, silver, itemsData, buddyFarmLinksEnabled, hasItemContent, onItemClick, setSidebarOpen }) {
  const itemsArray = Array.isArray(items) 
    ? items.map(item => [item.name, item.quantity])
    : Object.entries(items || {})

  if (itemsArray.length === 0 && !(silver > 0)) return null

  return (
    <div style={{ marginBottom: '8px' }}>
      {itemsArray.length > 0 && (
        <>
          <div style={{ 
            fontSize: '11px', 
            color: 'rgba(255,255,255,0.5)', 
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {itemsArray.map(([itemName, quantity]) => {
              const isClickable = hasItemContent(itemName)
              return (
                <div
                  key={itemName}
                  onClick={(e) => {
                    if (isClickable) {
                      e.stopPropagation()
                      onItemClick(itemName, quantity)
                      if (window.innerWidth <= 768) setSidebarOpen(false)
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
                    padding: '4px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)',
                    cursor: isClickable ? 'pointer' : 'default', transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { if (isClickable) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' }}
                >
                  <ItemDisplay itemName={itemName} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>×{formatNumberRounded(quantity)}</span>
                    {isClickable && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A9EFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      {silver > 0 && (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
          padding: '4px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', marginTop: '4px'
        }}>
          <ItemDisplay itemName="Silver" itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)' }}>
            ×{formatNumberRounded(silver)}
          </span>
        </div>
      )}
    </div>
  )
}

export default function PinnedTab({
  pinnedFolders,
  pinnedResources,
  setPinnedResources,
  pinnedQuests,
  setPinnedQuests,
  activePinnedFolder,
  setActivePinnedFolder,
  isCreatingFolderInTabs,
  setIsCreatingFolderInTabs,
  folderNameInput,
  setFolderNameInput,
  createFolder,
  hapticFeedback,
  setIsQuickPinModalOpen,
  removeFromPinned,
  removeQuestFromPinned,
  expandedPinnedQuests,
  setExpandedPinnedQuests,
  questsMode,
  setQuestsMode,
  locationsMode,
  setLocationsMode,
  setSidebarOpen,
  hasItemContent,
  handleQuestItemClick,
  navigateToItem,
  itemsData,
  buddyFarmLinksEnabled,
  activePerks,
  exploringMode,
  setLastPinnedLocation,
  onRestoreEconomySnapshot
}) {
  return (
    <div className="pinned-section">
      {/* Folder tabs */}
      <div className="folder-tabs-container">
        <div className="folder-tabs">
          {pinnedFolders.map(folder => {
            const folderItems = pinnedResources.filter(item => (item.folderId || 'default') === folder.id)
            const folderQuests = folder.id === 'quests' ? pinnedQuests.filter(q => (q.folderId || 'quests') === 'quests') : []
            const totalCount = folderItems.length + folderQuests.length
            return (
              <button
                key={folder.id}
                className={`folder-tab ${activePinnedFolder === folder.id ? 'active' : ''}`}
                onClick={() => setActivePinnedFolder(folder.id)}
                type="button"
              >
                {folder.name}
                <span className="folder-count">({totalCount})</span>
              </button>
            )
          })}
          {!isCreatingFolderInTabs ? (
            <button
              className="folder-tab new-folder"
              onClick={() => {
                setIsCreatingFolderInTabs(true)
                setFolderNameInput('')
              }}
              type="button"
              title="Create new folder"
            >
              + New Folder
            </button>
          ) : (
            <div className="folder-tab-input-wrapper">
              <input
                type="text"
                className="folder-name-input folder-tab-input"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && folderNameInput.trim()) {
                    const newId = createFolder(folderNameInput.trim())
                    setActivePinnedFolder(newId)
                    setIsCreatingFolderInTabs(false)
                    setFolderNameInput('')
                  } else if (e.key === 'Escape') {
                    setIsCreatingFolderInTabs(false)
                    setFolderNameInput('')
                  }
                }}
                placeholder="Folder name..."
                autoFocus
              />
              <button
                className="folder-input-btn folder-input-confirm"
                onClick={() => {
                  if (folderNameInput.trim()) {
                    const newId = createFolder(folderNameInput.trim())
                    setActivePinnedFolder(newId)
                    setIsCreatingFolderInTabs(false)
                    setFolderNameInput('')
                  }
                }}
                disabled={!folderNameInput.trim()}
                title="Create folder"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <button
                className="folder-input-btn folder-input-cancel"
                onClick={() => {
                  setIsCreatingFolderInTabs(false)
                  setFolderNameInput('')
                }}
                title="Cancel"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="section-header">
        <h3>Pinned Resources</h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            className="chip"
            onClick={() => {
              hapticFeedback('light')
              setIsQuickPinModalOpen(true)
            }}
            type="button"
            title="Pin any item"
          >
            + Pin
          </button>
          {(pinnedResources.filter(item => (item.folderId || 'default') === activePinnedFolder).length > 0 ||
            (activePinnedFolder === 'quests' && pinnedQuests.filter(q => (q.folderId || 'quests') === 'quests').length > 0)) && (
            <button 
              className="chip danger"
              onClick={() => {
                hapticFeedback('medium')
                setPinnedResources(prev => prev.filter(item => (item.folderId || 'default') !== activePinnedFolder))
                if (activePinnedFolder === 'quests') {
                  setPinnedQuests([])
                }
              }}
              type="button"
              title="Clear this folder"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      {(pinnedResources.filter(item => (item.folderId || 'default') === activePinnedFolder).length === 0 &&
        (activePinnedFolder !== 'quests' || pinnedQuests.filter(q => (q.folderId || 'quests') === 'quests').length === 0)) ? (
        <div className="empty-state">
          <p>No pinned {activePinnedFolder === 'quests' ? 'quests' : 'resources'} in this folder.</p>
          <p>{activePinnedFolder === 'quests' 
            ? 'Pin quests or questlines from the Quests mode.' 
            : 'Pin resources from any recipe by clicking the "+" button next to them.'}</p>
        </div>
      ) : (
        <div className="pinned-items">
          {/* Show pinned quests if in Quests folder */}
          {activePinnedFolder === 'quests' && pinnedQuests.map((quest, index) => (
            <div key={`quest-${index}`} className="pinned-card">
              <button
                className="pinned-close-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  removeQuestFromPinned(index)
                }}
                type="button"
                title="Remove from pinned"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className="pinned-card-content">
                <div 
                  onClick={() => {
                    if (quest.type === 'questline') {
                      localStorage.setItem('selectedQuestlineId', quest.id)
                      localStorage.setItem('selectedQuestId', '')
                    } else if (quest.type === 'quest') {
                      localStorage.setItem('selectedQuestlineId', quest.questlineId || '')
                      localStorage.setItem('selectedQuestId', quest.id)
                    }
                    
                    const wasInQuestsMode = questsMode
                    if (wasInQuestsMode) {
                      setQuestsMode(false)
                      setTimeout(() => { setQuestsMode(true) }, 0)
                    } else {
                      setQuestsMode(true)
                      setLocationsMode(false)
                    }
                    
                    if (window.innerWidth <= 768) setSidebarOpen(false)
                    hapticFeedback('light')
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="pinned-item-name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{quest.name.replace(/<br\s*\/?>/gi, ' ')}</span>
                    </div>
                  </div>
                  <div className="pinned-item-details">
                    {quest.type === 'quest' && quest.questlineName && (
                      <div style={{
                        fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px',
                        padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px',
                        borderLeft: '2px solid rgba(255,255,255,0.1)', fontStyle: 'italic', letterSpacing: '0.3px'
                      }}>
                        {quest.questlineName.replace(/<br\s*\/?>/gi, ' ')}
                      </div>
                    )}
                    {quest.description && (
                      <div style={{
                        fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                      }}>
                        {quest.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Toggle button for requirements/rewards */}
                {((quest.requirements?.items && (Array.isArray(quest.requirements.items) ? quest.requirements.items.length > 0 : Object.keys(quest.requirements.items).length > 0)) ||
                  (quest.rewards?.items && (Array.isArray(quest.rewards.items) ? quest.rewards.items.length > 0 : Object.keys(quest.rewards.items).length > 0)) ||
                  quest.requirements?.silver > 0 ||
                  quest.rewards?.silver > 0) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const questKey = `${quest.type}_${quest.id}`
                      setExpandedPinnedQuests(prev => {
                        const next = new Set(prev)
                        if (next.has(questKey)) next.delete(questKey)
                        else next.add(questKey)
                        return next
                      })
                      hapticFeedback('light')
                    }}
                    style={{
                      marginTop: '8px', padding: '4px 8px', fontSize: '11px',
                      color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                    type="button"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: expandedPinnedQuests.has(`${quest.type}_${quest.id}`) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    {expandedPinnedQuests.has(`${quest.type}_${quest.id}`) ? 'Hide items' : 'Show items'}
                  </button>
                )}

                {/* Requirements */}
                <AnimatePresence>
                  {expandedPinnedQuests.has(`${quest.type}_${quest.id}`) && quest.requirements && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden', marginTop: '12px' }}
                    >
                      <QuestItemsList
                        title="Requirements"
                        items={quest.requirements.items}
                        silver={quest.requirements.silver}
                        itemsData={itemsData}
                        buddyFarmLinksEnabled={buddyFarmLinksEnabled}
                        hasItemContent={hasItemContent}
                        onItemClick={(itemName, quantity) => handleQuestItemClick(itemName, quantity, quest.name)}
                        setSidebarOpen={setSidebarOpen}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Rewards */}
                <AnimatePresence>
                  {expandedPinnedQuests.has(`${quest.type}_${quest.id}`) && quest.rewards && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden', marginTop: '12px' }}
                    >
                      <QuestItemsList
                        title="Rewards"
                        items={quest.rewards.items}
                        silver={quest.rewards.silver}
                        itemsData={itemsData}
                        buddyFarmLinksEnabled={buddyFarmLinksEnabled}
                        hasItemContent={hasItemContent}
                        onItemClick={(itemName, quantity) => handleQuestItemClick(itemName, quantity, quest.name)}
                        setSidebarOpen={setSidebarOpen}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
          
          {/* Show economy snapshots */}
          {pinnedResources.map((pinnedItem, index) => {
            if ((pinnedItem.folderId || 'default') !== activePinnedFolder) return null

            // Economy snapshot
            if (pinnedItem.type === 'economy-snapshot') {
              const ts = pinnedItem.timestamp
              const dateStr = ts ? new Date(ts).toLocaleString() : ''
              return (
                <div key={index} className="pinned-card">
                  <button
                    className="pinned-close-btn"
                    onClick={() => removeFromPinned(index)}
                    type="button"
                    title="Remove from pinned"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                  <div
                    className="pinned-card-content"
                    onClick={() => {
                      if (onRestoreEconomySnapshot) {
                        onRestoreEconomySnapshot(pinnedItem.snapshotId)
                      }
                      if (window.innerWidth <= 768) setSidebarOpen(false)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="pinned-item-name">
                      <span style={{ fontWeight: 600 }}>Eco Snapshot</span>
                    </div>
                    <div className="pinned-item-details">
                      {dateStr && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{dateStr}</span>
                      )}
                      {pinnedItem.itemCount != null && (
                        <span style={{ fontSize: 12, color: '#99a', marginTop: 4 }}>
                          {pinnedItem.itemCount} items
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            }
            
            let est = null
            try {
              est = computePinnedEstimate(pinnedItem, pinnedItem.quantity, activePerks, exploringMode)
            } catch (e) { est = null }

            const locs = getItemLocations(pinnedItem.name) || []
            const selectorValue = pinnedItem.location || (est && est.location) || pinnedItem.selectedLocation || (locs[0] && locs[0].name) || ''

            return (
              <div key={index} className="pinned-card">
                <button
                  className="pinned-close-btn"
                  onClick={() => removeFromPinned(index)}
                  type="button"
                  title="Remove from pinned"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                {(() => {
                  const isClickable = hasItemContent(pinnedItem.name)
                  return (
                    <>
                      <div 
                        className="pinned-card-content"
                        onClick={() => {
                          if (!isClickable) return
                          navigateToItem(pinnedItem.name, pinnedItem.quantity, pinnedItem.parentRecipe || null)
                          if (window.innerWidth <= 768) setSidebarOpen(false)
                        }}
                        style={{ cursor: isClickable ? 'pointer' : 'default', opacity: isClickable ? 1 : 0.6 }}
                      >
                        <div className="pinned-item-name">
                          {itemsData && itemsData[pinnedItem.name] ? (
                            <ItemDisplay itemName={pinnedItem.name} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <LocationImage name={pinnedItem.name} size={24} />
                              <span style={{ fontWeight: 600 }}>{pinnedItem.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="pinned-item-details">
                          <span className="pinned-item-quantity">×{formatNumberRounded(pinnedItem.quantity)}</span>
                          {pinnedItem.parentRecipe && <span className="parent-recipe">from {pinnedItem.parentRecipe}</span>}

                          {est && (() => {
                            if (typeof est.apNeeded !== 'undefined' && est.apNeeded !== null) {
                              return (<div className="pinned-ap-line">{`${formatNumberRounded(est.apNeeded)} AP`}</div>)
                            }
                            if (est.mode === 'EXP') return (<div style={{ fontSize: 12, color: '#99a', marginTop: 6 }}>{formatNumberRounded(est.explores)} EXP • {formatNumberRounded(est.stamina)} STA</div>)
                            if (est.mode === 'AC') return (<div style={{ fontSize: 12, color: '#99a', marginTop: 6 }}>{formatNumberRounded(est.cidersNeeded)} AC • {formatNumberRounded(est.totalStamina)} STA</div>)
                            return null
                          })()}
                        </div>
                      </div>

                      <div className="pinned-loc-select">
                        {locs.length === 0 ? null : (
                          <PinnedLocationSelect
                            options={locs.map(l => l.name)}
                            value={selectorValue}
                            onChange={(newLoc) => {
                              setPinnedResources(prev => prev.map((p, i) => i === index ? { ...p, location: newLoc } : p))
                              setLastPinnedLocation(newLoc)
                            }}
                          />
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
