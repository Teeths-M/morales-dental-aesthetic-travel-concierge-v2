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
) {
  const fieldName = leg === 'origin' ? 'origin_driver_id' : 'destination_driver_id';

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
      line: 'A confirmed transfer leg opened up because the assigned driver cancelled. Open your portal to price and confirm the leg.',
      ctaLabel: 'Open Portal',
      ctaUrl: url,
    }),
  }).catch(() => {});

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: adminEmail,
      subject: `A driver cancelled and was automatically replaced | ${BRAND}`,
      body: linkOnlyEmail({
        from: 'findDriverBackup/admin',
        title: 'A driver cancelled a confirmed leg and a backup was dispatched automatically.',
        line: 'Open the admin console to review the case.',
        ctaLabel: 'Open Admin Console',
        ctaUrl: `${APP_URL}/admin/cases`,
      }),
    }).catch(() => {});
  }

  return { success: true, driver: backup };
}
