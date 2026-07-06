import React from 'react'
import { createPortal } from 'react-dom'
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
  setSidebarOpen,
  onClearAdvancedState,
}) {

  const [modeOpen, setModeOpen] = React.useState(false)
  const [modePos, setModePos] = React.useState(null) // { top, right, bottom } for fixed positioning
  const modeRef = React.useRef(null)
  const modeBtnRef = React.useRef(null)
  const modePortalRef = React.useRef(null)

  // Close mode dropdown on outside click or ESC
  React.useEffect(() => {
    function onDoc(e) {
      if (modeRef.current && modeRef.current.contains(e.target)) return
      if (modePortalRef.current && modePortalRef.current.contains(e.target)) return
      setModeOpen(false)
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

  function handleModeClick() {
    if (!modeOpen) {
      const btnRect = modeBtnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - btnRect.bottom - 16
      const estimatedHeight = 240
      if (spaceBelow < estimatedHeight) {
        // Open upward
        setModePos({
          right: window.innerWidth - btnRect.right + 'px',
          bottom: (window.innerHeight - btnRect.top + 8) + 'px',
          maxHeight: Math.max(80, spaceBelow) + 'px',
          overflowY: 'auto'
        })
      } else {
        // Open downward
        setModePos({
          right: window.innerWidth - btnRect.right + 'px',
          top: (btnRect.bottom + 8) + 'px',
        })
      }
    } else {
      setModePos(null)
    }
    setModeOpen(!modeOpen)
  }

  const dropdownContent = modeOpen ? (
    <div ref={modePortalRef} className="mode-dropdown glass" style={{ position: 'fixed', minWidth: '160px', zIndex: 9999, ...modePos }}>
      <button
        className="mode-option"
        type="button"
        onClick={() => {
          if (setView) setView('craft')
          if (setSelectedItem) setSelectedItem(null)
          if (setAmount) setAmount(1)
          if (setCraftChain) setCraftChain([])
          if (onClearAdvancedState) onClearAdvancedState()
          setModeOpen(false)
        }}
      >
        Craft
      </button>
      <button
        className="mode-option"
        type="button"
        onClick={() => {
          if (setView) setView('location')
          if (setSelectedItem) setSelectedItem(null)
          if (setAmount) setAmount(1)
          if (setCraftChain) setCraftChain([])
          if (onClearAdvancedState) onClearAdvancedState()
          setModeOpen(false)
        }}
      >
        Location
      </button>
      <button
        className="mode-option"
        type="button"
        onClick={() => {
          if (setView) setView('advanced')
          setModeOpen(false)
        }}
      >
        Advanced
      </button>
      <div className="mode-divider" style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
      <button
        className="mode-option"
        type="button"
        onClick={() => {
          if (onExit) onExit()
          setModeOpen(false)
        }}
        style={{ color: '#ff6b6b' }}
      >
        ✕ Exit Economy
      </button>
    </div>
  ) : null

  return (
    <header className={"glass header" + (headerVisible ? '' : ' hidden') + (isCaching ? ' caching' : '')} style={isCaching ? { '--caching-progress': `${cachingProgress}%` } : {}}>
      <button
        className="icon menu"
        onClick={() => { if (setSidebarOpen) setSidebarOpen(true) }}
        aria-label="Open sidebar"
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
            ref={modeBtnRef}
            className="chip"
            type="button"
            onClick={(e) => { e.stopPropagation(); handleModeClick() }}
            aria-expanded={modeOpen}
          >
            mode
          </button>
          {createPortal(dropdownContent, document.body)}
        </div>
      </div>
    </header>
  )
}
