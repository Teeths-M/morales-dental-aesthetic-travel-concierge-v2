import { PARTNER_TYPE_CONFIG, partnerDisplayName, partnerSpecialtyText, type PartnerType } from './partnerTypeConfig.ts';

// ── findNearReadyPartners ─────────────────────────────────────────────────────
// The real, generalized version of what checkNearVerifiedDoctors used to do
// only for doctors: surface partners of ANY of the 5 types already sitting in
// the pending_verification pipeline who have already passed both license and
// identity checks — one human background-check click from active. Extracted
// into its own module (not left inline in the entry.ts tool) so BOTH the
// LLM-facing checkNearReadyPartners tool AND the deterministic
// partnerSearchWidening.ts helper call the exact same logic, never two
// implementations that could drift apart.
//
// Never writes anything. background_check_status is informational only —
// "nothing automated may mark a background check passed" stays true; this
// function only ever reports what a human still needs to click, never treats
// the partner as ready on its own authority.

export interface NearReadyPartner {
  id: string;
  partner_type: PartnerType;
  name: string;
  specialty: string;
  country: string;
  license_verification_status: string;
  identity_verification_status: string;
  background_check_status: string;
  note: string;
}

export async function findNearReadyPartners(
  base44: any,
  partnerType: PartnerType,
  filters: { specialty?: string; country?: string } = {},
): Promise<NearReadyPartner[]> {
  const cfg = PARTNER_TYPE_CONFIG[partnerType];
  if (!cfg) return [];

  let pending: any[] = [];
  try {
    pending = await base44.asServiceRole.entities[cfg.entity].filter({ status: 'pending_verification' }, '-created_date', 200);
  } catch (_) {
    pending = [];
  }

  const nearReady = (pending as any[]).filter((p: any) =>
    p.license_verification_status === 'passed' &&
    p.identity_verification_status === 'passed'
  );

  const specialtyLow = (filters.specialty || '').toLowerCase();
  const countryLow = (filters.country || '').toLowerCase();

  const scored = nearReady.map((p: any) => {
    const pSpecialty = partnerSpecialtyText(cfg, p).toLowerCase();
    const pCountry = (p[cfg.countryField] || '').toLowerCase();
    const specialtyHit = !specialtyLow || (!!pSpecialty && (specialtyLow.includes(pSpecialty) || pSpecialty.includes(specialtyLow)));
    const countryHit = !countryLow || (!!pCountry && (countryLow.includes(pCountry) || pCountry.includes(countryLow)));
    return { p, relevant: specialtyHit && countryHit };
  });

  // Relevant matches first, but still surface others — a near-ready partner
  // in the wrong specialty/country is still useful information for a human
  // deciding whether to prioritize verifying them.
  const ranked = [...scored.filter(s => s.relevant), ...scored.filter(s => !s.relevant)]
    .map(s => s.p)
    .slice(0, 5);

  return ranked.map((p: any) => ({
    id: p.id,
    partner_type: partnerType,
    name: partnerDisplayName(cfg, p),
    specialty: partnerSpecialtyText(cfg, p),
    country: p[cfg.countryField] || '',
    license_verification_status: p.license_verification_status,
    identity_verification_status: p.identity_verification_status,
    background_check_status: p.background_check_status || 'pending',
    note: p.background_check_status === 'passed'
      ? 'License, identity, and background check all already passed — one admin click from active.'
      : 'License and identity already passed — still needs a human background-check click before this partner could be assigned.',
  }));
}
