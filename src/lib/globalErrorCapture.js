import { reportIncident } from '@/lib/incidentReporting';

const DEDUP_WINDOW_MS = 10_000;
const seen = new Map();

function shouldReport(message) {
  const key = String(message || '').slice(0, 300);
  const now = Date.now();
  const last = seen.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return false;
  seen.set(key, now);
  // Best-effort cleanup so this Map never grows unbounded over a long session
  if (seen.size > 200) {
    for (const [k, t] of seen) {
      if (now - t > DEDUP_WINDOW_MS) seen.delete(k);
    }
  }
  return true;
}

/**
 * installGlobalErrorCapture — catches errors React's per-route ErrorBoundary
 * never sees (uncaught exceptions and unhandled promise rejections outside a
 * render pass — API failures, timeouts, third-party script errors). Uses
 * addEventListener, which coexists safely with the existing Sentry
 * `window.onerror =` / `window.onunhandledrejection =` property-assignment
 * handlers in main.jsx, and — unlike those — runs in every environment, not
 * only PROD with a configured Sentry DSN. Call once from main.jsx.
 */
export function installGlobalErrorCapture() {
  window.addEventListener('error', (event) => {
    const message = event.error?.message || event.message;
    if (!shouldReport(message)) return;
    reportIncident({
      severity: 'medium',
      source: 'frontend',
      feature: 'global-error-listener',
      errorMessage: message,
      stackTrace: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason || 'Unhandled promise rejection');
    if (!shouldReport(message)) return;
    reportIncident({
      severity: 'medium',
      source: 'frontend',
      feature: 'global-error-listener',
      errorMessage: message,
      stackTrace: reason?.stack,
    });
  });
}
