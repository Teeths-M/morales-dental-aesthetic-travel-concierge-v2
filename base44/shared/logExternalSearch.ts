/**
 * logExternalSearch — a small, NEVER-THROWING logging helper for every
 * external web-search call M-Care's discovery tools make (Tavily today).
 *
 * Same discipline as logProviderContactAttempt.ts: it does NOT perform the
 * search itself — the caller already did (or attempted) the real call
 * before invoking this. This only writes the ExternalSearchLog audit row,
 * including failed/unavailable attempts, so "M-Care tried to search the web
 * N times today" is always answerable instead of leaving no trace beyond a
 * console.log.
 *
 * PHI SAFETY: `query` is a search string the caller controls — callers must
 * never pass a patient's name or clinical detail as the query. This module
 * doesn't enforce that (it can't know), it only logs what it's given.
 *
 * Logging must never block or fail the real search that calls it — the
 * entire body is wrapped in try/catch, matching logProviderContactAttempt.ts
 * and logCrisisReroute.ts's exact discipline.
 */

export type ExternalSearchLogFields = {
  query: string;
  search_type: 'provider' | 'procedure' | 'destination' | 'other';
  vendor: 'tavily' | 'none';
  status: 'success' | 'unavailable' | 'failed';
  result_count?: number;
  initiated_by: string;
  case_id?: string;
};

export async function logExternalSearch(base44: any, fields: ExternalSearchLogFields): Promise<void> {
  try {
    await base44.asServiceRole.entities.ExternalSearchLog.create({
      query: fields.query,
      search_type: fields.search_type,
      vendor: fields.vendor,
      status: fields.status,
      result_count: fields.result_count ?? 0,
      initiated_by: fields.initiated_by,
      case_id: fields.case_id || '',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[logExternalSearch] failed to log — not blocking the real search', error);
  }
}
