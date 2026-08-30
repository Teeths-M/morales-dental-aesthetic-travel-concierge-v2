/**
 * evaluateEvidenceWatch — Medical Evidence Watch pipeline, stage 3 (evaluate).
 *
 * A thin, cronAuthorized-gated wrapper around evidenceWatchPipeline.ts's
 * runEvidenceEvaluateStage — fully deterministic, no LLM. Classifies real
 * source-reliability tiers, computes the patient-facing confidence tier
 * (evidenceConfidence.ts), and runs the hard, unconditional banned-
 * absolute-claim-language check (evidenceLanguageGuard.ts) — a hit, or a
 * fallback-only extraction, routes the record to needs_more_evidence rather
 * than ever silently reaching queued_for_review.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { runEvidenceEvaluateStage } from '../../shared/evidenceWatchPipeline.ts';

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const result = await runEvidenceEvaluateStage(base44);

  return ok({ success: true, ...result });
}, { name: 'evaluateEvidenceWatch', requireAuth: false }));
