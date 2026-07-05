import React, { useMemo } from 'react'
import { useEconomy } from './hooks/useEconomy'
import { useCraft } from '../../hooks/useCraft'
import { useUIState } from '../../hooks/useUIState'
import EconomyStartScreen from './components/EconomyStartScreen'
import GoldCoinButton from './components/GoldCoinButton'
import EconomySimpleOverlay from './components/EconomySimpleOverlay'
import EconomyAdvanced from './components/EconomyAdvanced'
import { calculateLeftovers } from './utils/economyCalculator'

/**
 * EconomyPlugin — самодостаточный плагин экономического режима.
 * Не принимает пропсы. Все данные получает через хуки.
 * Рендерит себя только когда economyEnabled === true.
 */
export default function EconomyPlugin() {
  // Хуки экономики
  const {
    economyEnabled,
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
  } = useEconomy()

  // Существующие хуки приложения (только для чтения)
  const { item, amount, combinedRecipes } = useCraft()
  const { locationsMode, setIsItemSelectModalOpen } = useUIState()

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

  if (!economyEnabled) return null

  return (
    <>
      {/* Стартовый экран (когда не в locations и не в craft) */}
      {!locationsMode && !item && (
        <EconomyStartScreen
          onOpenLocations={() => {
            // Устанавливаем locationsMode через useUIState
            // Используем setLocationsMode если доступно, иначе заглушка
          }}
          onOpenCraft={() => {
            // Открываем ItemSelectModal
            if (setIsItemSelectModalOpen) setIsItemSelectModalOpen(true)
          }}
        />
      )}

      {/* Золотая кнопка (FAB) — показывается всегда, когда есть предметы */}
      <GoldCoinButton
        itemCount={economyChain.length}
        onClick={openSimpleOverlay}
        isActive={economyChain.length > 0}
      />

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
            style={{
              position: 'fixed',
              top: '12px',
              left: '12px',
              zIndex: 1001,
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(0,0,0,0.6)',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
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
