import React from 'react'

export default function HistoryTab({ craftHistory, clearHistory, handleHistoryClick, setSidebarOpen }) {
  return (
    <div className="history-section">
      <div className="section-header">
        <h3>Craft History ({craftHistory.length})</h3>
        {craftHistory.length > 0 && (
          <button 
            className="chip danger"
            onClick={clearHistory}
            type="button"
            title="Clear all history"
          >
            Clear All
          </button>
        )}
      </div>
      
      <div className="history-list-sidebar">
        {craftHistory.length === 0 ? (
          <div className="empty-state">
            <p>No craft history yet.</p>
            <p>Navigate through intermediate resources to build your history.</p>
          </div>
        ) : (
          craftHistory.map(entry => (
            <button
              key={entry.id}
              className="history-item-sidebar"
              onClick={() => {
                handleHistoryClick(entry)
                setSidebarOpen(false)
              }}
              type="button"
            >
              <div className="history-main">
                <span className="from">{entry.fromItem}</span>
                <span className="arrow">→</span>
                <span className="to">{entry.toItem}</span>
                <span className="amount">×{entry.toAmount}</span>
              </div>
              <div className="history-time">
                {new Date(entry.timestamp).toLocaleDateString()}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
