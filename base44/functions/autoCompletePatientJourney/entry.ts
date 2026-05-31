import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow both admin and scheduled execution (no user for scheduled)
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch all active cases in Travel-Coordination or later stages
    const activeCases = await base44.asServiceRole.entities.CaseRecord.filter({
      status: 'Travel-Coordination'
    });

    const completedCases = await base44.asServiceRole.entities.CaseRecord.filter({
      status: 'Ready-For-Travel'
    });

    const inProgressCases = await base44.asServiceRole.entities.CaseRecord.filter({
      status: 'Procedure-In-Progress'
    });

    const recoveryCases = await base44.asServiceRole.entities.CaseRecord.filter({
      status: 'Recovery'
    });

    const allActiveCases = [...(activeCases || []), ...(completedCases || []), ...(inProgressCases || []), ...(recoveryCases || [])];
    
    let updatedCount = 0;
    const updatedCaseIds = [];

    for (const caseRecord of allActiveCases) {
      // Check if return flight date exists and is in the past
      // We'll use a field to track expected return date
      // For now, we'll estimate based on procedure date + recovery days
      
      let shouldComplete = false;
      let completionReason = '';

      // Rule 1: Check if recovery period has ended
      if (caseRecord.recovery_days) {
        // Calculate expected return date from case creation or procedure date
        const caseCreated = new Date(caseRecord.created_date);
        const expectedReturnDate = new Date(caseCreated);
        expectedReturnDate.setDate(expectedReturnDate.getDate() + caseRecord.recovery_days + 7); // Add 7 days buffer

        if (expectedReturnDate.toISOString().split('T')[0] < today) {
          shouldComplete = true;
          completionReason = `Recovery period ended (expected return: ${expectedReturnDate.toISOString().split('T')[0]})`;
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
    console.error('Error in patient lifecycle automation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});