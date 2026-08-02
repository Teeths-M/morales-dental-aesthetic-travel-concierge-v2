import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useAdminCasesShared — the ONE CaseRecord fetch every admin-area page
 * should use. Base44 support confirmed ~9 separate admin pages/components
 * each independently fetching CaseRecord (list/filter, various shapes) is
 * what trips their 100-operations/minute-per-user rate limit — the burst
 * of separate calls, not any single one. This consolidates them into a
 * single shared React Query cache: every consumer gets the same data and
 * the same throttle/timeout/no-retry-on-429 protection for free. Derive
 * whatever narrower view you need (by status, by sort order, a capped
 * slice, etc.) client-side from the returned array via the selectors below
 * — never add a new independent CaseRecord.list/.filter call.
 */
export const ADMIN_CASES_QUERY_KEY = ['admin_cases_shared'];

// Last-known-good cache — survives a platform rate limit (or any other fetch
// failure) so an admin page never shows a hard "can't load anything" wall
// once it's loaded successfully at least once on this device. Deliberately
// localStorage, not React state: it must outlive a full page reload, since
// that's exactly when someone rechecks during an outage.
const CASES_CACHE_KEY = 'morales_admin_cases_cache_v1';

export function readCasesCache() {
  try {
    const raw = localStorage.getItem(CASES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.data) || !parsed?.cachedAt) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function writeCasesCache(data) {
  try {
    localStorage.setItem(CASES_CACHE_KEY, JSON.stringify({ data, cachedAt: new Date().toISOString() }));
  } catch (_) { /* quota/private-mode — cache is best-effort only */ }
}

// Module-level, not component/query state — this endpoint has repeatedly
// tripped Base44's platform rate limit, and something was observed
// re-firing it far more often than a person could be clicking Retry (seen
// live: a burst of duplicate 429s within seconds of a single fresh page
// load). Whatever the exact trigger, this app must never make the SAME
// active rate limit worse by hammering it. Hard-caps actual network calls
// to at most one per COOLDOWN window, no matter how many components/pages
// (re)mount or retry — now that every admin page shares this one hook,
// that cap applies across all of them, not just one page.
const CASE_LIST_MIN_INTERVAL_MS = 5000;
let _lastCaseListAttemptAt = 0;

// Same reasoning, for a user-facing error toast: bounds it to at most one
// per COOLDOWN window regardless of how many times a consumer's effect
// fires, so a burst of attempts can't pile up duplicate toasts (and
// duplicate device buzzes — see use-toast.jsx's toast()). Call this from
// the toast-firing effect itself; it returns whether this call "won" the
// cooldown and should actually show a toast.
const ADMIN_ERROR_TOAST_COOLDOWN_MS = 8000;
let _lastAdminErrorToastAt = 0;

export function shouldShowAdminErrorToast() {
  const now = Date.now();
  if (now - _lastAdminErrorToastAt < ADMIN_ERROR_TOAST_COOLDOWN_MS) return false;
  _lastAdminErrorToastAt = now;
  return true;
}

// A 429 needs a different message than a generic failure — "try again" is
// actively bad advice while a rate limit is active (each retry is another
// request against the same limit).
export function describeAdminLoadError(err) {
  const status = err?.response?.status ?? err?.status;
  if (status === 429) {
    return "The server is rate-limiting requests right now (too many recent loads). Wait a minute before retrying — clicking Retry immediately won't help.";
  }
  return err?.message || "This is taking much longer than it should — the server may be busy or unreachable.";
}

async function fetchAdminCases() {
  // Hard floor on actual network calls — see CASE_LIST_MIN_INTERVAL_MS
  // above. Rejects immediately, without ever touching the network, if
  // called again too soon after the last real attempt from ANY consumer.
  const sinceLastAttempt = Date.now() - _lastCaseListAttemptAt;
  if (sinceLastAttempt < CASE_LIST_MIN_INTERVAL_MS) {
    const throttleErr = /** @type {any} */ (new Error(`Checked too recently — please wait ${Math.ceil((CASE_LIST_MIN_INTERVAL_MS - sinceLastAttempt) / 1000)}s before retrying.`));
    throttleErr.isClientThrottled = true;
    throw throttleErr;
  }
  _lastCaseListAttemptAt = Date.now();

  // User-scoped: asServiceRole throws in the browser (backend-only) — admin
  // RLS on CaseRecord permits this read directly.
  //
  // Hard timeout: a platform-side stall (e.g. a rate limit that never
  // cleanly returns a response) must never leave a screen spinning
  // forever — after 8s, give up with a clear error instead of hanging.
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("This is taking too long — the server may be busy. Try Retry below.")), 8000)
  );
  const result = await Promise.race([
    base44.entities.CaseRecord.list('-created_date', 500),
    timeout,
  ]);
  writeCasesCache(result || []);
  return result || [];
}

export function useAdminCasesShared() {
  return useQuery({
    queryKey: ADMIN_CASES_QUERY_KEY,
    queryFn: fetchAdminCases,
    staleTime: 30000, // Keep data fresh for 30 seconds across every consumer
    // One retry for a genuine transient blip; never retry a client-side
    // throttle or a real 429 — see fetchAdminCases/CASE_LIST_MIN_INTERVAL_MS.
    retry: (failureCount, /** @type {any} */ err) => {
      if (err?.isClientThrottled) return false;
      if (err?.response?.status === 429 || err?.status === 429) return false;
      return failureCount < 1;
    },
  });
}

// ── Selectors — derive a narrower view from the shared cache instead of a
// new independent CaseRecord.list/.filter call ──────────────────────────────

/** Cases whose status is in the given list, in whatever order they arrived. */
export function selectByStatus(cases, statuses) {
  const set = new Set(statuses);
  return (cases || []).filter((c) => set.has(c?.status));
}

/**
 * Re-sorts by updated_date descending. The shared cache is fetched sorted by
 * created_date, so this is a best-effort re-sort of the already-fetched
 * window (up to 500 most-recently-created cases) — a case updated recently
 * but created outside that window wouldn't appear here. Accepted tradeoff:
 * current per-page caps this replaces were already 100-300 rows, and this
 * is what gets the admin area out of the rate-limit crisis.
 */
export function selectSortedByUpdatedDate(cases) {
  return [...(cases || [])].sort((a, b) => new Date(b?.updated_date || 0).getTime() - new Date(a?.updated_date || 0).getTime());
}
