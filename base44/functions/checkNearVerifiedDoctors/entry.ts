import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── checkNearVerifiedDoctors ─────────────────────────────────────────────────
// Read-only search tool for mcare_orchestrator (a backend dispatch-failure
// agent — NOT the patient-facing M-Care chat). When findDoctorBackup finds
// zero active+verified doctors, this surfaces doctors already in the
// verification pipeline who are one human click from ready, instead of
// giving up with nothing but "no one available."
//
// Never writes anything. license_verification_status/identity_verification_status
// are the two sub-checks an automated scan can legitimately attest to
// (see runDoctorVerificationScan); background_check_status stays human-only
// by design (CLAUDE.md's "nothing automated may mark a background check
// passed" invariant) and is surfaced here only as informational context for
// the admin reading the recommendation, never as a readiness signal this
// tool itself relies on.

const bodySchema = strictObject({
  specialty: Fields.optionalText(200),
  country: Fields.optionalText(100),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { specialty, country } = await body();

  let pending: any[] = [];
  try {
    pending = await base44.asServiceRole.entities.Doctor.filter({ status: 'pending_verification' }, '-created_date', 200);
  } catch (_) {
    pending = [];
  }

  const nearReady = (pending as any[]).filter((d: any) =>
    d.license_verification_status === 'passed' &&
    d.identity_verification_status === 'passed'
  );

  const specialtyLow = (specialty || '').toLowerCase();
  const countryLow = (country || '').toLowerCase();
  const scored = nearReady.map((d: any) => {
    const dSpecialty = (d.specialty || '').toLowerCase();
    const dCountry = (d.clinic_country || '').toLowerCase();
    const specialtyHit = !specialtyLow || (!!dSpecialty && (specialtyLow.includes(dSpecialty) || dSpecialty.includes(specialtyLow)));
    const countryHit = !countryLow || (!!dCountry && (countryLow.includes(dCountry) || dCountry.includes(countryLow)));
    return { d, relevant: specialtyHit && countryHit };
  });

  // Relevant matches first, but still surface others — a near-ready doctor
  // in the wrong specialty/country is still useful information for a human
  // deciding whether to prioritize verifying them.
  const ranked = [...scored.filter(s => s.relevant), ...scored.filter(s => !s.relevant)]
    .map(s => s.d)
    .slice(0, 5);

  return ok({
    success: true,
    count: ranked.length,
    doctors: ranked.map((d: any) => ({
      id: d.id,
      name: d.full_name,
      specialty: d.specialty || '',
      country: d.clinic_country || '',
      license_verification_status: d.license_verification_status,
      identity_verification_status: d.identity_verification_status,
      background_check_status: d.background_check_status || 'pending',
      note: d.background_check_status === 'passed'
        ? 'License, identity, and background check all already passed — one admin click from active.'
        : 'License and identity already passed — still needs a human background-check click before this doctor could be assigned.',
    })),
    message: ranked.length > 0
      ? `${ranked.length} doctor(s) already in the verification pipeline have passed license and identity checks and are close to ready.`
      : 'No doctor in the pending pipeline has passed both license and identity checks yet.',
  });
}, { name: 'checkNearVerifiedDoctors', requireAuth: false, bodySchema, rateLimit: { max: 8, windowSeconds: 300 } }));
