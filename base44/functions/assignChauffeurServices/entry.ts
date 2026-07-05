import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../_shared/auditHashChain.ts';

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// ── Token generation — HMAC-signed to match verifyPortalToken() in getPortalData.
// Client reads via ?token= query param, decodePortalToken() in /src/lib/portalToken.js.
// FIX: previously produced an unsigned btoa(JSON) token with no signature suffix —
// getPortalData's verifyPortalToken requires a '.'-separated HMAC-SHA256 signature
// and rejects anything without one, so every generated portal link was non-functional.
async function makePortalToken(caseId: string, partnerId: string, portalType: string) {
  const payload = {
    consultation_id: caseId,
    partner_id:      partnerId,
    portal_type:     portalType,
    expires_at:      Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const secret = Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production';
  const data = JSON.stringify(payload);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

const e = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function chauffeurEmail({ driverName, passengerName, serviceType, routes, caseRef, portalUrl }: {
  driverName: string; passengerName: string; serviceType: string;
  routes: string[]; caseRef: string; portalUrl: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">
    New Transfer Request — ${e(serviceType)}
  </div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">
    Hello ${e(driverName)},
  </h1>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#40514a;">
    You have a new medical transfer request from <strong>${BRAND}</strong>. Please review the patient details below and submit your pricing quote at your earliest convenience.
  </p>

  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:24px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Passenger</td>
        <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(passengerName)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Service Type</td>
        <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(serviceType)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Case Reference</td>
        <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(caseRef)}</td></tr>
  </table>

  <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#13221d;">Transfer legs required:</p>
  <ul style="margin:0 0 24px;padding-left:20px;">
    ${routes.map(r => `<li style="font-size:14px;color:#40514a;line-height:1.8;">${e(r)}</li>`).join('')}
  </ul>

  <div style="background:#fff8ed;border-left:4px solid #e8a020;padding:14px 18px;border-radius:0 12px 12px 0;margin-bottom:24px;">
    <p style="margin:0;font-size:14px;color:#40514a;line-height:1.6;">
      <strong>Medical transport note:</strong> This patient is travelling for a medical procedure abroad. Please ensure your vehicle is clean, comfortable, and equipped for a medically sensitive passenger. Wheelchair-accessible vehicles are preferred where available.
    </p>
  </div>

  <a href="${e(portalUrl)}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:700;">
    Submit My Quote →
  </a>
  <p style="margin:28px 0 0;font-size:13px;color:#64746d;line-height:1.6;">
    This link is valid for 7 days and is specific to your account. Do not share it.
    Questions? Reach us on WhatsApp or reply to this email.
  </p>
  <p style="margin:14px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { caseId } = await req.json();
    if (!caseId) return Response.json({ error: 'Case ID required' }, { status: 400 });

    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    const [originDrivers, destDrivers] = await Promise.all([
      base44.asServiceRole.entities.TaxiService.filter({ operating_country: caseRecord.client_country, status: 'active' }),
      base44.asServiceRole.entities.TaxiService.filter({ operating_country: caseRecord.procedure_country, status: 'active' }),
    ]);

    if (originDrivers.length === 0 || destDrivers.length === 0) {
      await base44.asServiceRole.entities.CaseRecord.update(caseId, {
        status: 'Admin-Review',
        admin_notes: 'Chauffeur service unavailable in origin or destination',
      });
      return Response.json({ status: 'NO_DRIVERS', message: 'Chauffeur services not available. Admin review required.' });
    }

    const originDriver = originDrivers[0];
    const destDriver   = destDrivers[0];
    const caseRef      = caseId.slice(-8).toUpperCase();

    // ── Fixed: tokens are btoa-encoded JSON payloads, URL uses ?token= query param ──
    // Previous implementation used random hex strings and /portal/transfer/:token path params —
    // that caused PortalChauffeur to fail because getTokenFromUrl() reads ?token= only.
    const originToken    = await makePortalToken(caseId, originDriver.id, 'transfer');
    const destToken      = await makePortalToken(caseId, destDriver.id,   'transfer');
    const originPortalUrl = `${APP_URL}/portal/transfer?token=${originToken}`;
    const destPortalUrl   = `${APP_URL}/portal/transfer?token=${destToken}`;

    // Update case record + write audit log
    const chauffeurAuditPrevHash = await computePrevHash(base44);
    await Promise.allSettled([
      base44.asServiceRole.entities.CaseRecord.update(caseId, {
        origin_driver_id:      originDriver.id,
        destination_driver_id: destDriver.id,
        transfer_status:       'SUBMITTED',
      }),
      base44.asServiceRole.entities.AuditLog.create({
        event_type:   'chauffeur_dispatched',
        actor_id:     user.id,
        actor_role:   user.role,
        actor_name:   user.full_name || user.email,
        actor_email:  user.email,
        resource_type:'CaseRecord',
        resource_id:  caseId,
        case_id:      caseId,
        details: {
          origin_driver:      originDriver.email,
          destination_driver: destDriver.email,
          client_country:     caseRecord.client_country,
          procedure_country:  caseRecord.procedure_country,
        },
        sensitive: false,
        timestamp: new Date().toISOString(),
        prev_hash: chauffeurAuditPrevHash,
      }),
    ]);

    // ── Dispatch to Origin + Destination Chauffeur simultaneously via Promise.allSettled ──
    // allSettled ensures one email failure never blocks the other dispatch.
    const dispatchResults = await Promise.allSettled([
      // Origin Chauffeur (patient's home country)
      originDriver.email ? base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to:        originDriver.email,
        subject:   `Transfer Request — ${caseRecord.client_name} (Origin) | ${BRAND}`,
        body: chauffeurEmail({
          driverName:    originDriver.driver_name || originDriver.company_name || 'Driver',
          passengerName: caseRecord.client_name,
          serviceType:   'Origin Country Transfer',
          routes:        [
            `Home → Airport (Departure day — ${caseRecord.client_country})`,
            `Airport → Home (Return — ${caseRecord.client_country})`,
          ],
          caseRef,
          portalUrl: originPortalUrl,
        }),
      }) : Promise.resolve({ skipped: 'no email' }),

      // Destination Chauffeur (procedure country)
      destDriver.email ? base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to:        destDriver.email,
        subject:   `Transfer Request — ${caseRecord.client_name} (Destination) | ${BRAND}`,
        body: chauffeurEmail({
          driverName:    destDriver.driver_name || destDriver.company_name || 'Driver',
          passengerName: caseRecord.client_name,
          serviceType:   'Destination Country Transfer',
          routes:        [
            `Airport → Hotel (Arrival — ${caseRecord.procedure_country})`,
            `Hotel → Clinic (Procedure day)`,
            `Clinic → Hotel (Post-procedure)`,
            `Hotel → Airport (Departure — ${caseRecord.procedure_country})`,
          ],
          caseRef,
          portalUrl: destPortalUrl,
        }),
      }) : Promise.resolve({ skipped: 'no email' }),
    ]);

    const failures = dispatchResults.filter(r => r.status === 'rejected').length;
    console.log(`[assignChauffeurServices] dispatched to 2 drivers, ${failures} email failures`);

    return Response.json({
      status:             'DRIVERS_ASSIGNED',
      origin_driver:      originDriver.email,
      destination_driver: destDriver.email,
      dispatch_failures:  failures,
      message:            'Origin and destination chauffeurs dispatched with branded portal links',
    });

  } catch (error) {
    console.error('[assignChauffeurServices]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
