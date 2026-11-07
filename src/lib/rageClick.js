/**
 * rageClick — spots someone clicking the same spot over and over, the usual
 * sign that a button looks broken or isn't responding.
 *
 * It only counts clicks: which element, where on screen, and when. It never
 * looks at what's on the page. src/lib/uxSignals.js feeds it real clicks and
 * decides what to do when it fires.
 *
 * The thresholds are starting values, not tuned against real traffic yet:
 * four clicks on the same element, within 30 px of each other, inside 1.2
 * seconds. A double-click doesn't count, and neither does steady normal
 * clicking. A fast "+" stepper could still trip it; those can opt out with
 * data-breadcrumb="off".
 */

export const RAGE_CLICK_THRESHOLD = 4;
export const RAGE_CLICK_WINDOW_MS = 1200;
export const RAGE_CLICK_RADIUS_PX = 30;
const MAX_REMEMBERED = 50;

/**
 * Returns record({ key, x, y, t }), which is true exactly once per burst of
 * rapid clicks on the same element. `key` identifies the element, `t` is a
 * time in milliseconds. A burst ends after a pause longer than the window.
 */
export function createRageClickDetector({
  threshold = RAGE_CLICK_THRESHOLD,
  windowMs = RAGE_CLICK_WINDOW_MS,
  radiusPx = RAGE_CLICK_RADIUS_PX,
} = {}) {
  let recent = [];
  let burstKey = null;
  let burstLastT = -Infinity;

  return function record({ key, x = 0, y = 0, t }) {
    if (key == null || !Number.isFinite(t)) return false;
    recent = recent.filter((c) => c.t <= t && t - c.t <= windowMs);
    recent.push({ key, x, y, t });
    if (recent.length > MAX_REMEMBERED) recent = recent.slice(-MAX_REMEMBERED);

    if (burstKey === key && t - burstLastT <= windowMs) {
      // Still the same burst: it already fired once.
      burstLastT = t;
      return false;
    }

    const near = recent.filter((c) => c.key === key && Math.hypot(c.x - x, c.y - y) <= radiusPx);
    if (near.length < threshold) return false;
    burstKey = key;
    burstLastT = t;
    return true;
  };
}
