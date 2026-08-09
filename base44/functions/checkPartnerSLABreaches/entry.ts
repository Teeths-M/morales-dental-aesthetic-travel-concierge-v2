import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';
import { findDoctorBackup } from '../../shared/findDoctorBackup.ts';
import { findCompanionBackup } from '../../shared/findCompanionBackup.ts';
import { getDoctorReminderCopy } from '../../shared/doctorReminderCopy.ts';
import { logCrisisReroute } from '../../shared/logCrisisReroute.ts';

// Outbound SMS/WhatsApp (Twilio) — inline, matching every other function in
// this codebase (see escalateSoloCheckIn, findDoctorBackup) rather than a
// shared module, per this repo's established convention.
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

/**
 * checkPartnerSLABreaches — Uber Auto-Rerouting Model
 *
 * Checked every 15 minutes via GitHub Actions (.github/workflows/safety-cron.yml),
 * the same real cron every other life-safety job in this repo uses — this file
 * previously said "Run hourly," but nothing scheduled it at all; it only ran
 * if an admin opened /admin and manually triggered it. The 24h/48h numbers
 * below are the actual escalation thresholds — checking every 15 minutes
 * instead of hourly just means a threshold crossing is caught sooner, not
 * that anything fires more often than intended (each branch is gated on its
 * own one-time sla_breached_* flag).
 *
 * If any partner (travel agency, driver, companion, or doctor) hasn't
 * confirmed within 24 hours of being contacted, the system automatically:
 *   1. Finds a backup partner in the network
 *   2. Dispatches a new quota/assignment request to the backup
 *   3. Alerts the admin concierge
 *   4. Flags the breach on CaseRecord for audit
 *
 * At 48 hours with any partner still unconfirmed, escalates to human intervention.
 */

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');



// HMAC-signed to match verifyPortalToken() in getPortalData — was previously
// unsigned and would fail that verification (portal link non-functional).
async function makeToken(caseId: string, partnerId: string, portalType: string) {
  const payload = { consultation_id: caseId, partner_id: partnerId, portal_type: portalType, expires_at: Date.now() + 14 * 86_400_000 };
  const secret = (() => {
    // FAIL CLOSED. This used to fall back to 'change-me-in-production', a value
    // published in this repository — so anyone who could read the repo could
    // mint a portal token for any case and read a patient's record. Refusing to
    // sign is a support ticket; a forgeable token is a breach.
    const s = Deno.env.get('PORTAL_TOKEN_SECRET');
    if (!s || s === 'change-me-in-production') {
      throw new Error('PORTAL_TOKEN_SECRET is not set — refusing to sign or verify a portal token.');
    }
    return s;
  })();
  const data = JSON.stringify(payload);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

Deno.serve(async (req) => {
  try {
    const base44  = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const now     = Date.now();
    const HR_12   = 12 * 60 * 60 * 1000;
    const HR_24   = 24 * 60 * 60 * 1000;
    const HR_48   = 48 * 60 * 60 * 1000;
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    // All cases actively waiting for partner quotes
    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { status: 'Vendor-Pending' }, '-quotas_requested_at', 100
    ).catch(() => []);

    const escalations: { case_id: string; partner: string; action: string }[] = [];

    for (const c of cases as any[]) {
      if (!c.quotas_requested_at) continue;
      const age = now - new Date(c.quotas_requested_at).getTime();
      const caseRef     = c.id.slice(-8).toUpperCase();
      const patientName = c.client_name;
      const tasks: Promise<unknown>[] = [];

      // ── Travel Agency SLA ────────────────────────────────────────────────
      if (age >= HR_24 && c.itinerary_status === 'PENDING' && !c.sla_breached_travel) {
        const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }).catch(() => []);
        const backup   = (agencies as any[]).find((a: any) => a.id !== c.travel_vendor_id) ?? (agencies as any[])[1];
        if (backup?.email) {
          const token  = await makeToken(c.id, backup.id, 'travel');
          const url    = `${APP_URL}/portal/travel?token=${token}`;
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: backup.email,
            subject: `Urgent: a quote request needs a response | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'checkPartnerSLABreaches/travel-backup',
              title: 'Urgent: a quote request needs a response.',
              line: 'A travel booking needs pricing urgently — the partner first contacted did not respond in time. Open your portal to review it and submit your quote.',
              ctaLabel: 'Submit My Quote',
              ctaUrl: url,
            }),
          }));
          if (adminEmail) {
            tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND, to: adminEmail,
              subject: `SLA alert: a partner is unresponsive | ${BRAND}`,
              body: linkOnlyEmail({
                from: 'checkPartnerSLABreaches/admin',
                title: 'A travel partner missed their 24-hour SLA.',
                line: 'A backup partner has been dispatched automatically. Open the admin console to review the case.',
                ctaLabel: 'Review In Console',
                ctaUrl: `${APP_URL}/admin/cases`,
              }),
            }));
          }
          tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, {
            sla_breached_travel: true, backup_travel_id: backup.id,
            fallback_state: { ...(c.fallback_state || {}), in_flux: true, primary_partner_type: 'travel_agency', escalation_reason: 'MANUAL_ESCALATION', current_escalation_level: 1 },
          }));
          tasks.push(logCrisisReroute(base44, {
            case_id: c.id,
            crisis_type: 'PARTNER_UNRESPONSIVE',
            detected_by: 'CRON',
            original_provider_type: 'travel_agency',
            status: 'rerouting',
            selected_backup_name: backup.agency_name || '',
            selected_backup_type: 'travel_agency',
            source_message: 'Travel agency did not respond to a quote request within the 24h SLA.',
          }).catch(() => {}));
          escalations.push({ case_id: c.id, partner: 'travel', action: 'backup_dispatched' });
        }
      }

      // ── Driver SLA ───────────────────────────────────────────────────────
      if (age >= HR_24 && c.transfer_status === 'PENDING' && !c.sla_breached_driver) {
        const drivers  = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
        const backup   = (drivers as any[]).find((d: any) => d.id !== c.origin_driver_id && d.id !== c.destination_driver_id) ?? (drivers as any[])[1];
        if (backup?.email) {
          const token  = await makeToken(c.id, backup.id, 'transfer');
          const url    = `${APP_URL}/portal/transfer?token=${token}`;
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: backup.email,
            subject: `Urgent: a transfer quote needs a response | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'checkPartnerSLABreaches/driver-backup',
              title: 'Urgent: a quote request needs a response.',
              line: 'A ground transfer needs pricing urgently — the partner first contacted did not respond in time. Open your portal to price the legs required.',
              ctaLabel: 'Submit My Quote',
              ctaUrl: url,
            }),
          }));
          tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, { sla_breached_driver: true, backup_driver_id: backup.id }));
          tasks.push(logCrisisReroute(base44, {
            case_id: c.id,
            crisis_type: 'PARTNER_UNRESPONSIVE',
            detected_by: 'CRON',
            original_provider_type: 'driver',
            status: 'rerouting',
            selected_backup_name: backup.agency_name || '',
            selected_backup_type: 'driver',
            source_message: 'Driver did not respond to a transfer quote request within the 24h SLA.',
          }).catch(() => {}));
          escalations.push({ case_id: c.id, partner: 'driver', action: 'backup_dispatched' });
        }
      }

      // ── Companion SLA ────────────────────────────────────────────────────
      // Delegates to findCompanionBackup — the same real implementation the
      // explicit companion-cancel path in respondToCompanionJob calls, so a
      // 24h silence and an after-confirming cancel produce one consistent
      // outcome (a real `offered` CompanionAssignment, not just an email).
      if (age >= HR_24 && c.companion_quote_status === 'PENDING' && !c.sla_breached_companion && c.booking_type !== 'travel_only') {
        tasks.push(findCompanionBackup(base44, c, c.companion_assignment_id).then(result => {
          escalations.push({ case_id: c.id, partner: 'companion', action: result.success ? 'backup_dispatched' : 'no_backup_available' });
          return logCrisisReroute(base44, {
            case_id: c.id,
            crisis_type: 'PARTNER_UNRESPONSIVE',
            detected_by: 'CRON',
            original_provider_type: 'companion',
            status: result.success ? 'resolved' : 'human_escalated',
            selected_backup_name: result.success ? (result.companion?.full_name || '') : '',
            selected_backup_type: 'companion',
            human_escalated: !result.success,
            human_escalated_reason: result.success ? '' : 'No backup companion available within the 24h SLA.',
            source_message: 'Companion did not respond to an assignment within the 24h SLA.',
          }).catch(() => {});
        }));
      }

      // ── 48hr Human Escalation ─────────────────────────────────────────────
      if (age >= HR_48) {
        const anyStillPending = c.itinerary_status === 'PENDING' || c.transfer_status === 'PENDING' || c.companion_quote_status === 'PENDING' || c.clinic_quote_status === 'PENDING';
        if (anyStillPending && adminEmail) {
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: adminEmail,
            subject: `Human intervention required on a case | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'checkPartnerSLABreaches/admin-48h',
              title: 'A case has gone 48 hours without full partner confirmation.',
              line: 'Backup dispatch has not resolved it and some partners remain unconfirmed. Open the admin console to intervene.',
              ctaLabel: 'Open Admin Console',
              ctaUrl: `${APP_URL}/admin/cases`,
            }),
          }));
          tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, {
            fallback_state: { ...(c.fallback_state || {}), human_intervention_required: true, human_intervention_triggered_at: new Date().toISOString() },
          }));
          // This branch has no one-time gate and re-fires every 15-minute cron
          // tick for as long as the 48h condition holds — dedupe against an
          // existing unresolved row for this case before writing another.
          tasks.push((async () => {
            let existing: any[] = [];
            try {
              existing = await base44.asServiceRole.entities.CrisisReroute.filter(
                { case_id: c.id, crisis_type: 'PARTNER_UNRESPONSIVE', status: 'human_escalated' }, '-detected_at', 1
              );
            } catch (_) { existing = []; }
            if (existing.length > 0) return;
            await logCrisisReroute(base44, {
              case_id: c.id,
              crisis_type: 'PARTNER_UNRESPONSIVE',
              detected_by: 'CRON',
              original_provider_type: 'other',
              status: 'human_escalated',
              human_escalated: true,
              human_escalated_reason: 'A case has gone 48 hours without full partner confirmation — backup dispatch did not resolve it.',
              source_message: 'Partner(s) remained unresponsive 48 hours after quotes were requested.',
            });
          })().catch(() => {}));
          escalations.push({ case_id: c.id, partner: 'all', action: 'human_intervention_required' });
        }
      }

      if (tasks.length > 0) await Promise.allSettled(tasks);
    }

    // ── Doctor SLA ───────────────────────────────────────────────────────────
    // Separate query: a case waiting on doctor confirmation is in status
    // 'Doctor-Pending', not 'Vendor-Pending' (vendor quotes only start once a
    // doctor confirms — see respondToDoctorPortalCase), so it never appears in
    // the `cases` fetch above. Aged off doctor_notified_at, not
    // quotas_requested_at, for the same reason.
    const doctorPendingCases = await base44.asServiceRole.entities.CaseRecord.filter(
      { status: 'Doctor-Pending' }, '-doctor_notified_at', 100
    ).catch(() => []);

    for (const c of doctorPendingCases as any[]) {
      if (!c.doctor_notified_at || c.sla_breached_doctor) continue;
      const age = now - new Date(c.doctor_notified_at).getTime();

      // Give the doctor an actual, communicated window before any reassignment:
      // a reminder at the halfway point of the 24h SLA, not a silent swap at 24h.
      // Sent on every channel we have for them (email always; SMS/WhatsApp/push
      // only if that contact method is on file), in their own language.
      if (age >= HR_12 && age < HR_24 && !c.doctor_reminder_sent_at && c.doctor_email) {
        const portalUrl = `${APP_URL}/portal/doctor/${c.doctor_portal_token}`;
        const doctorRecords = await base44.asServiceRole.entities.Doctor
          .filter({ email: c.doctor_email }, '-created_date', 1).catch(() => []);
        const doctor = (doctorRecords as any[])[0];
        const copy = getDoctorReminderCopy('case_waiting', doctor?.language_preference);

        await Promise.allSettled([
          base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: c.doctor_email,
            subject: `Action needed: a case is waiting on you | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'checkPartnerSLABreaches/doctor-reminder',
              title: copy.emailTitle,
              line: copy.emailLine,
              ctaLabel: copy.emailCta,
              ctaUrl: portalUrl,
            }),
          }).catch(() => {}),
          doctor?.phone ? sendSms(doctor.phone, linkOnlySms({
            from: 'checkPartnerSLABreaches/doctor-reminder-sms',
            line: copy.smsLine,
            url: portalUrl,
          })) : Promise.resolve(),
          doctor?.phone ? sendWhatsApp(doctor.phone, linkOnlySms({
            from: 'checkPartnerSLABreaches/doctor-reminder-whatsapp',
            line: copy.smsLine,
            url: portalUrl,
          })) : Promise.resolve(),
          base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
            user_email: c.doctor_email,
            title: copy.pushTitle,
            body: copy.pushBody,
            url: portalUrl,
            internal_secret: Deno.env.get('CRON_SECRET'),
          }).catch(() => {}),
        ]);

        await base44.asServiceRole.entities.CaseRecord.update(c.id, {
          doctor_reminder_sent_at: new Date(now).toISOString(),
        }).catch(() => {});
      }

      if (age >= HR_24) {
        const result = await findDoctorBackup(base44, c).catch(() => ({ success: false }));
        escalations.push({ case_id: c.id, partner: 'doctor', action: result.success ? 'backup_dispatched' : 'no_backup_available' });
        await logCrisisReroute(base44, {
          case_id: c.id,
          crisis_type: 'PARTNER_UNRESPONSIVE',
          detected_by: 'CRON',
          original_provider_type: 'doctor',
          status: result.success ? 'resolved' : 'human_escalated',
          selected_backup_name: result.success ? (result.doctor?.full_name || '') : '',
          selected_backup_type: 'doctor',
          human_escalated: !result.success,
          human_escalated_reason: result.success ? '' : 'No verified backup doctor available within the 24h SLA.',
          source_message: 'Doctor did not respond within the 24h SLA.',
        }).catch(() => {});
      }
    }

    console.log(`[checkPartnerSLABreaches] checked ${cases.length + doctorPendingCases.length} cases, ${escalations.length} escalations`);
    return Response.json({ success: true, escalations });
  } catch (error) {
    console.error('[checkPartnerSLABreaches]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
