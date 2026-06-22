/**
 * Error Tracking Service
 * 
 * Client-side error tracking with Sentry.
 * Install required packages first: @sentry/react, @sentry/tracing
 * 
 * Setup:
 * 1. npm install @sentry/react @sentry/tracing
 * 2. Add VITE_SENTRY_DSN to environment variables
 * 3. Import and initialize in main.jsx
 * 
 * Usage in main.jsx:
 *   import { initErrorTracking, setUserContext } from '@/lib/errorTracking';
 *   initErrorTracking();
 *   // After user logs in:
 *   setUserContext({ id: user.id });
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
let Sentry = null;

/**
 * Initialize Sentry error tracking
 * Call this in main.jsx before rendering App
 */
export function initErrorTracking() {
  if (!SENTRY_DSN || import.meta.env.DEV) {
    console.log('[ErrorTracking] Disabled (no DSN or dev mode)');
    return;
  }

  try {
    // Lazy load Sentry to avoid blocking initial render
    import('@sentry/react').then((sentryModule) => {
      Sentry = sentryModule;
      
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.2, // 20% sampling for free tier
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        enableTracing: true,
        replaysSessionSampleRate: 0.1, // 10% for sessions
        replaysOnErrorSampleRate: 1.0, // 100% for error sessions
      });

      // Setup global error handlers
      setupGlobalHandlers();
      
      console.log('[ErrorTracking] Sentry initialized');
    });
  } catch (error) {
    console.error('[ErrorTracking] Failed to initialize:', error);
  }
}

/**
 * Setup global error handlers
 */
function setupGlobalHandlers() {
  if (!Sentry) return;

  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[Global Error]', { message, source, lineno, colno, error });
    Sentry.captureException(error || new Error(message));
  };

  window.onunhandledrejection = (event) => {
    console.error('[Unhandled Rejection]', event.reason);
    Sentry.captureException(event.reason || new Error('Unhandled promise rejection'));
  };
}

/**
 * Set user context for error tracking
 * Call after user logs in
 * 
 * @param {Object} user - User object with id
 */
export function setUserContext(user) {
  if (!Sentry || !user) return;
  
  try {
    Sentry.setUser({ 
      id: user.id,
      // Never include PII: email, name, etc.
    });
  } catch (error) {
    console.error('[ErrorTracking] Failed to set user context:', error);
  }
}

/**
 * Capture a custom error
 * 
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
export function captureError(error, context = {}) {
  if (!Sentry) {
    console.error('[ErrorTracking] Not initialized:', error);
    return;
  }
  
  if (context) {
    Sentry.setContext('custom', context);
  }
  
  Sentry.captureException(error);
}

/**
 * Log a message (non-error)
 * 
 * @param {string} message - Message to log
 * @param {string} level - Level: info, warning, error
 */
export function logMessage(message, level = 'info') {
  if (!Sentry) return;
  
  Sentry.addBreadcrumb({
    message,
    level,
    timestamp: new Date().toISOString(),
  });
}