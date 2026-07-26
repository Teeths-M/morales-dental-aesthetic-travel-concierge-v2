/**
 * recallSimilarOutcomes
 *
 * Doctor-only "memory bank" recall. Given a case in progress, returns an
 * anonymized AGGREGATE (never a single row, never a name) of past outcomes
 * for similar procedure + condition profiles, so a doctor can see what M has
 * learned from similar cases before finalizing their own recommendation.
 *
 * This is advisory context, not a decision: the response always carries the
 * fixed caveat below in the payload itself, and no medication, dose, or care
 * decision is ever generated FOR this patient — only descriptive statistics
 * about past, different patients. The doctor is the only decision-maker.
 *
 * Same dual auth as logProcedureComplete/logPhysicalIntakeHandshake: a doctor
 * reaches this via their unauthenticated, signed portal token, OR an
 * admin/platform_admin session acting on their behalf.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';
import { resolveCaseIdentity } from '../_shared/resolveCaseIdentity.ts';
import { classifyProcedureCategory } from '../_shared/procedureCategory.ts';
import { bucketConditions } from '../_shared/conditionBuckets.ts';
import { sanitizeFields } from '../_shared/sanitizePromptInput.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';

const NARRATION_MODEL = 'gpt_5_mini';
const MIN_SIMILAR_CASES = 2;

export const RECALL_CAVEAT =
  "Reference only — every patient's medical history is different. This is not a recommendation for this patient. Confirm suitability using your own clinical judgment.";

async function logRecallAudit(
  base44: any,
  caseId: string,
  procedureCategory: string,
  conditionTags: string[],
  matchCount: number,
  timestamp: string,
): Promise<void> {
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'memory_bank_recall_viewed',
    resource_type: 'case_record',
    resource_id: caseId,
    actor_id: 'system',
    actor_name: 'recallSimilarOutcomes',
    case_id: caseId,
    details: { procedure_category: procedureCategory, condition_tag_count: conditionTags.length, similar_case_count: matchCount },
    sensitive: false,
    timestamp,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json();
    const { case_id, token } = body;

    const identity = await resolveCaseIdentity(base44, user, { case_id, token });
    if (!identity.ok) {
      return Response.json({ error: identity.error }, { status: identity.status });
    }
    const { caseRecord } = identity;

    const procedureName = caseRecord.procedures?.[0] || '';
    const procedureCategory = classifyProcedureCategory(procedureName);
    const conditionTags = bucketConditions(caseRecord.medical_conditions);
    const now = new Date().toISOString();

    const candidates = await base44.asServiceRole.entities.OutcomeRecord
      .filter({ procedure_category: procedureCategory })
      .catch(() => []);

    const overlapping = (candidates || []).filter((rec: any) => {
      if (rec.outcome === 'cancelled') return false;
      if (rec.case_id === caseRecord.id) return false; // never match a case against itself
      const tags: string[] = Array.isArray(rec.condition_bucket_tags) ? rec.condition_bucket_tags : [];
      return tags.some((t) => conditionTags.includes(t));
    });

    const matchedOn = { procedure_category: procedureCategory, condition_bucket_tags: conditionTags };

    if (overlapping.length < MIN_SIMILAR_CASES) {
      await logRecallAudit(base44, caseRecord.id, procedureCategory, conditionTags, overlapping.length, now);
      return Response.json({
        success: true,
        status: 'insufficient_data',
        similar_case_count: overlapping.length,
        matched_on: matchedOn,
        caveat: RECALL_CAVEAT,
      });
    }

    // ── Aggregate only — counts/percentages, never a single row or case_id ────
    const medFreq: Record<string, number> = {};
    let successCount = 0;
    let recoveryDaysSum = 0;
    let recoveryDaysCount = 0;

    for (const rec of overlapping) {
      for (const cat of (rec.medication_categories || [])) {
        medFreq[cat] = (medFreq[cat] || 0) + 1;
      }
      if (rec.outcome === 'success') successCount += 1;
      const recDays = typeof rec.recovery_days_actual === 'number'
        ? rec.recovery_days_actual
        : typeof rec.recovery_days_estimated === 'number'
          ? rec.recovery_days_estimated
          : null;
      if (recDays !== null) {
        recoveryDaysSum += recDays;
        recoveryDaysCount += 1;
      }
    }

    const total = overlapping.length;
    const medicationCategoryFrequency = Object.entries(medFreq)
      .map(([category, count]) => ({ category, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
    const outcomeSuccessRatePercent = Math.round((successCount / total) * 100);
    const avgRecoveryDays = recoveryDaysCount > 0 ? Math.round(recoveryDaysSum / recoveryDaysCount) : null;

    // Optional, advisory-only LLM narration of the already-computed aggregate.
    // Never asked for a recommendation — only to describe the numbers in prose.
    let aiSummary = '';
    try {
      const { clean } = sanitizeFields({
        procedure_category: procedureCategory,
        condition_tags: conditionTags.join(', '),
      }, 300);
      const narr = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: NARRATION_MODEL,
        prompt: `You are narrating an ALREADY-COMPUTED aggregate summary for a doctor reviewing a new patient. This is descriptive statistics about OTHER, DIFFERENT past patients — not a recommendation for the doctor's current patient. Do not suggest what to prescribe. Do not name a specific dose. Do not make a clinical recommendation. One short, calm paragraph only.

Procedure category: ${clean.procedure_category}
Condition tags matched: ${clean.condition_tags}
Similar past cases found: ${total}
Outcome success rate: ${outcomeSuccessRatePercent}%
Most common medication categories in those past cases: ${medicationCategoryFrequency.slice(0, 3).map((m) => `${m.category} (${m.percent}%)`).join(', ') || 'none recorded'}
Average recovery days recorded: ${avgRecoveryDays ?? 'not recorded'}

Return JSON only: { "summary": "one short paragraph" }`,
        response_json_schema: {
          type: 'object',
          properties: { summary: { type: 'string' } },
          required: ['summary'],
        },
      });
      aiSummary = String(narr?.summary || '');
    } catch (_) { /* narration is optional — the aggregate numbers always stand */ }

    await logRecallAudit(base44, caseRecord.id, procedureCategory, conditionTags, total, now);

    return Response.json({
      success: true,
      status: 'ok',
      similar_case_count: total,
      matched_on: matchedOn,
      medication_category_frequency: medicationCategoryFrequency,
      outcome_success_rate_percent: outcomeSuccessRatePercent,
      avg_recovery_days: avgRecoveryDays,
      ai_summary: aiSummary || null,
      caveat: RECALL_CAVEAT,
    });

  } catch (error) {
    console.error('[recallSimilarOutcomes]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'recallSimilarOutcomes', requireAuth: false }));
