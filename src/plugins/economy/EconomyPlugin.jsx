import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useEconomyContext } from './EconomyContext'
import { getCombinedRecipes } from '../../utils/recipeUtils'
import GoldCoinButton from './components/GoldCoinButton'
import EconomySimpleOverlay from './components/EconomySimpleOverlay'
import EconomyAdvanced from './components/EconomyAdvanced'
import EconomyStartScreen from './components/EconomyStartScreen'
import EconomyItemSelect from './components/EconomyItemSelect'
import EconomyCraftPanel from './components/EconomyCraftPanel'
import EconomyLocationPanel from './components/EconomyLocationPanel'
import ItemDisplay from '../../components/ItemDisplay'
import LocationImage from '../../components/LocationImage'
import itemsAPI from '../../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap } from '../../utils/itemImageUtils'
import { calculateLeftovers } from './utils/economyCalculator'
import './styles/economy.css'

const STATIC_ITEMS_MAP = normalizeItemsMap(itemsAPI)

/**
 * EconomyPlugin — самодостаточный плагин экономического режима.
 *
 * Рендерится в position:fixed контейнере поверх всего приложения,
 * полностью изолирован от .main и .stack.
 *
 * Breadcrumbs построены по тому же принципу, что и в AppHeader.jsx:
 * используется economyChain как источник данных, с ItemDisplay для иконок.
 */
export default function EconomyPlugin() {
  const breadcrumbsRef = useRef(null)

  // Состояние текущего view: 'start' | 'craft' | 'location'
  const [view, setView] = useState('start')

  // Состояние выбора: null | 'craft' | 'location'
  const [itemSelectMode, setItemSelectMode] = useState(null)

  // Выбранный предмет/локация
  const [selectedCraftItem, setSelectedCraftItem] = useState(null)
  const [selectedCraftAmount, setSelectedCraftAmount] = useState(1)
  const [selectedLocation, setSelectedLocation] = useState(null)

  // Хуки экономики (через контекст — единый экземпляр)
  const {
    economyEnabled,
    setEconomyEnabled,
    economyChain,
    prices,
    setPrice,
    currency,
    exchangeRates,
    advancedState,
    updateAdvancedCraft,
    removeFromAdvancedState,
    manualAdditions,
    addManualAddition,
    simpleOverlayOpen,
    openSimpleOverlay,
    closeSimpleOverlay,
    advancedTabOpen,
    openAdvancedTab,
    closeAdvancedTab,
    addToEconomyChain,
  } = useEconomyContext()

  // Плагин рендерится через createPortal в document.body,
  // поэтому не нужно скрывать .main — плагин поверх всего.

  // Получаем объединенные рецепты напрямую
  const combinedRecipes = useMemo(() => getCombinedRecipes(), [])

  // Вычисляем leftovers из economyChain для Advanced
  const leftovers = useMemo(() => {
    if (!economyChain || economyChain.length === 0) return []
    return calculateLeftovers(economyChain, prices, () => true)
  }, [economyChain, prices])

  // Функция получения цены предмета в нужной валюте
  const getItemPrice = (itemName, targetCurrency) => {
    const price = prices[itemName]
    if (!price) return null
    if (price[targetCurrency] != null) return price[targetCurrency]
    if (price.gold != null) return price.gold
    return null
  }

  // Обработчик выбора предмета из EconomyItemSelect (craft mode)
  const handleCraftSelect = (name, amount) => {
    setSelectedCraftItem(name)
    setSelectedCraftAmount(amount)
    setItemSelectMode(null)
    setView('craft')
  }

  // Обработчик выбора локации из EconomyItemSelect (location mode)
  const handleLocationSelect = (name, amount) => {
    setSelectedLocation(name)
    setItemSelectMode(null)
    setView('location')
  }

  // Обработчик открытия EconomyItemSelect для крафта
  const handleOpenCraftSelect = () => {
    setItemSelectMode('craft')
  }

  // Обработчик открытия EconomyItemSelect для локаций
  const handleOpenLocationSelect = () => {
    setItemSelectMode('location')
  }

  // Закрытие EconomyItemSelect
  const handleItemSelectClose = () => {
    setItemSelectMode(null)
  }

  // Возврат к стартовому экрану
  const handleBackToStart = () => {
    setSelectedCraftItem(null)
    setSelectedCraftAmount(1)
    setSelectedLocation(null)
    setView('start')
  }

  // Выход из экономического режима
  const handleExitEconomy = () => {
    setEconomyEnabled(false)
  }

  // Auto-scroll breadcrumbs to the rightmost (latest) node when chain updates
  useEffect(() => {
    try {
      if (breadcrumbsRef && breadcrumbsRef.current) {
        const el = breadcrumbsRef.current
        el.scrollLeft = el.scrollWidth
      }
    } catch (_) { /* ignore */ }
  }, [economyChain])

  // Плагин активен только когда economyEnabled === true
  if (!economyEnabled) return null

  // Стартовый экран: когда нет открытых оверлеев Simple/Advanced
  if (!simpleOverlayOpen && !advancedTabOpen) {
    return createPortal(
      <div className="economy-container">
        {/* EconomyItemSelect — модалка выбора (поверх всего) */}
        <EconomyItemSelect
          isOpen={itemSelectMode !== null}
          mode={itemSelectMode}
          onSelect={itemSelectMode === 'craft' ? handleCraftSelect : handleLocationSelect}
          onClose={handleItemSelectClose}
        />

        {/* Свой хедер с breadcrumb (как в AppHeader.jsx) */}
        <header className="economy-header glass">
          <div className="economy-header-left">
            {view !== 'start' && (
              <button className="economy-header-back" onClick={handleBackToStart} type="button" aria-label="Back">
                ←
              </button>
            )}
            <nav ref={breadcrumbsRef} className="breadcrumbs" aria-label="Economy chain">
              {economyChain && economyChain.length > 1 ? (
                <>
                  {economyChain.slice(0, Math.max(0, economyChain.length - 1)).map((node, idx) => (
                    <span key={idx} className="breadcrumb-item-wrapper">
                      <button
                        type="button"
                        className="breadcrumb-item"
                        onClick={handleBackToStart}
                      >
                        {node.isLocation ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LocationImage name={node.name} size={20} />
                            <span style={{ fontWeight: 600 }}>{node.name}</span>
                          </div>
                        ) : (
                          <ItemDisplay itemName={node.name} itemsData={STATIC_ITEMS_MAP} />
                        )}
                      </button>
                      <span className="breadcrumb-separator">›</span>
                    </span>
                  ))}
                  {economyChain.length > 0 && (
                    <span className="breadcrumb-item current">
                      {(() => {
                        const last = economyChain[economyChain.length - 1]
                        return last.isLocation ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LocationImage name={last.name} size={20} />
                            <span style={{ fontWeight: 600 }}>{last.name}</span>
                          </div>
                        ) : (
                          <ItemDisplay itemName={last.name} itemsData={STATIC_ITEMS_MAP} />
                        )
                      })()}
                    </span>
                  )}
                </>
              ) : (
                <div className="breadcrumb-mode" aria-label="Mode">
                  {view === 'craft' ? 'Craft' : view === 'location' ? 'Locations' : 'Economy'}
                </div>
              )}
            </nav>
          </div>
          <button className="economy-header-close" onClick={handleExitEconomy} type="button" aria-label="Close economy mode">
            ×
          </button>
        </header>

        {/* Основной контент */}
        <div className="economy-stack">
          {view === 'start' && (
            <EconomyStartScreen
              onOpenLocations={handleOpenLocationSelect}
              onOpenCraft={handleOpenCraftSelect}
            />
          )}

          {view === 'craft' && (
            <EconomyCraftPanel
              selectedItem={selectedCraftItem}
              amount={selectedCraftAmount}
              onOpenSelect={handleOpenCraftSelect}
            />
          )}

          {view === 'location' && (
            <EconomyLocationPanel
              selectedLocation={selectedLocation}
              onOpenSelect={handleOpenLocationSelect}
            />
          )}
        </div>

        {/* Золотая кнопка (FAB) — показывается когда есть предметы в цепочке */}
        {economyChain.length > 0 && (
          <GoldCoinButton
            itemCount={economyChain.length}
            onClick={openSimpleOverlay}
            isActive={true}
          />
        )}
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="economy-container">
      {/* Simple оверлей */}
      {simpleOverlayOpen && (
        <EconomySimpleOverlay
          isOpen={simpleOverlayOpen}
          onClose={closeSimpleOverlay}
          economyChain={economyChain}
          prices={prices}
          onSetPrice={setPrice}
          onAddManualItem={addManualAddition}
          onOpenAdvanced={() => {
            closeSimpleOverlay()
            openAdvancedTab()
          }}
          currency={currency}
          exchangeRates={exchangeRates}
          isTradableFn={() => true}
          combinedRecipes={combinedRecipes}
        />
      )}

      {/* Advanced вкладка */}
      {advancedTabOpen && (
        <>
          {/* Кнопка "← Back" для возврата из Advanced */}
          <button
            className="economy-back-btn"
            onClick={closeAdvancedTab}
          >
            ← Back
          </button>
          <EconomyAdvanced
            leftovers={leftovers}
            advancedState={advancedState}
            onUpdateCraft={updateAdvancedCraft}
            onRemoveItem={removeFromAdvancedState}
            onAddManualItem={addManualAddition}
            manualAdditions={manualAdditions}
            prices={prices}
            currency={currency}
            exchangeRates={exchangeRates}
            combinedRecipes={combinedRecipes}
            getItemPrice={getItemPrice}
          />
        </>
      )}
    </div>,
    document.body
  )
}
