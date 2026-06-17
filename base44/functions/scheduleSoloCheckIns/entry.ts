import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getLastAuditHash(base44) {
  try {
    const logs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    return logs[0] ? await sha256(JSON.stringify(logs[0])) : 'GENESIS';
  } catch (_) { return 'GENESIS'; }
}

// Only statuses that represent an active trip with a traveler physically on the ground
const ACTIVE_TRAVEL_STATUSES = new Set([
  'Travel-Coordination',
  'Ready-For-Travel',
  'Recovery',
  'RECOVERY_PHASE_7_DAY',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    // Find all cases where user is traveling solo (no companion)
    const allCases = await base44.asServiceRole.entities.CaseRecord.list('-created_date', 200);

    // Only schedule check-ins for cases where the patient is actively traveling on the ground
    // AND a destination handshake has been recorded (intake_handshake_logged_at is set).
    // Without this guard, every newly submitted consultation gets a check-in email.
    const soloCases = allCases.filter(c =>
      ACTIVE_TRAVEL_STATUSES.has(c.status) &&
      c.intake_handshake_logged_at &&
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

      // Generate one-time secure token for email link
      const tokenArray = new Uint8Array(32);
      crypto.getRandomValues(tokenArray);
      const rawToken = Array.from(tokenArray, b => b.toString(16).padStart(2, '0')).join('');

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken));
      const tokenHash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');

      const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await base44.asServiceRole.entities.CheckInToken.create({
        check_in_id: checkIn.id,
        token_hash: tokenHash,
        expires_at: tokenExpiresAt.toISOString(),
        used_at: null,
        created_at: now.toISOString(),
      });

      const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
      const checkInLink = `${appUrl}/check-in/${checkIn.id}?token=${rawToken}`;

      // Send initial notification with secure I'M SAFE button
      try {
        const emailBody = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
            <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
              <div style="text-align:center;margin-bottom:24px;">
                <span style="font-size:48px;">🛡️</span>
                <h1 style="color:#111827;font-size:24px;margin:12px 0 4px;">Safety Check-In Required</h1>
                <p style="color:#6b7280;font-size:14px;margin:0;">Morales Travel Concierge · Solo Traveler Protection</p>
              </div>
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${caseRecord.client_name}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">
                This is your scheduled safety check-in. Please confirm you are safe by clicking the button below within <strong>2 hours</strong>.
                If we do not hear from you, your emergency contact will be notified.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${checkInLink}"
                   style="display:inline-block;background-color:#059669;color:white;padding:16px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:18px;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(5,150,105,0.3);">
                  🟢 I'M SAFE — Confirm Now
                </a>
              </div>
              <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-top:24px;">
                <p style="color:#92400e;font-size:13px;margin:0;font-weight:bold;">⚠️ This link expires in 24 hours and can only be used once.</p>
                <p style="color:#92400e;font-size:13px;margin:8px 0 0;">If you cannot click the button, log in to your dashboard: <a href="${appUrl}/dashboard" style="color:#92400e;">${appUrl}/dashboard</a></p>
              </div>
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">Check-In Round #${round} · Scheduled: ${nextScheduled.toUTCString()}</p>
            </div>
          </div>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: caseRecord.client_email,
          subject: `🛡️ [Action Required] Solo Traveler Safety Check-In — Confirm You're Safe`,
          body: emailBody,
        });

        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          sent_time: now.toISOString(),
        });
      } catch (e) {
        console.error('Failed to send check-in email:', e);
      }

      // Log to AuditLog with real hash chain link
      const prevHashSched = await getLastAuditHash(base44);
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
        prev_hash: prevHashSched,
      });

      created++;
    }

    return Response.json({ created, total_solo_cases: soloCases.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});