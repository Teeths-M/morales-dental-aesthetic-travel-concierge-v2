// Repeat-procedure history check — detects whether a patient has had the SAME
// major procedure done before, on a separate, earlier trip through Morales.
//
// This is a distinct signal from getViolations()/procedureCompatibility.ts,
// which only ever checks procedures combined together in ONE booking/cart.
// Neither that engine nor safeTEngine.ts has ever looked at a patient's own
// case HISTORY — this file closes that gap, server-only (no client twin
// needed: this requires an asServiceRole query across a patient's own past
// CaseRecords, which cannot run client-side at all).
//
// Deterministic, no LLM. Never itself decides a tier — it only ever reports
// requiresReview: true/false. safeT4LifeScan (the caller) is what turns that
// into a real HIGH-tier mandatory doctor review + waiver gate.

import { tokenize } from './procedureKnowledgeMatch.ts';
import { PROCEDURE_PROFILES } from './procedureCompatibility.ts';

// 2 prior doctor-confirmed completions = this request would be the 3rd time.
// Matches the real-world case that prompted this check.
const REVIEW_THRESHOLD = 2;

// Same "major surgery" bar getViolations() already uses (majorSurgeries =
// profiles.filter(p => p.stress >= 6)) — reused for consistency, not a new
// threshold. A trivial repeat (teeth whitening, a 5th Botox) never qualifies.
const MAJOR_STRESS_THRESHOLD = 6;

function isMajorProcedure(name: string): boolean {
  const profile = (PROCEDURE_PROFILES as Record<string, { stress: number }>)[name] || { stress: 3 };
  return profile.stress >= MAJOR_STRESS_THRESHOLD;
}

// High-bar token overlap so "BBL" matches "Brazilian Butt Lift" without
// false-matching unrelated procedures that merely share a common word.
function sameProcedure(a: string, b: string): boolean {
  const an = (a || '').trim().toLowerCase();
  const bn = (b || '').trim().toLowerCase();
  if (!an || !bn) return false;
  if (an === bn) return true;
  const at = new Set(tokenize(a));
  const bt = new Set(tokenize(b));
  if (at.size === 0 || bt.size === 0) return false;
  let overlap = 0;
  for (const t of at) if (bt.has(t)) overlap++;
  const smaller = Math.min(at.size, bt.size);
  return overlap / smaller >= 0.8;
}

export interface RepeatProcedureResult {
  repeats: Array<{ procedure: string; priorCompletedCount: number; priorCaseIds: string[] }>;
  requiresReview: boolean;
}

const EMPTY_RESULT: RepeatProcedureResult = { repeats: [], requiresReview: false };

export async function checkRepeatProcedureHistory(
  base44: any,
  patientEmail: string,
  requestedProcedures: string[],
): Promise<RepeatProcedureResult> {
  if (!patientEmail || !Array.isArray(requestedProcedures) || requestedProcedures.length === 0) {
    return EMPTY_RESULT;
  }

  try {
    const priorCases = await base44.asServiceRole.entities.CaseRecord.filter(
      { client_email: patientEmail },
      '-created_date',
      50,
    );

    // procedure_complete_logged_at is set exactly once, atomically alongside
    // procedures_confirmed_by_doctor, only by logProcedureComplete when a real
    // doctor confirms completion — a reliable "this actually happened" signal,
    // unlike CaseRecord.status (whose vocabulary is inconsistent across
    // writers — see checkReturningPatient's own broken COMPLETED_STATUSES
    // check, deliberately not reused here).
    const completedCases = (priorCases || []).filter((c: any) => !!c.procedure_complete_logged_at);

    const repeats: RepeatProcedureResult['repeats'] = [];

    for (const requested of requestedProcedures) {
      if (!requested || !isMajorProcedure(requested)) continue;

      const matchingCaseIds: string[] = [];
      for (const c of completedCases) {
        const doneList: string[] =
          Array.isArray(c.procedures_confirmed_by_doctor) && c.procedures_confirmed_by_doctor.length > 0
            ? c.procedures_confirmed_by_doctor
            : (Array.isArray(c.procedures) ? c.procedures : []);
        if (doneList.some((p: string) => sameProcedure(p, requested))) {
          matchingCaseIds.push(c.id);
        }
      }

      if (matchingCaseIds.length > 0) {
        repeats.push({
          procedure: requested,
          priorCompletedCount: matchingCaseIds.length,
          priorCaseIds: matchingCaseIds,
        });
      }
    }

    const requiresReview = repeats.some((r) => r.priorCompletedCount >= REVIEW_THRESHOLD);
    return { repeats, requiresReview };
  } catch (e) {
    // Fails open for THIS signal only — a lookup failure here never weakens
    // any existing CRITICAL/HIGH trigger in safeT4LifeScan, which is computed
    // independently. It just means this one enrichment doesn't fire this time.
    console.error('[repeatProcedureHistory] lookup failed, degrading to no-signal (non-fatal):', (e as Error)?.message);
    return EMPTY_RESULT;
  }
}
