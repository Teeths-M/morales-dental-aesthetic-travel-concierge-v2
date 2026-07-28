/**
 * seedMemoryBankDemo
 *
 * Idempotent demo-data seeder for /demo/memory-bank. Public by design (the
 * doctor-completion demo itself is reached via an unauthenticated portal
 * token, same as the real flow) — but tightly scoped: it only ever touches
 * rows it created itself, identified by the fixed DEMO_TOKEN / is_demo_seed
 * flag. Zero blast radius on real patient/doctor data.
 *
 * Re-running this resets the demo to a clean starting state.
 */

import { createHandler, ok } from './createHandler.ts';

const DEMO_TOKEN = 'demo-memorybank-token';
const DEMO_PATIENT_EMAIL = 'demo.patient@moralesdemo.internal';
const DEMO_DOCTOR_EMAIL = 'demo.doctor@moralesdemo.internal';
const DEMO_PROCEDURE = 'Multiple Dental Implants'; // matches a real PROCEDURE_PROFILES key

const SEED_OUTCOMES: Array<{
  condition_bucket_tags: string[];
  medication_categories: string[];
  outcome: 'success' | 'complication';
  recovery_days_actual: number;
}> = [
  { condition_bucket_tags: ['diabetes', 'hypertension'], medication_categories: ['antibiotic', 'pain_relief'], outcome: 'success', recovery_days_actual: 6 },
  { condition_bucket_tags: ['diabetes'], medication_categories: ['antibiotic', 'anti_inflammatory'], outcome: 'success', recovery_days_actual: 8 },
  { condition_bucket_tags: ['hypertension', 'cardiac'], medication_categories: ['antibiotic', 'antiseptic_rinse'], outcome: 'complication', recovery_days_actual: 10 },
];

Deno.serve(createHandler(async ({ base44 }) => {
  // ── Idempotent reset: remove anything this demo previously seeded ──────────
  const existingCases = await base44.asServiceRole.entities.CaseRecord
    .filter({ doctor_portal_token: DEMO_TOKEN })
    .catch(() => []);
  for (const c of existingCases || []) {
    if (c.is_demo_seed) await base44.asServiceRole.entities.CaseRecord.delete(c.id).catch(() => {});
  }
  const existingOutcomes = await base44.asServiceRole.entities.OutcomeRecord
    .filter({ is_demo_seed: true })
    .catch(() => []);
  for (const o of existingOutcomes || []) {
    await base44.asServiceRole.entities.OutcomeRecord.delete(o.id).catch(() => {});
  }


  // ── Seed one demo case, ready for Stage 11 (Procedure Complete) ────────────
  const caseRecord = await base44.asServiceRole.entities.CaseRecord.create({
    client_name: 'Elena Ruiz (Demo Patient)',
    client_email: DEMO_PATIENT_EMAIL,
    client_phone: '+1-000-000-0000',
    procedures: [DEMO_PROCEDURE],
    medical_conditions: 'Diabetes, Hypertension',
    status: 'SURGICAL_EXECUTION_WINDOW',
    doctor_email: DEMO_DOCTOR_EMAIL,
    doctor_portal_token: DEMO_TOKEN,
    doctor_confirmation_status: 'CONFIRMED',
    safe_t_result: 'PASSED',
    risk_score: 'Moderate',
    date_of_birth: '1967-03-14',
    is_demo_seed: true,
  }).catch((e: any) => {
    console.error('[seedMemoryBankDemo] CaseRecord create failed:', e?.message);
    return null;
  });


  // ── Seed prior anonymized outcomes so the recall panel has real aggregate data ─
  let seeded = 0;
  const now = new Date().toISOString();
  for (const seed of SEED_OUTCOMES) {
    const rec = await base44.asServiceRole.entities.OutcomeRecord.create({
      procedure_category: 'dental',
      procedure_name: DEMO_PROCEDURE,
      outcome: seed.outcome,
      patient_age_bracket: '46-60',
      risk_score_at_booking: 'Moderate',
      safe_t_result: 'PASSED',
      recovery_days_actual: seed.recovery_days_actual,
      condition_bucket_tags: seed.condition_bucket_tags,
      medication_categories: seed.medication_categories,
      procedure_match_status: 'matched',
      anonymized: true,
      ingested_at: now,
      is_demo_seed: true,
    }).catch(() => null);
    if (rec) seeded += 1;
  }
//
  return ok({
    success: true,
    demo_token: DEMO_TOKEN,
    demo_case_id: caseRecord?.id || null,
    seeded_outcome_records: seeded,
    doctor_portal_path: `/portal/doctor/${DEMO_TOKEN}`,
  });
}, { name: 'seedMemoryBankDemo', requireAuth: false }));
