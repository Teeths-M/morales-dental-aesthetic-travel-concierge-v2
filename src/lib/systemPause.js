/**
 * System Pause — stops all Base44 API calls to conserve integration credits.
 *
 * Cross-device sync: pause state is stored in both localStorage (instant, this
 * device) AND in the SystemConfigChange entity (server-side, all devices).
 * On every app startup, syncPauseFromServer() is called before React mounts,
 * so a phone or tablet automatically picks up the paused state set on the laptop.
 *
 * Entity reads do NOT consume integration credits — only functions.invoke does.
 * asServiceRole bypasses RLS so all devices can read the flag without auth.
 */
import { base44 } from '@/api/base44Client';

const PAUSE_KEY    = 'morales_system_paused';
const CONFIG_KEY   = 'system_paused';
const ADMIN_EMAIL  = 'admin@moralesmedical.com';

// Stash the real invoke so we can restore it on resume
let _originalInvoke = null;

// ── Local flag helpers ────────────────────────────────────────────────────────

export function isSystemPaused() {
  try { return localStorage.getItem(PAUSE_KEY) === 'true'; }
  catch (_) { return false; }
}

function setLocalPaused(paused) {
  try {
    if (paused) localStorage.setItem(PAUSE_KEY, 'true');
    else        localStorage.removeItem(PAUSE_KEY);
  } catch (_) {}
}

// ── Base44 invoke intercept ───────────────────────────────────────────────────

export function applyPauseIntercept() {
  if (_originalInvoke) return; // already patched
  _originalInvoke = base44.functions.invoke.bind(base44.functions);
  base44.functions.invoke = async (name, payload) => {
    if (isSystemPaused()) {
      console.warn(`[SYSTEM PAUSED] Blocked: ${name}`);
      return { data: null, __paused: true };
    }
    return _originalInvoke(name, payload);
  };
}

export function removePauseIntercept() {
  if (!_originalInvoke) return;
  base44.functions.invoke = _originalInvoke;
  _originalInvoke = null;
}

// ── Server-side sync (entity reads — zero integration credits) ────────────────

async function getServerRecord() {
  try {
    const rows = await base44.asServiceRole.entities.SystemConfigChange.filter(
      { config_key: CONFIG_KEY }, '-created_date', 1
    );
    return rows[0] ?? null;
  } catch (_) { return null; }
}

async function writeServerPauseState(paused) {
  try {
    const existing = await getServerRecord();
    const now = new Date().toISOString();
    if (existing) {
      await base44.asServiceRole.entities.SystemConfigChange.update(existing.id, {
        requested_value: { paused },
        applied_at:      now,
      });
    } else {
      await base44.asServiceRole.entities.SystemConfigChange.create({
        config_key:          CONFIG_KEY,
        config_label:        'System Pause — conserves integration credits',
        requested_by_id:     'admin',
        requested_by_email:  ADMIN_EMAIL,
        requested_value:     { paused },
        status:              'approved',
        applied_at:          now,
      });
    }
  } catch (_) {}
}

/**
 * syncPauseFromServer — called before React mounts (in main.jsx).
 * Reads the server pause state and applies it locally.
 * Never auto-resumes: if server says "not paused" but local says "paused",
 * the local state wins (you might have paused offline).
 */
export async function syncPauseFromServer() {
  try {
    const record = await getServerRecord();
    if (!record) return;
    const serverPaused = record.requested_value?.paused === true;
    if (serverPaused) {
      // Server says paused — enforce on this device
      setLocalPaused(true);
      applyPauseIntercept();
    }
    // Never auto-resume from server — resume only via explicit button press
  } catch (_) {}
}

// ── Public pause / resume ─────────────────────────────────────────────────────

export function pauseSystem(queryClient) {
  setLocalPaused(true);
  applyPauseIntercept();
  // Sync to server so all other devices pick it up
  writeServerPauseState(true);
  if (queryClient) {
    queryClient.cancelQueries();
    queryClient.setDefaultOptions({
      queries: {
        enabled:              false,
        refetchInterval:      false,
        refetchOnWindowFocus: false,
        refetchOnReconnect:   false,
        retry:                false,
      },
    });
  }
}

export function resumeSystem(queryClient) {
  setLocalPaused(false);
  removePauseIntercept();
  // Sync resume to server so all other devices pick it up
  writeServerPauseState(false);
  if (queryClient) {
    queryClient.setDefaultOptions({
      queries: {
        enabled:              true,
        refetchInterval:      undefined,
        refetchOnWindowFocus: true,
        refetchOnReconnect:   true,
        retry:                3,
      },
    });
    setTimeout(() => queryClient.invalidateQueries(), 300);
  }
}

// Auto-apply intercept on module load if localStorage already says paused
// (survives page reload on the same device)
if (isSystemPaused()) {
  applyPauseIntercept();
}
