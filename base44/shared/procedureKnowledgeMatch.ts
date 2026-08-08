// ── Shared ProcedureKnowledge fuzzy matcher ─────────────────────────────────
// Extracted from getProcedureKnowledge so the scoring logic lives in exactly
// one place. Two callers use this: getProcedureKnowledge (chat, single
// best-match lookup from a casual free-text query) and
// getProcedureRiskSummaries (bulk display lookup for the public procedures
// catalog page, matching each catalog title against the same records).

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'am',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him',
  'us', 'them', 'this', 'that', 'these', 'those', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will',
  'what', 'when', 'where', 'why', 'who', 'how', 'which', 'be', 'been', 'being', 'have', 'has', 'had', 'not', 'no',
  'so', 'at', 'by', 'from', 'as', 'about', 'into', 'than', 'was', 'were', 'getting', 'get', 'think', 'thinking',
  'want', 'need', 'surgery', 'procedure', 'operation', 'op', 'surgical',
]);

export function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export interface ProcedureKnowledgeRecord {
  procedure_name?: string;
  aliases?: string[];
  category?: string;
  [key: string]: unknown;
}

/** Score how well `query` matches one ProcedureKnowledge record, 0–1. */
export function scoreProcedureMatch(query: string, record: ProcedureKnowledgeRecord): number {
  const qLow = query.toLowerCase();
  const qTokens = new Set(tokenize(query));
  const nameLow = (record.procedure_name || '').toLowerCase();
  const aliases = (record.aliases || []).map((a) => a.toLowerCase());

  // Exact / substring name or alias match = strong boost
  let exact = 0;
  if (nameLow === qLow) exact = 1;
  else if (nameLow.includes(qLow) || qLow.includes(nameLow)) exact = 0.85;
  else if (aliases.some((a) => a === qLow)) exact = 0.9;
  else if (aliases.some((a) => a.includes(qLow) || qLow.includes(a))) exact = 0.7;

  // Token overlap
  const storedTokens = new Set([
    ...tokenize(record.procedure_name || ''),
    ...aliases.flatMap((a) => tokenize(a)),
    ...tokenize(record.category || ''),
  ]);
  let overlap = 0;
  for (const t of qTokens) if (storedTokens.has(t)) overlap++;
  const tokenScore = qTokens.size === 0 ? 0 : overlap / storedTokens.size;

  return Math.max(exact, tokenScore);
}

/**
 * Score every record against `query`, keep those above `threshold`, return
 * highest-scoring first, capped at `limit`. Each returned record carries its
 * `score` alongside its original fields.
 */
export function findBestMatches<T extends ProcedureKnowledgeRecord>(
  query: string,
  records: T[],
  opts: { threshold?: number; limit?: number } = {},
): Array<T & { score: number }> {
  const threshold = opts.threshold ?? 0.2;
  const limit = opts.limit ?? 3;
  return records
    .map((r) => ({ ...r, score: scoreProcedureMatch(query, r) }))
    .filter((r) => r.score > threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
