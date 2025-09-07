import React, { useState, useEffect } from 'react';
import CustomListbox from '../components/CustomListbox.jsx';
import LocationImage from './LocationImage.jsx'
import {
  getAllLocationConfigs,
  getLocationConfig,
  setLocationConfig,
} from '../data/location-config';

function SmallNumberInput({ value, onChange }) {
  return (
    <input
      type="number"
      min="0"
      step="0.01"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={{ width: 80 }}
    />
  );
}

export default function LocationConfigPanel({ locations = [], onClose }) {
  const [configs, setConfigs] = useState({});
  const [selected, setSelected] = useState(locations && locations[0] ? locations[0].name : '');
  const [localCfg, setLocalCfg] = useState(null);
  const [localInput, setLocalInput] = useState('');

  useEffect(() => {
    setConfigs(getAllLocationConfigs());
  }, []);

  useEffect(() => {
    const existing = getLocationConfig(selected) || {};
    // Ensure structure: multiplier and exploringEffectiveness (EE)
    const initial = Object.assign({ multiplier: existing.multiplier ?? 1, exploringEffectiveness: existing.exploringEffectiveness ?? 1 }, existing);
    setLocalCfg(initial);
  }, [selected]);

  // keep input display in sync with localCfg; allow empty string for visual clearing
  useEffect(() => {
    if (!localCfg) return
    setLocalInput(localCfg.exploringEffectiveness != null ? String(localCfg.exploringEffectiveness) : '')
  }, [localCfg])

  function persist(cfg) {
    // immediate save to storage
    try {
      setLocationConfig(selected, cfg)
    } catch (e) {
      // ignore
    }
    setConfigs(getAllLocationConfigs());
    setLocalCfg(cfg);
  }

  const loc = locations.find((l) => l.name === selected) || { name: selected };

  // Compute explores per cider from Exploring Effectiveness (EE)
  // According to the provided chart:
  // - Without Cinnamon: explores = 1000 + EE * 10
  // - With Cinnamon: explores = round(1250 + EE * 12.5)
  // We treat the cider baseline for Cinnamon as 1250 when computing multiplier.
  function computesFromEE(ee) {
    const eeNum = Number(ee) || 0;
    const withoutCinnamon = 1000 + eeNum * 10;
    const withCinnamon = Math.round(1250 + eeNum * 12.5);
    const multiplier = withCinnamon / 1250; // multiplier to apply to BF cider-based rates
    return { ee: eeNum, withoutCinnamon, withCinnamon, multiplier };
  }

  return (
    <div className="location-config-panel" style={{ padding: 12, width: 560, maxWidth: '100%' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <CustomListbox
          options={locations.map(l => l.name)}
          value={selected}
          onChange={(v) => setSelected(v)}
          ariaLabel="Select location"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LocationImage name={selected} size={26} />
          <div style={{ fontSize: 13, color: '#666' }}>Changes are saved automatically</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ minWidth: 140 }}>Exploring Effectiveness (EE)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={localInput}
                onChange={(e) => {
                  // allow clearing the field (empty string) for user convenience
                  setLocalInput(e.target.value)
                }}
                onBlur={() => {
                  // on blur commit value; empty means default 1
                  const raw = (localInput || '').toString().trim()
                  const eeVal = raw === '' ? 1 : (parseInt(raw) || 1)
                  const calc = computesFromEE(eeVal)
                  const next = Object.assign({}, localCfg || {}, { exploringEffectiveness: calc.ee, multiplier: calc.multiplier });
                  persist(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const raw = (localInput || '').toString().trim()
                    const eeVal = raw === '' ? 1 : (parseInt(raw) || 1)
                    const calc = computesFromEE(eeVal)
                    const next = Object.assign({}, localCfg || {}, { exploringEffectiveness: calc.ee, multiplier: calc.multiplier });
                    persist(next);
                  }
                }}
                style={{ width: 80 }}
              />
              <span style={{ marginLeft: 8 }}>
                {/* info removed per design request */}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
