import React, { useState, useMemo } from 'react'

export default function EconomyPriceConfig({
  isOpen,
  onClose,
  prices,
  onSetPrice,
  priceRefreshable,
  onSetRefreshable,
  exchangeRates,
  onSetExchangeRates,
  allItems
}) {
  const [searchQuery, setSearchQuery] = useState('')

  // Combine allItems keys with prices keys for a complete list
  const itemList = useMemo(() => {
    const set = new Set()
    if (Array.isArray(allItems)) {
      allItems.forEach(name => set.add(name))
    }
    if (prices && typeof prices === 'object') {
      Object.keys(prices).forEach(name => set.add(name))
    }
    return Array.from(set).sort()
  }, [allItems, prices])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return itemList
    const q = searchQuery.toLowerCase()
    return itemList.filter(name => name.toLowerCase().includes(q))
  }, [itemList, searchQuery])

  const handleExchangeRateChange = (field, value) => {
    const num = value === '' ? null : Number(value)
    onSetExchangeRates({
      ...exchangeRates,
      [field]: num
    })
  }

  const handlePriceChange = (itemName, value) => {
    const num = value === '' ? null : Number(value)
    onSetPrice(itemName, 'gold', num)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content economy-price-config"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 500, width: '90%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Configure Prices</h3>
          <button
            className="modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Exchange Rates Section */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            Exchange Rates
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: 80 }}>1000 AP =</span>
              <input
                type="number"
                className="setting-input"
                style={{ width: 80 }}
                value={exchangeRates?.apToGold ?? ''}
                onChange={(e) => handleExchangeRateChange('apToGold', e.target.value)}
                placeholder="—"
              />
              <span>Gold</span>
            </label>
            <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: 80 }}>1000 OJ =</span>
              <input
                type="number"
                className="setting-input"
                style={{ width: 80 }}
                value={exchangeRates?.ojToGold ?? ''}
                onChange={(e) => handleExchangeRateChange('ojToGold', e.target.value)}
                placeholder="—"
              />
              <span>Gold</span>
            </label>
            <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: 80 }}>1000 OJ =</span>
              <input
                type="number"
                className="setting-input"
                style={{ width: 80 }}
                value={exchangeRates?.ojToAp ?? ''}
                onChange={(e) => handleExchangeRateChange('ojToAp', e.target.value)}
                placeholder="—"
              />
              <span>AP</span>
            </label>
          </div>
        </div>

        {/* Item Prices Section */}
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            Item Prices
          </h4>

          {/* Search */}
          <input
            type="text"
            className="setting-input"
            style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Items list */}
          <div
            style={{
              maxHeight: 300,
              overflowY: 'auto',
              border: '1px solid #333',
              borderRadius: 6,
              padding: '4px 0'
            }}
          >
            {filteredItems.length === 0 && (
              <div style={{ padding: '12px 16px', color: '#666', fontSize: 13 }}>
                No items found
              </div>
            )}
            {filteredItems.map(itemName => {
              const itemPrice = prices?.[itemName]?.gold
              const isRefreshable = priceRefreshable?.[itemName] !== false // default true
              return (
                <div
                  key={itemName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderBottom: '1px solid #2a2a2a',
                    fontSize: 13
                  }}
                >
                  {/* Item name */}
                  <span style={{ flex: '0 0 140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {itemName}
                  </span>

                  {/* Price input */}
                  <input
                    type="number"
                    className="setting-input"
                    style={{ width: 60, padding: '2px 6px', fontSize: 12 }}
                    value={itemPrice ?? ''}
                    onChange={(e) => handlePriceChange(itemName, e.target.value)}
                    placeholder="—"
                  />
                  <span style={{ fontSize: 11, color: '#888', minWidth: 14 }}>G</span>

                  {/* Refreshable toggle */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title={isRefreshable ? 'Auto-refresh from Fauna' : 'Manual price'}
                  >
                    <input
                      type="checkbox"
                      checked={!isRefreshable}
                      onChange={(e) => onSetRefreshable(itemName, !e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ color: isRefreshable ? '#888' : '#e5c07b' }}>
                      {isRefreshable ? 'Auto' : 'Manual'}
                    </span>
                  </label>

                  {/* Fauna indicator (placeholder) */}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#555' }}>
                    Fauna: —
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Refresh from Fauna button (placeholder) */}
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button
            className="chip wide"
            type="button"
            disabled
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            🔄 Refresh from Fauna
          </button>
          <p style={{ fontSize: 11, color: '#555', margin: '4px 0 0' }}>
            Coming soon — will fetch live prices from Fauna
          </p>
        </div>
      </div>
    </div>
  )
}
