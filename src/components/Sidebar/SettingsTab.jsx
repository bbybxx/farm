import React, { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useEconomyContext } from '../../plugins/economy/EconomyContext'
import EconomyPriceConfigModal from '../../plugins/economy/components/EconomyPriceConfigModal'
import { getBuiltinPrices } from '../../plugins/economy/utils/economyData'
import goldIcon from '../../plugins/economy/gold.png'
import apIcon from '../../plugins/economy/ap.png'
import ojIcon from '../../plugins/economy/oj.png'

export default function SettingsTab({
  pinnedEnabled,
  setPinnedEnabled,
  setIsFolderConfigOpen,
  historyEnabled,
  setHistoryEnabled,
  buddyFarmLinksEnabled,
  setBuddyFarmLinksEnabled,
  questItemSearchEnabled,
  setQuestItemSearchEnabled,
  exploringMode,
  setExploringMode,
  setIsLocationConfigOpen,
  historyLimit,
  setHistoryLimit,
  handleBugReport,
  handleClearData,
}) {
  const {
    economyEnabled, setEconomyEnabled,
    currency, setCurrency,
    exchangeRates, setExchangeRates,
    prices: economyPrices,
    setPrice,
    priceRefreshable, setPriceRefreshable,
    staminaSource, setStaminaSource,
    cranberryStamina, setCranberryStamina,
    applyBuiltinPrices,
    isPriceConfigOpen, setIsPriceConfigOpen
  } = useEconomyContext()

  // Применить цены из prices.json для предметов с Auto=true
  const handleUpdateFromBuiltin = useCallback(() => {
    applyBuiltinPrices(getBuiltinPrices())
  }, [applyBuiltinPrices])

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

      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={questItemSearchEnabled}
            onChange={(e) => setQuestItemSearchEnabled(e.target.checked)}
            className="setting-checkbox"
          />
          Enable Item Search in Quests
        </label>
        <p className="setting-description">
          Show a second search field in quests to find questlines that require specific items
        </p>
      </div>

      {/* Plugins — общая секция для всех плагинов */}
      <h3 className="section-title">Plugins</h3>

      {/* Economy Mode */}
      <h4 className="subsection-title" style={{ fontSize: '0.85rem', color: '#aaa', margin: '8px 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
        Economy Mode
      </h4>
      
      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={economyEnabled}
            onChange={(e) => setEconomyEnabled(e.target.checked)}
            className="setting-checkbox"
          />
          Enable Economy Mode
        </label>
        <p className="setting-description">
          Calculate profit/loss for crafting chains. Chain starts fresh when enabling.
        </p>
      </div>

      {economyEnabled && (
        <>
          <div className="setting-item">
            <div className="setting-label" style={{ alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600 }}>Display Currency</span>
              <div className="exploring-chips">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={`chip currency-btn${currency === 'gold' ? ' active' : ''}`}
                  onClick={() => setCurrency('gold')}
                  type="button"
                  title="Gold"
                >
                  <img src={goldIcon} alt="Gold" width={24} height={24} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={`chip currency-btn${currency === 'ap' ? ' active' : ''}`}
                  onClick={() => setCurrency('ap')}
                  type="button"
                  title="Arnold Palmer (AP)"
                >
                  <img src={apIcon} alt="AP" width={24} height={24} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={`chip currency-btn${currency === 'oj' ? ' active' : ''}`}
                  onClick={() => setCurrency('oj')}
                  type="button"
                  title="Orange Juice (OJ)"
                >
                  <img src={ojIcon} alt="OJ" width={24} height={24} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Exchange Rates */}
          <div className="setting-item" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', opacity: 0.7 }}>Exchange Rates</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', minWidth: 80 }}>1000 AP =</span>
              <input
                className="setting-input"
                type="number"
                min={0}
                step="any"
                value={exchangeRates.apToGold ?? ''}
                onChange={e => {
                  const val = e.target.value === '' ? null : Number(e.target.value)
                  setExchangeRates({ ...exchangeRates, apToGold: val })
                }}
                placeholder="0"
                style={{ width: 80, textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.85rem', minWidth: 28, textAlign: 'left' }}>G</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', minWidth: 80 }}>1000 OJ =</span>
              <input
                className="setting-input"
                type="number"
                min={0}
                step="any"
                value={exchangeRates.ojToGold ?? ''}
                onChange={e => {
                  const val = e.target.value === '' ? null : Number(e.target.value)
                  setExchangeRates({ ...exchangeRates, ojToGold: val })
                }}
                placeholder="0"
                style={{ width: 80, textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.85rem', minWidth: 28, textAlign: 'left' }}>G</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', minWidth: 80 }}>1000 OJ =</span>
              <input
                className="setting-input"
                type="number"
                min={0}
                step="any"
                value={exchangeRates.ojToAp ?? ''}
                onChange={e => {
                  const val = e.target.value === '' ? null : Number(e.target.value)
                  setExchangeRates({ ...exchangeRates, ojToAp: val })
                }}
                placeholder="0"
                style={{ width: 80, textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.85rem', minWidth: 28, textAlign: 'left' }}>AP</span>
            </div>
          </div>

          {/* Stamina Source */}
          <div className="setting-item">
            <div className="setting-label" style={{ alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600 }}>Stamina Source</span>
              <div className="exploring-chips">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={`chip currency-btn${staminaSource === 'apple' ? ' active' : ''}`}
                  onClick={() => setStaminaSource('apple')}
                  type="button"
                  title="Apple"
                >
                  <img src="/source-index_files/8297.png" alt="Apple" width={24} height={24} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={`chip currency-btn${staminaSource === 'oj' ? ' active' : ''}`}
                  onClick={() => setStaminaSource('oj')}
                  type="button"
                  title="Orange Juice (OJ)"
                >
                  <img src="/source-index_files/orangejuice.png" alt="OJ" width={24} height={24} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={`chip currency-btn${staminaSource === 'cranberry' ? ' active' : ''}`}
                  onClick={() => setStaminaSource('cranberry')}
                  type="button"
                  title="Cranberry Juice"
                >
                  <img src="/source-index_files/cranjuice2.png" alt="Cranberry Juice" width={24} height={24} />
                </motion.button>
              </div>
            </div>
            <p className="setting-description">
              Source used to calculate stamina cost in economy mode.
              {staminaSource === 'apple' && ' 1 Apple = 15 stamina'}
              {staminaSource === 'oj' && ' 1 Orange Juice = 100 stamina'}
              {staminaSource === 'cranberry' && ' 1 Cranberry Juice = 275g'}
            </p>
          </div>

          {/* Cranberry stamina input (only when cranberry selected) */}
          {staminaSource === 'cranberry' && (
            <div className="setting-item" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', opacity: 0.7 }}>Cranberry Juice Stamina</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="setting-input"
                  type="number"
                  min={1}
                  step="any"
                  value={cranberryStamina}
                  onChange={e => {
                    const val = e.target.value === '' ? 2700000 : Number(e.target.value)
                    if (val > 0) setCranberryStamina(val)
                  }}
                  placeholder="2700000"
                  style={{ width: 120, textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>stamina per juice</span>
              </div>
              <p className="setting-description">
                How much stamina one Cranberry Juice restores. Default: 2,700,000
              </p>
            </div>
          )}

          <button
            className="chip wide"
            onClick={() => setIsPriceConfigOpen(true)}
            type="button"
          >
            Configure Prices
          </button>
        </>
      )}


      <EconomyPriceConfigModal
        isOpen={economyEnabled && isPriceConfigOpen}
        onClose={() => setIsPriceConfigOpen(false)}
        prices={economyPrices}
        setPrice={setPrice}
        priceRefreshable={priceRefreshable}
        setPriceRefreshable={setPriceRefreshable}
        onUpdateFromBuiltin={handleUpdateFromBuiltin}
      />

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
          <span className="social-label">Credits</span>
          <a
            href="https://farmrpg-pricecheck.free.nf"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            title="More Calculators"
          >
            
            More Calcs
          </a>
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
          <span className="social-label">Last Update</span>
          <a
            href="https://www.reddit.com/r/FarmRPG/s/CftqGE7dU6"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            title="Reddit"
          >
            <img src="/reddit.png" alt="Reddit" className="social-icon" />
            Reddit
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
