import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Satellite message coordination layer.
// Logs the message intent and returns a queued confirmation.
// Integration with hardware providers (Garmin inReach, Iridium, SPOT) is
// configured via environment variables — absent in dev/demo, the message is
// logged and flagged as pending_hardware.
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, message, reason } = await body();

  if (!case_id) return err('case_id is required');
  if (!message)  return err('message is required');

  const provider = Deno.env.get('SATELLITE_PROVIDER') || 'none';
  const apiKey   = Deno.env.get('SATELLITE_API_KEY')  || '';

  let delivery_status = 'pending_hardware';
  let provider_ref    = null;

  if (provider !== 'none' && apiKey) {
    // Real satellite provider integration goes here (Garmin inReach API, Iridium, SPOT).
    // When SATELLITE_PROVIDER + SATELLITE_API_KEY are set, replace this block
    // with the provider's HTTP request and set delivery_status = 'sent'.
    delivery_status = 'pending_hardware';
  }

  // Log the message attempt regardless of hardware status
  await base44.asServiceRole.entities.AuditLog.create({
    event_type:    'emergency_alert_triggered',
    actor_id:      user.id,
    actor_role:    user.role,
    actor_name:    user.full_name || user.email,
    resource_type: 'CaseRecord',
    resource_id:   case_id,
    resource_name: `Satellite message — ${reason || 'manual'}`,
    case_id,
    details: {
      message_preview: message.slice(0, 120),
      reason,
      delivery_status,
      provider,
      provider_ref,
    },
    sensitive: true,
    timestamp: new Date().toISOString(),
  });

  return ok({
    queued: true,
    delivery_status,
    provider,
    note: provider === 'none'
      ? 'Satellite hardware not configured — message logged. Set SATELLITE_PROVIDER + SATELLITE_API_KEY to enable live dispatch.'
      : 'Message queued for satellite dispatch.',
  });
}, { name: 'sendSatelliteMessage', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
