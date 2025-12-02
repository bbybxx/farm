import React from 'react'
import { motion } from 'framer-motion'
import './DevLogs.css'

export default function DevLogs({ isOpen, onClose }) {
  if (!isOpen) return null

  const logs = [
    {
      id: 7,
      date: '2025-12-02',
      title: 'Repository cleanup & public release prep',
      content: 'Prepared repository for public release: removed .example files and sensitive example configs, replaced hardcoded API endpoints with `GRAPHQL_API_ENDPOINT` environment variable across scripts and server code, updated GitHub Actions to use secrets, cleaned .gitignore, removed tracked build/cache/temp files (.vite, .local, temp JSONs) and added a comprehensive README. Changes committed (867b6c8).'
    },
    {
      id: 6,
      date: '2025-12-02',
      title: 'Navigation Simplification & Performance',
      content: 'Merged Crafts/Resources modes into unified "Crafts" mode, Simplified navigation with hasItemContent() and navigateToItem() functions, Performance optimizations: React.memo for ItemDisplay and QuestsPanel, Removed Framer Motion from list items, Added LRU caching for exploring calculations, Added useDeferredValue for smoother input handling, Fixed location mode input sync issue, Prepared repository for public release'
    },
    {
      id: 5,
      date: '2025-11-06',
      title: 'Quest Pinning & Navigation',
      content: 'Auto-created "Quests" folder, Pin buttons for quests and questlines, Quick Pin modal for questlines, Clickable pinned quests, Clickable items in quests with blue arrow indicators, Navigation from quests to Craft/Locations mode, Craft chain with quest placeholder, Quest name truncation in breadcrumbs, Quantity display repositioned'
    },
        {
      id: 4,
      date: '2025-11-05',
      title: 'Quest mode',
      content: 'Add full Quests reference mode with questlines and individual quest pages, Quest data from API (296 questlines, 1999 quests), Two-page navigation system: questline totals + quest details, Search questlines with dropdown selector, Previous/Next quest navigation, Silver displayed as item with icon'
    },
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
