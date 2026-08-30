/**
 * runEvidenceWatchOrchestrator — Medical Evidence Watch pipeline orchestrator.
 * The ONE function wired into .github/workflows/freshness-cron.yml — once in
 * the monthly tier (scope: 'full') and once in the weekly tier (scope:
 * 'recalls_only'). Runs scan -> analyze -> evaluate in-process (each stage
 * function imported directly from evidenceWatchPipeline.ts, zero extra
 * network hop), and records a real, structured EvidenceWatchRun audit
 * trail: run id, trigger, scope, per-stage counts, and any failures (error
 * text only — never article bodies or PHI).
 *
 * Unlike the sibling Evidence Monitoring (incident) pipeline's
 * runIncidentEvidenceOrchestrator, dry_run here does NOT skip a final
 * "propose" stage — this pipeline has no separate artifact-creation step to
 * skip (MedicalDiscovery itself is the review artifact, see
 * evidenceWatchPipeline.ts's own header comment). dry_run still runs all
 * three real stages for real, honest verification before trusting a
 * scheduled run — the only difference is `trigger: 'dry_run'` recorded on
 * the audit row for transparency.
 *
 * Each of the 3 stages is also independently cronAuthorized-gated in its
 * own entry.ts, for manual/debugging use — this function is simply the one
 * that runs all 3 as a real scheduled sweep and keeps the audit trail.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import {
  runEvidenceScanStage, runEvidenceAnalyzeStage, runEvidenceEvaluateStage,
  DEFAULT_EVIDENCE_QUERIES, RECALL_QUERIES,
} from '../../shared/evidenceWatchPipeline.ts';

Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const payload = await body<{ dry_run?: boolean; scope?: 'full' | 'recalls_only'; trigger?: string }>();
  const dryRun = payload?.dry_run === true;
  const scope: 'full' | 'recalls_only' = payload?.scope === 'recalls_only' ? 'recalls_only' : 'full';
  const trigger: 'scheduled' | 'manual' | 'dry_run' = dryRun ? 'dry_run' : (payload?.trigger === 'manual' ? 'manual' : 'scheduled');

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const queriesRun = scope === 'recalls_only' ? RECALL_QUERIES : DEFAULT_EVIDENCE_QUERIES;

  let runRecordId: string | null = null;
  try {
    const rec = await base44.asServiceRole.entities.EvidenceWatchRun.create({
      run_id: runId,
      trigger,
      scope,
      started_at: startedAt,
      queries_run: queriesRun,
      counts: {},
      failures: [],
      model_version: 'gemini_3_flash',
      dry_run: dryRun,
      status: 'running',
    });
    runRecordId = rec?.id || null;
  } catch (_) { /* the run itself must proceed even if the audit row fails to create */ }

  const allFailures: Array<{ stage: string; url_or_query: string; error_message: string }> = [];

  const scanResult = await runEvidenceScanStage(base44, { runId, scope });
  allFailures.push(...scanResult.failures);

  const analyzeResult = await runEvidenceAnalyzeStage(base44);
  allFailures.push(...analyzeResult.failures);

  const evaluateResult = await runEvidenceEvaluateStage(base44);
  allFailures.push(...evaluateResult.failures);

  const counts = {
    discovered: scanResult.discovered,
    deduped: scanResult.deduped,
    analyzed: analyzeResult.analyzed,
    analysis_failures: analyzeResult.analysis_failures,
    evaluated: evaluateResult.evaluated,
    queued_for_review: evaluateResult.queued_for_review,
  };

  const completedAt = new Date().toISOString();
  const status = allFailures.length > 0 ? 'completed_with_errors' : 'completed';

  if (runRecordId) {
    await base44.asServiceRole.entities.EvidenceWatchRun.update(runRecordId, {
      completed_at: completedAt,
      counts,
      failures: allFailures.slice(0, 100),
      status,
    }).catch(() => {});
  }

  return ok({ success: true, run_id: runId, trigger, scope, dry_run: dryRun, counts, failure_count: allFailures.length, status });
}, { name: 'runEvidenceWatchOrchestrator', requireAuth: false }));
