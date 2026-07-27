// DUPLICATED from base44/functions/_shared/rateLimit.ts — see createHandler.ts in this
// same directory for why. Keep in sync by hand.

/**
 * Shared rate-limiting helper backed by the `RateLimitBucket` entity.
 *
 * Consolidates the sliding-window bucket logic that was previously hand-rolled
 * independently in publicDoctorCheck, sendOtp, requestPINReset, and others —
 * each with slightly different bucketing. This is the one implementation;
 * createHandler.ts calls it automatically for public (requireAuth:false)
 * functions unless a function opts out or supplies its own policy.
 */

export type Base44Client = { asServiceRole: { entities: { RateLimitBucket: any } } };

/**
 * Sliding-window check: true = request allowed (and counted), false = over limit.
 * A stale window (older than windowSeconds) resets rather than accumulating —
 * same behavior as the original publicDoctorCheck implementation this replaces.
 */
export async function checkRateLimit(
  base44: Base44Client,
  key: string,
  windowSeconds: number,
  max: number,
): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const buckets = await base44.asServiceRole.entities.RateLimitBucket
    .filter({ bucket_key: key }, '-created_date', 1)
    .catch(() => []);
  const bucket = buckets?.[0];

  if (!bucket) {
    await base44.asServiceRole.entities.RateLimitBucket.create({
      bucket_key: key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString(),
    }).catch(() => {});
    return true;
  }
  if (new Date(bucket.window_start) < windowStart) {
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, {
      window_start: now.toISOString(), count: 1, updated_at: now.toISOString(),
    }).catch(() => {});
    return true;
  }
  if (bucket.count >= max) return false;
  await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, {
    count: bucket.count + 1, updated_at: now.toISOString(),
  }).catch(() => {});
  return true;
}

function extractIp(req: Request): string {
  return (req.headers.get('CF-Connecting-IP')
    || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown').trim();
}

/**
 * IP-based check, and — when a userId is available — ALSO a user-based check.
 * Either bucket breaching its limit denies the request. Returns a ready-made
 * 429 Response (consistent JSON shape) when denied, or null when allowed, so
 * callers can simply `if (limited) return limited;`.
 */
export async function enforceRateLimit(
  base44: Base44Client,
  req: Request,
  opts: { functionName: string; max: number; windowSeconds: number; userId?: string | null },
): Promise<Response | null> {
  const { functionName, max, windowSeconds, userId } = opts;
  const ip = extractIp(req);

  const ipOk = await checkRateLimit(base44, `ip:${functionName}:${ip}`, windowSeconds, max);
  const userOk = userId
    ? await checkRateLimit(base44, `user:${functionName}:${userId}`, windowSeconds, max)
    : true;

  if (!ipOk || !userOk) {
    return Response.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    );
  }
  return null;
}
