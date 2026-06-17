import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// ── Error Tracking (To be enabled after installing @sentry/react) ───────────
// 1. Run: npm install @sentry/react
// 2. Add VITE_SENTRY_DSN to environment variables
// 3. Uncomment Sentry initialization code below
//
// Example:
// import * as Sentry from '@sentry/react';
// Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, tracesSampleRate: 0.2 });

// ── Service Worker Cleanup (Dev Only) ────────────────────────────────────────

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
  caches.keys().then(keys => {
    keys.forEach(key => caches.delete(key));
  });
}

// ── React Root ───────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)