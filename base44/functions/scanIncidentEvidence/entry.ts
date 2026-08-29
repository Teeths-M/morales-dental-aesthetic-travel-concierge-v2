/**
 * scanIncidentEvidence — Evidence Monitoring pipeline, stage 1 (scan).
 *
 * A thin, cronAuthorized-gated wrapper around incidentPipelineStages.ts's
 * runScanStage — independently triggerable for debugging/manual runs; also
 * called in-process by runIncidentEvidenceOrchestrator/entry.ts as part of
 * the full monthly pipeline. Runs the fixed discovery queries against the
 * real, already-configured Tavily search adapter (providerDiscovery.ts),
 * dedupes by URL and near-duplicate content hash, and creates
 * IncidentCandidate rows (status: 'new'). Never stores full article bodies
 * — only a bounded snippet.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { runScanStage, DEFAULT_INCIDENT_QUERIES } from '../../shared/incidentPipelineStages.ts';

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const runId = crypto.randomUUID();
  const result = await runScanStage(base44, { runId, queries: DEFAULT_INCIDENT_QUERIES });

  return ok({ success: true, run_id: runId, ...result });
}, { name: 'scanIncidentEvidence', requireAuth: false }));
