import { createHandler, ok, err } from '../_shared/createHandler.ts';

// ComplyAdvantage monitoring webhooks fire when a previously-screened entity
// appears on a new list (e.g. a partner who cleared initial screening later
// becomes sanctioned). We re-block the partner immediately.
//
// Env vars:
//   COMPLY_ADVANTAGE_WEBHOOK_SECRET — HMAC-SHA256 signing secret from your
//     ComplyAdvantage dashboard → Settings → Webhooks.

async function verifyHmacSignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get('COMPLY_ADVANTAGE_WEBHOOK_SECRET');
  if (!secret) {
    // No secret configured — allow but log so ops knows to set it.
    console.warn('[handleSanctionsWebhook] COMPLY_ADVANTAGE_WEBHOOK_SECRET not set — skipping signature check');
    return true;
  }

  const signature = req.headers.get('X-ComplyAdvantage-Signature') || '';
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

const ENTITY_MAP: Record<string, string> = {
  doctor:          'Doctor',
  travel_agency:   'TravelAgency',
  taxi_service:    'TaxiService',
  companion:       'Companion',
  security_agency: 'SecurityAgency',
};

Deno.serve(createHandler(async ({ base44, req }) => {
  // Read the raw body so we can verify the HMAC before parsing JSON.
  const rawBody = await req.text();
  const valid = await verifyHmacSignature(req, rawBody);
  if (!valid) return err('Invalid webhook signature', 401);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return err('Invalid JSON');
  }

  // ComplyAdvantage monitoring webhook shape:
  // { action: 'updated'|'deleted', entity_id: <search_id>,
  //   client_ref: '<partnerType>:<partnerId>', data: { total_hits, hits } }
  const { action, client_ref, data } = payload as {
    action: string;
    client_ref?: string;
    data?: { total_hits?: number; hits?: unknown[] };
  };

  // Only care about hit updates.
  if (action !== 'updated') return ok({ ignored: true, reason: `action=${action}` });

  if (!client_ref || !client_ref.includes(':')) {
    return err('Missing or malformed client_ref');
  }

  const [partnerType, partnerId] = client_ref.split(':');
  const totalHits = (data?.total_hits ?? 0) as number;

  if (totalHits === 0) return ok({ ignored: true, reason: 'no_hits' });

  // New sanctions hit post-activation — block the partner immediately.
  const entityName = ENTITY_MAP[partnerType];
  if (!entityName) return err(`Unknown partner_type: ${partnerType}`);

  const now = new Date().toISOString();
  const b44 = base44 as {
    asServiceRole: {
      entities: Record<string, { update: Function; get: Function }>;
      integrations: { Core: { SendEmail: Function } };
    };
  };

  const partner = await b44.asServiceRole.entities[entityName].get(partnerId);
  if (!partner) return err('Partner not found');

  await b44.asServiceRole.entities[entityName].update(partnerId, {
    status: 'blocked',
    sanctions_check_status: 'flagged',
    sanctions_flagged_at: now,
    verification_status: 'sanctions_flagged',
  });

  // Write audit entry.
  try {
    await b44.asServiceRole.entities.AuditLog.create({
      event_type: 'partner_notified',
      actor_id: 'system',
      actor_role: 'system',
      actor_name: 'ComplyAdvantage Monitoring',
      resource_type: entityName,
      resource_id: partnerId,
      resource_name: partner.full_name || partner.agency_name || partner.driver_name || partner.name || partnerId,
      details: {
        action: 'sanctions_monitoring_hit',
        partner_type: partnerType,
        total_hits: totalHits,
        source: 'comply_advantage_webhook',
      },
      sensitive: true,
      timestamp: now,
      prev_hash: 'SANCTIONS_WEBHOOK',
    });
  } catch (_) { /* audit write is best-effort */ }

  // Alert admin.
  const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@moralesmedical.com';
  try {
    const partnerName = partner.full_name || partner.agency_name || partner.driver_name || partner.name || partnerId;
    await b44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `🚨 SANCTIONS MONITORING HIT — ${partnerName} (${partnerType})`,
      body: `An ACTIVE partner has been flagged by ComplyAdvantage monitoring.\n\n`
          + `Partner: ${partnerName}\nType: ${partnerType}\nID: ${partnerId}\n`
          + `New hits: ${totalHits}\nTime: ${now}\n\n`
          + `Partner status has been automatically set to BLOCKED.\n\n`
          + `Review immediately at /admin/partner-verification`,
    });
  } catch (_) { /* email is non-fatal */ }

  return ok({ blocked: true, partner_id: partnerId, partner_type: partnerType });
}, { name: 'handleSanctionsWebhook', requireAuth: false, allowedRoles: [] }));
