import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { findBestMatches } from '../../shared/procedureKnowledgeMatch.ts';

// ── getProcedureIllustration ─────────────────────────────────────────────────
// Sibling of getProcedureKnowledge/getProcedureRiskSummaries, scoped to ONE
// thing: does a real, already-generated illustrative image exist for this
// procedure? Used as the fallback tier when ProcedureData.jsx's static
// catalog (the original 69) has no match — MessageBubble.jsx's
// ProcedureMediaCard tries that first, then this, before giving up honestly.
//
// Deliberately reads EVERY active ProcedureKnowledge row, including
// risk_level:'Not Yet Assessed' ones (generateProcedureIllustrations'
// picture-only rows) — unlike getProcedureKnowledge/getProcedureRiskSummaries,
// which both exclude those, this function never returns risk data at all, so
// there's nothing for an unassessed row to misrepresent.
//
// Same 0.5 threshold as getProcedureRiskSummaries: a silent picture in a chat
// bubble can't hedge, so this only surfaces a confident name/alias match,
// never a loose token-overlap guess.

Deno.serve(createHandler(async ({ base44, body }) => {
  const payload = await body();
  const query = (payload?.query || '').toString().trim();
  if (!query) return err('query (procedure name) is required');

  const all: any[] = await base44.asServiceRole.entities.ProcedureKnowledge.list('-updated_at', 400);
  const withImage = all.filter((r) => r.is_active !== false && !!r.image_url);

  if (withImage.length === 0) {
    return ok({ found: false });
  }

  const [best] = findBestMatches(query, withImage, { threshold: 0.5, limit: 1 });
  if (!best) {
    return ok({ found: false });
  }

  return ok({
    found: true,
    title: best.procedure_name,
    image_url: best.image_url,
    desc: best.description || null,
  });
}, { name: 'getProcedureIllustration', requireAuth: false }));