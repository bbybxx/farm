import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemDisplay from './ItemDisplay'
import LocationImage from './LocationImage'

export default function AppHeader({
  headerVisible,
  isCaching,
  cachingProgress,
  sidebarOpen,
  setSidebarOpen,
  menuBtnRef,
  isOffline,
  craftChain,
  setCraftChain,
  breadcrumbsRef,
  questsMode,
  setQuestsMode,
  locationsMode,
  setLocationsMode,
  setSelectedLocation,
  setItem,
  setAmount,
  handleLocationItemCommit,
  modeRef,
  modeOpen,
  setModeOpen,
  craftBreadcrumbs,
  setCraftBreadcrumbs,
  locationsBreadcrumbs,
  setLocationsBreadcrumbs,
  questsBreadcrumbs,
  setQuestsBreadcrumbs,
  item,
  amount,
  selectedLocation,
  itemsData,
  buddyFarmLinksEnabled,
  // Economy mode props
  economyEnabled,
  economyMode,
  setEconomyMode
}) {
  return (
    <header className={"glass header" + (headerVisible ? '' : ' hidden') + (isCaching ? ' caching' : '')} style={isCaching ? { '--caching-progress': `${cachingProgress}%` } : {}}>
      <button
        className="icon menu"
        ref={menuBtnRef}
        onClick={(e) => {
          e.stopPropagation()
          setSidebarOpen(true)
        }}
        aria-label="Open perks"
        aria-controls="perks-sidebar"
        aria-expanded={sidebarOpen}
      >≡</button>
      
      {isOffline && (
        <div className="offline-indicator" title="Working offline - all data cached locally">
          OFFLINE
        </div>
      )}
      
      <div className="craft-chain" onClick={(e) => e.stopPropagation()}>
        {craftChain && craftChain.length > 1 ? (
          <nav ref={breadcrumbsRef} className="breadcrumbs" aria-label="Craft chain">
            {craftChain.slice(0, Math.max(0, craftChain.length - 1)).map((node, idx) => {
              const displayName = (typeof node === 'string') ? node : (node && node.name) || ''
              const truncatedName = displayName.length > 13 
                ? `${displayName.substring(0, 5)}...${displayName.substring(displayName.length - 5)}`
                : displayName
              
              return (
                <span key={idx}>
                  <button
                    type="button"
                    className="breadcrumb-item"
                    onClick={(e) => {
                      e.stopPropagation()
                      const newChain = craftChain.slice(0, idx + 1)
                      setCraftChain(newChain)
                      const target = newChain[idx]
                      
                      if (target && typeof target === 'object' && target.isPlaceholder) {
                        setQuestsMode(true)
                        setLocationsMode(false)
                      } else if (target && typeof target === 'object' && target.isLocation) {
                        setQuestsMode(false)
                        setLocationsMode(true)
                        setSelectedLocation(target.name)
                        
                        if (target.savedAmount !== undefined && target.savedAmount !== null) {
                          setAmount(target.savedAmount)
                        }
                        if (target.targetItem && target.targetQuantity) {
                          if (target.savedAmount === undefined || target.savedAmount === null) {
                            handleLocationItemCommit(target.targetItem, target.targetQuantity)
                          }
                        }
                      } else {
                        setQuestsMode(false)
                        setLocationsMode(false)
                        
                        const targetName = (typeof target === 'string') ? target : (target && target.name) || ''
                        const targetAmt = (typeof target === 'object' && target && target.amount) ? target.amount : 1
                        if (targetName) setItem(targetName)
                        setAmount(targetAmt)
                      }
                    }}
                  >
                    {typeof node === 'object' && node && node.isPlaceholder ? (
                      <span style={{ fontWeight: 600 }}>{truncatedName}</span>
                    ) : typeof node === 'object' && node && node.isLocation ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LocationImage name={node.name} size={20} />
                        <span style={{ fontWeight: 600 }}>{truncatedName}</span>
                      </div>
                    ) : (
                      <ItemDisplay itemName={displayName} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                    )}
                  </button>
                  <span className="breadcrumb-separator">›</span>
                </span>
              )
            })}

            {craftChain.length > 0 && (
              <span className="breadcrumb-item current">
                {(() => {
                  const last = craftChain[craftChain.length - 1]
                  const lastName = (typeof last === 'string') ? last : (last && last.name) || ''
                  if (typeof last === 'object' && last && last.isLocation) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LocationImage name={lastName} size={20} />
                        <span style={{ fontWeight: 600 }}>{lastName}</span>
                      </div>
                    )
                  }
                  return <ItemDisplay itemName={lastName} itemsData={itemsData} enableBuddyFarmLinks={buddyFarmLinksEnabled} />
                })()}
              </span>
            )}
          </nav>
        ) : (
          <div className="breadcrumb-mode" aria-label="Mode">
            {questsMode ? 'Quests' : (locationsMode ? 'Locations' : 'Crafts')}
          </div>
        )}
      </div>
      
      {/* Header right controls: Mode button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', marginRight: 0 }}>
        <div style={{ position: 'relative' }} ref={modeRef}>
          <button
            className="chip"
            type="button"
            onClick={(e) => { e.stopPropagation(); setModeOpen(!modeOpen) }}
            aria-expanded={modeOpen}
          >
            mode
          </button>
          <AnimatePresence>
            {modeOpen && (
              <motion.div className="mode-dropdown glass" style={{ position: 'absolute', right: 0, marginTop: 8, minWidth: 160, zIndex: 9999 }}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.12 }}
              >
                {/* Crafts — показываем когда не в crafts режиме */}
                {(questsMode || locationsMode) && (
                  <button
                    className="mode-option"
                    type="button"
                    onClick={() => {
                      if (questsMode) setQuestsBreadcrumbs(craftChain)
                      else if (locationsMode) setLocationsBreadcrumbs(craftChain)
                      if (craftBreadcrumbs.length > 0) setCraftChain(craftBreadcrumbs)
                      else setCraftChain([{ name: item, amount: amount }])
                      setQuestsMode(false)
                      setLocationsMode(false)
                      setModeOpen(false)
                    }}
                  >
                    Crafts
                  </button>
                )}
                {/* Locations — показываем когда не в locations режиме */}
                {!locationsMode && (
                  <button
                    className="mode-option"
                    type="button"
                    onClick={() => {
                      if (questsMode) setQuestsBreadcrumbs(craftChain)
                      else setCraftBreadcrumbs(craftChain)
                      if (locationsBreadcrumbs.length > 0) setCraftChain(locationsBreadcrumbs)
                      else setCraftChain([{ name: selectedLocation || 'Forest', amount: 1, isLocation: true }])
                      setQuestsMode(false)
                      setLocationsMode(true)
                      setModeOpen(false)
                      if (!selectedLocation) setSelectedLocation('Forest')
                    }}
                  >
                    Locations
                  </button>
                )}
                {/* Quests — показываем когда не в quests режиме */}
                {!questsMode && (
                  <button
                    className="mode-option"
                    type="button"
                    onClick={() => {
                      if (locationsMode) setLocationsBreadcrumbs(craftChain)
                      else setCraftBreadcrumbs(craftChain)
                      if (questsBreadcrumbs.length > 0) setCraftChain(questsBreadcrumbs)
                      else setCraftChain([{ name: 'Quests', amount: 1, isPlaceholder: true }])
                      setQuestsMode(true)
                      setLocationsMode(false)
                      setModeOpen(false)
                    }}
                  >
                    Quests
                  </button>
                )}
                {/* Economy — показываем когда economyEnabled включён и не в economy режиме */}
                {economyEnabled && !economyMode && (
                  <button
                    className="mode-option"
                    type="button"
                    onClick={() => {
                      setEconomyMode(true)
                      setModeOpen(false)
                    }}
                  >
                    💰 Economy
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
