/**
 * Universal haptic buzz utility.
 *
 * Uses the Web Vibration API (supported on Android + most browsers;
 * silently no-ops on iOS and desktop where vibration is unavailable).
 *
 * Patterns are [buzz_ms, pause_ms, buzz_ms, ...] — same as sw.js.
 * Single source of truth for every notification sound/buzz in the app.
 */

const PATTERNS = {
  // ── Alerts & warnings ────────────────────────────────────────────────────
  alert:       [300, 100, 300],         // two firm buzzes — "pay attention"
  warning:     [200, 80,  200],         // same shape, softer — "heads up"
  error:       [350, 100, 350, 100, 350], // triple — "something went wrong"
  destructive: [350, 100, 350],         // double firm — Radix destructive toast

  // ── Positive / milestone ─────────────────────────────────────────────────
  success:     [100, 50, 100, 50, 200], // triple with longer finale
  arrival:     [100, 50, 100, 50, 200], // same as success
  handshake:   [100, 60, 100, 60, 100, 80, 380], // 7-pulse celebration
  golden_m:    [120, 60, 120, 60, 120, 80, 550], // maximum celebration

  // ── Journey / transport ──────────────────────────────────────────────────
  booking:     [100, 70, 220],          // short-long rise — new work coming in
  driver:      [100, 70, 220],          // same
  payment:     [160, 80, 160],          // confident double

  // ── Care / companion ─────────────────────────────────────────────────────
  companion:   [80, 50, 80, 50, 80],   // gentle triple

  // ── Informational ────────────────────────────────────────────────────────
  info:        [100, 60, 100],          // light double tap
  tip:         [80,  50, 80],           // softer double
  checkin:     [200, 80, 200],          // same as warning

  // ── Default ──────────────────────────────────────────────────────────────
  default:     [150, 100, 150],
};

/**
 * Trigger a vibration pattern.
 *
 * @param {string} type — notification type key (maps to PATTERNS above)
 */
export function buzz(type = 'default') {
  try {
    if (!navigator?.vibrate) return;
    const pattern = PATTERNS[type] || PATTERNS.default;
    navigator.vibrate(pattern);
  } catch (_) {
    // Vibration API not available — silently ignore
  }
}

export { PATTERNS };
