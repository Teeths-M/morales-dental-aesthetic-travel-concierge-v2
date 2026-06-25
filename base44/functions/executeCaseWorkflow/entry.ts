import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { caseId, action } = await req.json();
    
    if (!caseId) {
      return Response.json({ error: 'Case ID required' }, { status: 400 });
    }

    // BUG-R5-09 FIX: admin function must use asServiceRole to access any patient's case,
    // not user-scoped base44.entities which only returns the admin's own records.
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    let result = {};

    // Workflow state machine
    switch (caseRecord.status) {
      case 'Submitted':
        // Fan-out to Patient App Portal + SAFE-T scan simultaneously (Promise.allSettled —
        // confirmation email failure must never block the safety scan).
        await Promise.allSettled([
          base44.functions.invoke('sendBookingConfirmation', { case_id: caseId }).catch(() => {}),
        ]);
        // Trigger SAFE-T4LIFE scan
        result = await base44.functions.invoke('safeT4LifeScan', { caseId });
        break;

      case 'Safe-T-Reviewed':
        if (caseRecord.safe_t_result === 'PASSED') {
          // Assign doctor
          result = await base44.functions.invoke('assignDoctorToCase', { caseId });
        } else {
          result = { status: 'BLOCKED', message: 'Case blocked by SAFE-T review' };
        }
        break;

      case 'Doctor-Pending':
        if (caseRecord.doctor_confirmation_status === 'Confirmed') {
          // Doctor confirmed → request pricing quotas from all 4 partners simultaneously
          result = await base44.functions.invoke('requestPartnerQuotas', { case_id: caseId });
        } else {
          result = { status: 'WAITING_DOCTOR', message: 'Waiting for doctor confirmation' };
        }
        break;

      case 'Vendor-Pending':
        if (caseRecord.all_quotas_confirmed) {
          // All 4 partner quotes confirmed → calculate package price and fire Pay Now email
          result = await base44.functions.invoke('calculatePackagePrice', { case_id: caseId });
        } else {
          // Legacy path: chauffeur assignment (pre-quota system)
          result = await base44.functions.invoke('assignChauffeurServices', { caseId });
        }
        break;

      case 'Admin-Review':
        result = { status: 'ADMIN_REVIEW', message: 'Case requires manual admin review' };
        break;

      case 'Proposal-Sent':
      case 'PMP-25':
      case 'PMP-50':
        result = { status: 'AWAITING_PAYMENT', message: `Case is awaiting client payment (${caseRecord.status})` };
        break;

      case 'Deposit-Paid':
      case 'Travel-Coordination':
      case 'Ready-For-Travel':
        result = { status: 'IN_TRAVEL_COORDINATION', message: `Case is in travel coordination (${caseRecord.status})` };
        break;

      case 'Procedure-In-Progress':
      case 'SURGICAL_EXECUTION_WINDOW':
      case 'RECOVERY_PHASE_7_DAY':
      case 'Recovery':
        result = { status: 'IN_PROGRESS', message: `Case is active — no automated step (${caseRecord.status})` };
        break;

      case 'Completed':
        result = { status: 'COMPLETED', message: 'Case is already completed' };
        break;

      default:
        result = { status: 'UNKNOWN', message: `Unknown case status: ${caseRecord.status}` };
    }

    // Add to timeline log
    const timelineEntry = {
      timestamp: new Date().toISOString(),
      action: action || 'workflow_step',
      status_before: caseRecord.status,
      status_after: result.status || caseRecord.status,
      result: result
    };

    const updatedTimeline = caseRecord.timeline_log ? [...caseRecord.timeline_log, timelineEntry] : [timelineEntry];

    await base44.asServiceRole.entities.CaseRecord.update(caseId, {
      timeline_log: updatedTimeline
    });

    return Response.json({
      case_id: caseId,
      workflow_result: result,
      message: 'Workflow executed successfully'
    });

  } catch (error) {
    console.error('[executeCaseWorkflow]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});