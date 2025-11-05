import React, { useState, useMemo, useEffect } from 'react'
import ItemDisplay from './ItemDisplay'
import questsApiData from '../data/quests-api.json'

export default function QuestsPanel({ itemsData }) {
  const [selectedQuestline, setSelectedQuestline] = useState(null)
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [questChains, setQuestChains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isQuestSelectOpen, setIsQuestSelectOpen] = useState(false)
  const [viewMode, setViewMode] = useState('quest') // 'questline' or 'quest'

  // Load and transform quests data
  useEffect(() => {
    const loadQuests = async () => {
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
        
        // Auto-open "Feathers I" questline and first quest
        const feathersQuestline = chains.find(c => c.name === 'Feathers')
        if (feathersQuestline) {
          setSelectedQuestline(feathersQuestline)
          if (feathersQuestline.quests.length > 0) {
            setSelectedQuest(feathersQuestline.quests[0])
            setViewMode('quest')
          }
        }
        
        setLoading(false)
      } catch (err) {
        console.error('Failed to load quests:', err)
        setError(err.message)
        setLoading(false)
      }
    }
    
    loadQuests()
  }, [])

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
    if (quest) setSelectedQuest(quest)
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
    }
  }

  const handleQuestlineClick = () => {
    setViewMode('questline')
    setSelectedQuest(null)
  }

  const handleQuestClickFromList = (quest) => {
    setSelectedQuest(quest)
    setViewMode('quest')
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
              <span>{selectedQuestline.name}</span>
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
          return (
            <section className="glass card">
              {/* Questline Name */}
              <h2 style={{ margin: '0 0 24px 0', fontSize: '24px' }}>
                {selectedQuestline.name}
              </h2>

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
                      {Object.entries(totals.requirements.items).map(([name, quantity]) => (
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
                        gap: '12px'
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
                      <span style={{ flex: 1, fontSize: '15px', fontWeight: 500 }}>
                        {quest.name}
                      </span>
                      {quest.npc && (
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
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
      ) : (
        /* QUEST PAGE */
        <section className="glass card">
          {/* Quest Name */}
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
            {selectedQuest.name}
          </h2>

          {/* Questline link */}
          {selectedQuestline && (
            <div style={{ marginBottom: '16px' }}>
              <span style={{ 
                fontSize: '13px', 
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Questline:{' '}
              </span>
              <button
                onClick={handleQuestlineClick}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '14px', 
                  color: 'rgba(139, 92, 246, 0.9)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                  textUnderlineOffset: '3px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(139, 92, 246, 1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(139, 92, 246, 0.9)'
                }}
              >
                {selectedQuestline.name}
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
              color: 'rgba(255,255,255,0.85)'
            }}>
              {selectedQuest.description}
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
                {selectedQuest.requirements.items.map(item => (
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
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ 
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Select Questline</h2>
              <button
                onClick={() => setIsQuestSelectOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                type="text"
                className="input"
                placeholder="Search questlines..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ 
              flex: 1,
              overflow: 'auto',
              padding: '8px'
            }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredQuestlines.map(questline => (
                    <button
                      key={questline.id}
                      onClick={() => {
                        setSelectedQuestline(questline)
                        setViewMode('questline')
                        setIsQuestSelectOpen(false)
                      }}
                      style={{
                        padding: '12px 16px',
                        background: selectedQuestline?.id === questline.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${selectedQuestline?.id === questline.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        color: '#fff'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedQuestline?.id !== questline.id) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedQuestline?.id !== questline.id) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        }
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                        {questline.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        {questline.quests.length} quests
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
