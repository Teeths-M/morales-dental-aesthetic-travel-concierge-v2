import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { resolveCountryISO } from '../../shared/registryLookup.ts';

// ── checkDiscoveredCandidates ────────────────────────────────────────────────
// Read-only search tool for mcare_orchestrator (a backend dispatch-failure
// agent — NOT the patient-facing M-Care chat, though it reads the same
// DiscoveredProviderCandidate staging table Phase 36-38's web-discovery
// pipeline already writes to). When findDoctorBackup finds zero active
// doctors, this surfaces a real, already-discovered lead instead of nothing.
//
// Never writes anything, never promotes a candidate. A candidate here is
// exactly what discoverProviderCandidates/verifyDiscoveredCandidate already
// made it: a lead with an honest identity_confidence and (if a registry
// check already ran) a real registry_result — never something this tool
// treats as verified or assignable. Promotion into a real Doctor record
// stays the existing human-gated mcareCreate*Pending -> admin-approval
// pipeline, completely untouched by this tool.

const bodySchema = strictObject({
  specialty: Fields.optionalText(200),
  country: Fields.optionalText(100),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { specialty, country } = await body();

  let candidates: any[] = [];
  try {
    candidates = await base44.asServiceRole.entities.DiscoveredProviderCandidate.filter(
      { status: 'candidate' }, '-identity_confidence', 200
    );
  } catch (_) {
    candidates = [];
  }

  const countryISO = country ? resolveCountryISO(country) : null;
  const specialtyLow = (specialty || '').toLowerCase();

  const scored = (candidates as any[]).map((c: any) => {
    const cContext = (c.procedure_context || '').toLowerCase();
    const specialtyHit = !specialtyLow || (!!cContext && (specialtyLow.includes(cContext) || cContext.includes(specialtyLow)));
    const countryHit = !countryISO || !c.extracted_country_iso || c.extracted_country_iso === countryISO;
    return { c, relevant: specialtyHit && countryHit };
  });

  const ranked = [...scored.filter(s => s.relevant), ...scored.filter(s => !s.relevant)]
    .map(s => s.c)
    .slice(0, 5);

  return ok({
    success: true,
    count: ranked.length,
    candidates: ranked.map((c: any) => ({
      id: c.id,
      title: c.title,
      procedure_context: c.procedure_context || '',
      country_iso: c.extracted_country_iso || '',
      identity_confidence: c.identity_confidence ?? 0,
      registry_check_status: c.registry_check_status || 'not_attempted',
      registry_result: c.registry_check_status === 'checked' ? (c.registry_result || null) : null,
      note: c.registry_check_status === 'checked'
        ? 'A real government-registry check already ran against a human-supplied license number — see registry_result. Still not a verified provider without a human completing the standard onboarding review.'
        : 'A web-discovered lead only — no registry check has run. This is a starting point for a human to review, not a verified provider.',
    })),
    message: ranked.length > 0
      ? `${ranked.length} previously-discovered candidate lead(s) found — none are verified providers, all need human review through the standard onboarding pipeline before any contact or assignment.`
      : 'No previously-discovered candidate leads match this search.',
  });
}, { name: 'checkDiscoveredCandidates', requireAuth: false, bodySchema, rateLimit: { max: 8, windowSeconds: 300 } }));