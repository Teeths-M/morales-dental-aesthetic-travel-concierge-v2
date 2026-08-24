import { fetchVisaRequirement, type VisaPolicy } from './visaLookup.ts';
import { TTL_MS, isFresh } from './freshness.ts';

/**
 * getCachedVisaRequirement — the real caching-wrapper core extracted from
 * getVisaRequirement/entry.ts (2026), so a second, session-optional caller
 * (getTravelBriefing) can reuse the exact same 7-day TTL cache + live
 * fetchVisaRequirement fallback without a second implementation, and
 * without going through getVisaRequirement's own requireAuth:true HTTP
 * endpoint (which a same-process shared-module call doesn't need to).
 *
 * getVisaRequirement/entry.ts itself still owns the one thing that's
 * genuinely specific to it — comparing against a client-supplied curated-
 * matrix status and flagging a disagreement — that stays there, unchanged.
 * This module only owns "read the cache, or research and refresh it."
 */

export type CachedVisaResult = {
  fresh: boolean;
  visa_status: VisaPolicy['visa_status'];
  summary: string;
  medical_notes: string | null;
  source_url: string | null;
  confidence: number | null;
  last_confirmed_at: string;
  /** The raw snapshot record read from the DB (or null if none existed) — kept
   *  for callers (like getVisaRequirement) that need the record's own id. */
  snapshot: Record<string, unknown> | null;
};

// Short in-memory layer in front of the Base44 snapshot read only — see
// getVisaRequirement/entry.ts's own original comment for why this only
// absorbs request bursts on a warm isolate and never changes the real
// 7-day freshness guarantee. Module-level, so both callers (this file's
// own export, called directly from getTravelBriefing; and
// getVisaRequirement/entry.ts, which now imports this same function)
// naturally share one cache instead of each keeping its own.
const SNAPSHOT_CACHE_TTL_MS = 60 * 1000;
const freshSnapshotCache = new Map<string, { snap: Record<string, unknown>; expiresAt: number }>();
const snapshotKey = (nat: string, dest: string) => `${nat}::${dest}`;

export async function getCachedVisaRequirement(
  base44: any,
  nationality: string,
  destination: string,
  checkedVia: 'on_selection' | 'scheduled' | 'mcare_chat' = 'on_selection',
): Promise<CachedVisaResult> {
  const nat = nationality.trim();
  const dest = destination.trim();
  const key = snapshotKey(nat, dest);

  const memoHit = freshSnapshotCache.get(key);
  const cached = (memoHit && Date.now() < memoHit.expiresAt)
    ? memoHit.snap
    : (await base44.asServiceRole.entities.VisaRequirementSnapshot.filter(
        { nationality: nat, destination_country: dest }, '-last_confirmed_at', 1,
      ).catch(() => []))?.[0];

  if (cached && isFresh(cached.last_confirmed_at as string, TTL_MS.visa_rule)) {
    freshSnapshotCache.set(key, { snap: cached, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS });
    return {
      fresh: true,
      visa_status: cached.visa_status as VisaPolicy['visa_status'],
      summary: cached.summary as string,
      medical_notes: (cached.medical_notes as string) || null,
      source_url: (cached.source_url as string) || null,
      confidence: (cached.confidence as number) ?? null,
      last_confirmed_at: cached.last_confirmed_at as string,
      snapshot: cached,
    };
  }

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
    checked_via: checkedVia,
  };
  try {
    if (cached) await base44.asServiceRole.entities.VisaRequirementSnapshot.update(cached.id, record);
    else await base44.asServiceRole.entities.VisaRequirementSnapshot.create(record);
  } catch (_) { /* cache write failure must not break the caller's answer */ }

  return {
    fresh: false,
    visa_status: policy.visa_status,
    summary: policy.summary,
    medical_notes: policy.medical_notes || null,
    source_url: policy.source_url || null,
    confidence: policy.confidence,
    last_confirmed_at: nowISO,
    snapshot: (cached as Record<string, unknown>) || null,
  };
}
