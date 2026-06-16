import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    // Find all pending check-ins that were sent more than 2 hours ago
    const pendingCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { status: 'pending' },
      '-scheduled_time',
      100
    );

    let escalated2h = 0;
    let escalated3h = 0;

    for (const checkIn of pendingCheckIns) {
      if (!checkIn.sent_time) continue;

      const sentAt = new Date(checkIn.sent_time);
      const hoursSinceSent = (now - sentAt) / (1000 * 60 * 60);

      // 2-hour escalation: second notification
      if (hoursSinceSent >= 2 && hoursSinceSent < 3 && checkIn.status === 'pending') {
        // Send second notification
        const msg = `⚠️ SECOND ATTEMPT: You have not responded to your safety check-in. Please tap 'I'm Safe' immediately or your emergency contact will be notified.`;

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: checkIn.user_email,
            subject: `⚠️ URGENT: Safety Check-In Overdue (2 hours)`,
            body: `<p>${msg}</p><p><a href="${Deno.env.get('APP_URL')}/dashboard">Open Dashboard →</a></p>`,
          });
        } catch (e) {
          console.error('Failed to send 2h email:', e);
        }

        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          status: 'escalated_2h',
        });

        escalated2h++;
      }

      // 3-hour escalation: voice call + emergency contact notification
      if (hoursSinceSent >= 3 && checkIn.status !== 'escalated_3h' && checkIn.status !== 'resolved') {
        const emergencyContact = checkIn.emergency_contact || 'Not provided';

        // Attempt Twilio voice call
        let voiceCallSuccess = false;
        if (checkIn.user_phone) {
          try {
            // Twilio voice call using environment variables
            const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
            const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
            const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

            if (accountSid && authToken && twilioPhone) {
              const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);
              await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  From: twilioPhone,
                  To: checkIn.user_phone,
                  Body: `This is an automated safety call from Morales Medical. You have not responded to your check-in. Please press 1 to confirm you are safe, or contact your coordinator immediately.`,
                  StatusCallback: `${Deno.env.get('APP_URL')}/functions/soloCheckInVoiceCallback`,
                }),
              });
              voiceCallSuccess = true;
            }
          } catch (e) {
            console.error('Twilio voice call failed:', e);
          }
        }

        // Send SMS/email to emergency contact
        const alertMsg = `🚨 SAFETY ALERT: ${checkIn.user_name} has not responded to their safety check-in for 3 hours. Last known location: ${checkIn.location_label || 'Unknown'}. Please contact them immediately. Reply HELP if you cannot reach them.`;

        try {
          // Send email to emergency contact (if available)
          if (emergencyContact && emergencyContact.includes('@')) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: emergencyContact,
              subject: `🚨 URGENT: ${checkIn.user_name} Safety Check-In Overdue`,
              body: `<p>${alertMsg}</p><p>Contact: ${checkIn.user_phone}</p>`,
            });
          }
        } catch (e) {
          console.error('Failed to notify emergency contact:', e);
        }

        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          status: 'escalated_3h',
          escalation_level: 'contact_notified',
          voice_call_attempted_at: voiceCallSuccess ? now.toISOString() : null,
          emergency_contact_notified_at: now.toISOString(),
        });

        // Log to AuditLog
        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'safet_risk_status_changed',
          actor_id: 'system',
          actor_role: 'automated',
          actor_name: 'Solo Check-In Escalation System',
          resource_type: 'SoloCheckIn',
          resource_id: checkIn.id,
          resource_name: `Round ${checkIn.check_in_round}`,
          case_id: checkIn.case_id,
          details: {
            escalation: '3h_contact_notified',
            voice_call_attempted: voiceCallSuccess,
            emergency_contact,
            hours_overdue: hoursSinceSent,
          },
          sensitive: true,
          timestamp: now.toISOString(),
          prev_hash: 'SOLO_ESCALATION_3H',
        });

        escalated3h++;
      }
    }

    return Response.json({ escalated2h, escalated3h, checked: pendingCheckIns.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});