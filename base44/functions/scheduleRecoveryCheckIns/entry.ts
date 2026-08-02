import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';

// Called when HS5 (clinic appointment) handshake is confirmed.
// Schedules post-procedure recovery check-ins for the patient.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { case_id, procedure_date, recovery_days = 14 } = body;

    if (!case_id) {
      return Response.json({ error: 'case_id is required' }, { status: 400 });
    }

    // Verify case exists
    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { id: case_id }, '-created_date', 1
    ).catch(() => []);

    const caseRecord = cases?.[0];
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const procedureTime = procedure_date ? new Date(procedure_date) : new Date();
    const checkInsCreated = [];

    // Schedule recovery check-ins:
    // Day 1 post-procedure: 24h check-in (pain/swelling)
    // Day 3 post-procedure: 72h check-in (healing progress)
    // Day 7 post-procedure: 1-week check-in (final recovery)
    const checkInSchedule = [1, 3, 7, 10, 14].filter(d => d <= recovery_days);

    for (const dayOffset of checkInSchedule) {
      const scheduledTime = new Date(procedureTime.getTime() + dayOffset * 24 * 60 * 60 * 1000);

      try {
        const checkIn = await base44.asServiceRole.entities.RecoveryCheckIn.create({
          case_id,
          patient_email: caseRecord.client_email,
          scheduled_time: scheduledTime.toISOString(),
          day_offset: dayOffset,
          status: 'pending',
          check_type: dayOffset === 1 ? 'day_1_post_op' : dayOffset === 3 ? 'day_3_post_op' : 'day_7_post_op',
          created_at: new Date().toISOString(),
        });
        checkInsCreated.push(checkIn?.id || dayOffset);
      } catch (e) {
        console.error(`[scheduleRecoveryCheckIns] Failed to create day-${dayOffset} check-in:`, e?.message);
      }
    }

    // Notify patient of upcoming recovery check-ins
    if (caseRecord.client_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: 'Your Morales Recovery Check-In Schedule',
        body: `Your procedure is complete. We will check in with you at:\n\n` +
          checkInSchedule.map(d => `• Day ${d}: ${new Date(procedureTime.getTime() + d * 24 * 60 * 60 * 1000).toLocaleDateString()}`).join('\n') +
          `\n\nYour Morales care team is monitoring your recovery. If you have any concerns before your scheduled check-in, contact us immediately or tap Secure Line in the app.\n\nMorales Medical Travel`,
      }).catch(e => console.error('[scheduleRecoveryCheckIns] Email failed:', e?.message));
    }

    console.log(`[scheduleRecoveryCheckIns] Created ${checkInsCreated.length} recovery check-ins for case ${case_id}`);
    return Response.json({
      success: true,
      case_id,
      check_ins_scheduled: checkInsCreated.length,
      schedule: checkInSchedule.map(d => ({
        day: d,
        scheduled: new Date(procedureTime.getTime() + d * 24 * 60 * 60 * 1000).toISOString(),
      })),
    });

  } catch (err) {
    console.error('[scheduleRecoveryCheckIns] Error:', err?.message);
    return Response.json({ error: 'Failed to schedule recovery check-ins' }, { status: 500 });
  }
});
