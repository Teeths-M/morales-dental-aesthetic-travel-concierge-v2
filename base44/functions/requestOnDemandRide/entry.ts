/**
 * requestOnDemandRide
 *
 * The routine, real-time "get me a cab" path — for a normal authenticated
 * traveler with an active case, not gated on a compromised-device PinSession
 * or a confirmed emergency. Reuses the exact same driver-matching / safety-code
 * / notify logic as requestEmergencyRecoveryTransport via
 * shared/recoveryTransportDispatch.ts — the two functions differ only in who
 * may call them and why, never in what actually happens once called.
 *
 * M-Care's chat is the primary caller (a traveler typing/saying "I need a
 * cab" or a confirmed distress signal), but any authenticated traveler's own
 * client may call this directly too.
 */
import { createHandler, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { dispatchRecoveryTransport } from '../../shared/recoveryTransportDispatch.ts';

const bodySchema = strictObject({
  case_id: z.string().trim().max(100).optional(),
  pickup_latitude: z.coerce.number().min(-90).max(90).optional(),
  pickup_longitude: z.coerce.number().min(-180).max(180).optional(),
  pickup_address: Fields.optionalText(300),
  pickup_location_source: z.enum(['gps', 'ip_geo', 'manual']).optional().default('gps'),
  destination_address: Fields.optionalText(300),
  notes: Fields.optionalText(500),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    case_id,
    pickup_latitude,
    pickup_longitude,
    pickup_address,
    pickup_location_source,
    destination_address,
    notes,
  } = await body();

  if (pickup_latitude == null && pickup_longitude == null && !pickup_address) {
    return err('A pickup location (coordinates or address) is required.');
  }

  // Ownership check — same pattern as generateGuardianLink: a normal
  // traveler may only trigger a real dispatch for their own case.
  let resolvedCaseId = case_id;
  try {
    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { client_email: user.email }, '-created_date', 5,
    );
    if (!cases.length) {
      return err('No active case found for this account.', 400);
    }
    const owned = case_id ? cases.find((c: any) => c.id === case_id) : null;
    if (case_id && !owned) {
      return err('That case does not belong to this account.', 403);
    }
    resolvedCaseId = owned?.id || cases[0].id;
  } catch (_) {
    return err('Could not verify your case. Please try again.', 500);
  }

  const result = await dispatchRecoveryTransport(base44, {
    userEmail: user.email,
    caseId: resolvedCaseId,
    pickupLatitude: pickup_latitude ?? null,
    pickupLongitude: pickup_longitude ?? null,
    pickupAddress: pickup_address,
    pickupLocationSource: pickup_location_source,
    destinationAddress: destination_address,
    notes,
    requestedBy: 'patient',
    source: 'requestOnDemandRide',
    journeyEventPriorityOnMatch: 'high',
  });

  return Response.json(result);
}, {
  name: 'requestOnDemandRide',
  requireAuth: true,
  bodySchema,
  rateLimit: { max: 3, windowSeconds: 600 },
}));