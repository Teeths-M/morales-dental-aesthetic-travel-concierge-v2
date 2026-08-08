/**
 * sendMilestoneWhatsAppCheckIns — the Traveler Guardian WhatsApp sender.
 *
 * activateTravelerGuardian schedules six milestone SoloCheckIn records
 * (landed, arrived_at_hotel, pre_procedure, post_procedure, departure,
 * home_safe). Until now nothing actually SENT them — scheduleSoloCheckIns
 * only handles time-based email rounds and ignores milestone_type. This cron
 * closes that gap: for every milestone check-in whose scheduled_time has
 * arrived and that hasn't been sent yet, it delivers the check-in via
 * WhatsApp (with an email fallback when the traveler hasn't opted in or has
 * no valid phone), marks it sent, and logs the notification. The existing
 * escalation ladder (runSafetyMonitor / escalateSoloCheckIn) takes over if the
 * traveler doesn't respond.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { isSpanish, toE164, sendWhatsApp } from '../../shared/twilioWhatsApp.ts';

const MILESTONE_MESSAGES = {
  landed: {
    en: "🌍 You've landed at your destination. Welcome! Tap to confirm you're safe and settled:",
    es: "🌍 Has aterrizado en tu destino. ¡Bienvenido! Toca para confirmar que estás bien:",
  },
  arrived_at_hotel: {
    en: "🏨 Hope you've made it to your hotel and you're resting. Tap to confirm you arrived safely:",
    es: "🏨 Espero que ya estés en tu hotel descansando. Toca para confirmar que llegaste bien:",
  },
  pre_procedure: {
    en: "💊 Your procedure is coming up. How are you feeling? Tap to check in with me:",
    es: "💊 Tu procedimiento se acerca. ¿Cómo te sientes? Toca para hacérmelo saber:",
  },
  post_procedure: {
    en: "💚 Your procedure is complete. How are you feeling? Tap to check in so I know you're okay:",
    es: "💚 Tu procedimiento terminó. ¿Cómo te sientes? Toca para que sepa que estás bien:",
  },
  departure: {
    en: "✈️ Heading home today? Tap to confirm you're on your way:",
    es: "✈️ ¿Hoy regresas a casa? Toca para confirmar que vas en camino:",
  },
  home_safe: {
    en: "🏡 Welcome home! Tap to confirm you arrived safely — that closes out your Guardian watch:",
    es: "🏡 ¡Bienvenido a casa! Toca para confirmar que llegaste bien — así cierro tu monitoreo:",
  },
};

// WhatsApp helpers (isSpanish, toE164, sendWhatsApp) imported from ../../shared/twilioWhatsApp.ts

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const appUrl = (Deno.env.get('APP_URL') || 'https://morales.app').replace(/\/$/, '');

    // Pull pending check-ins and keep only due, unsent milestone ones.
    const pending = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { status: 'pending' },
      'scheduled_time',
      200,
    ).catch(() => []);

    const due = (pending as any[]).filter(c =>
      c.milestone_type &&
      !c.sent_time &&
      c.scheduled_time &&
      new Date(c.scheduled_time).getTime() <= now.getTime()
    );

    let sentWhatsApp = 0;
    let sentEmail = 0;
    let skipped = 0;
    const logWrites: Promise<any>[] = [];

    const logNotification = (entry: Record<string, unknown>) =>
      base44.asServiceRole.entities.NotificationLog.create({
        created_at: now.toISOString(),
        ...entry,
      }).catch(() => null);

    for (const checkIn of due) {
      let caseRecord: any = null;
      try { caseRecord = await base44.asServiceRole.entities.CaseRecord.get(checkIn.case_id); } catch (_) { caseRecord = null; }
      if (!caseRecord) { skipped++; continue; }

      // Respect the surgical-execution blackout — don't ping mid-procedure.
      if (caseRecord.notification_blackout_active) { skipped++; continue; }

      const milestone = checkIn.milestone_type as keyof typeof MILESTONE_MESSAGES;
      const lang = isSpanish(caseRecord) ? 'es' : 'en';
      const lead = MILESTONE_MESSAGES[milestone]?.[lang] || MILESTONE_MESSAGES[milestone]?.en || "Tap to confirm you're safe:";

      // One-time confirm token (reuses the existing CheckInToken flow).
      const tokenArray = new Uint8Array(32);
      crypto.getRandomValues(tokenArray);
      const rawToken = Array.from(tokenArray, b => b.toString(16).padStart(2, '0')).join('');
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
      const tokenHash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
      const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      try {
        await base44.asServiceRole.entities.CheckInToken.create({
          check_in_id: checkIn.id,
          token_hash: tokenHash,
          expires_at: tokenExpiresAt,
          used_at: null,
          created_at: now.toISOString(),
        });
      } catch (_) { /* best-effort */ }
      const confirmLink = `${appUrl}/check-in/${checkIn.id}?token=${rawToken}`;

      const phone = toE164(caseRecord.client_phone);
      const optedIn = !!caseRecord.whatsapp_opt_in;
      const updateFields: any = { sent_time: now.toISOString() };
      let channel: 'whatsapp' | 'email' = 'email';

      if (optedIn && phone) {
        const body = `${lead}\n${confirmLink}`;
        const res = await sendWhatsApp(phone, body);
        if (res.ok) {
          channel = 'whatsapp';
          sentWhatsApp++;
          updateFields.response_method = 'whatsapp';
          logWrites.push(logNotification({
            case_id: checkIn.case_id,
            channel: 'whatsapp',
            recipient_phone: phone,
            message_type: 'milestone_checkin',
            status: 'sent',
            milestone_type: milestone,
            notes: `Traveler Guardian milestone check-in sent via WhatsApp`,
            logged_at: now.toISOString(),
          }));
        } else {
          // WhatsApp failed — fall back to email so the milestone isn't lost.
          channel = 'email';
          logWrites.push(logNotification({
            case_id: checkIn.case_id,
            channel: 'whatsapp',
            recipient_phone: phone,
            message_type: 'milestone_checkin',
            status: 'failed',
            milestone_type: milestone,
            notes: res.error || 'WhatsApp send failed; falling back to email',
            logged_at: now.toISOString(),
          }));
        }
      }

      if (channel === 'email' && caseRecord.client_email) {
        const emailHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
            <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
              <div style="text-align:center;margin-bottom:20px;">
                <span style="font-size:40px;">🛡️</span>
                <h1 style="color:#111827;font-size:22px;margin:10px 0 4px;">Traveler Guardian Check-In</h1>
                <p style="color:#6b7280;font-size:13px;margin:0;">Morales Traveler Guardian · ${milestone.replace(/_/g, ' ')}</p>
              </div>
              <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${caseRecord.client_name || 'there'}</strong>,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;">${lead.replace(confirmLink, '')}</p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${confirmLink}" style="display:inline-block;background-color:#059669;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:17px;">🟢 I'M SAFE — Confirm Now</a>
              </div>
              <p style="color:#9ca3af;font-size:12px;text-align:center;">This link expires in 24 hours and can only be used once.</p>
            </div>
          </div>`;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: caseRecord.client_email,
            subject: `🛡️ Traveler Guardian Check-In — ${milestone.replace(/_/g, ' ')}`,
            body: emailHtml,
          });
          sentEmail++;
          updateFields.response_method = 'app';
          logWrites.push(logNotification({
            case_id: checkIn.case_id,
            channel: 'email',
            recipient_email: caseRecord.client_email,
            message_type: 'milestone_checkin',
            status: 'sent',
            milestone_type: milestone,
            notes: optedIn ? 'WhatsApp failed or no phone — milestone sent via email fallback' : 'WhatsApp not opted in — milestone sent via email',
            logged_at: now.toISOString(),
          }));
        } catch (_) {
          skipped++;
          continue;
        }
      } else if (channel === 'email' && !caseRecord.client_email) {
        skipped++;
        continue;
      }

      try {
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, updateFields);
      } catch (_) { /* still counted */ }
    }

    await Promise.allSettled(logWrites);

    return Response.json({
      success: true,
      run_at: now.toISOString(),
      due: due.length,
      sent_whatsapp: sentWhatsApp,
      sent_email: sentEmail,
      skipped,
    });
  } catch (error) {
    console.error('[sendMilestoneWhatsAppCheckIns]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});