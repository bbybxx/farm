import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ClearDataModals({ showClearConfirm, showClearSuccess, cancelClearData, confirmClearData }) {
  return (
    <>
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="modal-header">
                <h3>Clear All Data</h3>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to clear all saved data?</p>
                <p className="modal-warning">This will reset everything to default settings and cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn-secondary" 
                  onClick={cancelClearData}
                >
                  Cancel
                </button>
                <button 
                  className="btn-danger" 
                  onClick={confirmClearData}
                >
                  Clear All Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearSuccess && (
          <motion.div
            className="success-notification"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 20, 
              stiffness: 300 
            }}
          >
            <div className="notification-content">
              <span className="notification-icon">[OK]</span>
              <span>All data cleared! App reset to defaults.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
