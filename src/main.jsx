import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './new-app/App.jsx'
import './new-app/app.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
