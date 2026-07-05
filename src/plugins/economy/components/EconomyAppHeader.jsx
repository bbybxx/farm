import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemDisplay from '../../../components/ItemDisplay'
import LocationImage from '../../../components/LocationImage'

export default function EconomyAppHeader({
  headerVisible,
  isCaching,
  cachingProgress,
  isOffline,
  craftChain,
  setCraftChain,
  breadcrumbsRef,
  setSelectedItem,
  setAmount,
  itemsData,
  buddyFarmLinksEnabled,
  onExit,
  // Economy-specific props
  view,
  setView,
  selectedLocation,
  setSelectedLocation,
  locationAmount,
  setLocationAmount,
}) {
  const [modeOpen, setModeOpen] = React.useState(false)
  const modeRef = React.useRef(null)

  // Close mode dropdown on outside click or ESC
  React.useEffect(() => {
    function onDoc(e) {
      if (!modeRef.current) return
      if (!modeRef.current.contains(e.target)) setModeOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setModeOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <header className={"glass header" + (headerVisible ? '' : ' hidden') + (isCaching ? ' caching' : '')} style={isCaching ? { '--caching-progress': `${cachingProgress}%` } : {}}>
      <button
        className="icon menu"
        onClick={onExit}
        aria-label="Exit economy mode"
        type="button"
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
                      
                      if (target && typeof target === 'object' && target.isLocation) {
                        // Restore location view
                        if (setView) setView('location')
                        if (setSelectedLocation) setSelectedLocation(target.name)
                        if (target.savedAmount !== undefined && target.savedAmount !== null && setLocationAmount) {
                          setLocationAmount(target.savedAmount)
                        }
                      } else {
                        // Restore craft view
                        if (setView) setView('craft')
                        const targetName = (typeof target === 'string') ? target : (target && target.name) || ''
                        const targetAmt = (typeof target === 'object' && target && target.amount) ? target.amount : 1
                        if (targetName && setSelectedItem) setSelectedItem(targetName)
                        if (setAmount) setAmount(targetAmt)
                      }
                    }}
                  >
                    {typeof node === 'object' && node && node.isLocation ? (
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
            Economy
          </div>
        )}
      </div>
      
      {/* Header right controls: Mode dropdown */}
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
                {/* Craft — показываем когда не в craft режиме */}
                {view !== 'craft' && (
                  <button
                    className="mode-option"
                    type="button"
                    onClick={() => {
                      if (setView) setView('craft')
                      if (setCraftChain) setCraftChain([])
                      setModeOpen(false)
                    }}
                  >
                    Craft
                  </button>
                )}
                {/* Location — показываем когда не в location режиме */}
                {view !== 'location' && (
                  <button
                    className="mode-option"
                    type="button"
                    onClick={() => {
                      if (setView) setView('location')
                      if (setCraftChain) setCraftChain([])
                      setModeOpen(false)
                    }}
                  >
                    Location
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
