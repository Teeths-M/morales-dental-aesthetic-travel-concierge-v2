/**
 * analyzeEvidenceWatch — Medical Evidence Watch pipeline, stage 2 (analyze).
 *
 * A thin, cronAuthorized-gated wrapper around evidenceWatchPipeline.ts's
 * runEvidenceAnalyzeStage. Extracts structured facts from every
 * status:'new' MedicalDiscovery via Core.InvokeLLM (an unconditional
 * absolute-claim-language ban is built into the prompt itself — see
 * evidenceWatchPipeline.ts's ANALYSIS_PROMPT), falling back to a small
 * deterministic minimal extraction on any LLM failure. Never a second LLM
 * attempt.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { runEvidenceAnalyzeStage } from '../../shared/evidenceWatchPipeline.ts';

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const result = await runEvidenceAnalyzeStage(base44);

  return ok({ success: true, ...result });
}, { name: 'analyzeEvidenceWatch', requireAuth: false }));
