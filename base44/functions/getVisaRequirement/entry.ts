import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { fetchVisaRequirement } from '../../shared/visaLookup.ts';
import { TTL_MS, isFresh } from '../../shared/freshness.ts';

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
  const { nationality, destination_country } = await body<{ nationality?: string; destination_country?: string }>();
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
