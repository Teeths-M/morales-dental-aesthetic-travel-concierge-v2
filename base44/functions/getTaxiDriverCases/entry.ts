import { createHandler, ok } from '../../shared/createHandler.ts';

// Look up the driver's own TaxiService record by the authenticated user's
// email — never trust a caller-supplied driver id — mirroring getDoctorCases.
Deno.serve(createHandler(async ({ base44, user }) => {
  const services = await base44.asServiceRole.entities.TaxiService.filter({ email: user.email });
  if (!services.length) return ok({ cases: [] });

  const taxi = services[0];
  const cases = await base44.asServiceRole.entities.CaseRecord.filter(
    { assigned_driver_id: taxi.id },
    '-departure_date', 20
  );

  return ok({ cases });
}, { name: 'getTaxiDriverCases', requireAuth: true, allowedRoles: ['taxi_service'] }));
