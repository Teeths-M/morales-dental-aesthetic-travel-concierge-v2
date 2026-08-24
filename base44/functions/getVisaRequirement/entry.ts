import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { flagForReview } from '../../shared/freshness.ts';
import { getCachedVisaRequirement } from '../../shared/visaRequirementLookup.ts';

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
 *
 * The actual cache-or-refresh logic lives in shared/visaRequirementLookup.ts
 * (extracted 2026, Travel Intelligence pass) — getTravelBriefing reuses the
 * exact same function directly (a same-process shared-module call, not an
 * HTTP round-trip through this requireAuth:true endpoint, since a briefing
 * must also work for a signed-out visitor with no session to forward). This
 * file keeps only what's genuinely specific to it: comparing the live result
 * against a client-supplied curated-matrix status and flagging a disagreement.
 */

Deno.serve(createHandler(async ({ base44, body }) => {
  const { nationality, destination_country, matrix_status, matrix_is_explicit } = await body<{
    nationality?: string; destination_country?: string; matrix_status?: string; matrix_is_explicit?: boolean;
  }>();
  if (!nationality || !destination_country) {
    return err('nationality and destination_country are required');
  }

  const result = await getCachedVisaRequirement(base44, nationality, destination_country, 'on_selection');
  await flagIfDisagrees(base44, nationality.trim(), destination_country.trim(), result.visa_status, matrix_status, matrix_is_explicit);

  return ok({
    fresh: result.fresh,
    visa_status: result.visa_status,
    summary: result.summary,
    medical_notes: result.medical_notes,
    source_url: result.source_url,
    confidence: result.confidence,
    last_confirmed_at: result.last_confirmed_at,
  });
}, { name: 'getVisaRequirement', requireAuth: true }));
