/**
 * analyzeIncidentEvidence — Evidence Monitoring pipeline, stage 2 (analyze).
 *
 * A thin, cronAuthorized-gated wrapper around incidentPipelineStages.ts's
 * runAnalyzeStage. Picks up every IncidentCandidate row still at
 * status:'new', extracts structured facts via Core.InvokeLLM with a strict
 * JSON schema (falling back to a small, deterministic keyword extractor on
 * any LLM failure — never a second LLM retry, always low confidence),
 * resolves a mentioned clinic/provider against Morales's known partners
 * (providerCandidateMatch.ts — always capped, never auto-trusted), and
 * advances each row to status:'analyzed'.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { runAnalyzeStage } from '../../shared/incidentPipelineStages.ts';

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const result = await runAnalyzeStage(base44);

  return ok({ success: true, ...result });
}, { name: 'analyzeIncidentEvidence', requireAuth: false }));
