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

// Stash the real methods so we can restore them on resume
let _originalInvoke        = null;
let _originalIntegrations  = null;

// ── BroadcastChannel — instant cross-tab pause/resume (iOS 15.4+, all modern Android) ──
// When admin pauses on any tab, ALL other open tabs receive the signal in <10ms.
// Falls back silently on older browsers that don't support BroadcastChannel.
const BROADCAST_CH = 'morales_system_pause';
let _channel = null;

function getBroadcastChannel() {
  if (_channel) return _channel;
  try {
    _channel = new BroadcastChannel(BROADCAST_CH);
    _channel.onmessage = ({ data }) => {
      if (data?.event === 'paused') {
        setLocalPaused(true);
        applyPauseIntercept();
      } else if (data?.event === 'resumed') {
        setLocalPaused(false);
        removePauseIntercept();
      }
    };
  } catch { _channel = null; }
  return _channel;
}

function broadcastPause(paused) {
  try {
    const ch = getBroadcastChannel();
    ch?.postMessage({ event: paused ? 'paused' : 'resumed', ts: Date.now() });
  } catch {}
}

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

// ── Base44 full intercept (functions + integrations) ─────────────────────────

export function applyPauseIntercept() {
  // Patch functions.invoke
  if (!_originalInvoke) {
    _originalInvoke = base44.functions.invoke.bind(base44.functions);
    base44.functions.invoke = async (name, payload) => {
      if (isSystemPaused()) {
        console.warn(`[SYSTEM PAUSED] Blocked function: ${name}`);
        return { data: null, __paused: true };
      }
      return _originalInvoke(name, payload);
    };
  }

  // Wrap the ENTIRE integrations object with a Proxy — catches InvokeLLM,
  // InvokeVision, GenerateImage, SendEmail, and any future integration method
  // without needing to patch each one individually.
  // Re-entrant safe: if already proxied (_originalIntegrations is set), skip.
  // But if base44.integrations was unavailable on first call (lazy SDK init),
  // retry now that it may be populated.
  try {
    if (!_originalIntegrations && base44.integrations) {
      _originalIntegrations = base44.integrations;
      base44.integrations = new Proxy(base44.integrations, {
        get(target, serviceName) {
          const service = target[serviceName];
          if (!service || typeof service !== 'object') return service;
          // Return a proxy of each service (Core, Twilio, etc.)
          return new Proxy(service, {
            get(svc, methodName) {
              const method = svc[methodName];
              if (typeof method !== 'function') return method;
              return async (...args) => {
                if (isSystemPaused()) {
                  console.warn(`[SYSTEM PAUSED] Blocked integration: ${String(serviceName)}.${String(methodName)}`);
                  return { result: '', __paused: true };
                }
                return method.apply(svc, args);
              };
            },
          });
        },
      });
    }
  } catch (_) {}
}

export function removePauseIntercept() {
  if (_originalInvoke) {
    base44.functions.invoke = _originalInvoke;
    _originalInvoke = null;
  }
  if (_originalIntegrations) {
    base44.integrations = _originalIntegrations;
    _originalIntegrations = null;
  }
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
      // Server says paused — enforce on this device.
      // Always call applyPauseIntercept() here even if already paused:
      // on mobile the Proxy may not have been applied yet if base44.integrations
      // was unavailable at cold-start time or if the app returned from background.
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
  broadcastPause(true);          // instant signal to all open tabs
  writeServerPauseState(true);   // persists to server for other devices
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
  broadcastPause(false);         // instant signal to all open tabs
  writeServerPauseState(false);  // persists to server for other devices
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

// Init BroadcastChannel listener immediately so this tab can receive
// pause/resume signals from other tabs before any user interaction.
getBroadcastChannel();
