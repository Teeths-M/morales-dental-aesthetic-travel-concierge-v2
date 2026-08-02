import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

async function aiJourneySummary(cr: Record<string, unknown>): Promise<string | null> {
  if (!ANTHROPIC_KEY) return null;
  const procs = Array.isArray(cr.procedures) ? cr.procedures.join(', ') : String(cr.procedures || 'procedure');
  const dest = String(cr.procedure_country || cr.destination_city || 'destination');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: HAIKU, max_tokens: 60,
        messages: [{ role: 'user', content: `Medical travel concierge. Patient completed their journey: ${procs} in ${dest}. Write ONE warm 15-word sentence celebrating their completed journey. No quotes, no quotation marks.` }],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Cron secret OR admin session. The previous guard allowed both admin and
    // scheduled execution by letting a null user pass — which also let any
    // unauthenticated caller drive a bulk journey-completion sweep.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // BUG-R14-04 FIX: 4 separate unbounded filter() calls — each loads all records for that
    // status with no limit, on every scheduled run. Combined this is 4× full-table scans.
    // Only Recovery / RECOVERY_PHASE_7_DAY cases can ever satisfy the auto-complete rules
    // (Rules 1 and 2 both check for Recovery status). Travel-Coordination, Ready-For-Travel,
    // and Procedure-In-Progress cases are never completed by this function — they are scanned
    // and skipped every single run, wasting memory and time.
    // Fix: fetch only the two statuses that can actually trigger completion, with a cap.
    const recoveryCases = await base44.asServiceRole.entities.CaseRecord.filter(
      { status: 'Recovery' }, 'updated_date', 100
    );
    const recoveryPhaseCases = await base44.asServiceRole.entities.CaseRecord.filter(
      { status: 'RECOVERY_PHASE_7_DAY' }, 'updated_date', 100
    );
    const allActiveCases = [...(recoveryCases || []), ...(recoveryPhaseCases || [])];
    
    let updatedCount = 0;
    const updatedCaseIds = [];

    for (const caseRecord of allActiveCases) {
      // Only auto-complete if procedure_date is set and sufficient time has passed
      if (!caseRecord.procedure_date) {
        console.log(`[autoCompletePatientJourney] Skipping case ${caseRecord.id} — no procedure_date set`);
        continue;
      }
      const procedureDate = new Date(caseRecord.procedure_date);
      if (isNaN(procedureDate.getTime())) {
        console.warn(`[autoCompletePatientJourney] Invalid procedure_date for case ${caseRecord.id}`);
        continue;
      }

      let shouldComplete = false;
      let completionReason = '';

      // Rule 1: case is in Recovery/RECOVERY_PHASE_7_DAY status AND
      // procedure_date + recovery_days has elapsed.
      // Uses procedure_date (already validated above) as the anchor — not created_date or updated_date —
      // so recovery is measured from when the patient actually had their procedure.
      if (
        caseRecord.recovery_days &&
        (caseRecord.status === 'Recovery' || caseRecord.status === 'RECOVERY_PHASE_7_DAY')
      ) {
        const expectedReturnDate = new Date(procedureDate);
        expectedReturnDate.setDate(expectedReturnDate.getDate() + caseRecord.recovery_days + 7);

        if (expectedReturnDate.toISOString().split('T')[0] < today) {
          shouldComplete = true;
          completionReason = `Recovery period ended (expected return: ${expectedReturnDate.toISOString().split('T')[0]}, from procedure_date)`;
        }
      }

      // Rule 2: Check if case has been in Recovery status for extended period (>30 days post-procedure)
      if (caseRecord.status === 'Recovery') {
        const daysPostProcedure = Math.floor((now - procedureDate) / (1000 * 60 * 60 * 24));

        if (daysPostProcedure > 30) {
          shouldComplete = true;
          completionReason = `In Recovery status for ${daysPostProcedure} days post-procedure`;
        }
      }

      if (shouldComplete) {
        // Valid status transitions — prevent invalid state jumps
        const VALID_TRANSITIONS: Record<string, string[]> = {
          'Submitted':        ['Doctor-Pending', 'Cancelled'],
          'Doctor-Pending':   ['Doctor-Confirmed', 'Doctor-Declined', 'Cancelled'],
          'Doctor-Confirmed': ['Deposit-Paid', 'Cancelled'],
          'Deposit-Paid':     ['PMP-25', 'In-Progress', 'Cancelled'],
          'PMP-25':           ['In-Progress', 'Cancelled'],
          'In-Progress':      ['Completed', 'Cancelled'],
          'Recovery':         ['Completed', 'Cancelled'],
          'RECOVERY_PHASE_7_DAY': ['Completed', 'Cancelled'],
          'Completed':        [], // Terminal — no transitions allowed
          'Cancelled':        [], // Terminal
        };

        const targetStatus = 'Completed';
        const allowedNext = VALID_TRANSITIONS[caseRecord.status] || [];
        if (!allowedNext.includes(targetStatus)) {
          console.error(`[autoCompletePatientJourney] Invalid transition: ${caseRecord.status} → ${targetStatus} for case ${caseRecord.id}`);
          continue;
        }

        // Update case status to Completed
        const journeySummary = await aiJourneySummary(caseRecord);
        await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
          status: 'Completed',
          timeline_log: [
            ...(caseRecord.timeline_log || []),
            {
              timestamp: now.toISOString(),
              action: 'auto_completed',
              details: journeySummary ? `${completionReason} — ${journeySummary}` : completionReason,
            }
          ]
        });

        updatedCount++;
        updatedCaseIds.push(caseRecord.id);
      }
    }

    return Response.json({
      success: true,
      checked_count: allActiveCases.length,
      updated_count: updatedCount,
      updated_case_ids: updatedCaseIds,
      checked_date: today
    });

  } catch (error) {
    console.error('[autoCompletePatientJourney]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});