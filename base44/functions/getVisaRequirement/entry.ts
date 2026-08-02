import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { fetchVisaRequirement } from '../../shared/visaLookup.ts';
import { TTL_MS, isFresh, flagForReview } from '../../shared/freshness.ts';

// Mirrors src/hooks/useVisaRequirement.js's LIVE_TO_APP — kept in sync
// manually since the frontend matrix (src/lib/visaMatrix.js) isn't
// available in this Deno runtime. Only used to compare on equal terms
// against the client-reported matrix_status below, never to decide what's
// shown to the patient — that decision stays on the frontend.
const LIVE_TO_APP: Record<string, string> = {
  visa_free: 'exempt',
  evisa: 'evisa',
  on_arrival: 'evisa',
  embassy_required: 'embassy',
  unknown: 'unknown',
};

/**
 * M's own curated, cited research (src/lib/visaMatrix.js) intentionally wins
 * over a live AI lookup when it has an explicit answer for this exact pair —
 * see useVisaRequirement.js. This never blocks or changes the response; it
 * only tells a human the two sources disagreed, via the same review queue
 * recheckVisaRequirements.ts already uses for a policy that changed on
 * re-check.
 */
async function flagIfDisagrees(
  base44: any,
  nat: string,
  dest: string,
  liveStatus: string,
  matrixStatus?: string,
  matrixIsExplicit?: boolean,
) {
  if (!matrixIsExplicit || !matrixStatus || matrixStatus === 'unknown') return;
  const liveAppStatus = LIVE_TO_APP[liveStatus] || 'unknown';
  if (liveAppStatus === 'unknown' || liveAppStatus === matrixStatus) return;
  await flagForReview(base44, {
    subject_type: 'visa_rule',
    subject_label: `${nat} → ${dest}`,
    change_type: 'status_changed',
    detail: `M's researched entry list says "${matrixStatus}" but the live AI check on selection returned "${liveAppStatus}". The researched answer is shown to the patient; please verify which is correct.`,
    detected_via: 'live_check',
    previous_value: matrixStatus,
    new_value: liveAppStatus,
    severity: 'warning',
  }).catch(() => {});
}

/**
 * getVisaRequirement — called when a user selects a destination × nationality in
 * their journey, so they always see the CURRENT requirement at decision time.
 *
 * Serves a cached VisaRequirementSnapshot only while it is within the visa TTL
 * (7 days); otherwise it re-checks live against official sources and refreshes
 * the snapshot. Always returns the source and 'last confirmed' date for display.
 * Advisory only — never gates a booking; low-confidence renders as 'unknown'.
 */

// ── Short in-memory layer in front of the Base44 snapshot read only ───────────
// This sits ON TOP OF the real days-long DB-backed freshness system above — it
// only absorbs request bursts on a warm isolate (same nationality×destination
// pair requested repeatedly within a minute), it does not change the 7-day
// freshness guarantee. Deliberately caches ONLY confirmed-fresh results: a
// stale/missing snapshot always hits Base44 for real, so this can never delay
// the self-correcting live-refresh path below (caching a stale negative here
// would make every call in the window redo the live re-check instead of
// picking up the just-written fresh record, which would be worse than no
// cache at all).
const SNAPSHOT_CACHE_TTL_MS = 60 * 1000;
const freshSnapshotCache = new Map<string, { snap: Record<string, unknown>; expiresAt: number }>();
const snapshotKey = (nat: string, dest: string) => `${nat}::${dest}`;

Deno.serve(createHandler(async ({ base44, body }) => {
  const { nationality, destination_country, matrix_status, matrix_is_explicit } = await body<{
    nationality?: string; destination_country?: string; matrix_status?: string; matrix_is_explicit?: boolean;
  }>();
  if (!nationality || !destination_country) {
    return err('nationality and destination_country are required');
  }

  const nat = nationality.trim();
  const dest = destination_country.trim();
  const key = snapshotKey(nat, dest);

  // ── Serve fresh cache if we have it (in-memory, then DB-backed) ─────────────
  const memoHit = freshSnapshotCache.get(key);
  const cached = (memoHit && Date.now() < memoHit.expiresAt)
    ? memoHit.snap
    : (await base44.asServiceRole.entities.VisaRequirementSnapshot.filter(
        { nationality: nat, destination_country: dest }, '-last_confirmed_at', 1,
      ).catch(() => []))?.[0];

  if (cached && isFresh(cached.last_confirmed_at as string, TTL_MS.visa_rule)) {
    freshSnapshotCache.set(key, { snap: cached, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS });
    await flagIfDisagrees(base44, nat, dest, cached.visa_status as string, matrix_status, matrix_is_explicit);
    return ok({
      fresh: true,
      visa_status: cached.visa_status,
      summary: cached.summary,
      medical_notes: cached.medical_notes || null,
      source_url: cached.source_url || null,
      confidence: cached.confidence ?? null,
      last_confirmed_at: cached.last_confirmed_at,
    });
  }

  // ── Stale or missing → re-check live and refresh the snapshot ───────────────
  const policy = await fetchVisaRequirement(base44, nat, dest);
  const nowISO = new Date().toISOString();

  const record = {
    nationality: nat,
    destination_country: dest,
    visa_status: policy.visa_status,
    summary: policy.summary,
    medical_notes: policy.medical_notes || '',
    source_url: policy.source_url || '',
    confidence: policy.confidence,
    last_confirmed_at: nowISO,
    checked_via: 'on_selection',
  };
  try {
    if (cached) await base44.asServiceRole.entities.VisaRequirementSnapshot.update(cached.id, record);
    else await base44.asServiceRole.entities.VisaRequirementSnapshot.create(record);
  } catch (_) { /* cache write failure must not break the user's answer */ }

  await flagIfDisagrees(base44, nat, dest, policy.visa_status, matrix_status, matrix_is_explicit);

  return ok({
    fresh: false,
    visa_status: policy.visa_status,
    summary: policy.summary,
    medical_notes: policy.medical_notes || null,
    source_url: policy.source_url || null,
    confidence: policy.confidence,
    last_confirmed_at: nowISO,
  });
}, { name: 'getVisaRequirement', requireAuth: true }));
