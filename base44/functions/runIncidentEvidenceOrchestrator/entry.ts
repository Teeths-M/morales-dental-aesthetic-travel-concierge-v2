/**
 * runIncidentEvidenceOrchestrator — Evidence Monitoring pipeline orchestrator.
 * The ONE function wired into .github/workflows/freshness-cron.yml's new
 * monthly tier (1st of each month). Runs scan -> analyze -> evaluate ->
 * propose in-process (each stage function imported directly from
 * incidentPipelineStages.ts, zero extra network hop), and records a real,
 * structured IncidentScanRun audit trail: run id, trigger, per-stage counts,
 * and any failures (error text only — never article bodies or PHI).
 *
 * dry_run: true still performs real search/LLM calls through scan/analyze/
 * evaluate (useful for testing the real pipeline) but skips the final
 * propose stage's real persistence — instead it reports how many evaluated,
 * corroborated/conflicting incidents WOULD have been proposed, without
 * creating any ProposedSafetyRule or ProviderSafetyReviewTask row.
 *
 * Each of the 4 stages is also independently cronAuthorized-gated in its
 * own entry.ts, for manual/debugging use — this function is simply the one
 * that runs all 4 as a real monthly sweep and keeps the audit trail.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { runScanStage, runAnalyzeStage, runEvaluateStage, runProposeStage, DEFAULT_INCIDENT_QUERIES } from '../../shared/incidentPipelineStages.ts';
import { DUPLICATE_MATCH_THRESHOLD } from '../../shared/providerCandidateMatch.ts';

const MIN_PARTNER_MATCH_CONFIDENCE = Math.round(DUPLICATE_MATCH_THRESHOLD * 100);

Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const payload = await body();
  const dryRun = payload?.dry_run === true;
  const trigger: 'scheduled' | 'manual' | 'dry_run' = dryRun ? 'dry_run' : (payload?.trigger === 'manual' ? 'manual' : 'scheduled');

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  let runRecordId: string | null = null;
  try {
    const rec = await base44.asServiceRole.entities.IncidentScanRun.create({
      run_id: runId,
      trigger,
      started_at: startedAt,
      queries_run: DEFAULT_INCIDENT_QUERIES,
      counts: {},
      failures: [],
      model_version: 'gemini_3_flash',
      dry_run: dryRun,
      status: 'running',
    });
    runRecordId = rec?.id || null;
  } catch (_) { /* the run itself must proceed even if the audit row fails to create */ }

  const allFailures: Array<{ stage: string; url_or_query: string; error_message: string }> = [];

  const scanResult = await runScanStage(base44, { runId, queries: DEFAULT_INCIDENT_QUERIES });
  allFailures.push(...scanResult.failures);

  const analyzeResult = await runAnalyzeStage(base44);
  allFailures.push(...analyzeResult.failures);

  const evaluateResult = await runEvaluateStage(base44);
  allFailures.push(...evaluateResult.failures);

  let rules_proposed = 0;
  let review_tasks_created = 0;
  let would_propose_rules: number | undefined;
  let would_create_review_tasks: number | undefined;

  if (dryRun) {
    try {
      const [corroborated, conflicting] = await Promise.all([
        base44.asServiceRole.entities.IncidentCandidate.filter({ status: 'evaluated', corroboration_status: 'corroborated' }, '-created_at', 200),
        base44.asServiceRole.entities.IncidentCandidate.filter({ status: 'evaluated', corroboration_status: 'conflicting' }, '-created_at', 200),
      ]);
      would_propose_rules = corroborated.length + conflicting.length;
      const byPartner = new Map<string, number>();
      for (const row of corroborated as any[]) {
        if (!row.matched_partner_id || (row.match_confidence || 0) < MIN_PARTNER_MATCH_CONFIDENCE) continue;
        byPartner.set(row.matched_partner_id, (byPartner.get(row.matched_partner_id) || 0) + 1);
      }
      would_create_review_tasks = Array.from(byPartner.values()).filter((n) => n >= 2).length;
    } catch (_) {
      would_propose_rules = 0;
      would_create_review_tasks = 0;
    }
  } else {
    const proposeResult = await runProposeStage(base44);
    allFailures.push(...proposeResult.failures);
    rules_proposed = proposeResult.rules_proposed;
    review_tasks_created = proposeResult.review_tasks_created;
  }

  const counts = {
    discovered: scanResult.discovered,
    deduped: scanResult.deduped,
    analyzed: analyzeResult.analyzed,
    analysis_failures: analyzeResult.analysis_failures,
    evaluated: evaluateResult.evaluated,
    rules_proposed,
    review_tasks_created,
    ...(dryRun ? { would_propose_rules, would_create_review_tasks } : {}),
  };

  const completedAt = new Date().toISOString();
  const status = allFailures.length > 0 ? 'completed_with_errors' : 'completed';

  if (runRecordId) {
    await base44.asServiceRole.entities.IncidentScanRun.update(runRecordId, {
      completed_at: completedAt,
      counts,
      failures: allFailures.slice(0, 100),
      status,
    }).catch(() => {});
  }

  return ok({ success: true, run_id: runId, trigger, dry_run: dryRun, counts, failure_count: allFailures.length, status });
}, { name: 'runIncidentEvidenceOrchestrator', requireAuth: false }));
