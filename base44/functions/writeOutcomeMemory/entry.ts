/**
 * writeOutcomeMemory
 *
 * Anonymized "memory bank" write. Called by logProcedureComplete immediately
 * after a doctor confirms a procedure complete (fire-and-forget, non-fatal).
 *
 * Writes ONLY category/tag-level data to OutcomeRecord (admin/platform_admin
 * RLS, anonymized by default) — NEVER the patient's name/email, the doctor's
 * free-text outcome notes, or a raw medication name/dose/frequency. Only fixed
 * taxonomy tags computed by the shared bucketing helpers ever reach this table.
 *
 * Read back later, for a DIFFERENT patient, by recallSimilarOutcomes — which
 * exposes only aggregate counts/percentages to a doctor, never a single row.
 */

import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { classifyProcedureCategory } from '../_shared/procedureCategory.ts';
import { bucketConditions } from '../_shared/conditionBuckets.ts';
import { bucketMedicationNames } from '../_shared/medicationCategories.ts';
import { PROCEDURE_PROFILES } from '../_shared/procedureCompatibility.ts';

function ageBracketFromDob(dob?: string): string | undefined {
  if (!dob) return undefined;
  const born = new Date(dob).getTime();
  if (!Number.isFinite(born)) return undefined;
  const age = Math.floor((Date.now() - born) / (365.25 * 86400000));
  if (!Number.isFinite(age) || age <= 0) return undefined;
  if (age <= 30) return '18-30';
  if (age <= 45) return '31-45';
  if (age <= 60) return '46-60';
  return '61+';
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id } = await body<{ case_id: string }>();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const procedureName = caseRecord.procedures?.[0] || '';
  const procedureCategory = classifyProcedureCategory(procedureName);
  const conditionTags = bucketConditions(caseRecord.medical_conditions);
  const medicationCategories = bucketMedicationNames(caseRecord.doctor_recommended_medications || []);
  const matchStatus = caseRecord.procedure_match_status || 'not_checked';
  const outcome = matchStatus === 'mismatch_flagged' ? 'incomplete' : 'success';
  const ageBracket = ageBracketFromDob(caseRecord.date_of_birth);
  const now = new Date().toISOString();

  const record = await base44.asServiceRole.entities.OutcomeRecord.create({
    case_id, // internal linkage only — recallSimilarOutcomes never returns this to a caller
    procedure_category: procedureCategory,
    procedure_name: procedureName,
    outcome,
    ...(ageBracket ? { patient_age_bracket: ageBracket } : {}),
    ...(caseRecord.risk_score ? { risk_score_at_booking: caseRecord.risk_score } : {}),
    safe_t_result: caseRecord.safe_t_result || 'PENDING',
    ...(PROCEDURE_PROFILES[procedureName]?.recoveryDays !== undefined
      ? { recovery_days_estimated: PROCEDURE_PROFILES[procedureName].recoveryDays }
      : {}),
    condition_bucket_tags: conditionTags,
    medication_categories: medicationCategories,
    procedure_match_status: matchStatus,
    anonymized: true,
    ingested_at: now,
    is_demo_seed: !!caseRecord.is_demo_seed,
  }).catch((e: any) => {
    console.error('[writeOutcomeMemory] create failed:', e?.message);
    return null;
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'outcome_memory_written',
    resource_type: 'outcome_record',
    resource_id: record?.id || '',
    actor_id: 'system',
    actor_name: 'writeOutcomeMemory',
    case_id,
    details: { procedure_category: procedureCategory, condition_tag_count: conditionTags.length },
    sensitive: false,
    timestamp: now,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    success: true,
    outcome_record_id: record?.id || null,
    procedure_category: procedureCategory,
    condition_bucket_tags: conditionTags,
    medication_categories: medicationCategories,
  });
}, { name: 'writeOutcomeMemory', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
