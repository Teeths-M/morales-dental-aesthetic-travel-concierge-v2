import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';

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

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');



// HMAC-signed to match verifyPortalToken() in getPortalData — was previously
// unsigned and would fail that verification (portal link non-functional).
async function makeToken(caseId: string, partnerId: string, portalType: string) {
  const payload = { consultation_id: caseId, partner_id: partnerId, portal_type: portalType, expires_at: Date.now() + 14 * 86_400_000 };
  const secret = Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production';
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
            subject: `Urgent: a care assignment needs a response | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'checkPartnerSLABreaches/companion-backup',
              title: 'Urgent: a care assignment needs an answer.',
              line: 'A recovery support assignment needs an answer urgently — the companion first contacted did not respond in time. Open your dashboard to review it.',
              ctaLabel: 'Open Companion Dashboard',
              ctaUrl: `${APP_URL}/companion-dashboard`,
            }),
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
