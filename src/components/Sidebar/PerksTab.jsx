import React from 'react'
import { motion } from 'framer-motion'

export default function PerksTab({ perkCategories, activePerks, togglePerk }) {
  return (
    <>
      {perkCategories.map(category => (
        <div key={category.title} className="perk-group">
          <h3 className="perk-group-title">{category.title}</h3>
          {category.perks.map(p => (
            <motion.button
              layout
              key={p}
              whileTap={{ scale: 0.98 }}
              className={"chip wide" + (activePerks.includes(p) ? ' active' : '')}
              onClick={() => togglePerk(p)}
              type="button"
              aria-pressed={activePerks.includes(p)}
            >
              {p}
            </motion.button>
          ))}
        </div>
      ))}
    </>
  )
}
