import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { runLookup, REGISTRY_ADAPTERS } from '../../shared/registryLookup.ts';
import { computeCandidateConfidence } from '../../shared/providerCandidateMatch.ts';

// ── verifyDiscoveredCandidate ─────────────────────────────────────────────────
// Runs a REAL government-registry check (US/CO/MX — registryLookup.ts's
// existing, already-live adapters) against a candidate discoverProviderCandidates
// already saved. This is the honest completion of the gap that function
// deliberately left open: a raw Tavily search result essentially never
// contains a license number, so discovery alone can never verify anything —
// this tool exists for the moment a human (or the traveler, if they happen to
// know it) actually supplies one.
//
// What this does NOT do, structurally, not just by convention: it never
// creates or updates a Doctor/TravelAgency/etc. record, and it never writes
// the candidate's own `status` field to anything but its existing
// candidate/rejected/stale enum — a passed registry check is real evidence
// for a human reviewer, not a self-sufficient approval. The candidate stays
// exactly what it was: a lead. Promotion into a real partner record is still
// only the existing mcareCreate*Pending -> initiatePartnerVerification ->
// admin-approval pipeline.
//
// The response's `eligible_for_verified_badge` is the one deliberate,
// explicit signal M-Care's instructions are allowed to key {{providerstatus:
// verified|Name}} off of — true only when the registry genuinely found a
// confident match (see registryLookup.ts's own route_to_manual logic:
// !found || confidence < 70 routes to manual, same bar here).

const bodySchema = strictObject({
  candidate_id: Fields.shortText(100),
  license_number: Fields.shortText(100),
  doctor_name: Fields.optionalText(200),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { candidate_id, license_number, doctor_name } = await body();

  let candidate: any;
  try {
    candidate = await base44.asServiceRole.entities.DiscoveredProviderCandidate.get(candidate_id);
  } catch (_) {
    candidate = null;
  }
  if (!candidate) return err('Candidate not found', 404);

  const countryISO = candidate.extracted_country_iso || null;
  const adapter = countryISO ? REGISTRY_ADAPTERS[countryISO] : null;
  if (!adapter || !adapter.supportsLookup) {
    return ok({
      success: true,
      checked: false,
      eligible_for_verified_badge: false,
      message: countryISO
        ? `No automated registry exists for ${countryISO} — this candidate needs manual human review, a real check can't run here.`
        : 'No country could be determined for this candidate — this needs manual human review.',
    });
  }

  const result = await runLookup(countryISO, license_number, doctor_name || candidate.title || '');
  const registryConfidence = typeof (result as any).confidence === 'number' ? (result as any).confidence : undefined;
  const newConfidence = computeCandidateConfidence(candidate.relevance_score || 0, registryConfidence);
  const found = !!(result as any).found;
  const routeToManual = (result as any).route_to_manual !== false; // default true unless explicitly false
  const eligibleForVerifiedBadge = found && !routeToManual;

  try {
    await base44.asServiceRole.entities.DiscoveredProviderCandidate.update(candidate_id, {
      registry_check_status: 'checked',
      registry_result: result,
      license_number_checked: license_number,
      registry_checked_at: new Date().toISOString(),
      identity_confidence: newConfidence,
    });
  } catch (e) {
    console.error('[verifyDiscoveredCandidate] failed to persist registry result', e);
  }

  return ok({
    success: true,
    checked: true,
    found,
    registry_name: (result as any).registry_name || adapter.registry_name,
    confidence: registryConfidence ?? null,
    name_match: (result as any).name_match ?? null,
    route_to_manual: routeToManual,
    identity_confidence: newConfidence,
    eligible_for_verified_badge: eligibleForVerifiedBadge,
    message: eligibleForVerifiedBadge
      ? `Real registry match found via ${(result as any).registry_name || adapter.registry_name} — genuine verification evidence, still not a Morales approval.`
      : found
        ? `A registry record exists but the match isn't confident enough (or the name doesn't clearly match) — this needs manual human review, not an automatic verified label.`
        : `No matching registry record found for that license number — this needs manual human review before treating this candidate as anything more than a lead.`,
  });
}, { name: 'verifyDiscoveredCandidate', requireAuth: false, bodySchema }));
