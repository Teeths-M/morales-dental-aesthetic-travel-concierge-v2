/**
 * evaluateIncidentEvidence — Evidence Monitoring pipeline, stage 3 (evaluate).
 *
 * A thin, cronAuthorized-gated wrapper around incidentPipelineStages.ts's
 * runEvaluateStage. Picks up every IncidentCandidate row at status:
 * 'analyzed', classifies its source_reliability_tier from the publisher
 * domain (fully deterministic — never the LLM's own self-assessment),
 * checks for corroboration against other analyzed/evaluated/proposed rows
 * describing the same real-world story, and sets corroboration_status.
 * A single, uncorroborated source is NEVER marked corroborated — that
 * requires >=2 independent non-social-media domains, or one authoritative
 * primary source alone (incidentSourceQuality.ts).
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { runEvaluateStage } from '../../shared/incidentPipelineStages.ts';

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const result = await runEvaluateStage(base44);

  return ok({ success: true, ...result });
}, { name: 'evaluateIncidentEvidence', requireAuth: false }));
