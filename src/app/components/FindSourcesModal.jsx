import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getItemLocations, computePinnedEstimate } from '../../utils/exploringUtils.js'
import LocationImage from '../../components/LocationImage.jsx'

export default function FindSourcesModal({ isOpen, onClose, resourceName, amount, results = [], onUse, exploringMode = 'Apple Cider', activePerks = [], selectedLocation = null }) {
  // Ensure location-type results appear: merge any locations from data that aren't present in results
  const fallbackLocs = (typeof getItemLocations === 'function') ? (getItemLocations(resourceName) || []) : []
  const existingLocNames = new Set(results.filter(r => r && r.kind === 'location' && r.location).map(r => r.location))
  const missingLocResults = fallbackLocs.filter(l => !existingLocNames.has(l.name)).map(l => ({ kind: 'location', location: l.name, hasData: false }))
  // Also extract best-location suggestions from any craft breakdowns (chosen.bestLocation)
  // dedupe by location name
  const seenLocKeys = new Set(existingLocNames)
  const craftDerivedLocs = []
  ;(results || []).forEach(r => {
    if (r && r.kind === 'craft' && Array.isArray(r.breakdown)) {
      r.breakdown.forEach(entry => {
        const chosen = entry && entry.chosen
        if (!chosen) return
        const best = chosen.bestLocation || (chosen.location ? { location: chosen.location, perUnit: chosen.perUnit || null, requiredBudget: chosen.requiredBudget || null, mode: chosen.mode || null, apNeeded: chosen.apNeeded || null, cidersNeeded: chosen.cidersNeeded || null, totalStamina: chosen.totalStamina || null } : null)
        if (!best || !best.location) return
  const key = best.location
  if (seenLocKeys.has(key)) return
  seenLocKeys.add(key)
        craftDerivedLocs.push({ kind: 'location', location: best.location, hasData: true, perUnit: best.perUnit, requiredBudget: best.requiredBudget, apNeeded: best.apNeeded, cidersNeeded: best.cidersNeeded, totalStamina: best.totalStamina, mode: best.mode, note: entry.ingredient || null })
      })
    }
  })

  const displayResults = (results || []).concat(missingLocResults, craftDerivedLocs)
  // Also include locations for individual ingredients used by crafts (useful when final product is craft-only)
  const ingredientLocs = []
  ;(results || []).forEach(r => {
    if (r && r.kind === 'craft' && Array.isArray(r.breakdown)) {
      r.breakdown.forEach(entry => {
        const ing = entry && entry.ingredient
        if (!ing) return
        try {
          const locsForIng = getItemLocations(ing) || []
          locsForIng.forEach(l => {
            if (!l || !l.name) return
            if (seenLocKeys.has(l.name)) return
            seenLocKeys.add(l.name)
            ingredientLocs.push({ kind: 'location', location: l.name, hasData: false, note: `for ${ing}` })
          })
        } catch (e) {
          // ignore
        }
      })
    }
  })

  const finalDisplayResults = displayResults.concat(ingredientLocs)
  const craftPresent = (results || []).some(r => r && r.kind === 'craft')
  const displayArray = craftPresent ? (results || []).filter(r => r && r.kind === 'craft') : finalDisplayResults

  try {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
          className="modal-wrapper"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            className="glass modal-content"
            role="dialog"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 780 }}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            <h2>Find sources — {resourceName} ×{amount}</h2>
        <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ width: '40%' }}>Source</th>
                <th style={{ width: '18%' }}>Budget</th>
                <th>Notes / breakdown</th>
              </tr>
            </thead>
            <tbody>
              {displayArray.map((r, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '8px 6px', display: 'flex', alignItems: 'center' }}>
                    {r.kind === 'location' ? (
                      <>
                        <LocationImage name={r.location} size={28} />
                        <span>{r.location}</span>
                      </>
                    ) : (r.kind === 'craft' ? `Craft: ${r.recipe}` : "")}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    {r.hasData === false ? 'No data' : (
                      // Prefer labels based on exploringMode: AP -> show AP counts, AC -> show AC + stamina, otherwise show stamina or numeric budget
                      exploringMode === 'Arnold Palmer' ? (
                        // show AP if present, else fall back to requiredBudget as AP, else stamina
                        r.apNeeded != null ? `${r.apNeeded} AP` : (r.requiredBudget != null ? `${r.requiredBudget} AP` : (r.staminaBudget != null ? `${r.staminaBudget} stamina` : '—'))
                      ) : exploringMode === 'Apple Cider' ? (
                        // show cider count if available, and include total stamina if we have it; else prefer stamina
                        r.cidersNeeded != null ? `${r.cidersNeeded} AC${r.totalStamina != null ? ` + ${r.totalStamina} stamina` : ''}` : (r.totalStamina != null ? `${r.totalStamina} stamina` : (r.staminaBudget != null ? `${r.staminaBudget} stamina` : (r.requiredBudget != null ? String(r.requiredBudget) : '—')))
                      ) : (
                        // Manual/other modes: show stamina if available, otherwise requiredBudget
                        r.staminaBudget != null ? `${r.staminaBudget} stamina` : (r.requiredBudget != null ? String(r.requiredBudget) : '—')
                      )
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', color: '#667' }}>
                    {r.kind === 'location' && (r.variant ? r.variant : (r.hasData === false ? 'No data' : ''))}
                    {r.kind === 'craft' && (
                      <div>
                        {r.breakdown && r.breakdown.length > 0 ? (
                          <div style={{ fontSize: 12 }}>
                            {(() => {
                              // Aggregate base materials from the breakdown recursively (kept for fallback)
                              const acc = {}
                              function collectFromEntries(entries) {
                                entries.forEach(e => {
                                  const chosen = e.chosen
                                  if (!chosen) {
                                    acc[e.ingredient] = acc[e.ingredient] || { totalQty: 0, sources: [] }
                                    acc[e.ingredient].totalQty += e.qtyNeeded || 0
                                    acc[e.ingredient].sources.push({ kind: 'unknown' })
                                    return
                                  }
                                  if (chosen.method === 'farm' || chosen.method === 'base') {
                                    const name = chosen.item || e.ingredient
                                    acc[name] = acc[name] || { totalQty: 0, sources: [] }
                                    acc[name].totalQty += e.qtyNeeded || 0
                                    acc[name].sources.push({ kind: chosen.method, location: chosen.location, stamina: chosen.staminaBudget != null ? chosen.staminaBudget : (chosen.budget != null ? chosen.budget : null), apNeeded: chosen.apNeeded, cidersNeeded: chosen.cidersNeeded, totalStamina: chosen.totalStamina, mode: chosen.mode, bestLocation: chosen.bestLocation })
                                  } else if (chosen.method === 'craft' && Array.isArray(chosen.children)) {
                                    collectFromEntries(chosen.children)
                                  } else {
                                    acc[e.ingredient] = acc[e.ingredient] || { totalQty: 0, sources: [] }
                                    acc[e.ingredient].totalQty += e.qtyNeeded || 0
                                    acc[e.ingredient].sources.push({ kind: 'unknown' })
                                  }
                                })
                              }
                              collectFromEntries(r.breakdown)

                              // build candidates for best overall location for this craft
                              const candidates = [];
                              (r.breakdown || []).forEach(entry => {
                                const chosen = entry && entry.chosen
                                const qtyNeeded = entry && (entry.qtyNeeded || entry.qty || 1)
                                if (chosen) {
                                  const best = chosen.bestLocation || (chosen.location ? { location: chosen.location, apNeeded: chosen.apNeeded, cidersNeeded: chosen.cidersNeeded, totalStamina: chosen.totalStamina, requiredBudget: chosen.requiredBudget, mode: chosen.mode } : null)
                                  if (best && best.location) {
                                    // if best lacks numeric scoring, try to enrich via computePinnedEstimate
                                    if ((best.apNeeded == null && best.cidersNeeded == null && best.totalStamina == null) && typeof computePinnedEstimate === 'function') {
                                      try {
                                        const est = computePinnedEstimate({ name: entry.ingredient, location: best.location }, qtyNeeded, activePerks || [], exploringMode)
                                        if (est && est.location) {
                                          candidates.push(Object.assign({ location: best.location }, est))
                                        } else {
                                          candidates.push(best)
                                        }
                                      } catch (e) {
                                        candidates.push(best)
                                      }
                                    } else {
                                      candidates.push(best)
                                    }
                                  }
                                }
                                try {
                                  const ingLocs = getItemLocations(entry.ingredient) || []
                                  ingLocs.forEach(l => {
                                    try {
                                      const est = (typeof computePinnedEstimate === 'function') ? computePinnedEstimate({ name: entry.ingredient, location: l.name }, qtyNeeded, activePerks || [], exploringMode) : null
                                      if (est && est.location) candidates.push(Object.assign({ location: l.name }, est))
                                      else candidates.push({ location: l.name })
                                    } catch (e) {
                                      candidates.push({ location: l.name })
                                    }
                                  })
                                } catch (e) {}
                              })

                              function scoreLoc(loc) {
                                if (!loc) return Infinity
                                if (exploringMode === 'Arnold Palmer' && typeof loc.apNeeded === 'number') return loc.apNeeded
                                if (exploringMode === 'Apple Cider' && typeof loc.cidersNeeded === 'number') return loc.cidersNeeded
                                if (typeof loc.totalStamina === 'number') return loc.totalStamina
                                if (typeof loc.requiredBudget === 'number') return loc.requiredBudget
                                return Infinity
                              }

                              let bestCandidate = null
                              let bestScore = Infinity
                              candidates.forEach(c => {
                                const s = scoreLoc(c)
                                if (s < bestScore) { bestScore = s; bestCandidate = c }
                              })

                              // Prefer showing per-material best locations (chosen.bestLocation) when crafts require farmed bases.
                              return Object.keys(acc).map((mat, mi) => {
                                const info = acc[mat]
                                const amt = info.totalQty
                                const primary = info.sources.find(s => s.location || s.bestLocation) || info.sources[0]
                                let locPart = ''
                                let valuePart = ''

                                // prefer explicit bestLocation on the per-ingredient chosen plan
                                if (primary && primary.bestLocation) {
                                  const bl = primary.bestLocation
                                  locPart = bl.location || ''
                                  if (bl.apNeeded != null && exploringMode === 'Arnold Palmer') valuePart = `${bl.apNeeded} AP`
                                  else if (bl.cidersNeeded != null) valuePart = `${bl.cidersNeeded} AC${bl.totalStamina != null ? ` + ${bl.totalStamina} stamina` : ''}`
                                  else if (bl.totalStamina != null) valuePart = `${bl.totalStamina} stamina`
                                  else if (bl.requiredBudget != null) valuePart = `${bl.requiredBudget}`
                                } else if (primary && primary.location) {
                                  locPart = primary.location
                                  if (primary.apNeeded != null && exploringMode === 'Arnold Palmer') valuePart = `${primary.apNeeded} AP`
                                  else if (primary.cidersNeeded != null) valuePart = `${primary.cidersNeeded} AC${primary.totalStamina != null ? ` + ${primary.totalStamina} stamina` : ''}`
                                  else if (primary.stamina != null) valuePart = `${primary.stamina} stamina`
                                } else {
                                  // try to find a fallback via computePinnedEstimate for this material (best location/value)
                                  try {
                                    const est = computePinnedEstimate({ name: mat, location: selectedLocation }, amt, activePerks || [], exploringMode)
                                    if (est) {
                                      // est may be mode-specific and include location/apNeeded/cidersNeeded/totalStamina
                                      locPart = est.location || locPart
                                      if (est.mode === 'AC' || exploringMode === 'Apple Cider') {
                                        if (est.cidersNeeded != null) valuePart = `${est.cidersNeeded} AC${est.totalStamina != null ? ` + ${est.totalStamina} stamina` : ''}`
                                      } else if (est.mode === 'AP' || exploringMode === 'Arnold Palmer') {
                                        if (est.apNeeded != null) valuePart = `${est.apNeeded} AP`
                                      } else {
                                        if (est.stamina != null) valuePart = `${est.stamina} stamina`
                                        else if (est.explores != null) valuePart = `${est.explores} explores`
                                      }
                                    } else {
                                      const locs = getItemLocations(mat) || []
                                      if (locs && locs.length > 0) locPart = locs[0].name
                                    }
                                  } catch (e) {
                                    try {
                                      const locs = getItemLocations(mat) || []
                                      if (locs && locs.length > 0) locPart = locs[0].name
                                    } catch (e2) {}
                                  }
                                }

                                const parts = [`${mat}: ${amt}`]
                                if (locPart) parts.push(`${locPart}${info.note ? ` (${info.note})` : ''}`)
                                if (valuePart) parts.push(valuePart)
                                return (<div key={mi}>{parts.join(' — ')}</div>)
                              })
                            })()}
                          </div>
                        ) : '—'}
                      </div>
                    )}
                  </td>
                  {/* removed Use button cell per request */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="chip" onClick={onClose}>Close</button>
        </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    )
  } catch (err) {
    // Prevent modal from crashing the entire app; log and show safe fallbackreturn (
      <div className="modal-wrapper glass modal-content" role="dialog">
        <h2>Find sources — {resourceName} ×{amount}</h2>
        <div style={{ padding: 12, color: '#a33' }}>Error while computing sources. Please check console for details.</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="chip" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }
}

