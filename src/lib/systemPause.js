/**
 * System Pause — stops all Base44 API calls to conserve integration credits.
 *
 * When paused:
 *   - base44.functions.invoke() returns { data: null } immediately (no network call)
 *   - React Query polling intervals are cancelled
 *   - All new queries are blocked from running
 *
 * The patch is applied at import time if localStorage says paused.
 * This means credits stop draining even across page reloads.
 */
import { base44 } from '@/api/base44Client';

const PAUSE_KEY = 'morales_system_paused';

// Stash the real invoke so we can restore it on resume
let _originalInvoke = null;

export function isSystemPaused() {
  return localStorage.getItem(PAUSE_KEY) === 'true';
}

export function applyPauseIntercept() {
  if (_originalInvoke) return; // already patched
  _originalInvoke = base44.functions.invoke.bind(base44.functions);
  base44.functions.invoke = async (name, payload) => {
    if (isSystemPaused()) {
      console.warn(`[SYSTEM PAUSED] Blocked function call: ${name}`);
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

export function pauseSystem(queryClient) {
  localStorage.setItem(PAUSE_KEY, 'true');
  applyPauseIntercept();
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
  localStorage.removeItem(PAUSE_KEY);
  removePauseIntercept();
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
    // Short delay so components can re-render with enabled: true before fetching
    setTimeout(() => queryClient.invalidateQueries(), 300);
  }
}

// Auto-apply intercept on module load if already paused (survives page reload)
if (isSystemPaused()) {
  applyPauseIntercept();
}
