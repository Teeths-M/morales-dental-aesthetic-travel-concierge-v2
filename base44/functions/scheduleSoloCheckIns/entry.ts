import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    // Find all cases where user is traveling solo (no companion)
    const allCases = await base44.asServiceRole.entities.CaseRecord.list('-created_date', 200);

    const soloCases = allCases.filter(c =>
      c.status !== 'Completed' &&
      (!c.requires_companion || c.companion_requirement_status === 'companion_required_pending' || c.companion_requirement_status === 'not_required')
    );

    let created = 0;

    for (const caseRecord of soloCases) {
      // Check if there's already an active pending check-in
      const existingCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
        { case_id: caseRecord.id, status: 'pending' },
        '-scheduled_time',
        1
      );

      if (existingCheckIns.length > 0) {
        continue; // Already has a pending check-in
      }

      // Check if medical pause is active
      const medicalPause = caseRecord.status === 'Procedure-In-Progress' || caseRecord.status === 'SURGICAL_EXECUTION_WINDOW';
      if (medicalPause) {
        continue; // Skip during procedure
      }

      // Determine next scheduled time
      // First check-in: 6 hours after destination handshake (intake_handshake_logged_at)
      // Subsequent: every 12 hours
      const handshakeTime = caseRecord.intake_handshake_logged_at ? new Date(caseRecord.intake_handshake_logged_at) : new Date();
      const firstCheckIn = new Date(handshakeTime.getTime() + 6 * 60 * 60 * 1000);

      // Find last acknowledged check-in to determine round number
      const lastCheckIn = await base44.asServiceRole.entities.SoloCheckIn.filter(
        { case_id: caseRecord.id },
        '-created_date',
        1
      );

      const round = lastCheckIn.length > 0 ? (lastCheckIn[0].check_in_round || 0) + 1 : 1;

      // Schedule next check-in
      let nextScheduled;
      if (round === 1) {
        nextScheduled = firstCheckIn;
      } else {
        const lastTime = lastCheckIn[0].scheduled_time ? new Date(lastCheckIn[0].scheduled_time) : handshakeTime;
        nextScheduled = new Date(lastTime.getTime() + 12 * 60 * 60 * 1000);
      }

      // Don't create if already in the past (will be caught by escalation logic)
      if (nextScheduled < now) {
        nextScheduled = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      }

      // Create check-in record
      const checkIn = await base44.asServiceRole.entities.SoloCheckIn.create({
        case_id: caseRecord.id,
        trip_id: caseRecord.id,
        user_id: caseRecord.created_by_id || '',
        user_email: caseRecord.client_email,
        user_name: caseRecord.client_name,
        user_phone: caseRecord.client_phone || '',
        scheduled_time: nextScheduled.toISOString(),
        check_in_round: round,
        status: 'pending',
        is_paused_medical: false,
        created_at: now.toISOString(),
      });

      // Send initial notification
      const msg = `🛡️ Safety Check-In: Tap 'I'm Safe' within 2 hours. Your solo traveler protection is active.`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: caseRecord.client_email,
          subject: `🛡️ Solo Traveler Safety Check-In Required`,
          body: `<p>${msg}</p><p>Scheduled for: ${nextScheduled.toLocaleString()}</p><p><a href="${Deno.env.get('APP_URL')}/dashboard">Open Dashboard →</a></p>`,
        });

        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          sent_time: now.toISOString(),
        });
      } catch (e) {
        console.error('Failed to send check-in notification:', e);
      }

      // Log to AuditLog
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'handshake_created',
        actor_id: 'system',
        actor_role: 'automated',
        actor_name: 'Solo Check-In Scheduler',
        resource_type: 'SoloCheckIn',
        resource_id: checkIn.id,
        resource_name: `Round ${round}`,
        case_id: caseRecord.id,
        details: {
          action: 'solo_checkin_scheduled',
          scheduled_time: nextScheduled.toISOString(),
          is_first: round === 1,
        },
        sensitive: false,
        timestamp: now.toISOString(),
        prev_hash: 'SOLO_SCHEDULER',
      });

      created++;
    }

    return Response.json({ created, total_solo_cases: soloCases.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});