import './silence-console.js' // Silence all console output in production
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import './app/app.css'
import './styles/ios-pwa-fix.css'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('[PWA] App is ready for offline use!')
  },
  onUpdate: (registration) => {
    console.log('[PWA] New version available!')
    // Auto-update the service worker
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }
})
