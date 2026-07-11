import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { fetchVisaRequirement } from '../_shared/visaLookup.ts';
import { TTL_MS, isFresh } from '../_shared/freshness.ts';

/**
 * getVisaRequirement — called when a user selects a destination × nationality in
 * their journey, so they always see the CURRENT requirement at decision time.
 *
 * Serves a cached VisaRequirementSnapshot only while it is within the visa TTL
 * (7 days); otherwise it re-checks live against official sources and refreshes
 * the snapshot. Always returns the source and 'last confirmed' date for display.
 * Advisory only — never gates a booking; low-confidence renders as 'unknown'.
 */
Deno.serve(createHandler(async ({ base44, body }) => {
  const { nationality, destination_country } = await body<{ nationality?: string; destination_country?: string }>();
  if (!nationality || !destination_country) {
    return err('nationality and destination_country are required');
  }

  const nat = nationality.trim();
  const dest = destination_country.trim();

  // ── Serve fresh cache if we have it ────────────────────────────────────────
  const existing = await base44.asServiceRole.entities.VisaRequirementSnapshot.filter(
    { nationality: nat, destination_country: dest }, '-last_confirmed_at', 1,
  ).catch(() => []);
  const cached = existing?.[0];

  if (cached && isFresh(cached.last_confirmed_at, TTL_MS.visa_rule)) {
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
