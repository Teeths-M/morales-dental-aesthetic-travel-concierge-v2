import { linkOnlyEmail } from './notify.ts';

const BRAND = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// Same HMAC minting shape already proven in checkPartnerSLABreaches/assignChauffeurServices —
// verified by getPortalData's verifyPortalToken.
async function makeToken(caseId: string, partnerId: string, portalType: string) {
  const payload = { consultation_id: caseId, partner_id: partnerId, portal_type: portalType, expires_at: Date.now() + 14 * 86_400_000 };
  const secret = (() => {
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

/**
 * findDriverBackup — called by cancelDriverAssignment when a driver already
 * confirmed on one specific leg (origin or destination) backs out. Distinct
 * from checkPartnerSLABreaches's existing driver branch, which handles a
 * driver who never responded to the *initial* quote request at all and so
 * has no specific leg to reassign yet (it only records backup_driver_id for
 * an admin to route) — this one knows exactly which leg opened up and
 * refills it immediately.
 */
export async function findDriverBackup(
  base44: any,
  caseRecord: Record<string, any>,
  leg: 'origin' | 'destination',
  excludeDriverId: string,
  reason: 'cancelled' | 'no_show' = 'cancelled',
) {
  const fieldName = leg === 'origin' ? 'origin_driver_id' : 'destination_driver_id';
  const reasonText = reason === 'no_show'
    ? 'the assigned driver did not arrive for pickup'
    : 'the assigned driver cancelled';

  const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
  const backup = (drivers as any[]).find((d: any) =>
    d.id !== excludeDriverId &&
    d.id !== caseRecord.origin_driver_id &&
    d.id !== caseRecord.destination_driver_id &&
    d.email
  );

  if (!backup) {
    await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
      [fieldName]: null,
      sla_breached_driver: true,
    }).catch(() => {});

    // Same silent-failure gap findDoctorBackup closed earlier tonight — a
    // patient physically waiting for this leg deserves a loud failure, not
    // a status flip nobody is told about.
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: adminEmail,
        subject: `🚨 CRITICAL: no backup driver available — ${caseRecord.client_name || 'patient'}`,
        body: `<div style="background:#7f1d1d;color:white;padding:20px;border-radius:8px;">
          <h2 style="margin:0;">No verified backup driver available</h2></div>
          <div style="padding:20px;border:1px solid #7f1d1d;border-top:none;border-radius:0 0 8px 8px;">
          <p>${reasonText === 'the assigned driver did not arrive for pickup' ? 'A driver did not show for pickup' : 'A driver cancelled'} and every currently active driver company was tried — none available. This leg needs manual assignment now.</p>
          <p><strong>Patient:</strong> ${caseRecord.client_name || 'Unknown'}<br/>
          <strong>Case ID:</strong> ${caseRecord.id}<br/>
          <strong>Leg:</strong> ${leg}</p>
          </div>`,
      }).catch(() => {});
    }

    try {
      await base44.asServiceRole.entities.DispatchFailureLog.create({
        case_id: caseRecord.id,
        partner_type: 'driver',
        reason: `No verified backup driver available — ${reasonText} (${leg} leg)`,
        timestamp: new Date().toISOString(),
        fallback_action: 'admin_critical_alert_sent',
      });
    } catch (_) {}

    return { success: false };
  }

  const token = await makeToken(caseRecord.id, backup.id, 'transfer');
  const url = `${APP_URL}/portal/transfer?token=${token}`;

  await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
    [fieldName]: backup.id,
    sla_breached_driver: true,
    backup_driver_id: backup.id,
  }).catch(() => {});

  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: BRAND, to: backup.email,
    subject: `Urgent: a transfer needs a driver | ${BRAND}`,
    body: linkOnlyEmail({
      from: 'findDriverBackup',
      title: 'Urgent: a ground transfer needs a driver.',
      line: `A confirmed transfer leg opened up because ${reasonText}. Open your portal to price and confirm the leg.`,
      ctaLabel: 'Open Portal',
      ctaUrl: url,
    }),
  }).catch(() => {});

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: adminEmail,
      subject: `A driver was automatically replaced | ${BRAND}`,
      body: linkOnlyEmail({
        from: 'findDriverBackup/admin',
        title: `A confirmed leg lost its driver (${reasonText}) and a backup was dispatched automatically.`,
        line: 'Open the admin console to review the case.',
        ctaLabel: 'Open Admin Console',
        ctaUrl: `${APP_URL}/admin/cases`,
      }),
    }).catch(() => {});
  }

  return { success: true, driver: backup };
}
