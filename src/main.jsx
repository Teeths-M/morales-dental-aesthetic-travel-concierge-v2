import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from '@/App.jsx'
import '@/index.css'
import { syncPauseFromServer, isSystemPaused, applyPauseIntercept } from '@/lib/systemPause'

// ── Sentry Error Tracking (Production Only) ──────────────────────────────────

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN && import.meta.env.PROD) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.2, // 20% sampling for free tier
    enableTracing: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      if (import.meta.env.DEV) {
        console.log('[Sentry] Error captured (dev mode, not sent):', event.message);
        return null;
      }
      return event;
    },
  });
}

// ── Global Error Handlers (Safety Net) ───────────────────────────────────────

if (import.meta.env.PROD && SENTRY_DSN) {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[Global Error]', { message, source, lineno, colno, error });
    Sentry.captureException(error || new Error(message));
  };

  window.onunhandledrejection = (event) => {
    console.error('[Unhandled Rejection]', event.reason);
    Sentry.captureException(event.reason || new Error('Unhandled promise rejection'));
  };
}

// ── Service Worker Cleanup (Dev Only) ────────────────────────────────────────
// Must complete BEFORE React mounts — stale SW cache can serve old JS with a
// null React instance, causing "Cannot read properties of null (reading 'useState')"

async function mountApp() {
  // Sync pause state from server BEFORE mounting — so phones/tablets automatically
  // pick up the paused state set on any other device. Zero integration credits used.
  await syncPauseFromServer().catch(() => {});

  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    } catch (_) { /* ignore — best effort */ }
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

mountApp();

// ── Mobile/Tablet: re-sync pause state every time the app returns to foreground ──
// Scenario: admin pauses on laptop while phone is backgrounded. Without this,
// the phone has no way to learn about the pause until the next cold start.
// BroadcastChannel handles same-browser tabs instantly (<10ms).
// visibilitychange + server sync handles cross-device (laptop → phone).
let _lastVisibilitySync = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  // 1. Belt-and-suspenders: re-apply from localStorage instantly (works offline)
  if (isSystemPaused()) applyPauseIntercept();
  // 2. Throttle: only hit the server once per 30 seconds to avoid spam
  const now = Date.now();
  if (now - _lastVisibilitySync < 30_000) return;
  _lastVisibilitySync = now;
  syncPauseFromServer().catch(() => {});
});

// Register service worker in production for offline tile caching + app shell
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}