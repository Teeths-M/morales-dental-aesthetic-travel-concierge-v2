/**
 * protectionType — who are we protecting?
 *
 * Morales began as a medical-travel concierge, so every flow historically
 * assumed the person signing up was flying somewhere for a procedure. That
 * assumption is baked into the onboarding wizard (it asks "what procedure
 * interests you?" before it has established that a procedure is even involved)
 * and it quietly excludes a person who wants the safety layer without a
 * journey — SOS, emergency contacts, the PIN vault and location sharing are
 * all case-independent and work perfectly well for someone at home.
 *
 * So the first question we ask is the honest one: are you travelling for
 * treatment, or not? We protect both. The answer branches onboarding and is
 * readable platform-wide via `getProtectionType`.
 *
 * Storage: localStorage is authoritative for UX gating (instant, works
 * offline, survives a failed network write); the User record is the durable
 * copy, written best-effort. Same discipline as [[locationConsent]] — never
 * block a person on our persistence succeeding.
 */

export const PROTECTION_TYPES = {
  TRAVELER: 'medical_traveler',
  NON_TRAVELER: 'non_traveler',
};

const VALID = new Set(Object.values(PROTECTION_TYPES));

const STORAGE_KEY = 'morales_protection_type';

/**
 * @param {object} [user] the authenticated user record, when already loaded
 * @returns {'medical_traveler'|'non_traveler'|null} null = not yet answered
 */
export function getProtectionType(user = null) {
  if (VALID.has(user?.protection_type)) return user.protection_type;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID.has(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Record locally (instant) — callers persist to the User record separately. */
export function setProtectionTypeLocally(type) {
  if (!VALID.has(type)) return;
  try { localStorage.setItem(STORAGE_KEY, type); } catch { /* private mode */ }
}

export function isMedicalTraveler(user = null) {
  return getProtectionType(user) === PROTECTION_TYPES.TRAVELER;
}

export function isNonTraveler(user = null) {
  return getProtectionType(user) === PROTECTION_TYPES.NON_TRAVELER;
}

/**
 * What each choice actually gets. Every line here is a claim made to a person
 * about their safety, so each one must be true in code today:
 *
 *  - SOS            → `triggerSOS` takes `case_id` as OPTIONAL; the /emergency
 *                     page and M-Care chat both call it with no case at all.
 *                     Works with no journey.
 *  - Emergency PIN  → EmergencyPIN is keyed by user email, not by case.
 *  - Location share → gated on consent per case; travellers only. NOT listed
 *                     for non-travellers, because there is no case to attach it to.
 *  - Handshakes /
 *    journey spine  → require a CaseRecord. Travellers only.
 *
 * If a feature moves, this list moves with it. Do not add aspirational lines.
 */
export const PROTECTION_OPTIONS = [
  {
    type: PROTECTION_TYPES.TRAVELER,
    title: 'Medical Traveler',
    subtitle: "I'm travelling for treatment",
    covers: [
      'Your full journey, coordinated end to end',
      'Verified doctors and clinics',
      'Check-ins at every step of the trip',
      'Emergency SOS and your protection vault',
    ],
  },
  {
    type: PROTECTION_TYPES.NON_TRAVELER,
    title: 'Non-Traveler',
    subtitle: "I'm not travelling — I want the protection",
    covers: [
      'Emergency SOS, wherever you are',
      'Your emergency contacts, reachable instantly',
      'Your protection vault, encrypted on your device',
      'Book a journey later — nothing is locked',
    ],
  },
];
