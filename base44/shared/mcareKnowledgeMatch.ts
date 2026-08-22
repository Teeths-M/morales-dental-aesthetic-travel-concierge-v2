import type { FreshnessKind } from './freshness.ts';

// ── Shared McareKnowledge fuzzy matcher ─────────────────────────────────────
// Extracted from mcareResearchAndLearn/recallMcareKnowledge, which each had
// their own byte-identical STOPWORDS/tokenize plus a Jaccard-ish overlap
// scorer with no shared implementation — a real, confirmed drift risk (the
// two files' own ACCEPT thresholds had already diverged into three different,
// undocumented values). This centralizes the scoring math and the
// "is this record even eligible to be recalled" filter so the two callers
// can never silently disagree on either again. Each caller still applies its
// own acceptance threshold, since they serve genuinely different purposes:
// mcareResearchAndLearn needs one confident match to skip research entirely;
// recallMcareKnowledge surfaces several looser candidates for the agent to
// weigh.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'am',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him',
  'us', 'them', 'this', 'that', 'these', 'those', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will',
  'what', 'when', 'where', 'why', 'who', 'how', 'which', 'be', 'been', 'being', 'have', 'has', 'had', 'not', 'no',
  'so', 'at', 'by', 'from', 'as', 'about', 'into', 'than', 'was', 'were',
]);

export function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export interface McareKnowledgeRecord {
  question?: string;
  normalized_question?: string;
  search_keywords?: string[];
  flagged_for_review?: boolean;
  verification_status?: string;
  [key: string]: unknown;
}

/**
 * A record is eligible for recall only if it hasn't been admin-flagged and
 * hasn't been retracted (the two signals are kept in sync at their one write
 * site, AdminMcareKnowledge.jsx — checking both here is defensive, not
 * redundant, in case a future path ever sets one without the other).
 */
export function isActiveMcareKnowledgeRecord(record: McareKnowledgeRecord): boolean {
  return !record.flagged_for_review && record.verification_status !== 'retracted';
}

/** Jaccard-ish token-overlap score between `question` and one record, 0–1. */
export function scoreMcareKnowledgeMatch(question: string, record: McareKnowledgeRecord): number {
  const qTokens = new Set(tokenize(question));
  if (qTokens.size === 0) return 0;
  const stored = new Set([
    ...tokenize(record.normalized_question || record.question || ''),
    ...((record.search_keywords || []).map((k) => String(k).toLowerCase())),
  ]);
  let overlap = 0;
  for (const t of qTokens) if (stored.has(t)) overlap++;
  return overlap / Math.max(qTokens.size, stored.size);
}

/**
 * The single highest-scoring eligible record, or null if the question has no
 * real tokens or no records qualify. Used by mcareResearchAndLearn's
 * recall-first check.
 */
export function findBestMcareKnowledgeMatch<T extends McareKnowledgeRecord>(
  question: string,
  records: T[],
): (T & { score: number }) | null {
  if (tokenize(question).length === 0) return null;
  let best: (T & { score: number }) | null = null;
  for (const r of records) {
    if (!isActiveMcareKnowledgeRecord(r)) continue;
    const score = scoreMcareKnowledgeMatch(question, r);
    if (!best || score > best.score) best = { ...r, score };
  }
  return best;
}

/**
 * Every eligible record, scored and sorted highest-first. Used by
 * recallMcareKnowledge to surface multiple candidates.
 */
export function scoreAllMcareKnowledgeMatches<T extends McareKnowledgeRecord>(
  question: string,
  records: T[],
): Array<T & { score: number }> {
  return records
    .filter(isActiveMcareKnowledgeRecord)
    .map((r) => ({ ...r, score: scoreMcareKnowledgeMatch(question, r) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Maps a McareKnowledge record's freshness_tier to its TTL_MS key in
 * freshness.ts. Defaults to 'knowledge_stable' (the most lenient window) for
 * a pre-migration record with no tier set yet, or an unrecognized value —
 * the safe, least-disruptive default; the record's absent last_verified_at
 * already means freshnessState() will correctly treat it as needing a real
 * check the next time it's actually recalled, with no bulk backfill needed.
 */
export function knowledgeFreshnessKind(tier?: string | null): FreshnessKind {
  if (tier === 'volatile') return 'knowledge_volatile';
  if (tier === 'regulatory') return 'knowledge_regulatory';
  return 'knowledge_stable';
}
