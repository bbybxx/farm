import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function FolderConfigModal({
  isOpen,
  onClose,
  pinnedFolders,
  pinnedResources,
  pinnedQuests,
  editingFolderId,
  setEditingFolderId,
  folderNameInput,
  setFolderNameInput,
  renameFolder,
  deletingFolderId,
  setDeletingFolderId,
  deleteFolder,
  isCreatingFolder,
  setIsCreatingFolder,
  createFolder
}) {
  const handleClose = () => {
    onClose()
    setEditingFolderId(null)
    setIsCreatingFolder(false)
    setFolderNameInput('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="modal glass folder-config-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            transition={{ duration: 0.2 }}
          >
            <div className="modal-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                Manage Pinning Folders
              </h3>
            </div>
            <div className="modal-body">
              <div className="folder-list">
                {pinnedFolders.map(folder => (
                  <div key={folder.id} className="folder-config-item">
                    {editingFolderId === folder.id ? (
                      <div className="folder-edit-input-wrapper">
                        <input
                          type="text"
                          className="folder-name-input"
                          value={folderNameInput}
                          onChange={(e) => setFolderNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && folderNameInput.trim()) {
                              renameFolder(folder.id, folderNameInput)
                              setEditingFolderId(null)
                              setFolderNameInput('')
                            } else if (e.key === 'Escape') {
                              setEditingFolderId(null)
                              setFolderNameInput('')
                            }
                          }}
                          autoFocus
                          placeholder="Folder name"
                        />
                        <button
                          className="folder-input-btn confirm"
                          onClick={() => {
                            if (folderNameInput.trim()) {
                              renameFolder(folder.id, folderNameInput)
                              setEditingFolderId(null)
                              setFolderNameInput('')
                            }
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </button>
                        <button
                          className="folder-input-btn cancel"
                          onClick={() => {
                            setEditingFolderId(null)
                            setFolderNameInput('')
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="folder-config-info">
                          <span className="folder-config-name">{folder.name}</span>
                          <span className="folder-config-count">
                            {folder.id === 'quests' 
                              ? `${pinnedQuests.filter(q => (q.folderId || 'quests') === 'quests').length} quests`
                              : `${pinnedResources.filter(item => (item.folderId || 'default') === folder.id).length} items`
                            }
                          </span>
                        </div>
                        <div className="folder-config-actions">
                          <button
                            className="folder-config-btn"
                            onClick={() => {
                              setEditingFolderId(folder.id)
                              setFolderNameInput(folder.name)
                            }}
                            title="Rename folder"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          {folder.id !== 'default' && !folder.isSystemFolder && (
                            deletingFolderId === folder.id ? (
                              <div className="folder-delete-confirm">
                                <span className="folder-delete-message">Delete "{folder.name}"?</span>
                                <button
                                  className="folder-input-btn folder-input-confirm"
                                  onClick={() => {
                                    deleteFolder(folder.id)
                                    setDeletingFolderId(null)
                                  }}
                                  title="Confirm delete"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </button>
                                <button
                                  className="folder-input-btn folder-input-cancel"
                                  onClick={() => setDeletingFolderId(null)}
                                  title="Cancel"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                className="folder-config-btn danger"
                                onClick={() => setDeletingFolderId(folder.id)}
                                title="Delete folder"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {/* Create new folder inline */}
                {isCreatingFolder && (
                  <div className="folder-config-item creating">
                    <div className="folder-edit-input-wrapper">
                      <input
                        type="text"
                        className="folder-name-input"
                        value={folderNameInput}
                        onChange={(e) => setFolderNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && folderNameInput.trim()) {
                            createFolder(folderNameInput)
                            setIsCreatingFolder(false)
                            setFolderNameInput('')
                          } else if (e.key === 'Escape') {
                            setIsCreatingFolder(false)
                            setFolderNameInput('')
                          }
                        }}
                        autoFocus
                        placeholder="New folder name"
                      />
                      <button
                        className="folder-input-btn confirm"
                        onClick={() => {
                          if (folderNameInput.trim()) {
                            createFolder(folderNameInput)
                            setIsCreatingFolder(false)
                            setFolderNameInput('')
                          }
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </button>
                      <button
                        className="folder-input-btn cancel"
                        onClick={() => {
                          setIsCreatingFolder(false)
                          setFolderNameInput('')
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {!isCreatingFolder && (
                <button
                  className="chip wide"
                  onClick={() => {
                    setIsCreatingFolder(true)
                    setFolderNameInput('')
                  }}
                  type="button"
                >
                  + Create New Folder
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
