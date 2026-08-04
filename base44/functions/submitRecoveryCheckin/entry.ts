import { createHandler } from '../../shared/createHandler.ts';
import { linkOnlyEmail, emergencyDispatch } from '../../shared/notify.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';

// pain_level/escalate are left untyped (z.any()) — both feed the medical-
// emergency escalation decision below via loose truthy/parseInt handling
// that already tolerates strings, numbers, or missing values. Restricting
// their type here could reject a value the existing logic currently
// handles gracefully (e.g. falls back to 0), which is not a place to add
// new failure modes to an emergency-escalation path.
const SubmitRecoveryCheckinSchema = strictObject({
  session_id: Fields.shortText(200),
  checkin_index: z.coerce.number().int().min(0),
  pain_level: z.any().optional(),
  notes: z.string().max(2000).optional(),
  escalate: z.any().optional(),
});

// Pain level at which we stop treating this as a routine escalation and trigger
// the full emergency cascade: family alert + case emergency flag + urgent admin page.
const SEVERE_PAIN_THRESHOLD = 8;
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { session_id, checkin_index, pain_level, notes, escalate } = await body();
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
        // Exempt from link-only policy: an active medical emergency to the patient's own
        // emergency contact is exactly what emergencyDispatch() is for (Portia, 2026-07-18).
        // LEAK-SCAN-IGNORE-START — authorised emergencyDispatch() carve-out, not a link-only leak.
        const familyContacts = session.family_contacts || [];
        const familyAlerts = familyContacts.map(contact =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to: contact.email,
            subject: `🚨 URGENT: ${session.patient_name} needs immediate attention`,
            body: emergencyDispatch({
              reason: 'medical_emergency',
              from: 'submitRecoveryCheckin',
              body: `Dear ${contact.name || 'Family Member'},\n\nThis is an automated alert from the Morales Medical Concierge team.\n\n${session.patient_name} reported a pain level of ${numericPain}/10 during their recovery check-in and has requested immediate medical assistance.\n\nCase ID: ${session.case_id}\nTime: ${new Date().toLocaleString()}\n${notes ? `Patient note: "${notes}"` : ''}\n\nOur concierge team has been alerted and is responding now. Please do not panic — this alert was triggered so you are aware immediately.\n\nMorales Emergency Response\n+1 (800) MORALES`,
            }),
          }).catch(e => console.error('[submitRecoveryCheckin] family alert failed:', contact.email, e))
        );
        // LEAK-SCAN-IGNORE-END
        await Promise.allSettled(familyAlerts);

        // Wire into the autonomous escalation machine so the patient is NEVER left waiting
        // on a sleeping human. runSilentSafetyEscalation picks this up on its next scheduled
        // run and fires: SMS T+15m → voice call T+30m → guardian GPS T+60m →
        // security dispatch T+120m → police checklist T+3h — with no human intervention.
        await base44.asServiceRole.entities.SoloCheckIn.create({
          case_id: session.case_id,
          user_email: session.patient_email,
          user_name: session.patient_name,
          user_phone: session.patient_phone || null,
          scheduled_time: now,
          sent_time: now,
          status: 'pending',
          context_type: null,
          check_in_round: 'recovery_emergency',
          missed_round_count: 0,
          notes: `Auto-escalation: recovery check-in reported pain ${numericPain}/10. Case ${session.case_id}.`,
          created_at: now,
        }).catch(e => console.error('[submitRecoveryCheckin] escalation wire failed:', e));
      }

      // Admin notification — situational awareness, not emergency dispatch to a
      // personal contact, so it stays link-only per policy. Real detail (name,
      // pain level, notes, case ID) is read in the admin dashboard the link opens.
      const escalationEmail = Deno.env.get('ADMIN_EMAIL');
      if (escalationEmail) {
        const subject = isMedicalEmergency
          ? '🚨 MEDICAL EMERGENCY — Recovery Check-In — RESPOND NOW'
          : '⚠️ Recovery Escalation Requested';
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: escalationEmail,
          subject,
          body: linkOnlyEmail({
            title: isMedicalEmergency ? 'A patient reported a medical emergency' : 'A patient requested concierge assistance',
            line: isMedicalEmergency
              ? 'A patient reported severe pain during a recovery check-in and family contacts have been notified. Open the admin dashboard now for the case detail.'
              : 'A patient has requested immediate concierge assistance during post-surgery recovery. Open the admin dashboard for the case detail.',
            ctaUrl: `${APP_URL}/admin`,
            ctaLabel: 'Open Admin Dashboard',
            from: 'submitRecoveryCheckin',
          }),
        });
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

    if (allDone) {
      // All check-ins complete — request post-recovery feedback + the patient
      // reputation survey. Awaited via allSettled (not truly fire-and-forget):
      // an un-awaited invoke can be cut off once this handler returns its
      // response. Both are non-fatal — a failure here doesn't undo the check-in.
      const internal_secret = Deno.env.get('CRON_SECRET');
      await Promise.allSettled([
        base44.asServiceRole.functions.invoke('sendPostSurgeryFeedback', {
          entity_id: session.id,
          internal_secret,
        }).catch(e => console.error('[submitRecoveryCheckin] feedback request failed:', e)),
        base44.asServiceRole.functions.invoke('sendReputationSurvey', {
          case_id: session.case_id,
          patient_email: session.patient_email,
          patient_name: session.patient_name,
          role: 'patient',
          internal_secret,
        }).catch(e => console.error('[submitRecoveryCheckin] reputation survey failed:', e)),
      ]);
    }

    return Response.json({ success: true, escalated: !!escalate, all_done: allDone, medical_emergency: isMedicalEmergency });
}, { name: 'submitRecoveryCheckin', bodySchema: SubmitRecoveryCheckinSchema }));
