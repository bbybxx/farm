import React from 'react'

export default function EconomyStartScreen({ onOpenLocations, onOpenCraft }) {
  return (
    <div
      className="economy-start-screen"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        padding: '20px',
      }}
    >
      <div
        className="economy-start-content glass"
        style={{
          textAlign: 'center',
          padding: '40px 32px',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '1.6rem' }}>Economy Mode</h2>
        <p style={{ margin: '0 0 28px', color: 'var(--text-secondary, #aaa)', fontSize: '1rem' }}>
          Choose your starting point:
        </p>
        <div
          className="economy-start-buttons"
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            className="economy-start-btn locations glass"
            onClick={onOpenLocations}
            type="button"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '28px 24px',
              borderRadius: '14px',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              cursor: 'pointer',
              background: 'var(--glass-bg, rgba(255,255,255,0.06))',
              color: 'inherit',
              fontFamily: 'inherit',
              fontSize: '1rem',
              flex: '1 1 180px',
              minWidth: '160px',
              transition: 'background 0.2s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-hover-bg, rgba(255,255,255,0.12))'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg, rgba(255,255,255,0.06))'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span className="economy-start-icon" style={{ fontSize: '2.2rem' }}>
              📍
            </span>
            <span className="economy-start-label" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              Locations
            </span>
            <span
              className="economy-start-desc"
              style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #aaa)', lineHeight: 1.3 }}
            >
              Explore resources from locations
            </span>
          </button>
          <button
            className="economy-start-btn craft glass"
            onClick={onOpenCraft}
            type="button"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '28px 24px',
              borderRadius: '14px',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              cursor: 'pointer',
              background: 'var(--glass-bg, rgba(255,255,255,0.06))',
              color: 'inherit',
              fontFamily: 'inherit',
              fontSize: '1rem',
              flex: '1 1 180px',
              minWidth: '160px',
              transition: 'background 0.2s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-hover-bg, rgba(255,255,255,0.12))'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg, rgba(255,255,255,0.06))'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span className="economy-start-icon" style={{ fontSize: '2.2rem' }}>
              🔧
            </span>
            <span className="economy-start-label" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              Craft
            </span>
            <span
              className="economy-start-desc"
              style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #aaa)', lineHeight: 1.3 }}
            >
              Start with a crafting recipe
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
