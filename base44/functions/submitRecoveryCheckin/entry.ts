import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id, checkin_index, pain_level, notes, escalate } = await req.json();
    if (session_id === undefined || checkin_index === undefined) {
      return Response.json({ error: 'session_id and checkin_index required' }, { status: 400 });
    }

    const sessions = await base44.entities.RecoverySession.filter({ id: session_id });
    const session = sessions[0];
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

    const checkins = [...(session.checkins || [])];
    if (!checkins[checkin_index]) return Response.json({ error: 'Check-in not found' }, { status: 404 });

    checkins[checkin_index] = {
      ...checkins[checkin_index],
      completed_at: new Date().toISOString(),
      status: escalate ? 'escalated' : 'completed',
      pain_level: pain_level || null,
      notes: notes || null,
      escalated: !!escalate
    };

    const completedCount = checkins.filter(c => c.status === 'completed' || c.status === 'escalated').length;
    const escalations = checkins.filter(c => c.escalated).length;
    const allDone = checkins.every(c => c.status !== 'pending');

    const updateData = {
      checkins,
      total_checkins_completed: completedCount,
      escalations,
      is_active: !allDone
    };

    if (escalate) {
      updateData.concierge_escalated_at = new Date().toISOString();
      // Notify admin/concierge
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@moralesmedical.com',
        subject: `🚨 Recovery Escalation — ${session.patient_name}`,
        body: `Patient has requested immediate concierge assistance during post-surgery recovery.\n\nPatient: ${session.patient_name}\nEmail: ${session.patient_email}\nPain Level: ${pain_level || 'Not reported'}/10\nNotes: ${notes || 'None'}\nCase ID: ${session.case_id}\n\nPlease contact the patient immediately.`
      });
    }

    if (allDone) {
      // Lift notification blackout
      await base44.asServiceRole.entities.CaseRecord.update(session.case_id, {
        notification_blackout_active: false,
        notification_blackout_lifted_at: new Date().toISOString()
      });
    }

    await base44.entities.RecoverySession.update(session.id, updateData);

    return Response.json({ success: true, escalated: !!escalate, all_done: allDone });
  } catch (error) {
    console.error('submitRecoveryCheckin error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});