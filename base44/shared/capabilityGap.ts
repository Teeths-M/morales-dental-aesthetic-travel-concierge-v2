/**
 * capabilityGap — honest, machine-readable "this isn't real yet" states.
 *
 * M-Care's own instructions already forbid inventing a fact (Rule 3, NO
 * INVENTED DATA); this file applies the same discipline to infrastructure,
 * not just data. A caller that would otherwise have to guess, simulate, or
 * silently no-op when an underlying capability doesn't exist should instead
 * return one of these explicit states — never a fabricated success.
 *
 * Today exactly one of these is ever actually reachable end-to-end:
 * DISCOVERY_UNAVAILABLE. There is no structured, controllable, per-source
 * web-search or business-directory API anywhere in this codebase — only
 * Base44's black-box InvokeLLM({add_context_from_internet:true}) grounding
 * flag (mcareResearchAndLearn), which cannot resolve provider identity or
 * return inspectable sources. If real search/discovery infrastructure is
 * ever added, replace this file's guarantee — don't bolt a "sometimes real"
 * result on beside it.
 */

import { REGISTRY_ADAPTERS } from './registryLookup.ts';

export const CAPABILITY_GAP = {
  DISCOVERY_UNAVAILABLE: 'DISCOVERY_UNAVAILABLE',
  VERIFICATION_UNAVAILABLE: 'VERIFICATION_UNAVAILABLE',
  OUTREACH_UNAVAILABLE: 'OUTREACH_UNAVAILABLE',
} as const;

export type CapabilityGapState = typeof CAPABILITY_GAP[keyof typeof CAPABILITY_GAP];

export type CapabilityGapResult = {
  available: false;
  state: CapabilityGapState;
  reason: string;
};

export type CapabilityAvailable = { available: true };

/**
 * The honest answer to "can M-Care find a provider Morales has never heard
 * from?" — always unavailable today. Discovery only ever happens through
 * self-registration (mcareCreate*Pending) or a patient personally naming a
 * doctor they already know (submitDoctorNomination) — never an open-web search.
 */
export function providerDiscoveryStatus(): CapabilityGapResult {
  return {
    available: false,
    state: CAPABILITY_GAP.DISCOVERY_UNAVAILABLE,
    reason: 'No structured web-search or business-directory integration exists yet. M-Care can only work with providers who already signed up themselves or were personally nominated by a patient — it cannot search the open web for a new one.',
  };
}

/**
 * Whether an automated government-registry check exists for a country.
 * Derived directly from registryLookup.ts's own adapter table so this can
 * never drift out of sync with what's actually wired up.
 */
export function verificationCapabilityFor(countryISO: string | null | undefined): CapabilityGapResult | CapabilityAvailable {
  const iso = countryISO ? countryISO.toUpperCase() : null;
  const adapter = iso ? REGISTRY_ADAPTERS[iso] : null;
  if (adapter?.supportsLookup) return { available: true };
  return {
    available: false,
    state: CAPABILITY_GAP.VERIFICATION_UNAVAILABLE,
    reason: iso
      ? `No automated government-registry integration exists for ${iso} yet (only ${Object.keys(REGISTRY_ADAPTERS).join('/')} are covered). This routes to manual human review, never a fabricated pass.`
      : 'No country was identified to check a registry against — this routes to manual human review.',
  };
}

/**
 * Whether M-Care can contact a given "provider" at all. Only ever true for a
 * provider already onboarded to Morales (a real partner record with contact
 * info on file) — M-Care cannot cold-contact a business it discovered on its
 * own, since discovery itself doesn't exist (see providerDiscoveryStatus).
 */
export function outreachCapabilityFor(providerIsKnownPartner: boolean): CapabilityGapResult | CapabilityAvailable {
  if (providerIsKnownPartner) return { available: true };
  return {
    available: false,
    state: CAPABILITY_GAP.OUTREACH_UNAVAILABLE,
    reason: 'M-Care can only contact providers already onboarded to Morales — it cannot cold-contact a business it discovered on its own, since no discovery capability exists yet.',
  };
}
