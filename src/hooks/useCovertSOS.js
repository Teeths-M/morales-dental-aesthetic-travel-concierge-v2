/**
 * useCovertSOS — Silent emergency gesture detector
 *
 * Detects covert SOS triggers without any visible feedback:
 *   PRIMARY:  5 rapid taps anywhere on screen within 2 seconds
 *   BACKUP:   Typing "MORALESHELP" in any input (keyboard listener)
 *
 * When triggered:
 *   1. Grabs last known GPS silently
 *   2. Calls triggerCovertSOS edge function
 *   3. Shows NO visual feedback — the attacker sees nothing
 *   4. Plays NO sound
 *
 * Activation: stored in localStorage under 'morales_covert_sos_enabled'.
 * Only active when explicitly armed by the patient in settings.
 */
import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { captureCovertSosEvidenceAsync } from '@/lib/covertSosEvidence';

const STORAGE_KEY   = 'morales_covert_sos_enabled';
const FIRE_KEY      = 'morales_covert_last_fire';
const TAP_THRESHOLD = 5;       // taps required
const TAP_WINDOW_MS = 2000;    // window in ms
const COOLDOWN_MS   = 30_000;  // prevent double-fire (30s cooldown)
const KEYWORD       = 'moraleshelp';

/**
 * The cooldown is shared across hook instances and tabs, not just held in a
 * ref. The detector is mounted globally in AppLayout (so the documented "type
 * MORALESHELP in any text field" works on every page) AND on the Dashboard,
 * which passes a cached GPS fix. Two live instances both listen on `document`,
 * so a ref-local cooldown would let one gesture fire two SOS dispatches.
 *
 * Fails toward FIRING: if localStorage is unavailable we fall back to the ref
 * alone and risk a duplicate. A duplicate SOS is an annoyance; a suppressed one
 * is a person nobody comes for.
 */
function recentlyFired() {
  try {
    const last = Number(localStorage.getItem(FIRE_KEY) || 0);
    return Number.isFinite(last) && Date.now() - last < COOLDOWN_MS;
  } catch { return false; }
}

function markFired() {
  try { localStorage.setItem(FIRE_KEY, String(Date.now())); } catch { /* ref-only fallback */ }
}

export function isCovertSOSEnabled() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

export function enableCovertSOS()  { try { localStorage.setItem(STORAGE_KEY, 'true');  } catch {} }
export function disableCovertSOS() { try { localStorage.removeItem(STORAGE_KEY);        } catch {} }

export function useCovertSOS({ caseId, currentLocation, enabled = true }) {
  const tapCountRef    = useRef(0);
  const tapTimerRef    = useRef(null);
  const lastFireRef    = useRef(0);
  const keyBufferRef   = useRef('');
  const keyTimerRef    = useRef(null);
  const firingRef      = useRef(false);

  const fire = useCallback(async (method) => {
    const now = Date.now();
    if (!isCovertSOSEnabled()) return;
    if (!enabled)              return;
    if (firingRef.current)     return;
    if (now - lastFireRef.current < COOLDOWN_MS) return;
    if (recentlyFired())       return;   // another instance/tab already dispatched

    firingRef.current  = true;
    lastFireRef.current = now;
    markFired();

    // Silently grab GPS if available
    let lat = currentLocation?.lat ?? null;
    let lng = currentLocation?.lng ?? null;
    let accuracy = currentLocation?.accuracy ?? null;

    // Try a fresh GPS fix (2s timeout — don't wait longer)
    if (!lat && navigator.geolocation) {
      await new Promise(resolve => {
        const t = setTimeout(resolve, 2000);
        navigator.geolocation.getCurrentPosition(
          pos => { clearTimeout(t); lat = pos.coords.latitude; lng = pos.coords.longitude; accuracy = pos.coords.accuracy; resolve(); },
          ()  => { clearTimeout(t); resolve(); }
        );
      });
    }

    // Fire to backend — completely silent, no await needed for UX
    base44.functions.invoke('triggerCovertSOS', {
      case_id:        caseId || null,
      gps_lat:        lat,
      gps_lng:        lng,
      accuracy_m:     accuracy,
      trigger_method: method,
    }).catch(() => {});

    // Best-effort evidence follow-up — a genuinely separate call, never
    // awaited or raced against the primary alert above. See
    // src/lib/covertSosEvidence.js for why: camera capture is far slower and
    // less reliable than a GPS fix, so entangling it here would risk delaying
    // or losing the one call that must always fire fast and cleanly.
    captureCovertSosEvidenceAsync({ caseId: caseId || null }).catch(() => {});

    // Reset after cooldown
    setTimeout(() => { firingRef.current = false; }, COOLDOWN_MS);
  }, [caseId, currentLocation, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // ── Primary: 5-tap gesture ─────────────────────────────────────────────
    // The window is FIXED from the first tap. It used to be re-armed on every
    // tap (clearTimeout + fresh 2s), which meant the real condition was "5 taps
    // with under 2s between each" — unbounded in total duration, and something
    // ordinary fast scrolling or a child playing with the phone can satisfy.
    // A false positive here dispatches real security to a real address, so the
    // gesture has to be deliberate: five taps inside one 2-second window.
    function onTouchStart() {
      if (!isCovertSOSEnabled()) return;

      // First tap of a burst: start the window and let it run to completion.
      if (tapCountRef.current === 0) {
        tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, TAP_WINDOW_MS);
      }
      tapCountRef.current++;

      if (tapCountRef.current >= TAP_THRESHOLD) {
        tapCountRef.current = 0;
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
        fire('gesture');
      }
    }

    // ── Backup: keyword in any input ──────────────────────────────────────
    function onKeyDown(e) {
      if (!isCovertSOSEnabled()) return;
      // Only track actual character keys
      if (e.key.length !== 1) return;

      keyBufferRef.current = (keyBufferRef.current + e.key.toLowerCase()).slice(-KEYWORD.length);

      if (keyTimerRef.current) clearTimeout(keyTimerRef.current);
      keyTimerRef.current = setTimeout(() => { keyBufferRef.current = ''; }, 10_000);

      if (keyBufferRef.current === KEYWORD) {
        keyBufferRef.current = '';
        fire('orb_keyword');
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('keydown',    onKeyDown);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('keydown',    onKeyDown);
      clearTimeout(tapTimerRef.current);
      clearTimeout(keyTimerRef.current);
    };
  }, [enabled, fire]);
}
