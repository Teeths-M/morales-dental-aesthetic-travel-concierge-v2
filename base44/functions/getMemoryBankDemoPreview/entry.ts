/**
 * getMemoryBankDemoPreview
 *
 * Read-only preview of the seeded demo case's PATIENT-VISIBLE fields, for the
 * /demo/memory-bank page. Exposes exactly the same shape PostProcedureCarePanel
 * reads in the real patient dashboard — nothing from the admin-only memory
 * bank (OutcomeRecord) is ever included here.
 *
 * Public by design: there is no real authenticated demo patient login in this
 * pass (see plan's Open Decisions), so this substitutes for one, scoped to
 * only the fixed demo case's already-public-facing fields.
 */

import { createHandler, ok, err } from '../_shared/createHandler.ts';

const DEMO_TOKEN = 'demo-memorybank-token';

Deno.serve(createHandler(async ({ base44 }) => {
  const records = await base44.asServiceRole.entities.CaseRecord
    .filter({ doctor_portal_token: DEMO_TOKEN })
    .catch(() => []);
  const caseRecord = (records || []).find((c: any) => c.is_demo_seed) || null;

  if (!caseRecord) {
    return err('Demo not seeded yet — use "Seed / Reset Demo Data" first.', 404);
  }

  return ok({
    success: true,
    case: {
      client_name: caseRecord.client_name,
      procedures: caseRecord.procedures || [],
      medical_conditions: caseRecord.medical_conditions || '',
      status: caseRecord.status,
      procedure_match_status: caseRecord.procedure_match_status || 'not_checked',
      procedure_match_explanation: caseRecord.procedure_match_explanation || null,
      medication_schedule: caseRecord.medication_schedule || [],
      medication_source: caseRecord.medication_source || null,
      procedure_outcome_notes: caseRecord.procedure_outcome_notes || null,
    },
  });
}, { name: 'getMemoryBankDemoPreview', requireAuth: false }));
