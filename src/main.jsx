import './silence-console.js' // Silence all console output in production
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { EconomyProvider } from './plugins/economy/EconomyContext'
import './app/app.css'
import './styles/ios-pwa-fix.css'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <EconomyProvider>
      <App />
    </EconomyProvider>
  </React.StrictMode>
)

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: () => {},
  onUpdate: (registration) => {// Auto-update the service worker
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }
})

