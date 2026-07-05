/**
 * EconomyPriceConfigModal.jsx
 * Панель настройки цен для экономического режима.
 * Раскрывается как inline-аккордеон под кнопкой "⚙ Configure Prices" в SettingsTab.
 *
 * Показывает ВСЕ предметы из prices.json (community prices), кроме PC.
 * Цены парсятся из строкового формата buddy.farm (например "17.5-20g/k") в { value, divisor }.
 * Поиск, inline-редактирование, тоггл Auto (priceRefreshable).
 * Кнопка "Update" — применяет цены из prices.json для предметов с Auto=true.
 *
 * В колонке Item показывается только иконка предмета (без названия).
 * Поиск поддерживает двойные скобки ((...)) — они игнорируются.
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import ItemDisplay from '../../../components/ItemDisplay'
import itemsAPI from '../../../data/items-api.json' with { type: 'json' }
import { normalizeItemsMap } from '../../../utils/itemImageUtils'
import { formatNumberRounded } from '../../../utils/formatters'
import { parseItemPrices } from '../utils/parsePriceString'
import communityPrices from '../../../../prices.json'

const STATIC_ITEMS_MAP = normalizeItemsMap(itemsAPI)

/**
 * Парсит prices.json в плоский объект { "Item Name": { gold: {value, divisor}, ap: ..., oj: ... } }
 * Пропускает PC-предметы.
 */
function parseCommunityPrices() {
  const result = {}
  if (!communityPrices?.items) return result
  for (const item of communityPrices.items) {
    if (item.PC) continue
    // Убираем суффикс вида " (<i>meal</i>)" целиком, чтобы имена совпадали с items-api.json
    const name = item.name.replace(/\s*\(<i>[^<]*<\/i>\)/g, '').trim()
    result[name] = parseItemPrices(item)
  }
  return result
}

const BUILTIN_PRICES = parseCommunityPrices()
const BUILTIN_ITEM_NAMES = Object.keys(BUILTIN_PRICES).sort((a, b) => a.localeCompare(b))

/**
 * Проверяет, есть ли у предмета хотя бы одна цена с divisor === 1000 (/k).
 */
function hasKPrice(itemName) {
  const p = BUILTIN_PRICES[itemName]
  if (!p) return false
  return (p.gold?.divisor === 1000) || (p.ap?.divisor === 1000) || (p.oj?.divisor === 1000)
}

/**
 * Убирает двойные скобки ((...)) из строки, если они есть.
 * Если строка начинается с (( и заканчивается на )), возвращает содержимое внутри.
 * Иначе возвращает исходную строку.
 * Примеры:
 *   "((apple))" → "apple"
 *   "(apple"    → "(apple"
 *   "apple)"    → "apple)"
 *   "(((apple)))" → "(((apple)))"
 *   "((apple)"  → "((apple)"
 */
function stripDoubleParens(str) {
  const match = str.match(/^\(\((.+)\)\)$/)
  return match ? match[1] : str
}

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Object<string, {gold?: {value: number|null, divisor: number}, ap?: ..., oj?: ...}>} props.prices
 * @param {(itemName: string, currencyType: 'gold'|'ap'|'oj', value: number|null) => void} props.setPrice
 * @param {Object<string, boolean>} props.priceRefreshable
 * @param {(itemName: string, bool: boolean) => void} props.setPriceRefreshable
 * @param {() => void} props.onUpdateFromBuiltin — применить цены из prices.json для Auto-предметов
 */
export default function EconomyPriceConfigModal({
  isOpen,
  onClose,
  prices = {},
  setPrice,
  priceRefreshable = {},
  setPriceRefreshable,
  onUpdateFromBuiltin,
}) {
  const [search, setSearch] = useState('')
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  // Фильтр по поиску
  const filteredItems = useMemo(() => {
    if (!search.trim()) return BUILTIN_ITEM_NAMES
    const q = stripDoubleParens(search.trim().toLowerCase())
    return BUILTIN_ITEM_NAMES.filter(name => name.toLowerCase().includes(q))
  }, [search])

  const pricedCount = useMemo(() => {
    return Object.keys(prices).length
  }, [prices])

  const startEdit = useCallback((itemName, currency) => {
    const current = prices[itemName]?.[currency]
    // Показываем сырое value (без деления на divisor)
    setEditingCell({ itemName, currency })
    setEditValue(current?.value != null ? String(current.value) : '')
  }, [prices])

  const commitEdit = useCallback(() => {
    if (!editingCell) return
    const { itemName, currency } = editingCell
    const trimmed = editValue.trim()
    const value = trimmed === '' ? null : Number(trimmed)
    const finalValue = (value != null && !isNaN(value)) ? value : null
    // Сохраняем как { value, divisor: 1 } — пользователь вводит per-unit цену
    setPrice(itemName, currency, finalValue != null ? { value: finalValue, divisor: 1 } : null)
    setEditingCell(null)
    setEditValue('')
  }, [editingCell, editValue, setPrice])

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') commitEdit()
    else if (e.key === 'Escape') cancelEdit()
  }, [commitEdit, cancelEdit])

  if (!isOpen) return null

  return (
    <div className="glass" style={{ padding: '1rem', marginTop: '0.5rem', borderRadius: '8px' }}>
      {/* Хедер */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Price Configuration</span>
        <button
          className="chip"
          onClick={onClose}
          type="button"
          style={{ fontSize: '0.8rem', padding: '2px 8px' }}
        >
          ✕
        </button>
      </div>

      {/* Поиск + кнопка Update */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <input
            className="input"
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
        </div>
        <button
          className="chip"
          onClick={onUpdateFromBuiltin}
          type="button"
          style={{ fontSize: '0.8rem' }}
          title="Apply prices from prices.json for items with Auto enabled"
        >
          🔄 Update
        </button>
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
          {pricedCount} items with prices
        </span>
      </div>

      {/* Таблица */}
      <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        {filteredItems.length === 0 ? (
          <div style={{ padding: '12px 0', textAlign: 'center', color: '#9aa', fontSize: '0.85rem' }}>
            {search
              ? 'No items match your search.'
              : 'No items loaded.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600, opacity: 0.7 }}>Item</th>
                <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, opacity: 0.7, width: 80 }}>Gold</th>
                <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, opacity: 0.7, width: 80 }}>Arnold Palmer (AP)</th>
                <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, opacity: 0.7, width: 80 }}>Orange Juice (OJ)</th>
                <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 600, opacity: 0.7, width: 60 }}>Auto</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(itemName => {
                const itemPrice = prices[itemName] || {}
                const isRefreshable = priceRefreshable[itemName] !== false

                return (
                  <tr
                    key={itemName}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <ItemDisplay itemName={itemName} itemsData={STATIC_ITEMS_MAP} showName={false} enableBuddyFarmLinks />
                        {hasKPrice(itemName) && (
                          <span style={{ fontSize: '10px', opacity: 0.5, userSelect: 'none' }}>/k</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                      {renderCell(itemName, 'gold', itemPrice.gold?.value, editingCell, editValue, startEdit, commitEdit, cancelEdit, handleKeyDown, inputRef, setEditValue)}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                      {renderCell(itemName, 'ap', itemPrice.ap?.value, editingCell, editValue, startEdit, commitEdit, cancelEdit, handleKeyDown, inputRef, setEditValue)}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                      {renderCell(itemName, 'oj', itemPrice.oj?.value, editingCell, editValue, startEdit, commitEdit, cancelEdit, handleKeyDown, inputRef, setEditValue)}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isRefreshable}
                        onChange={e => {
                          if (setPriceRefreshable) {
                            setPriceRefreshable(itemName, e.target.checked)
                          }
                        }}
                        style={{ cursor: 'pointer', margin: 0 }}
                        title={isRefreshable ? 'Will be updated from prices.json' : 'Protected from updates'}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function renderCell(itemName, currency, value, editingCell, editValue, startEdit, commitEdit, cancelEdit, handleKeyDown, inputRef, setEditValue) {
  const isEditing = editingCell && editingCell.itemName === itemName && editingCell.currency === currency

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="input"
        type="text"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          minWidth: 50,
          padding: '1px 4px',
          fontSize: '0.8rem',
          textAlign: 'right',
          boxSizing: 'border-box',
        }}
      />
    )
  }

  return (
    <button
      onClick={() => startEdit(itemName, currency)}
      type="button"
      style={{
        background: 'none',
        border: 'none',
        color: value != null ? 'inherit' : 'rgba(255,255,255,0.25)',
        cursor: 'pointer',
        padding: '1px 4px',
        fontSize: '0.8rem',
        textAlign: 'right',
        width: '100%',
        borderRadius: 3,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
      title="Click to edit"
    >
      {value != null ? formatNumberRounded(value) : '—'}
    </button>
  )
}
