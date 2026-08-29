/**
 * proposeSafetyLearning — Evidence Monitoring pipeline, stage 4 (propose).
 *
 * A thin, cronAuthorized-gated wrapper around incidentPipelineStages.ts's
 * runProposeStage. Only ever acts on IncidentCandidate rows whose
 * corroboration_status is 'corroborated' or 'conflicting' — gated in the
 * underlying query itself, never on a single, uncorroborated source (see
 * "PARTNERS: multiple procedures and age are not automatic risk decisions"
 * in the original spec — the same discipline applies here).
 *
 * Creates a ProviderSafetyReviewTask ONLY when >=2 corroborated incidents
 * share the same, real, high-confidence matched partner — a private,
 * human-only review task, never a public warning and never a suspension.
 *
 * Drafts a ProposedSafetyRule — a plain-language clinician-review PROMPT,
 * never a numeric threshold or an age/clinic verdict the system applies to
 * itself. review_status starts (and can only be created) at
 * 'pending_review'; nothing in this codebase ever writes 'approved' — that
 * is exclusively a human admin's own manual action in the review queue.
 *
 * THE HARD BOUNDARY: this function never imports, calls, or writes to
 * _shared/safeTEngine.ts, computeSafeT, SafeTScreening, or
 * ProcedureKnowledge.risk_level. See incidentPipelineStages.ts's own header
 * and the redteam invariant that pins this structurally.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { runProposeStage } from '../../shared/incidentPipelineStages.ts';

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const result = await runProposeStage(base44);

  return ok({ success: true, ...result });
}, { name: 'proposeSafetyLearning', requireAuth: false }));
