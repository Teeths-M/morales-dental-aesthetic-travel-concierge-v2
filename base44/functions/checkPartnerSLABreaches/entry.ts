import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * checkPartnerSLABreaches — Uber Auto-Rerouting Model
 *
 * Run hourly. If any partner hasn't confirmed their quota within 24 hours
 * of being contacted, the system automatically:
 *   1. Finds a backup partner in the network
 *   2. Dispatches a new quota request to the backup
 *   3. Alerts the admin concierge
 *   4. Flags the breach on CaseRecord for audit
 *
 * At 48 hours with any partner still unconfirmed, escalates to human intervention.
 */

const BRAND   = 'Morales Dental & Aesthetics';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function makeToken(caseId: string, partnerId: string, portalType: string) {
  const payload = { consultation_id: caseId, partner_id: partnerId, portal_type: portalType, expires_at: Date.now() + 14 * 86_400_000 };
  return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))));
}

function escalationEmail({ partnerType, patientName, caseRef, reason, portalUrl }: {
  partnerType: string; patientName: string; caseRef: string; reason: string; portalUrl: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:24px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:20px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#d9c19b;">Backup Partner Request — SLA Escalation</div>
</td></tr>
<tr><td style="padding:28px 32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#13221d;">Urgent: Quote needed for ${e(patientName)}</h1>
  <div style="background:#fff8ed;border-left:4px solid #e8a020;padding:12px 16px;border-radius:0 10px 10px 0;margin-bottom:20px;">
    <p style="margin:0;font-size:13px;color:#92400e;">${e(reason)}</p>
  </div>
  <p style="margin:0 0 20px;font-size:14px;color:#40514a;line-height:1.7;">
    We are reaching out to you as a backup ${e(partnerType)} partner. A previous partner did not respond within our service window, and we need your support to ensure this patient's journey stays on track.
    Please submit your availability and pricing as soon as possible.
  </p>
  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:20px;">
    <tr><td style="padding:8px 0;color:#64746d;font-size:13px;width:40%;">Patient</td><td style="padding:8px 0;color:#13221d;font-size:14px;font-weight:700;">${e(patientName)}</td></tr>
    <tr><td style="padding:8px 0;color:#64746d;font-size:13px;">Case Reference</td><td style="padding:8px 0;color:#13221d;font-size:14px;font-weight:600;">${e(caseRef)}</td></tr>
    <tr><td style="padding:8px 0;color:#64746d;font-size:13px;">Priority</td><td style="padding:8px 0;color:#dc2626;font-size:14px;font-weight:700;">⚡ URGENT — Response needed within 12 hours</td></tr>
  </table>
  <a href="${e(portalUrl)}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;">Submit Quote Now →</a>
  <p style="margin:20px 0 0;font-size:12px;color:#64746d;">If you are unable to fulfil this request, please reply to this email immediately so we can reassign.</p>
  <p style="margin:10px 0 0;font-size:13px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44  = createClientFromRequest(req);
    const now     = Date.now();
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
          const token  = makeToken(c.id, backup.id, 'travel');
          const url    = `${APP_URL}/portal/travel?token=${token}`;
          const reason = `The previously contacted travel agency did not respond to their quote request within 24 hours for patient ${patientName}.`;
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: backup.email,
            subject: `⚡ Urgent quote request (backup) — ${patientName} | ${BRAND}`,
            body: escalationEmail({ partnerType: 'travel agency', patientName, caseRef, reason, portalUrl: url }),
          }));
          if (adminEmail) {
            tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND, to: adminEmail,
              subject: `SLA Alert: Travel agency unresponsive — ${patientName} (${caseRef})`,
              body: `<p>The travel agency for case <strong>${caseRef}</strong> (${patientName}) has not responded within 24 hours. A backup partner (${backup.agency_name || backup.email}) has been automatically dispatched.</p>`,
            }));
          }
          tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, {
            sla_breached_travel: true, backup_travel_id: backup.id,
            fallback_state: { ...(c.fallback_state || {}), in_flux: true, primary_partner_type: 'travel_agency', escalation_reason: 'MANUAL_ESCALATION', current_escalation_level: 1 },
          }));
          escalations.push({ case_id: c.id, partner: 'travel', action: 'backup_dispatched' });
        }
      }

      // ── Driver SLA ───────────────────────────────────────────────────────
      if (age >= HR_24 && c.transfer_status === 'PENDING' && !c.sla_breached_driver) {
        const drivers  = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
        const backup   = (drivers as any[]).find((d: any) => d.id !== c.origin_driver_id && d.id !== c.destination_driver_id) ?? (drivers as any[])[1];
        if (backup?.email) {
          const token  = makeToken(c.id, backup.id, 'transfer');
          const url    = `${APP_URL}/portal/transfer?token=${token}`;
          const reason = `The previously contacted chauffeur service did not respond to their transfer quote request within 24 hours for patient ${patientName}.`;
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: backup.email,
            subject: `⚡ Urgent transfer quote (backup) — ${patientName} | ${BRAND}`,
            body: escalationEmail({ partnerType: 'chauffeur', patientName, caseRef, reason, portalUrl: url }),
          }));
          tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, { sla_breached_driver: true, backup_driver_id: backup.id }));
          escalations.push({ case_id: c.id, partner: 'driver', action: 'backup_dispatched' });
        }
      }

      // ── Companion SLA ────────────────────────────────────────────────────
      if (age >= HR_24 && c.companion_quote_status === 'PENDING' && !c.sla_breached_companion && c.booking_type !== 'travel_only') {
        const companions = await base44.asServiceRole.entities.Companion.filter({ verification_status: 'verified', is_available: true }).catch(() => []);
        const backup     = (companions as any[]).find((cp: any) => cp.id !== c.companion_assignment_id) ?? (companions as any[])[0];
        if (backup?.email) {
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: backup.email,
            subject: `⚡ Urgent companion request (backup) — ${patientName} | ${BRAND}`,
            body: escalationEmail({ partnerType: 'companion', patientName, caseRef, reason: `A previous companion did not respond within 24 hours for patient ${patientName}.`, portalUrl: `${APP_URL}/companion-dashboard` }),
          }));
          tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, { sla_breached_companion: true }));
          escalations.push({ case_id: c.id, partner: 'companion', action: 'backup_dispatched' });
        }
      }

      // ── 48hr Human Escalation ─────────────────────────────────────────────
      if (age >= HR_48) {
        const anyStillPending = c.itinerary_status === 'PENDING' || c.transfer_status === 'PENDING' || c.companion_quote_status === 'PENDING' || c.clinic_quote_status === 'PENDING';
        if (anyStillPending && adminEmail) {
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: adminEmail,
            subject: `🚨 HUMAN INTERVENTION REQUIRED — ${patientName} (${caseRef})`,
            body: `<p>48 hours have passed since partner quotas were requested for case <strong>${caseRef}</strong> (${patientName}). Some partners remain unconfirmed despite backup dispatch. Manual intervention is required.</p>
            <p>Pending: Travel=${c.itinerary_status}, Driver=${c.transfer_status}, Companion=${c.companion_quote_status}, Clinic=${c.clinic_quote_status}</p>
            <p><a href="${APP_URL}/admin/cases/${c.id}">View Case in Admin →</a></p>`,
          }));
          tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, {
            fallback_state: { ...(c.fallback_state || {}), human_intervention_required: true, human_intervention_triggered_at: new Date().toISOString() },
          }));
          escalations.push({ case_id: c.id, partner: 'all', action: 'human_intervention_required' });
        }
      }

      if (tasks.length > 0) await Promise.allSettled(tasks);
    }

    console.log(`[checkPartnerSLABreaches] checked ${cases.length} cases, ${escalations.length} escalations`);
    return Response.json({ success: true, escalations });
  } catch (error) {
    console.error('[checkPartnerSLABreaches]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
