import { createHandler, ok, err } from '../../shared/createHandler.ts';

// markTransportArrived — authenticated. Lets the traveler's widget (or an
// admin) explicitly mark a RecoveryTransportRequest as arrived when the
// geofence hasn't triggered (e.g. GPS jitter keeps it just over 50m) or when
// the traveler confirms the driver is there. Verifies ownership.

export default createHandler(async ({ base44, user, body }) => {
  const b = await body().catch(() => ({}));
  const transport_request_id = String(b.transport_request_id || '').trim();
  if (!transport_request_id) return err('transport_request_id is required.', 400);

  let transport: any = null;
  try {
    const transports = await base44.asServiceRole.entities.RecoveryTransportRequest.filter({ id: transport_request_id }, '-created_at', 1);
    transport = transports?.[0] || null;
  } catch (_) { transport = null; }

  if (!transport) return err('Ride not found.', 404);

  const isOwner = transport.user_email && user && user.email && transport.user_email === user.email;
  const isAdmin = user && (user.role === 'admin' || user.role === 'platform_admin');
  if (!isOwner && !isAdmin) {
    return err('You can only update rides for your own case.', 403);
  }

  if (['completed', 'cancelled'].includes(transport.status)) {
    return ok({ already_final: true, transport_status: transport.status });
  }

  try {
    await base44.asServiceRole.entities.RecoveryTransportRequest.update(transport.id, {
      status: 'arrived',
      arrived_at: new Date().toISOString(),
    });
  } catch (_) {
    return err('Could not mark the ride as arrived.', 500);
  }

  return ok({ marked_arrived: true, transport_status: 'arrived' });
}, { name: 'markTransportArrived', requireAuth: true });