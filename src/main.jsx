import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Unregister all service workers and clear caches in dev to prevent stale JS
// from breaking React hooks (e.g. "Cannot read properties of null reading 'useRef'")
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
  caches.keys().then(keys => {
    keys.forEach(key => caches.delete(key));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)