import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow both admin and scheduled execution (no user for scheduled)
    if (user && user.role !== 'admin' && user.role !== 'platform_admin') {
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
      // Check if return flight date exists and is in the past
      // We'll use a field to track expected return date
      // For now, we'll estimate based on procedure date + recovery days
      
      let shouldComplete = false;
      let completionReason = '';

      // BUG-R5-01 FIX: NEVER use created_date to estimate return date.
      // created_date is the consultation submission timestamp — weeks/months before travel.
      // Using it means cases auto-complete the moment recovery_days passes since *submission*,
      // silently terminating active journeys where the patient hasn't even left yet.
      //
      // Rule 1 now requires: case is in Recovery/RECOVERY_PHASE_7_DAY status AND
      // updated_date (last status transition) + recovery_days has elapsed.
      // This correctly measures recovery from the time the case entered Recovery, not from creation.
      if (
        caseRecord.recovery_days &&
        (caseRecord.status === 'Recovery' || caseRecord.status === 'RECOVERY_PHASE_7_DAY')
      ) {
        const lastTransition = new Date(caseRecord.updated_date);
        const expectedReturnDate = new Date(lastTransition);
        expectedReturnDate.setDate(expectedReturnDate.getDate() + caseRecord.recovery_days + 7);

        if (expectedReturnDate.toISOString().split('T')[0] < today) {
          shouldComplete = true;
          completionReason = `Recovery period ended (expected return: ${expectedReturnDate.toISOString().split('T')[0]}, from last status transition)`;
        }
      }

      // Rule 2: Check if case has been in Recovery status for extended period (>30 days)
      if (caseRecord.status === 'Recovery') {
        const statusUpdatedAt = new Date(caseRecord.updated_date);
        const daysInRecovery = Math.floor((now - statusUpdatedAt) / (1000 * 60 * 60 * 24));
        
        if (daysInRecovery > 30) {
          shouldComplete = true;
          completionReason = `In Recovery status for ${daysInRecovery} days`;
        }
      }

      if (shouldComplete) {
        // Update case status to Completed
        await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
          status: 'Completed',
          timeline_log: [
            ...(caseRecord.timeline_log || []),
            {
              timestamp: now.toISOString(),
              action: 'auto_completed',
              details: completionReason
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