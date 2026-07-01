import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Pain level at which we stop treating this as a routine escalation and trigger
// the full emergency cascade: family alert + case emergency flag + urgent admin page.
const SEVERE_PAIN_THRESHOLD = 8;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id, checkin_index, pain_level, notes, escalate } = await req.json();
    if (session_id === undefined || checkin_index === undefined) {
      return Response.json({ error: 'session_id and checkin_index required' }, { status: 400 });
    }

    // BUG-R7-05 FIX: filter({ id }) always returns [] — use .get() for primary key lookup.
    // Also switch to asServiceRole: RecoverySession is written by the system (logProcedureComplete),
    // so user-scoped reads for patient-facing check-in can fail on cross-ownership records.
    const session = await base44.asServiceRole.entities.RecoverySession.get(session_id);
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
    const numericPain = typeof pain_level === 'number' ? pain_level : parseInt(pain_level, 10) || 0;

    // A severe pain report during recovery is a medical emergency — not a workflow event.
    // Treat it as such: notify family, flag the case, and page admin with urgency.
    const isMedicalEmergency = escalate && numericPain >= SEVERE_PAIN_THRESHOLD;

    const updateData = {
      checkins,
      total_checkins_completed: completedCount,
      escalations,
      is_active: !allDone
    };

    if (escalate) {
      const now = new Date().toISOString();
      updateData.concierge_escalated_at = now;

      if (isMedicalEmergency) {
        // Escalate case to EMERGENCY_TRIAGE so the SituationRoom dashboard surfaces it immediately.
        await base44.asServiceRole.entities.CaseRecord.update(session.case_id, {
          case_priority: 'Critical',
          emergency_triage_at: now,
          emergency_triage_reason: `Recovery check-in: pain level ${numericPain}/10. Immediate medical attention required.`,
        }).catch(e => console.error('[submitRecoveryCheckin] case flag failed:', e));

        // Alert every family contact stored on the session — they need to know now, not at next heartbeat.
        const familyContacts = session.family_contacts || [];
        const familyAlerts = familyContacts.map(contact =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to: contact.email,
            subject: `🚨 URGENT: ${session.patient_name} needs immediate attention`,
            body: `Dear ${contact.name || 'Family Member'},\n\nThis is an automated alert from the Morales Medical Concierge team.\n\n${session.patient_name} reported a pain level of ${numericPain}/10 during their recovery check-in and has requested immediate medical assistance.\n\nCase ID: ${session.case_id}\nTime: ${new Date().toLocaleString()}\n${notes ? `Patient note: "${notes}"` : ''}\n\nOur concierge team has been alerted and is responding now. Please do not panic — this alert was triggered so you are aware immediately.\n\nMorales Emergency Response\n+1 (800) MORALES`
          }).catch(e => console.error('[submitRecoveryCheckin] family alert failed:', contact.email, e))
        );
        await Promise.allSettled(familyAlerts);
      }

      // Admin notification — urgency level differs by severity
      const escalationEmail = Deno.env.get('ADMIN_EMAIL');
      if (escalationEmail) {
        const subject = isMedicalEmergency
          ? `🚨 MEDICAL EMERGENCY — ${session.patient_name} — Pain ${numericPain}/10 — RESPOND NOW`
          : `⚠️ Recovery Escalation — ${session.patient_name}`;
        const body = isMedicalEmergency
          ? `MEDICAL EMERGENCY — IMMEDIATE RESPONSE REQUIRED\n\nPatient: ${session.patient_name}\nEmail: ${session.patient_email}\nPain Level: ${numericPain}/10\nCase ID: ${session.case_id}\nNotes: ${notes || 'None'}\n\nFamily contacts have been notified. Case status set to EMERGENCY_TRIAGE.\n\nCall the patient NOW. If unreachable within 5 minutes, dispatch emergency services to their last known location.`
          : `Patient has requested immediate concierge assistance during post-surgery recovery.\n\nPatient: ${session.patient_name}\nEmail: ${session.patient_email}\nPain Level: ${pain_level || 'Not reported'}/10\nNotes: ${notes || 'None'}\nCase ID: ${session.case_id}\n\nPlease contact the patient immediately.`;
        await base44.asServiceRole.integrations.Core.SendEmail({ to: escalationEmail, subject, body });
      }
    }

    if (allDone) {
      // Lift notification blackout
      await base44.asServiceRole.entities.CaseRecord.update(session.case_id, {
        notification_blackout_active: false,
        notification_blackout_lifted_at: new Date().toISOString()
      });
    }

    await base44.asServiceRole.entities.RecoverySession.update(session.id, updateData);

    return Response.json({ success: true, escalated: !!escalate, all_done: allDone, medical_emergency: isMedicalEmergency });
  } catch (error) {
    console.error('[submitRecoveryCheckin]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});