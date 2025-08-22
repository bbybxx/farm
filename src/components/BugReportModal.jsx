import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BugReportModal.css';

function BugReportModal({ isOpen, onClose, onSubmit }) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await onSubmit(message.trim());
      
      if (result.success) {
        setSubmitSuccess(true);
        setSubmitResult(result);
        setMessage('');
        
        // Close modal after showing success message
        setTimeout(() => {
          setSubmitSuccess(false);
          setSubmitResult(null);
          onClose();
        }, 2000);
      } else {
        // Handle error - you could show an error message here
        console.error('Failed to submit bug report:', result.error);
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage('');
      setSubmitSuccess(false);
      setSubmitResult(null);
      onClose();
    }
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
