import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { caseId, action } = await req.json();
    
    if (!caseId) {
      return Response.json({ error: 'Case ID required' }, { status: 400 });
    }

    const caseRecord = await base44.entities.CaseRecord.get(caseId);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    let result = {};

    // Workflow state machine
    switch (caseRecord.status) {
      case 'Submitted':
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
          // Assign travel agency
          result = await base44.functions.invoke('assignTravelAgency', { caseId });
        } else {
          result = { status: 'WAITING_DOCTOR', message: 'Waiting for doctor confirmation' };
        }
        break;

      case 'Vendor-Pending':
        // Assign chauffeur services
        result = await base44.functions.invoke('assignChauffeurServices', { caseId });
        break;

      case 'Admin-Review':
        result = { status: 'ADMIN_REVIEW', message: 'Case requires manual admin review' };
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

    await base44.entities.CaseRecord.update(caseId, {
      timeline_log: updatedTimeline
    });

    return Response.json({
      case_id: caseId,
      workflow_result: result,
      message: 'Workflow executed successfully'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});