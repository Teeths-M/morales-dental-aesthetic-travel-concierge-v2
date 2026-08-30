/**
 * scanEvidenceWatch — Medical Evidence Watch pipeline, stage 1 (scan).
 *
 * A thin, cronAuthorized-gated wrapper around evidenceWatchPipeline.ts's
 * runEvidenceScanStage — independently triggerable for debugging/manual
 * runs; also called in-process by runEvidenceWatchOrchestrator/entry.ts as
 * part of the full monthly/weekly pipeline. Runs the real Tier-1
 * government/research APIs (PubMed, ClinicalTrials.gov, openFDA — all free
 * and keyless) plus Tavily for Tier 2/3 discovery, dedupes by URL and
 * near-duplicate content hash, and creates MedicalDiscovery rows
 * (status: 'new'). Never stores full article/abstract bodies — only a
 * bounded snippet.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { runEvidenceScanStage } from '../../shared/evidenceWatchPipeline.ts';

Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const payload = await body<{ scope?: 'full' | 'recalls_only' }>();
  const scope: 'full' | 'recalls_only' = payload?.scope === 'recalls_only' ? 'recalls_only' : 'full';

  const runId = crypto.randomUUID();
  const result = await runEvidenceScanStage(base44, { runId, scope });

  return ok({ success: true, run_id: runId, scope, ...result });
}, { name: 'scanEvidenceWatch', requireAuth: false }));
