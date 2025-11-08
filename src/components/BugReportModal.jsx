import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BugReportModal.css';

function BugReportModal({ isOpen, onClose, onSubmit }) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]); // Array of File objects
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('BugReportModal handleSubmit called');
    
    if (!message.trim()) {
      console.log('Message is empty, aborting');
      return;
    }

    console.log('Preparing payload:', { messageLength: message.trim().length, filesCount: files.length });
    setIsSubmitting(true);
    
    try {
      // Pass files along with the message. Convert files state (array) to FileList-like array
      const payload = { message: message.trim(), files };
      console.log('Calling onSubmit with payload');
      const result = await onSubmit(payload);
      console.log('onSubmit result:', result);
      
      if (result.success) {
        setSubmitSuccess(true);
        setSubmitResult(result);
        setMessage('');
        setFiles([]); // Clear files after successful submission
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Clear file input field
        }
        
        // Close modal after showing success message
        setTimeout(() => {
          setSubmitSuccess(false);
          setSubmitResult(null);
          onClose();
        }, 2000);
      } else {
        // Handle error - you could show an error message here
      }
    } catch (error) {
      // Error handling removed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage('');
      setFiles([]);
      setSubmitSuccess(false);
      setSubmitResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear file input field
      }
      onClose();
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    // limit to 8 files to avoid huge uploads
    const limited = selected.slice(0, 8);
    setFiles(limited);
  };

  const removeFileAt = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="bug-report-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bug-report-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bug-report-header">
              <h3>Bug Report</h3>
              <button 
                className="bug-report-close" 
                onClick={handleClose}
                disabled={isSubmitting}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            {submitSuccess ? (
              <motion.div
                className="bug-report-success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="success-icon">✓</div>
                <p>Thank you! Your bug report has been sent successfully.</p>
                {submitResult?.method === 'direct-api' && (
                  <p className="success-details">Sent via Telegram API</p>
                )}
                {submitResult?.method === 'telegram-webapp' && (
                  <p className="success-details">Sent via Telegram Web App</p>
                )}
                {submitResult?.fallback && (
                  <p className="success-details">Report logged locally</p>
                )}
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="bug-report-form">
                <div className="bug-report-content">
                  <label htmlFor="bug-message" className="bug-report-label">
                    Describe the issue you encountered:
                  </label>
                  <textarea
                    id="bug-message"
                    className="bug-report-textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please describe what went wrong, what you expected to happen, and any steps to reproduce the issue..."
                    rows="6"
                    disabled={isSubmitting}
                    autoFocus
                  />

                  <div style={{ marginTop: 12 }}>
                    <label className="bug-report-label" htmlFor="bug-files">Attach files (images, logs, etc.) — up to 8 files</label>
                    <input
                      ref={fileInputRef}
                      id="bug-files"
                      type="file"
                      multiple
                      accept="image/*,text/plain,application/json,application/zip,application/octet-stream"
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                    />

                    {files.length > 0 && (
                      <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                        {files.map((f, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {f.type.startsWith('image/') ? (
                              <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                            ) : (
                              <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', borderRadius: 8, color: '#bbb', fontSize: 12 }}>{f.name.split('.').pop()}</div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13 }}>{f.name}</div>
                              <div style={{ fontSize: 12, color: '#999' }}>{(f.size / 1024).toFixed(1)} KB</div>
                            </div>
                            <button type="button" className="bug-report-button secondary" style={{ padding: '6px 10px', minHeight: 'auto', height: 36 }} onClick={() => removeFileAt(idx)} disabled={isSubmitting}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bug-report-actions">
                  <button
                    type="button"
                    className="bug-report-button secondary"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bug-report-button primary"
                    disabled={!message.trim() || isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Report'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BugReportModal;

