import { motion, AnimatePresence } from 'framer-motion'

export default function GoldCoinButton({
  itemCount = 0,
  onClick,
  isActive = false,
}) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.button
          className={`gold-coin-button${isActive ? ' active' : ''}`}
          onClick={onClick}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.15 }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 700,
            color: '#fff',
            zIndex: 1000,
            boxShadow: isActive
              ? '0 4px 14px rgba(255, 179, 0, 0.4)'
              : 'none',
            background: isActive ? '#FFB300' : 'var(--button-disabled, #636363)',
            opacity: isActive ? 1 : 0.5,
            pointerEvents: isActive ? 'auto' : 'none',
          }}
        >
          <span>💰</span>
          {itemCount > 0 && (
            <span className="coin-count" style={{ fontSize: '12px' }}>
              {itemCount}
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
