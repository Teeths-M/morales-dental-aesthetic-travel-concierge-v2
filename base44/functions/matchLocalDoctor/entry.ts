import { createHandler, ok, err } from '../_shared/createHandler.ts';

/**
 * matchLocalDoctor — finds the best available verified M Local doctor
 * in the patient's home country and returns their profile.
 * Called by checkMissedRecoveryCheckins and interpretRecoveryCheckIn
 * when a post-return concern is detected.
 */
Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id } = await body();
  if (!case_id) return err('case_id is required');

  // Load the case to get patient's home country
  const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: case_id }, '-created_date', 1);
  if (!cases.length) return err('Case not found');
  const caseRecord = cases[0];

  const patientCountry = caseRecord.patient_country || caseRecord.client_country;
  if (!patientCountry) return err('Patient home country not set on case');

  // Find verified active M Local doctors in the patient's home country
  const candidates = await base44.asServiceRole.entities.Doctor.filter(
    {
      doctor_type: 'local',
      home_country: patientCountry,
      verification_status: 'verified',
      is_active: true,
      accepting_referrals: true,
    },
    '-trust_score',
    10
  );

  if (!candidates.length) {
    // Fallback: any verified local doctor (different country)
    const fallback = await base44.asServiceRole.entities.Doctor.filter(
      { doctor_type: 'local', verification_status: 'verified', accepting_referrals: true },
      '-trust_score',
      5
    );
    if (!fallback.length) return ok({ matched: false, reason: 'No M Local doctors available' });
    return ok({ matched: true, doctor: fallback[0], country_match: false });
  }

  return ok({ matched: true, doctor: candidates[0], country_match: true });
}, { name: 'matchLocalDoctor', requireAuth: false, allowedRoles: [] }));
