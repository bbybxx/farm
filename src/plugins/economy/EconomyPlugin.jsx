import React, { useState, useMemo, useEffect } from 'react'
import { useEconomyContext } from './EconomyContext'
import { getCombinedRecipes } from '../../utils/recipeUtils'
import GoldCoinButton from './components/GoldCoinButton'
import EconomySimpleOverlay from './components/EconomySimpleOverlay'
import EconomyAdvanced from './components/EconomyAdvanced'
import EconomyStartScreen from './components/EconomyStartScreen'
import EconomyItemSelect from './components/EconomyItemSelect'
import EconomyCraftPanel from './components/EconomyCraftPanel'
import EconomyLocationPanel from './components/EconomyLocationPanel'
import { calculateLeftovers } from './utils/economyCalculator'
import './styles/economy.css'

/**
 * EconomyPlugin — самодостаточный плагин экономического режима.
 *
 * Плагин НЕ зависит от economyMode из useUIState.
 * Он активируется исключительно по economyEnabled (свой флаг).
 *
 * Логика потока:
 *   1. economyEnabled=true → EconomyStartScreen (выбор Craft/Locations)
 *   2. Клик Craft/Locations → EconomyItemSelect (модалка выбора в стиле ItemSelectModal)
 *   3. Выбор предмета/локации → EconomyCraftPanel / EconomyLocationPanel (на странице)
 *   4. После добавления в цепочку → можно вернуться к StartScreen
 *
 * Панели рендерятся как основной контент на странице (не оверлей),
 * полностью копируя стиль и поведение оригинальных режимов крафта/локаций.
 *
 * Связь с крафтовым стейтом (item, amount, craftChain) ОТСУТСТВУЕТ.
 */
export default function EconomyPlugin() {
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

  // Скрываем основной контент App.jsx когда экономический режим активен
  useEffect(() => {
    document.body.classList.toggle('economy-active', economyEnabled)
    return () => document.body.classList.remove('economy-active')
  }, [economyEnabled])

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

  // Построение breadcrumb
  const breadcrumbParts = useMemo(() => {
    const parts = [{ label: 'Economy', onClick: handleBackToStart }]
    if (view === 'craft') {
      parts.push({ label: 'Craft', onClick: handleBackToStart })
      if (selectedCraftItem) parts.push({ label: selectedCraftItem })
    } else if (view === 'location') {
      parts.push({ label: 'Locations', onClick: handleBackToStart })
      if (selectedLocation) parts.push({ label: selectedLocation })
    }
    return parts
  }, [view, selectedCraftItem, selectedLocation])

  // Плагин активен только когда economyEnabled === true
  if (!economyEnabled) return null

  // Стартовый экран: когда нет открытых оверлеев Simple/Advanced
  if (!simpleOverlayOpen && !advancedTabOpen) {
    return (
      <>
        {/* EconomyItemSelect — модалка выбора (поверх всего) */}
        <EconomyItemSelect
          isOpen={itemSelectMode !== null}
          mode={itemSelectMode}
          onSelect={itemSelectMode === 'craft' ? handleCraftSelect : handleLocationSelect}
          onClose={handleItemSelectClose}
        />

        {/* Свой хедер с breadcrumb */}
        <header className="economy-header glass">
          <div className="economy-header-left">
            {view !== 'start' && (
              <button className="economy-header-back" onClick={handleBackToStart} type="button" aria-label="Back">
                ←
              </button>
            )}
            <nav className="economy-breadcrumb">
              {breadcrumbParts.map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="economy-breadcrumb-sep">›</span>}
                  {part.onClick ? (
                    <button className="economy-breadcrumb-link" onClick={part.onClick} type="button">
                      {part.label}
                    </button>
                  ) : (
                    <span className="economy-breadcrumb-current">{part.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
          <button className="economy-header-close" onClick={handleExitEconomy} type="button" aria-label="Close economy mode">
            ×
          </button>
        </header>

        {/* Основной контент в .economy-stack (копия .stack, но не трогается CSS .main > .stack) */}
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
      </>
    )
  }

  return (
    <>
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
    </>
  )
}
