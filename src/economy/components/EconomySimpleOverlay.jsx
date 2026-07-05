import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { runSimple } from '../utils/economyCalculator'

const CURRENCY_LABELS = {
  gold: 'G',
  ap: 'AP',
  oj: 'OJ',
}

export default function EconomySimpleOverlay({
  isOpen,
  onClose,
  economyChain,
  prices,
  onSetPrice,
  onAddManualItem,
  onOpenAdvanced,
  currency,
  exchangeRates,
  isTradableFn,
  combinedRecipes,
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [addItemName, setAddItemName] = useState('')
  const [addItemQuantity, setAddItemQuantity] = useState(1)
  const [result, setResult] = useState(null)
  const [calculated, setCalculated] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [log, setLog] = useState([])

  const handleCalculate = useCallback(() => {
    const res = runSimple(economyChain, prices)
    setResult(res)
    setCalculated(true)
  }, [economyChain, prices])

  const handleAddItem = useCallback(() => {
    const name = addItemName.trim()
    const qty = parseInt(addItemQuantity, 10) || 1
    if (!name) return
    onAddManualItem(name, qty)
    setLog(prev => [...prev, `+${qty} ${name} (added manually)`])
    setAddItemName('')
    setAddItemQuantity(1)
    setAddOpen(false)
  }, [addItemName, addItemQuantity, onAddManualItem])

  const handleSave = useCallback(() => {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }, [])

  const handleClose = useCallback(() => {
    setResult(null)
    setCalculated(false)
    setAddOpen(false)
    setAddItemName('')
    setAddItemQuantity(1)
    onClose()
  }, [onClose])

  const currencyLabel = CURRENCY_LABELS[currency] || 'G'

  // Предупреждения о ценах
  const warnings = economyChain
    .filter(item => isTradableFn(item.name) && (!prices[item.name] || prices[item.name].gold == null))
    .map(item => item.name)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="glass"
            style={{
              width: '100%',
              maxWidth: '600px',
              height: '75vh',
              overflowY: 'auto',
              borderRadius: '16px 16px 0 0',
              padding: '20px 24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Заголовок + крестик */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Economy Calculator</h2>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Список предметов в цепочке */}
            <div style={{ flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {economyChain.map((item, idx) => {
                  const isAdded = log.some(l => l.includes(item.name))
                  return (
                    <div
                      key={`${item.name}-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <span style={{ flex: '1 1 120px', fontWeight: 500, fontSize: '0.95rem' }}>
                        {item.name}
                        {isAdded && (
                          <span style={{ color: '#FFB300', fontSize: '0.75rem', marginLeft: 6 }}>
                            (added)
                          </span>
                        )}
                      </span>
                      <span style={{ flex: '0 0 60px', textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-secondary, #aaa)' }}>
                        ×{item.amount}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        value={prices[item.name]?.gold ?? ''}
                        onChange={e => {
                          const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                          onSetPrice(item.name, 'gold', val === '' ? undefined : val)
                        }}
                        style={{
                          flex: '0 0 80px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(0,0,0,0.2)',
                          color: 'inherit',
                          fontSize: '0.85rem',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #aaa)', flex: '0 0 20px' }}>
                        {currencyLabel}
                      </span>
                      <button
                        type="button"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          color: 'inherit',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => {/* заглушка */}}
                      >
                        Fill from Fauna
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Кнопка Add */}
            <div style={{ flexShrink: 0 }}>
              {!addOpen ? (
                <button
                  type="button"
                  className="chip wide"
                  onClick={() => setAddOpen(true)}
                  style={{ width: '100%' }}
                >
                  + Add
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Item name"
                    value={addItemName}
                    onChange={e => setAddItemName(e.target.value)}
                    style={{
                      flex: '1 1 140px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(0,0,0,0.2)',
                      color: 'inherit',
                      fontSize: '0.85rem',
                    }}
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qty"
                    value={addItemQuantity}
                    onChange={e => setAddItemQuantity(parseInt(e.target.value, 10) || 1)}
                    style={{
                      flex: '0 0 70px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(0,0,0,0.2)',
                      color: 'inherit',
                      fontSize: '0.85rem',
                      textAlign: 'right',
                    }}
                  />
                  <button
                    type="button"
                    className="chip"
                    onClick={handleAddItem}
                    disabled={!addItemName.trim()}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setAddOpen(false)
                      setAddItemName('')
                      setAddItemQuantity(1)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Журнал добавлений */}
            {log.length > 0 && (
              <div
                style={{
                  flexShrink: 0,
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary, #aaa)',
                  padding: '4px 0',
                }}
              >
                {log.map((entry, i) => (
                  <div key={i}>{entry}</div>
                ))}
              </div>
            )}

            {/* Кнопка Calculate */}
            <div style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="chip wide"
                onClick={handleCalculate}
                style={{
                  width: '100%',
                  background: 'var(--accent, #4CAF50)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                Calculate
              </button>
            </div>

            {/* Warning-баннер */}
            {warnings.length > 0 && (
              <div
                style={{
                  flexShrink: 0,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 193, 7, 0.15)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  color: '#FFC107',
                  fontSize: '0.85rem',
                }}
              >
                ⚠ Price warning: no price set for{' '}
                {warnings.join(', ')}
              </div>
            )}

            {/* Результаты */}
            {calculated && result && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary, #aaa)' }}>
                  === Results ===
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cost:</span>
                  <span style={{ color: '#ef5350', fontWeight: 600 }}>
                    {result.cost.toFixed(2)} {currencyLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Revenue:</span>
                  <span style={{ fontWeight: 600 }}>
                    {result.revenue.toFixed(2)} {currencyLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Profit:</span>
                  <span
                    style={{
                      color: result.profit >= 0 ? '#66bb6a' : '#ef5350',
                      fontWeight: 700,
                    }}
                  >
                    {result.profit >= 0 ? '+' : ''}{result.profit.toFixed(2)} {currencyLabel}
                  </span>
                </div>
              </div>
            )}

            {/* Leftovers */}
            {calculated && result && result.leftovers.length > 0 && (
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary, #aaa)' }}>
                  Leftovers:
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {result.leftovers
                    .filter(item => isTradableFn(item.name))
                    .map((item, idx) => {
                      const priceVal = item.price?.gold ?? 0
                      const totalVal = priceVal * item.quantity
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.03)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <span>
                            {item.name}: {item.quantity} @ {priceVal.toFixed(2)} {currencyLabel}
                          </span>
                          <span style={{ fontWeight: 500 }}>
                            = {totalVal.toFixed(2)} {currencyLabel}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Кнопки Open Advanced и Pin/Save */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexShrink: 0,
                paddingTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <button
                type="button"
                className="chip"
                onClick={onOpenAdvanced}
                style={{ flex: 1 }}
              >
                Open Advanced ▸
              </button>
              <button
                type="button"
                className="chip"
                onClick={handleSave}
                style={{ flex: 1 }}
              >
                {showSaved ? 'Saved! (placeholder)' : 'Pin / Save'}
              </button>
            </div>

            {/* Небольшой отступ снизу для скролла */}
            <div style={{ height: 16, flexShrink: 0 }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
