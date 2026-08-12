/**
 * providerCandidateMatch — scores a raw web-search hit against Morales's
 * already-known partners, and computes an honest confidence figure for a
 * newly-discovered candidate.
 *
 * No general-purpose multi-field identity-resolution scorer existed in this
 * codebase before this file (confirmed by audit: procedureKnowledgeMatch.ts
 * and fuzzyMatch.js are both single-string-field matchers, e.g. procedure
 * name — neither combines name+location+specialty the way a discovered
 * provider needs). This reuses procedureKnowledgeMatch.ts's tokenize() (same
 * Deno runtime, already a shared primitive) rather than importing the
 * frontend-only src/lib/fuzzyMatch.js across a runtime boundary.
 *
 * The core safety property lives in computeCandidateConfidence: search
 * relevance ALONE can never produce a score that looks like "verified" —
 * it's capped well below where a real registry confirmation would land.
 */

import { tokenize } from './procedureKnowledgeMatch.ts';

export type KnownProviderSignature = {
  id: string;
  partner_type: 'doctor' | 'travel_agency' | 'taxi_service' | 'companion' | 'security_agency';
  name: string;
  city?: string;
  country?: string;
  specialty?: string;
};

export type SearchCandidateText = {
  title: string;
  snippet: string;
};

/** Below this, a candidate is treated as a genuinely new lead, not a duplicate of a known partner. */
export const DUPLICATE_MATCH_THRESHOLD = 0.55;

/** 0-1: how likely `candidate`'s title/snippet is actually describing `provider`, an existing Morales partner. */
export function scoreAgainstKnownProvider(candidate: SearchCandidateText, provider: KnownProviderSignature): number {
  const text = `${candidate.title || ''} ${candidate.snippet || ''}`.toLowerCase();
  const nameLow = (provider.name || '').toLowerCase().trim();
  if (!nameLow || !text.trim()) return 0;

  let nameScore = 0;
  if (text.includes(nameLow)) {
    nameScore = 0.9;
  } else {
    const nameTokens = new Set(tokenize(provider.name || ''));
    const textTokens = new Set(tokenize(text));
    let overlap = 0;
    for (const t of nameTokens) if (textTokens.has(t)) overlap++;
    nameScore = nameTokens.size ? overlap / nameTokens.size : 0;
  }

  let contextBonus = 0;
  if (provider.city && text.includes(provider.city.toLowerCase())) contextBonus += 0.05;
  if (provider.specialty && text.includes(provider.specialty.toLowerCase())) contextBonus += 0.05;

  return Math.min(1, nameScore + contextBonus);
}

/** Best known-partner match for `candidate`, if any clears DUPLICATE_MATCH_THRESHOLD. */
export function isLikelyKnownProvider(
  candidate: SearchCandidateText,
  knownProviders: KnownProviderSignature[],
): { matched: boolean; provider?: KnownProviderSignature; score: number } {
  let best: KnownProviderSignature | undefined;
  let bestScore = 0;
  for (const p of knownProviders) {
    const score = scoreAgainstKnownProvider(candidate, p);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  const matched = bestScore >= DUPLICATE_MATCH_THRESHOLD;
  return { matched, provider: matched ? best : undefined, score: bestScore };
}

/**
 * Combined identity_confidence (0-100) for a freshly-discovered candidate.
 * Search relevance alone tops out at 40 — nowhere near enough to read as
 * "verified." A real registry confirmation (0-100, from registryLookup.ts)
 * dominates when one exists, since it's genuine third-party signal.
 */
export function computeCandidateConfidence(relevanceScore: number, registryConfidence?: number): number {
  const clampedRelevance = Math.min(1, Math.max(0, relevanceScore || 0));
  const searchPortion = Math.round(clampedRelevance * 40);
  if (typeof registryConfidence === 'number' && registryConfidence > 0) {
    const registryPortion = Math.round(Math.min(100, Math.max(0, registryConfidence)) * 0.6);
    return Math.min(100, searchPortion + registryPortion);
  }
  return searchPortion;
}
