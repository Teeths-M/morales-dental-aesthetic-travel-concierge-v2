// ── partnerTypeConfig ────────────────────────────────────────────────────────
// Single source of truth for the field-name differences across Morales's 5
// partner entities (Doctor/TravelAgency/TaxiService/Companion/SecurityAgency).
// Confirmed directly against each entity's real .jsonc schema and each real
// existing caller's own field usage (not guessed) before this file was
// written — display field names genuinely differ per entity even though the
// verification-progress fields (status/license_verification_status/
// identity_verification_status) are identical across all 5.
//
// partner_type values match the union already established by
// providerCandidateMatch.ts's KnownProviderSignature and
// DiscoveredProviderCandidate.matched_existing_partner_type — 'companion',
// never 'companion_agency' (that string is an unrelated user-role constant
// in src/lib/constants.js, not a partner_type).

export type PartnerType = 'doctor' | 'travel_agency' | 'taxi_service' | 'companion' | 'security_agency';

export interface PartnerTypeConfig {
  partner_type: PartnerType;
  entity: string;
  /** Human-facing noun for chat copy, e.g. "another verified doctor". */
  noun: string;
  /** Real field holding a display name on this entity. */
  nameField: string;
  /** Fallback display-name field, if the primary is often blank (TaxiService only). */
  nameFieldFallback?: string;
  /** Real field holding specialty/services — may be a string (Doctor) or an array (the other 4). */
  specialtyField: string;
  specialtyIsArray: boolean;
  /** Real field holding the partner's country. */
  countryField: string;
  /** Real field holding a city, when one exists on this entity (doctor only, confirmed). */
  cityField?: string;
  /**
   * Where an admin can review a specific partner record of this type, once
   * they have its id. No dedicated single-record admin page is confirmed for
   * every type, so this is the best available list/console entry point.
   */
  adminReviewUrl: string;
}

export const PARTNER_TYPE_CONFIG: Record<PartnerType, PartnerTypeConfig> = {
  doctor: {
    partner_type: 'doctor',
    entity: 'Doctor',
    noun: 'doctor',
    nameField: 'full_name',
    specialtyField: 'specialty',
    specialtyIsArray: false,
    countryField: 'clinic_country',
    cityField: 'clinic_city',
    adminReviewUrl: '/admin/doctors',
  },
  travel_agency: {
    partner_type: 'travel_agency',
    entity: 'TravelAgency',
    noun: 'travel agency',
    nameField: 'agency_name',
    specialtyField: 'services_offered',
    specialtyIsArray: true,
    countryField: 'headquarters_country',
    adminReviewUrl: '/admin/partners',
  },
  taxi_service: {
    partner_type: 'taxi_service',
    entity: 'TaxiService',
    noun: 'driver',
    nameField: 'driver_name',
    nameFieldFallback: 'company_name',
    specialtyField: 'vehicle_types',
    specialtyIsArray: true,
    countryField: 'operating_country',
    adminReviewUrl: '/admin/partners',
  },
  companion: {
    partner_type: 'companion',
    entity: 'Companion',
    noun: 'companion',
    nameField: 'full_name',
    specialtyField: 'specializations',
    specialtyIsArray: true,
    countryField: 'country',
    adminReviewUrl: '/admin/partners',
  },
  security_agency: {
    partner_type: 'security_agency',
    entity: 'SecurityAgency',
    noun: 'security escort',
    nameField: 'agency_name',
    specialtyField: 'services_offered',
    specialtyIsArray: true,
    countryField: 'country',
    adminReviewUrl: '/admin/partners',
  },
};

export function partnerDisplayName(cfg: PartnerTypeConfig, record: Record<string, any>): string {
  const primary = record[cfg.nameField];
  if (primary) return primary;
  if (cfg.nameFieldFallback && record[cfg.nameFieldFallback]) return record[cfg.nameFieldFallback];
  return `Unnamed ${cfg.noun}`;
}

export function partnerSpecialtyText(cfg: PartnerTypeConfig, record: Record<string, any>): string {
  const raw = record[cfg.specialtyField];
  if (cfg.specialtyIsArray) return Array.isArray(raw) ? raw.join(', ') : '';
  return raw || '';
}
