// Minimal location configuration helper.
// Purpose: store per-location and per-item overrides for cider calculations.
// Storage: uses localStorage in the browser; falls back to an in-memory store when not available (so Node imports won't crash).

const STORAGE_KEY = 'ciderLocationConfigs_v1';
let memoryStore = null;

function hasLocalStorage() {
  try {
    return (typeof window !== 'undefined') && !!window.localStorage;
  } catch (e) {
    return false;
  }
}

function loadRaw() {
  if (hasLocalStorage()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('location-config: failed to parse localStorage data', e);
      return {};
    }
  }

  if (!memoryStore) memoryStore = {};
  return memoryStore;
}

function saveRaw(obj) {
  if (hasLocalStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      return;
    } catch (e) {
      console.warn('location-config: failed to write to localStorage', e);
    }
  }
  memoryStore = obj;
}

function getAllLocationConfigs() {
  return loadRaw();
}

function getLocationConfig(locationName) {
  const all = loadRaw();
  return all[locationName] || null;
}

function setLocationConfig(locationName, config) {
  const all = loadRaw();
  all[locationName] = config;
  saveRaw(all);
}

function clearLocationConfig(locationName) {
  const all = loadRaw();
  delete all[locationName];
  saveRaw(all);
}

function resetAll() {
  saveRaw({});
}

// Apply overrides to a drops dictionary. dropRates is expected to be an object with keys like
// 'rq0cs1', 'rq0cs0' etc., each with { dropsPerCider: number, ... } or numeric value.
// Returns a new object copy with overrides applied (does not mutate original).
function applyLocationOverrides(dropRates, locationName) {
  if (!dropRates) return dropRates;
  const cfg = getLocationConfig(locationName);
  if (!cfg || cfg.enabled === false) return deepClone(dropRates);

  const multiplier = typeof cfg.multiplier === 'number' ? cfg.multiplier : 1;
  const itemOverrides = cfg.items || {}; // { itemName: { enabled: true, multiplier: 0.8 } }

  const out = {};
  Object.keys(dropRates).forEach((variantKey) => {
    const variant = dropRates[variantKey];
    // variant may be an object with dropsPerCider or a number
    const base = (variant && typeof variant === 'object' && 'dropsPerCider' in variant)
      ? variant.dropsPerCider
      : (typeof variant === 'number' ? variant : null);

    if (base == null) {
      out[variantKey] = deepClone(variant);
      return;
    }

    // by default apply location multiplier; per-item overrides are applied later by callers
    const adjusted = roundTo(base * multiplier, 5);
    if (typeof variant === 'number') {
      out[variantKey] = adjusted;
    } else {
      out[variantKey] = Object.assign({}, variant, { dropsPerCider: adjusted });
    }
  });

  // NOTE: per-item multipliers are intentionally not applied here because this function lacks item context
  // but we keep the structure so callers can apply itemOverrides when an item name is available.
  out.__locationConfig = cfg || null; // attach for caller convenience
  return out;
}

function applyItemOverrideForVariant(variantValue, locationName, itemName) {
  const cfg = getLocationConfig(locationName);
  if (!cfg || !cfg.items) return variantValue;
  const itemCfg = cfg.items[itemName];
  if (!itemCfg || itemCfg.enabled === false) return variantValue;

  const base = (variantValue && typeof variantValue === 'object' && 'dropsPerCider' in variantValue)
    ? variantValue.dropsPerCider
    : (typeof variantValue === 'number' ? variantValue : null);
  if (base == null) return variantValue;
  const m = typeof itemCfg.multiplier === 'number' ? itemCfg.multiplier : 1;
  const adjusted = roundTo(base * m, 5);
  if (typeof variantValue === 'number') return adjusted;
  return Object.assign({}, variantValue, { dropsPerCider: adjusted });
}

// Helpers
function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function roundTo(n, decimals = 5) {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

export {
  getAllLocationConfigs,
  getLocationConfig,
  setLocationConfig,
  clearLocationConfig,
  resetAll,
  applyLocationOverrides,
  applyItemOverrideForVariant,
};
