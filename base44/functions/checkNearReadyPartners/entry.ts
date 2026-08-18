import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { findNearReadyPartners } from '../../shared/checkNearReadyPartners.ts';

// ── checkNearReadyPartners ───────────────────────────────────────────────────
// Read-only search tool for mcare_orchestrator (a backend dispatch-failure
// agent — NOT the patient-facing M-Care chat). Generalized from the original
// doctor-only checkNearVerifiedDoctors: when a normal backup search for ANY
// of the 5 partner types (doctor, travel agency, taxi/driver, companion,
// security agency) comes up empty, this surfaces partners already in the
// verification pipeline who are one human click from ready, instead of
// giving up with nothing but "no one available."
//
// The actual query/scoring logic lives in shared/checkNearReadyPartners.ts so
// this tool and base44/shared/partnerSearchWidening.ts's deterministic
// direct-call path share exactly one implementation. Never writes anything.

const bodySchema = strictObject({
  partner_type: z.enum(['doctor', 'travel_agency', 'taxi_service', 'companion', 'security_agency']),
  specialty: Fields.optionalText(200),
  country: Fields.optionalText(100),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { partner_type, specialty, country } = await body();

  const ranked = await findNearReadyPartners(base44, partner_type, { specialty, country });
  const nounPlural = { doctor: 'doctor(s)', travel_agency: 'travel agenc(ies)', taxi_service: 'driver(s)', companion: 'companion(s)', security_agency: 'security escort(s)' }[partner_type];

  return ok({
    success: true,
    partner_type,
    count: ranked.length,
    partners: ranked,
    message: ranked.length > 0
      ? `${ranked.length} ${nounPlural} already in the verification pipeline have passed license and identity checks and are close to ready.`
      : `No ${partner_type.replace(/_/g, ' ')} in the pending pipeline has passed both license and identity checks yet.`,
  });
}, { name: 'checkNearReadyPartners', requireAuth: false, bodySchema, rateLimit: { max: 8, windowSeconds: 300 } }));
