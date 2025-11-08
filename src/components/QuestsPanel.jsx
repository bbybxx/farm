import React, { useState, useMemo, useEffect, useRef } from 'react'
import ItemDisplay from './ItemDisplay'
import '../app/app.css'
import questsApiData from '../data/quests-api.json'

export default function QuestsPanel({ 
  itemsData, 
  savedQuestlineId, 
  savedQuestId, 
  onQuestlineChange, 
  onQuestChange,
  pinnedEnabled,
  addToPinned,
  addQuestToPinned,
  recentlyAddedItems,
  onItemClick,
  combinedRecipes,
  getItemLocations,
  enableBuddyFarmLinks
}) {
  const [selectedQuestline, setSelectedQuestline] = useState(null)
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [expandedDescriptions, setExpandedDescriptions] = useState({})
  const [searchFilter, setSearchFilter] = useState('')
  const [questChains, setQuestChains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isQuestSelectOpen, setIsQuestSelectOpen] = useState(false)
  const [viewMode, setViewMode] = useState('quest') // 'questline' or 'quest'
  const questSelectListRef = useRef(null)

  // Load and transform quests data
  useEffect(() => {
    try {
      setLoading(true)
      setError(null)

      const data = questsApiData

      // Transform API data to our format
      const chains = (data.data?.questlines || []).map(questline => {
        const steps = questline.steps || []
        return {
          id: String(questline.id),
          name: questline.title,
          image: questline.image,
          automatic: questline.automatic,
          quests: steps
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((step, index) => {
              const quest = step.quest
              const requirements = {
                levels: [],
                items: [],
                silver: 0
              }

              // Parse level requirements
              const levelMap = {
                requiredFarmingLevel: 'Farming',
                requiredFishingLevel: 'Fishing',
                requiredCraftingLevel: 'Crafting',
                requiredExploringLevel: 'Exploring',
                requiredCookingLevel: 'Cooking',
                requiredTowerLevel: 'Tower'
              }

              Object.entries(levelMap).forEach(([key, skill]) => {
                if (quest[key] && quest[key] > 0) {
                  requirements.levels.push({ skill, level: quest[key] })
                }
              })

              // Parse item requirements
              if (quest.requiredItems && Array.isArray(quest.requiredItems)) {
                quest.requiredItems.forEach(req => {
                  if (req.item && req.quantity > 0) {
                    requirements.items.push({
                      name: req.item.name,
                      quantity: req.quantity,
                      image: req.item.image
                    })
                  }
                })
              }

              if (quest.requiredSilver && quest.requiredSilver > 0) {
                requirements.silver = quest.requiredSilver
              }

              // Parse rewards
              const rewards = {
                items: [],
                silver: quest.rewardSilver || 0,
                xp: 0,
                gold: quest.rewardGold || 0
              }

              if (quest.rewardItems && Array.isArray(quest.rewardItems)) {
                quest.rewardItems.forEach(rew => {
                  if (rew.item && rew.quantity > 0) {
                    rewards.items.push({
                      name: rew.item.name,
                      quantity: rew.quantity,
                      image: rew.item.image
                    })
                  }
                })
              }

              return {
                id: String(quest.id),
                name: quest.title,
                description: quest.cleanDescription || quest.description || '',
                npc: quest.npc,
                image: quest.image,
                requirements,
                rewards,
                order: step.order || index,
                prevQuestId: index > 0 ? String(steps[index - 1].quest.id) : null,
                nextQuestId: index < steps.length - 1 ? String(steps[index + 1].quest.id) : null
              }
            })
        }
      })

      setQuestChains(chains)

      // Restore saved questline and quest, or auto-open "Feathers"
      let restoredQuestline = null
      let restoredQuest = null

      if (savedQuestlineId) {
        restoredQuestline = chains.find(c => c.id === savedQuestlineId)
        if (restoredQuestline && savedQuestId) {
          restoredQuest = restoredQuestline.quests.find(q => q.id === savedQuestId)
        }
      }

      // Fallback to "Feathers" questline if nothing saved
      if (!restoredQuestline) {
        restoredQuestline = chains.find(c => c.name === 'Feathers')
        if (restoredQuestline && restoredQuestline.quests.length > 0) {
          restoredQuest = restoredQuestline.quests[0]
        }
      }

      if (restoredQuestline) {
        setSelectedQuestline(restoredQuestline)
        if (restoredQuest) {
          setSelectedQuest(restoredQuest)
          setViewMode('quest')
        } else {
          setViewMode('questline')
        }
      }

      setLoading(false)
    } catch (err) {
      console.error('Failed to load quests:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [savedQuestlineId, savedQuestId])

  // Scroll to selected questline when modal opens
  useEffect(() => {
    if (isQuestSelectOpen && questSelectListRef.current && selectedQuestline) {
      setTimeout(() => {
        const activeButton = questSelectListRef.current?.querySelector('button[data-selected="true"]')
        if (activeButton) {
          activeButton.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
      }, 100)
    }
  }, [isQuestSelectOpen, selectedQuestline])

  const getItemImage = (itemName) => {
    const cleaned = itemName.toLowerCase().replace(/[^a-z0-9]/g, '')
    return `${cleaned}.png`
  }



  // Calculate total requirements and rewards
  const getQuestlineTotals = (questline) => {
    const totals = {
      requirements: { items: {}, silver: 0, levels: {} },
      rewards: { items: {}, silver: 0, xp: 0 }
    }

    questline.quests.forEach(quest => {
      quest.requirements.items.forEach(item => {
        totals.requirements.items[item.name] = 
          (totals.requirements.items[item.name] || 0) + item.quantity
      })
      totals.requirements.silver += quest.requirements.silver

      quest.requirements.levels.forEach(lvl => {
        if (!totals.requirements.levels[lvl.skill] || 
            totals.requirements.levels[lvl.skill] < lvl.level) {
          totals.requirements.levels[lvl.skill] = lvl.level
        }
      })

      quest.rewards.items.forEach(item => {
        totals.rewards.items[item.name] = 
          (totals.rewards.items[item.name] || 0) + item.quantity
      })
      totals.rewards.silver += quest.rewards.silver
      totals.rewards.xp += quest.rewards.xp
    })

    return totals
  }



  const navigateToQuest = (questId) => {
    if (!questId || !selectedQuestline) return
    const quest = selectedQuestline.quests.find(q => q.id === questId)
    if (quest) {
      setSelectedQuest(quest)
      if (onQuestChange) onQuestChange(quest.id)
    }
  }

  // Filter questlines by search (only questlines, not individual quests)
  const filteredQuestlines = useMemo(() => {
    if (!searchFilter.trim()) return questChains
    const query = searchFilter.toLowerCase()
    return questChains.filter(chain => 
      chain.name.toLowerCase().includes(query)
    )
  }, [questChains, searchFilter])

  const handleQuestSelect = (quest) => {
    // Find and open the questline
    const questline = questChains.find(c => c.id === quest.questlineId)
    if (questline) {
      setSelectedQuestline(questline)
      setSelectedQuest(quest)
      setViewMode('quest')
      setIsQuestSelectOpen(false)
      if (onQuestlineChange) onQuestlineChange(questline.id)
      if (onQuestChange) onQuestChange(quest.id)
    }
  }

  const handleQuestlineClick = () => {
    setViewMode('questline')
    setSelectedQuest(null)
    if (onQuestChange) onQuestChange(null)
  }

  const handleQuestClickFromList = (quest) => {
    setSelectedQuest(quest)
    setViewMode('quest')
    if (onQuestChange) onQuestChange(quest.id)
  }

  // Early return for loading state
  if (loading) {
    return (
      <section className="glass" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
          Loading quest data...
        </div>
      </section>
    )
  }

  // Early return for error state
  if (error) {
    return (
      <section className="glass" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '14px', color: 'rgba(255,100,100,0.8)' }}>
          Failed to load quests: {error}
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Quest selector control */}
      <section className="glass controls">
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span className="label">Questline</span>
          <button 
            className="input" 
            onClick={() => setIsQuestSelectOpen(true)} 
            type="button"
            style={{ textAlign: 'left' }}
          >
            {selectedQuestline ? (
              <span>{selectedQuestline.name.replace(/<br\s*\/?>/gi, ' ')}</span>
            ) : (
              <span style={{ opacity: 0.5 }}>Select a questline...</span>
            )}
          </button>
        </label>
      </section>

      {/* Main content - Questline page or Quest page */}
      {!selectedQuestline ? (
        <section className="glass" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
            Select a quest or questline to view details
          </div>
        </section>
      ) : viewMode === 'questline' ? (
        /* QUESTLINE PAGE */
        (() => {
          const totals = getQuestlineTotals(selectedQuestline)
          const questlinePinKey = `quest_questline_${selectedQuestline.id}`
          return (
            <section className="glass card" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
              {/* Questline Name with Pin Button */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '24px',
                gap: '12px',
                maxWidth: '100%'
              }}>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '24px',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                  flex: '1 1 0',
                  minWidth: 0,
                  maxWidth: '100%'
                }}>
                  {selectedQuestline.name.replace(/<br\s*\/?>/gi, ' ')}
                </h2>
                {pinnedEnabled && addQuestToPinned && (
                  <button
                    className={`pin-btn ${recentlyAddedItems?.has(questlinePinKey) ? 'success' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      addQuestToPinned({
                        type: 'questline',
                        id: selectedQuestline.id,
                        name: selectedQuestline.name,
                        description: selectedQuestline.description,
                        requirements: totals.requirements,
                        rewards: totals.rewards
                      }, e)
                    }}
                    type="button"
                    title={`Pin questline: ${selectedQuestline.name}`}
                  >
                    <div className="pin-icon">
                      <div className={`pin-line pin-line-horizontal ${recentlyAddedItems?.has(questlinePinKey) ? 'checked' : ''}`}></div>
                      <div className={`pin-line pin-line-vertical ${recentlyAddedItems?.has(questlinePinKey) ? 'checked' : ''}`}></div>
                    </div>
                  </button>
                )}
              </div>

              {/* Total Requirements */}
              {(Object.keys(totals.requirements.items).length > 0 || 
                totals.requirements.silver > 0 ||
                Object.keys(totals.requirements.levels).length > 0) && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ 
                    fontSize: '16px', 
                    marginTop: 0, 
                    marginBottom: '16px', 
                    color: 'rgba(255,255,255,0.9)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 700
                  }}>
                    Total Requirements
                  </h3>
                  
                  {Object.keys(totals.requirements.levels).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                      {Object.entries(totals.requirements.levels).map(([skill, level]) => (
                        <span 
                          key={skill}
                          style={{
                            padding: '8px 14px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#93c5fd'
                          }}
                        >
                          {skill} Lv.{level}
                        </span>
                      ))}
                    </div>
                  )}

                  {Object.keys(totals.requirements.items).length > 0 && (
                    <ul className="list" style={{ marginBottom: '16px' }}>
                      {Object.entries(totals.requirements.items).map(([name, quantity]) => {
                        const pinKey = `${name}_${quantity}_${selectedQuestline.name} (Total)`
                        const canCraft = combinedRecipes && combinedRecipes[name]
                        const canFind = getItemLocations && getItemLocations(name)?.length > 0
                        const isClickable = onItemClick && (canCraft || canFind)
                        
                        return (
                          <li key={name} style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 0'
                          }}>
                            <div 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px',
                                cursor: isClickable ? 'pointer' : 'default',
                                flex: 1
                              }}
                              onClick={() => {
                                if (isClickable) {
                                  onItemClick(name, quantity, selectedQuestline.name)
                                }
                              }}
                            >
                              <ItemDisplay
                                itemName={name}
                                itemsData={itemsData}
                                size="medium"
                                enableBuddyFarmLinks={enableBuddyFarmLinks}
                              >
                                {isClickable && (
                                  <span className="craft-indicator">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                      <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </span>
                                )}
                              </ItemDisplay>
                            </div>
                            <span style={{ 
                              fontSize: '16px', 
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.9)',
                              marginRight: pinnedEnabled && addToPinned ? '8px' : '0'
                            }}>
                              × {quantity.toLocaleString()}
                            </span>
                            {pinnedEnabled && addToPinned && (
                              <button
                                className={`pin-btn ${recentlyAddedItems?.has(pinKey) ? 'success' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToPinned(name, quantity, `${selectedQuestline.name} (Total)`, e)
                                }}
                                type="button"
                                title={`Pin ${name} from ${selectedQuestline.name}`}
                              >
                                <div className="pin-icon">
                                  <div className={`pin-line pin-line-horizontal ${recentlyAddedItems?.has(pinKey) ? 'checked' : ''}`}></div>
                                  <div className={`pin-line pin-line-vertical ${recentlyAddedItems?.has(pinKey) ? 'checked' : ''}`}></div>
                                </div>
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {totals.requirements.silver > 0 && (
                    <li style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      padding: '10px 0'
                    }}>
                      <ItemDisplay
                        itemName="Silver"
                        itemsData={itemsData}
                        size="medium"
                        enableBuddyFarmLinks={enableBuddyFarmLinks}
                      />
                      <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.9)'
                      }}>
                        × {totals.requirements.silver.toLocaleString()}
                      </span>
                    </li>
                  )}
                </div>
              )}

              {/* Total Rewards */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  marginTop: 0, 
                  marginBottom: '16px', 
                  color: 'rgba(255,255,255,0.9)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 700
                }}>
                  Total Rewards
                </h3>
                
                {Object.keys(totals.rewards.items).length > 0 && (
                  <ul className="list" style={{ marginBottom: '16px' }}>
                    {Object.entries(totals.rewards.items).map(([name, quantity]) => (
                      <li key={name} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        padding: '10px 0'
                      }}>
                        <ItemDisplay
                          itemName={name}
                          itemsData={itemsData}
                          size="medium"
                          enableBuddyFarmLinks={enableBuddyFarmLinks}
                        />
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.9)'
                        }}>
                          × {quantity.toLocaleString()}
                        </span>
                      </li>
                    ))}
                    {totals.rewards.silver > 0 && (
                      <li style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        padding: '10px 0'
                      }}>
                        <ItemDisplay
                          itemName="Silver"
                          itemsData={itemsData}
                          size="medium"
                          enableBuddyFarmLinks={enableBuddyFarmLinks}
                        />
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.9)'
                        }}>
                          × {totals.rewards.silver.toLocaleString()}
                        </span>
                      </li>
                    )}
                  </ul>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {totals.rewards.xp > 0 && (
                    <span style={{
                      padding: '8px 14px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#c4b5fd'
                    }}>
                      {totals.rewards.xp.toLocaleString()} XP
                    </span>
                  )}
                </div>
              </div>

              {/* List of Quests */}
              <div>
                <h3 style={{ 
                  fontSize: '16px', 
                  marginTop: 0, 
                  marginBottom: '16px', 
                  color: 'rgba(255,255,255,0.9)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 700
                }}>
                  Quests ({selectedQuestline.quests.length})
                </h3>
                
                <ul className="list">
                  {selectedQuestline.quests.map((quest, index) => (
                    <li 
                      key={quest.id}
                      onClick={() => handleQuestClickFromList(quest)}
                      style={{
                        cursor: 'pointer',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <span style={{ 
                        fontSize: '13px', 
                        fontWeight: 700, 
                        color: 'rgba(255,255,255,0.4)', 
                        minWidth: '30px' 
                      }}>
                        {index + 1}.
                      </span>
                      <span style={{ flex: 1, fontSize: '15px', fontWeight: 500, minWidth: 0, wordBreak: 'break-word' }}>
                        {quest.name.replace(/<br\s*\/?>/gi, ' ')}
                      </span>
                      {quest.npc && (
                        <span style={{ 
                          fontSize: '13px', 
                          color: 'rgba(255,255,255,0.5)',
                          flexShrink: 0,
                          marginLeft: '8px',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {quest.npc}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )
        })()
      ) : selectedQuest ? (
        /* QUEST PAGE */
        <section className="glass card" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          {/* Quest Name with Pin Button */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '8px',
            gap: '12px',
            maxWidth: '100%'
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '24px',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              hyphens: 'auto',
              flex: '1 1 0',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              {selectedQuest.name.replace(/<br\s*\/?>/gi, ' ')}
            </h2>
            {pinnedEnabled && addQuestToPinned && (() => {
              const questPinKey = `quest_quest_${selectedQuest.id}`
              return (
                <button
                  className={`pin-btn ${recentlyAddedItems?.has(questPinKey) ? 'success' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    addQuestToPinned({
                      type: 'quest',
                      id: selectedQuest.id,
                      questlineId: selectedQuestline?.id,
                      questlineName: selectedQuestline?.name,
                      name: selectedQuest.name,
                      description: selectedQuest.description,
                      npc: selectedQuest.npc,
                      requirements: selectedQuest.requirements,
                      rewards: selectedQuest.rewards
                    }, e)
                  }}
                  type="button"
                  title={`Pin quest: ${selectedQuest.name}`}
                >
                  <div className="pin-icon">
                    <div className={`pin-line pin-line-horizontal ${recentlyAddedItems?.has(questPinKey) ? 'checked' : ''}`}></div>
                    <div className={`pin-line pin-line-vertical ${recentlyAddedItems?.has(questPinKey) ? 'checked' : ''}`}></div>
                  </div>
                </button>
              )
            })()}
          </div>

          {/* Questline link */}
          {selectedQuestline && (
            <div style={{ 
              marginBottom: '16px',
              padding: '8px 12px',
              background: 'rgba(139, 92, 246, 0.04)',
              borderRadius: '6px',
              borderLeft: '2px solid rgba(139, 92, 246, 0.3)',
              display: 'inline-block'
            }}>
              <span style={{ 
                fontSize: '11px', 
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                fontWeight: 600
              }}>
                Questline
              </span>
              <button
                onClick={handleQuestlineClick}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '13px', 
                  color: 'rgba(139, 92, 246, 0.85)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  marginLeft: '8px',
                  fontStyle: 'italic',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(139, 92, 246, 1)'
                  e.currentTarget.style.textDecoration = 'underline'
                  e.currentTarget.style.textDecorationStyle = 'dotted'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(139, 92, 246, 0.85)'
                  e.currentTarget.style.textDecoration = 'none'
                }}
              >
                {selectedQuestline.name.replace(/<br\s*\/?>/gi, ' ')}
              </button>
              {selectedQuest.npc && (
                <>
                  <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.3)' }}>•</span>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                    NPC: {selectedQuest.npc}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Description */}
          {selectedQuest.description && (
            <div style={{ 
              marginBottom: '24px', 
              padding: '16px', 
              background: 'rgba(255,255,255,0.03)',
              borderLeft: '3px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              fontSize: '15px',
              lineHeight: '1.6',
              color: 'rgba(255,255,255,0.85)',
              position: 'relative'
            }}>
              <div style={{
                maxHeight: expandedDescriptions[selectedQuest.id] ? '1000px' : '4.8em',
                overflow: 'hidden',
                position: 'relative',
                paddingBottom: expandedDescriptions[selectedQuest.id] ? '0' : '8px',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {selectedQuest.description}
                {!expandedDescriptions[selectedQuest.id] && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '1.6em',
                    background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.03))',
                    pointerEvents: 'none',
                    transition: 'opacity 0.3s ease'
                  }} />
                )}
              </div>
              {selectedQuest.description.length > 150 && (
                <button
                  onClick={() => setExpandedDescriptions(prev => ({
                    ...prev,
                    [selectedQuest.id]: !prev[selectedQuest.id]
                  }))}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12))',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '6px',
                    color: 'rgba(147, 197, 253, 1)',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))'
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.4)'
                    e.target.style.transform = 'translateY(-1px)'
                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12))'
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.25)'
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.1)'
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'translateY(0) scale(0.98)'
                  }}
                  onMouseUp={(e) => {
                    e.target.style.transform = 'translateY(-1px) scale(1)'
                  }}
                >
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: expandedDescriptions[selectedQuest.id] ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  {expandedDescriptions[selectedQuest.id] ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Requirements Section */}
          {(selectedQuest.requirements.items.length > 0 ||
            selectedQuest.requirements.silver > 0 ||
            selectedQuest.requirements.levels.length > 0) && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                marginTop: 0, 
                marginBottom: '16px', 
                color: 'rgba(255,255,255,0.9)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 700
              }}>
                Requirements
              </h3>
              
              {selectedQuest.requirements.levels.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {selectedQuest.requirements.levels.map(lvl => (
                    <span 
                      key={lvl.skill}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#93c5fd'
                      }}
                    >
                      {lvl.skill} Lv.{lvl.level}
                    </span>
                  ))}
                </div>
              )}

              <ul className="list">
                {selectedQuest.requirements.items.map(item => {
                  const pinKey = `${item.name}_${item.quantity}_${selectedQuestline.name} (Quest)`
                  const canCraft = combinedRecipes && combinedRecipes[item.name]
                  const canFind = getItemLocations && getItemLocations(item.name)?.length > 0
                  const isClickable = onItemClick && (canCraft || canFind)
                  
                  return (
                    <li key={item.name} style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0'
                    }}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          cursor: isClickable ? 'pointer' : 'default',
                          flex: 1
                        }}
                        onClick={() => {
                          if (isClickable) {
                            onItemClick(item.name, item.quantity, selectedQuest.name)
                          }
                        }}
                      >
                        <ItemDisplay
                          itemName={item.name}
                          itemsData={itemsData}
                          size="medium"
                          enableBuddyFarmLinks={enableBuddyFarmLinks}
                        >
                          {isClickable && (
                            <span className="craft-indicator">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          )}
                        </ItemDisplay>
                      </div>
                      <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.9)',
                        marginRight: pinnedEnabled && addToPinned ? '8px' : '0'
                      }}>
                        × {item.quantity.toLocaleString()}
                      </span>
                      {pinnedEnabled && addToPinned && (
                        <button
                          className={`pin-btn ${recentlyAddedItems?.has(pinKey) ? 'success' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            addToPinned(item.name, item.quantity, `${selectedQuestline.name} (Quest)`, e)
                          }}
                          type="button"
                          title={`Pin ${item.name} from ${selectedQuestline.name}`}
                        >
                          <div className="pin-icon">
                            <div className={`pin-line pin-line-horizontal ${recentlyAddedItems?.has(pinKey) ? 'checked' : ''}`}></div>
                            <div className={`pin-line pin-line-vertical ${recentlyAddedItems?.has(pinKey) ? 'checked' : ''}`}></div>
                          </div>
                        </button>
                      )}
                    </li>
                  )
                })}
                {selectedQuest.requirements.silver > 0 && (
                  <li style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '10px 0'
                  }}>
                    <ItemDisplay
                      itemName="Silver"
                      itemsData={itemsData}
                      size="medium"
                      enableBuddyFarmLinks={enableBuddyFarmLinks}
                    />
                    <span style={{ 
                      fontSize: '16px', 
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.9)'
                    }}>
                      × {selectedQuest.requirements.silver.toLocaleString()}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Rewards Section */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              marginTop: 0, 
              marginBottom: '16px', 
              color: 'rgba(255,255,255,0.9)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 700
            }}>
              Rewards
            </h3>
            
            <ul className="list" style={{ marginBottom: '16px' }}>
              {selectedQuest.rewards.items.map(item => (
                <li key={item.name} style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 0'
                }}>
                  <ItemDisplay
                    itemName={item.name}
                    itemsData={itemsData}
                    size="medium"
                    enableBuddyFarmLinks={enableBuddyFarmLinks}
                  />
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    × {item.quantity.toLocaleString()}
                  </span>
                </li>
              ))}
              {selectedQuest.rewards.silver > 0 && (
                <li style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '10px 0'
                }}>
                  <ItemDisplay
                    itemName="Silver"
                    itemsData={itemsData}
                    size="medium"
                    enableBuddyFarmLinks={enableBuddyFarmLinks}
                  />
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    × {selectedQuest.rewards.silver.toLocaleString()}
                  </span>
                </li>
              )}
            </ul>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {selectedQuest.rewards.xp > 0 && (
                <span style={{
                  padding: '8px 14px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#c4b5fd'
                }}>
                  {selectedQuest.rewards.xp.toLocaleString()} XP
                </span>
              )}
              {selectedQuest.rewards.gold > 0 && (
                <span style={{
                  padding: '8px 14px',
                  background: 'rgba(234, 179, 8, 0.2)',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fcd34d'
                }}>
                  🪙 {selectedQuest.rewards.gold.toLocaleString()} Gold
                </span>
              )}
            </div>
          </div>

          {/* Navigation buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <button
              disabled={!selectedQuest.prevQuestId}
              onClick={() => navigateToQuest(selectedQuest.prevQuestId)}
              style={{
                flex: 1,
                padding: '14px 20px',
                background: selectedQuest.prevQuestId ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: selectedQuest.prevQuestId ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: selectedQuest.prevQuestId ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedQuest.prevQuestId) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedQuest.prevQuestId) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              ← Previous Quest
            </button>
            <button
              disabled={!selectedQuest.nextQuestId}
              onClick={() => navigateToQuest(selectedQuest.nextQuestId)}
              style={{
                flex: 1,
                padding: '14px 20px',
                background: selectedQuest.nextQuestId ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: selectedQuest.nextQuestId ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: selectedQuest.nextQuestId ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedQuest.nextQuestId) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedQuest.nextQuestId) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              Next Quest →
            </button>
          </div>
        </section>
      ) : (
        /* NO QUEST SELECTED */
        <section className="glass" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
            Select a quest to view details
          </div>
        </section>
      )}

      {/* Quest Select Modal */}
      {isQuestSelectOpen && (
        <div 
          className="modal-wrapper"
          onClick={() => setIsQuestSelectOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 1000,
            paddingTop: '40px'
          }}
        >
          <div 
            className="glass item-select-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '600px',
              maxHeight: 'calc(100vh - 80px)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="item-select-header">
              <h2 className="item-select-title">Select Questline</h2>
              <div className="item-select-search-wrapper">
                <input
                  type="text"
                  className="calc-input item-select-search"
                  placeholder="Search questlines..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div ref={questSelectListRef} className="item-select-list">
              {filteredQuestlines.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '14px'
                }}>
                  No questlines found
                </div>
              ) : (
                filteredQuestlines.map(questline => (
                  <button
                    key={questline.id}
                    data-selected={selectedQuestline?.id === questline.id}
                    className={selectedQuestline?.id === questline.id ? 'active' : ''}
                    onClick={() => {
                      setSelectedQuestline(questline)
                      setViewMode('questline')
                      setIsQuestSelectOpen(false)
                      if (onQuestlineChange) onQuestlineChange(questline.id)
                      if (onQuestChange) onQuestChange(null)
                    }}
                    type="button"
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                      {questline.name.replace(/<br\s*\/?>/gi, ' ')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      {questline.quests.length} quests
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
