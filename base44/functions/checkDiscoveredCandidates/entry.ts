import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { findDiscoveredCandidates } from '../../shared/findDiscoveredCandidates.ts';

// ── checkDiscoveredCandidates ────────────────────────────────────────────────
// Read-only search tool for mcare_orchestrator (a backend dispatch-failure
// agent — NOT the patient-facing M-Care chat, though it reads the same
// DiscoveredProviderCandidate staging table Phase 36-38's web-discovery
// pipeline already writes to). When a normal backup search for ANY of the 5
// partner types (doctor, travel agency, taxi/driver, companion, security
// agency) finds nothing, this surfaces a real, already-discovered lead
// instead of nothing. partner_type is optional (defaults to searching every
// type) — an older candidate discovered before this field existed has it
// blank and stays visible rather than hidden.
//
// The actual query/scoring logic lives in shared/findDiscoveredCandidates.ts
// so this tool and base44/shared/partnerSearchWidening.ts's deterministic
// direct-call path share exactly one implementation.
//
// Never writes anything, never promotes a candidate. A candidate here is
// exactly what discoverProviderCandidates/verifyDiscoveredCandidate already
// made it: a lead with an honest identity_confidence and (if a registry
// check already ran) a real registry_result — never something this tool
// treats as verified or assignable. Promotion into a real Doctor/TravelAgency/
// etc. record stays the existing human-gated mcareCreate*Pending ->
// admin-approval pipeline, completely untouched by this tool.

const bodySchema = strictObject({
  partner_type: z.enum(['doctor', 'travel_agency', 'taxi_service', 'companion', 'security_agency']).optional(),
  specialty: Fields.optionalText(200),
  country: Fields.optionalText(100),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { partner_type, specialty, country } = await body();

  const ranked = await findDiscoveredCandidates(base44, partner_type, { specialty, country });

  return ok({
    success: true,
    count: ranked.length,
    candidates: ranked,
    message: ranked.length > 0
      ? `${ranked.length} previously-discovered candidate lead(s) found — none are verified providers, all need human review through the standard onboarding pipeline before any contact or assignment.`
      : 'No previously-discovered candidate leads match this search.',
  });
}, { name: 'checkDiscoveredCandidates', requireAuth: false, bodySchema, rateLimit: { max: 8, windowSeconds: 300 } }));
