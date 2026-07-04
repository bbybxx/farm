import React from 'react'
import { motion } from 'framer-motion'

export default function SettingsTab({
  pinnedEnabled,
  setPinnedEnabled,
  setIsFolderConfigOpen,
  historyEnabled,
  setHistoryEnabled,
  buddyFarmLinksEnabled,
  setBuddyFarmLinksEnabled,
  exploringMode,
  setExploringMode,
  setIsLocationConfigOpen,
  historyLimit,
  setHistoryLimit,
  handleBugReport,
  handleClearData,
  setIsDevLogsOpen,
  // Dynamic Prices
  prices,
  isPricesLoading,
  pricesError,
  pricesLastUpdated,
  onRefreshPrices,
  onClearPrices
}) {

  return (
    <div className="settings-section">
      <h3 className="section-title">Display Settings</h3>
      
      <h3 className="section-title">Features</h3>
      
      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={pinnedEnabled}
            onChange={(e) => setPinnedEnabled(e.target.checked)}
            className="setting-checkbox"
          />
          Enable Resource Pinning
        </label>
        <p className="setting-description">
          Show pinned tab and pin buttons for resources
        </p>
      </div>

      {pinnedEnabled && (
        <div className="setting-item">
          <button
            className="chip wide"
            onClick={() => setIsFolderConfigOpen(true)}
            type="button"
          >
            Configure Pinning Folders
          </button>
          <p className="setting-description">
            Manage folders for organizing pinned resources
          </p>
        </div>
      )}
      
      
      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={historyEnabled}
            onChange={(e) => setHistoryEnabled(e.target.checked)}
            className="setting-checkbox"
          />
          Enable History functionality
        </label>
        <p className="setting-description">
          Track and save calculation history
        </p>
      </div>

      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={buddyFarmLinksEnabled}
            onChange={(e) => setBuddyFarmLinksEnabled(e.target.checked)}
            className="setting-checkbox"
          />
          Enable buddy.farm Links
        </label>
        <p className="setting-description">
          Make item icons clickable to open buddy.farm pages
        </p>
      </div>

      <h3 className="section-title">Exploring</h3>
      <div className="setting-item">
        <div className="setting-label" style={{ alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 600 }}>Mode</span>
          <div className="exploring-chips">
            <motion.button
              whileTap={{ scale: 0.98 }}
              className={`chip${exploringMode === 'Apple Cider' ? ' active' : ''}`}
              onClick={() => setExploringMode('Apple Cider')}
              type="button"
            >
              Apple Cider
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              className={`chip${exploringMode === 'Arnold Palmer' ? ' active' : ''}`}
              onClick={() => setExploringMode('Arnold Palmer')}
              type="button"
            >
              Arnold Palmer
            </motion.button>
          </div>
        </div>
        <p className="setting-description">Select how exploring calculations should be performed.</p>
      </div>
      
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setIsLocationConfigOpen(true)}
          className="small-btn"
          style={{ padding: '6px 10px' }}
        >
          Configure locations
        </button>
        <div style={{ fontSize: 12, color: '#666' }}>Set Exploring Effectiveness per location (affects cider explores)</div>
      </div>
      
      {historyEnabled && (
        <>
          <h3 className="section-title">History Settings</h3>
          
          <div className="setting-item">
            <label className="setting-label">
              History limit
              <input
                type="number"
                min="10"
                max="200"
                value={historyLimit}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10)
                  if (Number.isNaN(parsed)) {
                    setHistoryLimit(50)
                    return
                  }
                  const bounded = Math.min(200, Math.max(10, parsed))
                  setHistoryLimit(bounded)
                }}
                className="setting-input"
              />
            </label>
            <p className="setting-description">
              Maximum number of history entries to keep (10-200)
            </p>
          </div>
        </>
      )}
      
      <h3 className="section-title">Dynamic Prices</h3>
      <div className="setting-item">
        <button
          className={`chip wide${isPricesLoading ? ' disabled' : ''}`}
          onClick={onRefreshPrices}
          disabled={isPricesLoading}
          type="button"
          title="Fetch latest prices from server"
        >
          {isPricesLoading ? 'Loading...' : prices ? '🔄 Refresh Prices' : '📥 Fetch Prices'}
        </button>
        {prices && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p className="setting-description" style={{ margin: 0 }}>
              ✅ Loaded {Object.keys(prices).length} items with dynamic prices
            </p>
            {pricesLastUpdated && (
              <p className="setting-description" style={{ margin: 0, fontSize: 11 }}>
                Last updated: {new Date(pricesLastUpdated).toLocaleString()}
              </p>
            )}
            <button
              className="small-btn"
              onClick={onClearPrices}
              type="button"
              style={{ alignSelf: 'flex-start', marginTop: 4, fontSize: 11, padding: '2px 8px', color: '#e06c75' }}
            >
              Clear cached prices
            </button>
          </div>
        )}
        {pricesError && (
          <p className="setting-description" style={{ color: '#e06c75', marginTop: 4 }}>
            ⚠️ {pricesError}
          </p>
        )}
        <p className="setting-description">
          Fetch prices from the server without rebuilding the app. 
          Requires a webhook to POST data to /api/prices first.
        </p>
      </div>
      
      <h3 className="section-title">Bug Report</h3>

      <button
        className="chip wide"
        onClick={handleBugReport}
        type="button"
        title="Report a bug or issue"
      >
        Report Bug
      </button>
      <div className="settings-info">
        <p>Found a bug or issue? Let us know and help improve the app.</p>
      </div>
      
      <h3 className="section-title">Data Management</h3>
      <button
        className="chip wide danger"
        onClick={handleClearData}
        type="button"
        title="Clear all saved data and reset to defaults"
      >
        Clear All Saved Data
      </button>
      
      <div className="settings-info">
        <p>This will remove all saved perks, craft history, settings, and current selection.</p>
      </div>
      
      {/* Social links */}
      <div className="social-links">
        <div className="social-link-wrapper">
          <span className="social-label">Updates</span>
          <button
            onClick={() => setIsDevLogsOpen(true)}
            className="social-link"
            title="Development Logs"
            type="button"
            style={{ cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Dev Logs
          </button>
        </div>
        <div className="social-link-wrapper">
          <span className="social-label">My Profile</span>
          <a 
            href="https://farmrpg.com/index.php#!/profile.php?user_name=bbybxx" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link"
            title="FarmRPG Profile"
          >
            <img src="/farmrpg_logo.png" alt="FarmRPG" className="social-icon" />
            FarmRPG
          </a>
        </div>
        <div className="social-link-wrapper">
          <span className="social-label">Tip</span>
          <a 
            href="https://boosty.to/bbybxx/donate?forPost=9850758" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link"
            title="Support on Boosty"
          >
            <img src="/boosty-sign-logo.png" alt="Boosty" className="social-icon" />
            Boosty
          </a>
        </div>
        <div className="social-link-wrapper">
          <span className="social-label">Code</span>
          <a
            href="https://github.com/bbybxx/farm"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            title="GitHub Repository"
          >
            <svg className="social-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.33.96.1-.75.4-1.25.72-1.54-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 2.87-.39c.98 0 1.97.13 2.88.39 2.18-1.5 3.14-1.18 3.14-1.18.62 1.57.23 2.73.11 3.02.74.81 1.18 1.84 1.18 3.1 0 4.43-2.71 5.41-5.29 5.69.41.36.77 1.07.77 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
            </svg>
            GitHub
          </a>
        </div>
        <div className="social-link-wrapper">
          <span className="social-label">Telegram</span>
          <a
            href="https://t.me/bbybrxx"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            title="Telegram"
          >
            <svg className="social-icon" width="20" height="20" viewBox="0 0 240 240" fill="none" aria-hidden="true">
              <path d="M20 120c0-55.228 44.772-100 100-100s100 44.772 100 100-44.772 100-100 100S20 175.228 20 120z" fill="currentColor" opacity="0.06"/>
              <path d="M50.5 120.2l133.4-48.4c3.1-1.1 6.7 1.3 5.6 4.4l-22.6 84.9c-1.2 4.6-6.6 6.4-10.2 3.4l-33.9-27.1-17.1 16.5c-3.5 3.3-8.9 1.5-10.3-3.2L61 127.6 50.5 120.2z" fill="currentColor"/>
            </svg>
            @bbybrxx
          </a>
        </div>
        <div className="social-link-wrapper">
          <span className="social-label">Discord</span>
          <a
            href="https://discord.com/users/715290260564869130"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            title="Discord"
          >
            <svg className="social-icon" width="20" height="20" viewBox="0 0 71 55" fill="currentColor" aria-hidden="true">
              <path d="M60.104 4.552A58.545 58.545 0 0 0 44.4.9a41.01 41.01 0 0 0-2.06 4.183 54.3 54.3 0 0 0-13.08 0A41.08 41.08 0 0 0 27.2.9 58.59 58.59 0 0 0 11.1 4.55C3.6 18.2 2.2 31.6 3.1 44.9a59.22 59.22 0 0 0 22.7 5.86c.34-.47.64-.96.9-1.47-6.2-1.86-10.96-5.15-13.6-8.52 1.15.68 2.36 1.3 3.6 1.82 6.54 2.89 12.9 4.56 20.2 4.56 7.24 0 13.55-1.68 20.1-4.56 1.25-.52 2.45-1.14 3.6-1.82-2.64 3.37-7.4 6.66-13.6 8.52.26.5.56 1 .9 1.47A59.2 59.2 0 0 0 67.9 44.9c.9-13.3.1-26.7-7.8-40.35zM23.2 37.1c-3.2 0-5.8-2.9-5.8-6.4 0-3.5 2.6-6.4 5.8-6.4 3.2 0 5.8 2.9 5.8 6.4 0 3.5-2.6 6.4-5.8 6.4zm24.6 0c-3.2 0-5.8-2.9-5.8-6.4 0-3.5 2.6-6.4 5.8-6.4 3.2 0 5.8 2.9 5.8 6.4 0 3.5-2.6 6.4-5.8 6.4z" />
            </svg>
            Discord
          </a>
        </div>
      </div>
    </div>
  )
}
