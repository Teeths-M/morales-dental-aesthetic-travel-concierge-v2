/**
 * capabilityGap — honest, machine-readable "this isn't real yet" states.
 *
 * M-Care's own instructions already forbid inventing a fact (Rule 3, NO
 * INVENTED DATA); this file applies the same discipline to infrastructure,
 * not just data. A caller that would otherwise have to guess, simulate, or
 * silently no-op when an underlying capability doesn't exist should instead
 * return one of these explicit states — never a fabricated success.
 *
 * providerDiscoveryStatus() now genuinely reflects live state: it checks for
 * a real TAVILY_API_KEY (providerDiscovery.ts's searchForProviders is the
 * actual caller) rather than the static "always unavailable" stub this used
 * to be. A search hit is still never a verified fact — see
 * discoverProviderCandidates/entry.ts for the full candidate → verification
 * → confidence → memory pipeline a Tavily result has to pass through.
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
 * from?" — true only when a real TAVILY_API_KEY is configured. Without one,
 * discovery only ever happens through self-registration (mcareCreate*Pending)
 * or a patient personally naming a doctor they already know
 * (submitDoctorNomination) — never an open-web search.
 */
export function providerDiscoveryStatus(): CapabilityGapResult | CapabilityAvailable {
  if (Deno.env.get('TAVILY_API_KEY')) return { available: true };
  return {
    available: false,
    state: CAPABILITY_GAP.DISCOVERY_UNAVAILABLE,
    reason: 'No TAVILY_API_KEY configured. M-Care can only work with providers who already signed up themselves or were personally nominated by a patient — it cannot search the open web for a new one yet.',
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
