import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';
import { getDoctorReminderCopy } from '../../shared/doctorReminderCopy.ts';
import { logCrisisReroute } from '../../shared/logCrisisReroute.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
const CONFIRMATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const PROCEDURE_WARNING_HOURS = 24; // doctor still unconfirmed, procedure within a day — flag + remind the doctor on every channel
const PROCEDURE_CRITICAL_HOURS = 4; // doctor still unconfirmed, procedure within hours — flag + admin SMS

// Outbound SMS/WhatsApp (Twilio) — inline, matching this codebase's own
// established convention (see escalateMissedDriverHandshake,
// escalateSoloCheckIn) rather than a shared module.
async function sendAdminSms(message: string) {
  const adminPhone = Deno.env.get('ADMIN_PHONE');
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!adminPhone || !sid || !token || !from) return;
  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: adminPhone, From: from, Body: message }).toString(),
    });
  } catch (_) { /* non-blocking — SMS failure must never stop the flagging pass */ }
}

async function sendSms(to: string, message: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return;
  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
    });
  } catch (_) { /* non-blocking */ }
}

async function sendWhatsApp(to: string, message: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return;
  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: `whatsapp:${to}`, From: `whatsapp:${from}`, Body: message }).toString(),
    });
  } catch (_) { /* non-blocking */ }
}

// Doctor reminder, every channel we have for them, in their own language.
// Wrapped as a single promise so it slots into the existing
// collect-then-Promise.allSettled pattern below instead of blocking the loop.
async function sendDoctorReminder(base44: any, doctorEmail: string, portalToken: string) {
  const portalUrl = `${APP_URL}/portal/doctor/${portalToken}`;
  const doctorRecords = await base44.asServiceRole.entities.Doctor
    .filter({ email: doctorEmail }, '-created_date', 1).catch(() => []);
  const doctor = doctorRecords[0];
  const copy = getDoctorReminderCopy('confirm_date', doctor?.language_preference);

  await Promise.allSettled([
    base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Medical Travel Safety', to: doctorEmail,
      subject: 'Please confirm your procedure date',
      body: linkOnlyEmail({
        from: 'detectFallbackCrisis/doctor-reminder',
        title: copy.emailTitle,
        line: copy.emailLine,
        ctaLabel: copy.emailCta,
        ctaUrl: portalUrl,
      }),
    }).catch(() => {}),
    doctor?.phone ? sendSms(doctor.phone, linkOnlySms({
      from: 'detectFallbackCrisis/doctor-reminder-sms',
      line: copy.smsLine,
      url: portalUrl,
    })) : Promise.resolve(),
    doctor?.phone ? sendWhatsApp(doctor.phone, linkOnlySms({
      from: 'detectFallbackCrisis/doctor-reminder-whatsapp',
      line: copy.smsLine,
      url: portalUrl,
    })) : Promise.resolve(),
    base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: doctorEmail,
      title: copy.pushTitle,
      body: copy.pushBody,
      url: portalUrl,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {}),
  ]);
}

async function aiAdditionalRisks(cases: Record<string, unknown>[]): Promise<{ case_id: string; reason: string }[]> {
  if (!ANTHROPIC_KEY || !cases.length) return [];
  const summary = cases.slice(0, 20).map(c =>
    `${String(c.id).slice(-6)}: status=${c.status} priority=${c.case_priority} stale_days=${Math.floor((Date.now() - new Date(String(c.updated_date || c.created_date || 0)).getTime()) / 86400_000)} payment=${c.payment_status} doctor_status=${c.doctor_status}`
  ).join('\n');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: HAIKU, max_tokens: 250,
        messages: [{ role: 'user', content: `Medical travel case risk scanner. Cases (id_suffix: status, priority, stale_days, payment, doctor_status):\n${summary}\n\nIdentify cases stuck or at risk that need attention (e.g. stale >3 days in early status, payment pending long, no doctor assigned). Return JSON array max 5: [{"id_suffix":"...","reason":"1 sentence risk"}]. Empty array [] if none.` }],
      }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    const m = (d.content?.[0]?.text || '').trim().match(/\[[\s\S]*\]/);
    const parsed: { id_suffix: string; reason: string }[] = m ? JSON.parse(m[0]) : [];
    return parsed.map(p => {
      const matched = cases.find(c => String(c.id).endsWith(p.id_suffix));
      return matched ? { case_id: String(matched.id), reason: p.reason } : null;
    }).filter(Boolean) as { case_id: string; reason: string }[];
  } catch { return []; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // BUG-R5 FIX: The previous guard only blocked non-admin authenticated users.
    // Unauthenticated callers (user === null) were allowed through — any anonymous POST
    // could trigger a full 500-case scan and mass-update (DoS vector).
    // Now: require either admin/platform_admin role OR accept calls with no user token
    // only when triggered from an internal automation context (no Authorization header = system).
    // The check below rejects any request that has a user token but is NOT admin.
    // The comment above described the intent correctly but the check did not
    // implement it: `if (user && ...)` rejected a non-admin token yet allowed a
    // request carrying NO token at all — leaving the 500-case scan + mass-update
    // DoS vector it was written to close wide open. cronAuthorized requires a
    // cron secret or an admin session, and defaults closed when neither exists.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    // BUG-R14-06 FIX: list('-created_date', 500) is an arbitrary cap — on a busy platform
    // cases beyond position 500 are silently never scanned for fallback crises.
    // Sort by updated_date descending to prioritise recently-changed cases (most likely
    // to have just missed a confirmation window), and cap at 300 which covers realistic load.
    const allCases = await base44.asServiceRole.entities.CaseRecord.list('-updated_date', 300);
    const activeCases = allCases.filter(c => c.status !== 'Completed');

    const results = { scanned: activeCases.length, flagged: 0, resolved: 0, unchanged: 0, details: [] };

    // Collect all updates then fire them concurrently — avoid serial await-per-case
    const updatePromises = [];
    const smsPromises = [];

    for (const c of activeCases) {
      // Skip if already explicitly resolved
      if (c.fallback_state?.in_flux === false && c.fallback_state?.resolved_at) {
        results.unchanged++;
        continue;
      }

      let shouldFlag = false;
      let reason = '';
      let primaryPartnerType = '';
      let primaryPartnerName = '';
      let missedAt = null;
      let confirmationDeadline = null;
      let hoursLeftForSms = null;

      // Check: doctor notified but confirmation window missed
      if (
        c.doctor_confirmation_status === 'PENDING' &&
        c.doctor_notified_at &&
        (now - new Date(c.doctor_notified_at)) > CONFIRMATION_WINDOW_MS &&
        !['Completed', 'Submitted'].includes(c.status)
      ) {
        shouldFlag = true;
        reason = 'DOCTOR_MISSED_CONFIRMATION_WINDOW';
        primaryPartnerType = 'doctor';
        primaryPartnerName = c.doctor_selected || 'Assigned Doctor';
        missedAt = new Date(c.doctor_notified_at);
        confirmationDeadline = new Date(missedAt.getTime() + CONFIRMATION_WINDOW_MS);
      }

      // Check: doctor still unconfirmed as the procedure itself approaches —
      // distinct from the rule above, which only measures speed since
      // notification. A doctor notified early who simply never gets around
      // to confirming, with the patient now on the ground, was invisible to
      // that rule alone — nothing re-checked confirmation status against
      // procedure_date as the date actually neared.
      const procedureDate = c.procedure_date ? new Date(c.procedure_date) : null;
      const hoursUntilProcedure = procedureDate && !Number.isNaN(procedureDate.getTime())
        ? (procedureDate.getTime() - now.getTime()) / (60 * 60 * 1000)
        : null;

      if (
        !shouldFlag &&
        c.doctor_confirmation_status === 'PENDING' &&
        hoursUntilProcedure !== null &&
        hoursUntilProcedure > 0 &&
        hoursUntilProcedure <= PROCEDURE_WARNING_HOURS &&
        !['Completed', 'Submitted'].includes(c.status)
      ) {
        shouldFlag = true;
        reason = hoursUntilProcedure <= PROCEDURE_CRITICAL_HOURS
          ? 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL'
          : 'DOCTOR_UNCONFIRMED_PROCEDURE_APPROACHING';
        primaryPartnerType = 'doctor';
        primaryPartnerName = c.doctor_selected || 'Assigned Doctor';
        missedAt = now;
        confirmationDeadline = procedureDate;
        hoursLeftForSms = hoursUntilProcedure;
      }

      if (shouldFlag && confirmationDeadline && !c.fallback_state?.in_flux) {
        const auditEntry = {
          timestamp: now.toISOString(),
          action: 'IN_FLUX_AUTO_DETECTED',
          actor: 'system',
          notes: `${reason} — primary partner: ${primaryPartnerName}.` +
            (missedAt ? ` Checked at ${missedAt.toISOString()}.` : ''),
        };

        updatePromises.push(
          base44.asServiceRole.entities.CaseRecord.update(c.id, {
            case_priority: c.case_priority === 'Normal' ? 'Urgent' : c.case_priority,
            fallback_state: {
              in_flux: true,
              in_flux_triggered_at: now.toISOString(),
              primary_partner_type: primaryPartnerType,
              primary_partner_name: primaryPartnerName,
              primary_partner_contact_phone: '',
              confirmation_deadline: confirmationDeadline.toISOString(),
              current_escalation_level: reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL' ? 2 : 1,
              escalation_reason: reason,
              human_intervention_required: false,
              fallback_sequence: [],
              audit_trail: [...(c.fallback_state?.audit_trail || []), auditEntry],
            },
          })
        );

        // Log the intervention for /admin/crisis-reroutes. The 4h critical
        // tier is the one that actually escalates to a human (admin SMS,
        // below); the 15-min and 24h-approaching tiers are the softer,
        // earlier signal — flagged but not yet a human escalation.
        updatePromises.push(
          logCrisisReroute(base44, {
            case_id: c.id,
            crisis_type: 'PARTNER_UNRESPONSIVE',
            detected_by: 'CRON',
            original_provider_type: 'doctor',
            original_provider_name: primaryPartnerName,
            status: reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL' ? 'human_escalated' : 'detected',
            human_escalated: reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL',
            human_escalated_reason: reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL'
              ? `Doctor still unconfirmed with the procedure within ${PROCEDURE_CRITICAL_HOURS}h of starting — escalated to admin.`
              : '',
            source_message: auditEntry.notes,
          }).catch(() => {})
        );

        // Give the doctor an actual window, not just an internal flag: the
        // first time this case tips into flux over a proximity reason (not
        // the pre-existing 15-minute-after-notification rule above, which
        // covers a different, earlier signal), remind the doctor directly on
        // every channel we have for them, in their own language — before
        // admin ever gets involved at the 4h critical tier below.
        if (
          (reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_APPROACHING' || reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL') &&
          c.doctor_email
        ) {
          updatePromises.push(
            sendDoctorReminder(base44, c.doctor_email, c.doctor_portal_token).catch(() => {})
          );
        }

        // Critical tier — procedure is hours away and the doctor still
        // hasn't confirmed. This does NOT auto-reassign the doctor: "hasn't
        // clicked confirm yet" is a softer signal than a driver physically
        // failing to show, and unilaterally firing a doctor who may still
        // come through risks doing real harm (duplicate assignment,
        // confusion on arrival). It escalates as loudly as this system
        // escalates real emergencies elsewhere — an admin text, not just an
        // email — so a human decides fast, with findDoctorBackup one click
        // away in the admin console if they choose to use it.
        if (reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL') {
          const hoursLeft = Math.max(0, Math.round(hoursLeftForSms ?? 0));
          smsPromises.push(sendAdminSms(
            `URGENT: Dr. ${primaryPartnerName} still hasn't confirmed for ${c.client_name || 'a patient'} — procedure in ${hoursLeft}h (case ${String(c.id).slice(-8)}). Confirm or dispatch a backup doctor now.`
          ));
        }

        // Proactive chat bubble, polled by the frontend (useJourneyEvents).
        // Deliberately excludes DOCTOR_MISSED_CONFIRMATION_WINDOW (15 minutes
        // — too early to be meaningful, and triggers no notification to
        // anyone today, not even the doctor) — only the two proximity-to-
        // procedure tiers, which already page the doctor/admin for real.
        // Rides on the same in_flux gate as logCrisisReroute above, so this
        // fires exactly once per flux episode, never on every 15-min tick.
        if (
          (reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_APPROACHING' || reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL') &&
          (c.client_email || c.user_email)
        ) {
          updatePromises.push(
            logJourneyEvent(base44, {
              case_id: c.id,
              client_email: c.client_email || c.user_email,
              event_type: 'doctor_confirmation_delay_flagged',
              source: 'detectFallbackCrisis',
              message_text: reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL'
                ? "I've flagged your doctor's confirmation for urgent follow-up with our team since your procedure is very close — I'll keep you posted."
                : "Your procedure is coming up soon, and I'm actively following up on your doctor's confirmation to make sure everything's ready.",
              priority: reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL' ? 'high' : 'medium',
              action_taken: `Doctor confirmation still pending as the procedure approaches (${reason})`,
              tool_result: { reason, hours_until_procedure: hoursLeftForSms },
              escalation_occurred: reason === 'DOCTOR_UNCONFIRMED_PROCEDURE_CRITICAL',
            })
          );
        }

        results.flagged++;
        results.details.push({ id: c.id, name: c.client_name, reason });
      } else {
        results.unchanged++;
      }
    }

    // Fire all updates concurrently instead of serially
    if (updatePromises.length > 0) {
      await Promise.allSettled(updatePromises);
    }
    if (smsPromises.length > 0) {
      await Promise.allSettled(smsPromises);
    }

    // AI risk scan — identifies additional at-risk cases beyond the single hardcoded rule
    const aiRisks = await aiAdditionalRisks(activeCases);
    for (const risk of aiRisks) {
      const alreadyFlagged = results.details.some((d: { id: string }) => d.id === risk.case_id);
      if (!alreadyFlagged) {
        results.details.push({ id: risk.case_id, name: 'AI-identified', reason: risk.reason });
        results.flagged++;
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('[detectFallbackCrisis]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});