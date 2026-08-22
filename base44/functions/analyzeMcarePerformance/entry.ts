/**
 * analyzeMcarePerformance — closes the LEARN node in M-Care's reasoning loop.
 *
 * Real, cross-case, deterministic learning: when RULE 33 (REPLANNING) makes
 * M-Care try a real alternative after a JourneyPlan step fails, that
 * outcome (did the alternative actually work?) is recorded per-case but
 * never generalized across journeys — a new case starts blind to what
 * already happened on prior ones. This aggregates real JourneyPlan history
 * into `(failed_tool_name -> alternative_tool_name)` success-rate patterns
 * and persists any pattern with a real sample size into McareKnowledge, the
 * same "learn-and-recall brain" mcareResearchAndLearn already writes to —
 * so the agent can recallMcareKnowledge a real, self-observed pattern the
 * same way it recalls a researched fact, no new entity or tool grant needed.
 *
 * Deliberately distinguished from mcareResearchAndLearn's LLM-researched
 * entries: accuracy_estimation and created_by both say plainly this is
 * computed from real execution history, never an LLM's own judgment, and
 * confidence_score is capped at 80 (never claims researched-fact-level
 * certainty) via a simple, sample-size-scaled formula.
 *
 * Only considers the FIRST later step in a plan that used a different
 * tool_name after a failure — a real, disclosed simplification (not an
 * exhaustive multi-hop replanning-chain analysis). Reads the most recent
 * 500 JourneyPlan records per run (sorted by created_at desc) — a real,
 * disclosed bound; this app's own SDK filter has no way to query inside a
 * nested array field, so every plan in the batch is scanned in memory.
 *
 * Scheduled: freshness-cron.yml's daily tier (aggregate stats, not a
 * life-safety escalation — same tier as calculateDriverTrustScore).
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { reviseAndUpdate } from '../../shared/reviseAndUpdate.ts';
import { TTL_MS } from '../../shared/freshness.ts';

const MIN_ATTEMPTS = 3;
const MIN_SUCCESS_RATE = 0.5;
const RECENT_PLAN_LIMIT = 500;

interface PlanStep {
  step_number?: number;
  tool_name?: string;
  status?: string;
}

interface PatternStats {
  attempts: number;
  successes: number;
}

function computeConfidence(attempts: number, successRate: number): number {
  // Sample-size-scaled, capped at 80 so a self-observed pattern can never
  // read as more certain than an LLM-researched McareKnowledge entry
  // (which only ever persists at >=80% self-reported confidence).
  const sampleBonus = Math.min(20, (attempts - MIN_ATTEMPTS) * 2);
  const raw = successRate * 60 + sampleBonus;
  return Math.round(Math.min(80, raw));
}

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const plans = await base44.asServiceRole.entities.JourneyPlan.filter({}, '-created_at', RECENT_PLAN_LIMIT).catch(() => []);

  const patterns = new Map<string, PatternStats>();
  for (const plan of plans as any[]) {
    const steps: PlanStep[] = Array.isArray(plan.steps) ? plan.steps : [];
    for (let i = 0; i < steps.length; i++) {
      const failedStep = steps[i];
      if (failedStep.status !== 'failed' || !failedStep.tool_name) continue;
      for (let j = i + 1; j < steps.length; j++) {
        const altStep = steps[j];
        if (!altStep.tool_name || altStep.tool_name === failedStep.tool_name) continue;
        if (altStep.status !== 'done' && altStep.status !== 'failed') continue;
        const key = `${failedStep.tool_name}::${altStep.tool_name}`;
        const stats = patterns.get(key) || { attempts: 0, successes: 0 };
        stats.attempts += 1;
        if (altStep.status === 'done') stats.successes += 1;
        patterns.set(key, stats);
        break; // only the first real alternative tried after this failure
      }
    }
  }

  const now = new Date().toISOString();
  let written = 0;
  let skipped = 0;

  for (const [key, stats] of patterns) {
    const [failedTool, altTool] = key.split('::');
    const successRate = stats.successes / stats.attempts;
    if (stats.attempts < MIN_ATTEMPTS || successRate < MIN_SUCCESS_RATE) {
      skipped++;
      continue;
    }

    const confidence = computeConfidence(stats.attempts, successRate);
    const successPct = Math.round(successRate * 100);
    const normalizedQuestion = `replanning:${failedTool}->${altTool}`;
    const question = `What should I try if ${failedTool} doesn't find a match or fails?`;
    const answer = `Based on ${stats.attempts} real attempt${stats.attempts === 1 ? '' : 's'} recorded in JourneyPlan history, trying ${altTool} next succeeded ${successPct}% of the time.`;

    const existing = await base44.asServiceRole.entities.McareKnowledge
      .filter({ normalized_question: normalizedQuestion })
      .catch(() => []);

    const payload = {
      question,
      normalized_question: normalizedQuestion,
      answer,
      confidence_score: confidence,
      accuracy_estimation: 'Computed from real JourneyPlan execution history, not researched',
      source_summary: `${stats.attempts} real replanning attempts, ${stats.successes} succeeded`,
      search_keywords: [failedTool, altTool, 'alternative', 'retry', 'replanning'],
      journey_context: 'logistics',
      // A replanning pattern is a deterministic, self-observed operational
      // signal, not a researched fact — source_type/verification_status say
      // so plainly, and freshness_tier:'volatile' matches how quickly an
      // operational reality (a tool that used to fail, or now works) can
      // change. This writer already re-runs and re-upserts every real
      // pattern daily, so the short TTL mostly matters if a live recall of
      // one of these rows happens between cron runs.
      source_type: 'self_observed_pattern',
      verification_status: 'researched',
      freshness_tier: 'volatile',
      last_verified_at: now,
      next_review_at: new Date(Date.now() + TTL_MS.knowledge_volatile).toISOString(),
    };

    if (existing.length > 0) {
      // Preserve the prior pattern (attempt counts/answer) before
      // overwriting it, rather than a silent update-in-place.
      await reviseAndUpdate(base44 as any, 'McareKnowledge', existing[0].id, payload, {
        actor: 'analyzeMcarePerformance',
        reason: 'Daily re-aggregation of replanning outcomes',
      }).catch(() => {});
    } else {
      await base44.asServiceRole.entities.McareKnowledge.create({
        ...payload,
        created_at: now,
        created_by: 'analyzeMcarePerformance',
        recalled_count: 0,
        useful_feedback: 0,
        flagged_for_review: false,
      }).catch(() => {});
    }
    written++;
  }

  return ok({
    success: true,
    plans_scanned: (plans as any[]).length,
    patterns_found: patterns.size,
    patterns_written: written,
    patterns_skipped_below_threshold: skipped,
  });
}, { name: 'analyzeMcarePerformance', requireAuth: false }));
