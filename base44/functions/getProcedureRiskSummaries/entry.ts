import { createHandler, ok } from '../../shared/createHandler.ts';
import { z, strictObject } from '../../shared/validate.ts';
import { findBestMatches } from '../../shared/procedureKnowledgeMatch.ts';

// ── getProcedureRiskSummaries ────────────────────────────────────────────────
// Bulk sibling of getProcedureKnowledge, for the public procedures catalog
// page (Procedures.jsx / ProcedureModal.jsx) rather than the chat agent.
// Given the catalog's procedure titles, returns a title -> risk summary map
// for any confident match against ProcedureKnowledge — a title with no
// confident match is simply omitted, never given a fabricated/default risk
// level. No procedure risk content is authored here; this only surfaces
// what an admin has already curated via /admin/procedure-knowledge.
//
// Threshold is deliberately higher than getProcedureKnowledge's chat lookup
// (0.5 vs 0.2): a chat answer can hedge ("here's what I found, let me know if
// that's not quite right"), but a silent pill on a browsing card cannot — a
// loose token-overlap match attached to the wrong procedure would be
// actively misleading in a medical context, so this only surfaces
// near-exact name/alias matches.

const bodySchema = strictObject({
  titles: z.array(z.string().trim().min(1).max(200)).min(1).max(150),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { titles } = await body();

  const all: any[] = await base44.asServiceRole.entities.ProcedureKnowledge.list('-updated_at', 200);
  const active = all.filter((r) => r.is_active !== false);

  const summaries: Record<string, { risk_level: string; risk_factors: string[]; complication_rate: string | null }> = {};
  if (active.length > 0) {
    for (const title of titles) {
      const [best] = findBestMatches(title, active, { threshold: 0.5, limit: 1 });
      if (best) {
        summaries[title] = {
          risk_level: best.risk_level,
          risk_factors: best.risk_factors || [],
          complication_rate: best.complication_rate || null,
        };
      }
    }
  }

  return ok({ summaries });
}, { name: 'getProcedureRiskSummaries', requireAuth: false, bodySchema }));
