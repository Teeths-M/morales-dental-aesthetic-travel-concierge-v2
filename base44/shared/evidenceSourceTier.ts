/**
 * evidenceSourceTier — deterministic source-tier classification for the
 * Medical Evidence Watch pipeline. A result from pubmedAdapter.ts,
 * clinicalTrialsAdapter.ts, or openFdaAdapter.ts is ALWAYS tier_1 by
 * construction — it came from the authoritative government/research API
 * itself, no domain-pattern guessing needed. A Tavily result falls through
 * to incidentSourceQuality.ts's classifySourceReliability, imported and
 * reused here — never duplicated (this repo's own BUNDLER redteam sweep
 * would catch a local copy of a shared helper).
 */

import { classifySourceReliability } from './incidentSourceQuality.ts';

export type SourceTier = 'tier_1' | 'tier_2' | 'tier_3';
export type EvidenceAdapter = 'pubmed' | 'clinicaltrials' | 'openfda' | 'tavily';

export function classifyEvidenceSourceTier(adapter: EvidenceAdapter, domain?: string): SourceTier {
  if (adapter === 'pubmed' || adapter === 'clinicaltrials' || adapter === 'openfda') {
    return 'tier_1';
  }

  // tavily — reuse the existing domain-reliability classifier rather than a
  // second, drifting copy of the same domain lists.
  const reliability = classifySourceReliability(domain || '');
  if (reliability === 'authoritative_primary') return 'tier_1'; // e.g. a .gov page Tavily happened to surface
  if (reliability === 'established_reporting' || reliability === 'professional_publication') return 'tier_2';
  return 'tier_3'; // user_generated or unknown
}

/** Pure. Returns the best (most trustworthy) tier among a set of sources. */
export function bestTier(tiers: SourceTier[]): SourceTier {
  if (tiers.includes('tier_1')) return 'tier_1';
  if (tiers.includes('tier_2')) return 'tier_2';
  return 'tier_3';
}
