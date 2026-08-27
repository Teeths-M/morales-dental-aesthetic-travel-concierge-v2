// trustScanLevels.ts — verification tiers and data-retention policy for M-Care
// TrustScan. The four levels are deliberately distinct: never one generic
// "Verified" badge for all of these. Retention is per document type (and
// role where relevant); M-Care auto-deletes its metadata copy when the
// retention window ends, unless a legal hold or explicit consent requires
// otherwise. Raw identity documents stay with the verification provider
// (Persona) wherever possible.

export const VERIFICATION_LEVELS = {
  basic: {
    key: 'basic',
    label: 'Basic',
    description: 'Email and phone verified.',
    bookable: false,
  },
  identity_verified: {
    key: 'identity_verified',
    label: 'Identity Verified',
    description: 'Government document captured live + active selfie liveness + face match.',
    bookable: false,
  },
  partner_verified: {
    key: 'partner_verified',
    label: 'Partner Verified',
    description: 'Legal business identity, beneficial contact, and payout ownership verified.',
    bookable: false,
  },
  medical_provider_approved: {
    key: 'medical_provider_approved',
    label: 'Medical Provider Approved',
    description: 'License verified against the official primary registry + human review approved.',
    bookable: true,
  },
} as const;

export type VerificationLevel = keyof typeof VERIFICATION_LEVELS;

// Retention windows (days) per document type. Conservative defaults; tune
// per country/role in a future curated table. A legal hold or explicit
// consent overrides auto-deletion.
export const RETENTION_DAYS: Record<string, number> = {
  passport: 730,
  drivers_license: 365,
  national_id: 730,
  residence_permit: 365,
  default: 365,
};

export function retentionExpiresAt(documentType: string | undefined, now: Date = new Date()): string {
  const days = RETENTION_DAYS[documentType || 'default'] || RETENTION_DAYS.default;
  const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

export function retentionPolicyKey(documentType: string | undefined): string {
  return `retention:${documentType || 'default'}`;
}

// Documents-status derivation from an expiry date.
export function documentsStatus(expiryDate: string | undefined, now: Date = new Date()): 'current' | 'expiring_soon' | 'expired' | 'none' {
  if (!expiryDate) return 'none';
  const exp = new Date(expiryDate).getTime();
  if (!isFinite(exp)) return 'none';
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (exp < now.getTime()) return 'expired';
  if (exp < now.getTime() + thirtyDays) return 'expiring_soon';
  return 'current';
}

// The ONLY four user-facing outcomes. Never expose internal sub-check
// statuses or raw fraud signals to the subject.
export const USER_FACING_STATUSES = [
  'verified',
  'needs_review',
  'unable_to_verify',
  'expired_document',
] as const;

export function isUserFacingStatus(s: string): boolean {
  return (USER_FACING_STATUSES as readonly string[]).includes(s);
}

// Honest limitations surfaced on a TrustProfile — never "scam-proof" or
// "guaranteed real".
export function defaultLimitations(level: VerificationLevel, sandbox: boolean): string[] {
  const limits: string[] = [];
  if (level === 'identity_verified') {
    limits.push('Identity verified against a single government document and an active selfie liveness challenge.');
    limits.push('Presentation-attack detection is one signal among many and is never the sole basis for a decision.');
  }
  if (level === 'partner_verified') {
    limits.push('Business identity verified from submitted registration evidence; rechecks run on a recurring schedule.');
  }
  if (level === 'medical_provider_approved') {
    limits.push('License verified against the official primary registry at the time of review; status may change between rechecks.');
  }
  if (sandbox) {
    limits.push('Verification ran against the sandbox environment — not yet authoritative.');
  }
  limits.push('Verified from trusted sources, with human review when anything is uncertain. Not a guarantee against all fraud.');
  return limits;
}