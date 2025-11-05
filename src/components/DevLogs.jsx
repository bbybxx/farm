import React from 'react'
import { motion } from 'framer-motion'
import './DevLogs.css'

export default function DevLogs({ isOpen, onClose }) {
  if (!isOpen) return null

  const logs = [
    {
      id: 3,
      date: '2025-11-05',
      title: 'New features added',
      content: 'Added dedicated development logs page, improved resource pinning with folder organization and quick pinning option, feature for entaring yhe number of resources in "locations" mode.'
    },
    {
      id: 2,
      date: '2025-08-27',
      title: 'v2.0 Release',
      content: 'New features added including advanced crafting options, improved UI, performance enhancements, exploring mode and resource tracking.'
    },
    {
      id: 1,
      date: '2025-04-24',
      title: 'Initial Release',
      content: 'First version of Craft Calculator launched with basic functionality for crafting calculations'
    }
  ]

  return (
    <motion.div
      className="modal-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="dev-logs-content glass"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dev-logs-header">
          <h2>Development Logs</h2>
          <button
            className="close-btn"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="dev-logs-list">
          {logs.length === 0 ? (
            <div className="empty-state">
              <p>No development logs yet.</p>
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="dev-log-item">
                <div className="log-date">{new Date(log.date).toLocaleDateString()}</div>
                <h3 className="log-title">{log.title}</h3>
                <div className="log-content">{log.content}</div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
