// ── Module-level in-memory cache for read-heavy edge functions ─────────────────
// Deno edge invocations are ephemeral by default — the isolate is torn down
// once the response returns (see completeHandshake/entry.ts's comment on this).
// A warm isolate CAN serve multiple requests though, so module-level state is a
// free hit-rate win under sustained load, not a durable or consistency
// guarantee — never use this for anything that must be correct on every call
// (see checkClinicStatus/entry.ts, deliberately excluded from this pattern).
//
// In-flight de-duplication means concurrent callers on the same warm isolate
// share one fetch instead of each starting their own — the exact behavior
// calculatePriceQuote's original hand-rolled cache already relied on
// ("eliminates ~99% of DB reads under load").

export function createMemoCache<TArg, TResult>(
  buildFn: (arg: TArg) => Promise<TResult>,
  ttlMs: number,
) {
  let cached: { value: TResult; expiresAt: number } | null = null;
  let inFlight: Promise<TResult> | null = null;

  return async function get(arg: TArg): Promise<TResult> {
    const now = Date.now();
    if (cached && now < cached.expiresAt) return cached.value;
    if (inFlight) return inFlight;
    inFlight = buildFn(arg).then((value) => {
      cached = { value, expiresAt: Date.now() + ttlMs };
      inFlight = null;
      return value;
    });
    inFlight.catch(() => { inFlight = null; cached = null; });
    return inFlight;
  };
}

/** Keyed variant for functions whose cacheable read varies by an input parameter. */
export function createKeyedMemoCache<TArg, TResult>(
  buildFn: (arg: TArg) => Promise<TResult>,
  ttlMs: number,
  keyFn: (arg: TArg) => string,
) {
  const cache = new Map<string, { value: TResult; expiresAt: number }>();
  const inFlight = new Map<string, Promise<TResult>>();

  return async function get(arg: TArg): Promise<TResult> {
    const key = keyFn(arg);
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && now < hit.expiresAt) return hit.value;
    const pending = inFlight.get(key);
    if (pending) return pending;
    const promise = buildFn(arg).then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      inFlight.delete(key);
      return value;
    });
    promise.catch(() => { inFlight.delete(key); });
    inFlight.set(key, promise);
    return promise;
  };
}
