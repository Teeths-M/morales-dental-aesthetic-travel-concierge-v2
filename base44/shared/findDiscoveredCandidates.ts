import { resolveCountryISO } from './registryLookup.ts';
import type { PartnerType } from './partnerTypeConfig.ts';

// ── findDiscoveredCandidates ──────────────────────────────────────────────────
// The real query/scoring logic behind the checkDiscoveredCandidates tool,
// extracted so both that LLM-facing tool AND partnerSearchWidening.ts's
// deterministic direct-call path share exactly one implementation. Never
// writes anything, never promotes a candidate — see DiscoveredProviderCandidate
// .jsonc's own description for why 'verified' never applies to anything this
// returns.

export interface DiscoveredCandidateResult {
  id: string;
  title: string;
  procedure_context: string;
  country_iso: string;
  identity_confidence: number;
  registry_check_status: string;
  registry_result: Record<string, unknown> | null;
  note: string;
}

export async function findDiscoveredCandidates(
  base44: any,
  partnerType?: PartnerType,
  filters: { specialty?: string; country?: string } = {},
): Promise<DiscoveredCandidateResult[]> {
  let candidates: any[] = [];
  try {
    candidates = await base44.asServiceRole.entities.DiscoveredProviderCandidate.filter(
      { status: 'candidate' }, '-identity_confidence', 200
    );
  } catch (_) {
    candidates = [];
  }

  if (partnerType) {
    candidates = (candidates as any[]).filter((c: any) => !c.partner_type || c.partner_type === partnerType);
  }

  const countryISO = filters.country ? resolveCountryISO(filters.country) : null;
  const specialtyLow = (filters.specialty || '').toLowerCase();

  const scored = (candidates as any[]).map((c: any) => {
    const cContext = (c.procedure_context || '').toLowerCase();
    const specialtyHit = !specialtyLow || (!!cContext && (specialtyLow.includes(cContext) || cContext.includes(specialtyLow)));
    const countryHit = !countryISO || !c.extracted_country_iso || c.extracted_country_iso === countryISO;
    return { c, relevant: specialtyHit && countryHit };
  });

  const ranked = [...scored.filter(s => s.relevant), ...scored.filter(s => !s.relevant)]
    .map(s => s.c)
    .slice(0, 5);

  return ranked.map((c: any) => ({
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
  }));
}
