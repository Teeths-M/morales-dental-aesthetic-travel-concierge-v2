// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches DoctorSignupStep3.jsx
import { base44 } from '@/api/base44Client';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';
import { SKIPPED } from '@/lib/mcareFlow/doctorSignupGraph';

/**
 * submitDoctorSignup — the ONE place a real Doctor account gets created.
 *
 * Extracted from DoctorSignupStep3.jsx's handleSubmit (2026-08) so the
 * classic multi-step form and M-Care's conversational signup call the exact
 * same sequence — a chat-driven signup can never diverge from the form's
 * safety/data properties because there is only one function that does this.
 *
 * Enforces the auth-gate-before-create ordering itself (not left to the
 * caller): a guest completing signup would otherwise get a real Doctor
 * record with no role granted (syncTenantRole silently no-ops for a guest),
 * permanently locking them out of their own dashboard — the exact
 * "Partner Onboarding Lockout" bug fixed 2026-07-24. Throws 'AUTH_REQUIRED'
 * so any caller can catch it and show its own sign-in prompt.
 *
 * Does NOT set status/verification_status to anything but
 * 'pending_verification' — activation only ever happens later, via
 * activateVerifiedDoctor, never here and never by a direct entity update.
 */
export async function submitDoctorSignup(formData, language = 'en') {
  const currentUser = await base44.auth.me().catch(() => null);
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }

  const doctorData = {
    full_name: formData.full_name,
    email: formData.email,
    phone: formData.phone,
    clinic_country: formData.clinic_country,
    clinic_city: formData.clinic_city,
    clinic_name: formData.clinic_name,
    professional_background: formData.professional_background,
    years_experience: Number(formData.years_experience) || 0,
    bio: formData.bio,
    license_number: formData.license_number,
    license_url: formData.license_url === SKIPPED ? undefined : formData.license_url,
    website_url: formData.website_url || undefined,
    social_facebook: formData.social_facebook || undefined,
    social_instagram: formData.social_instagram || undefined,
    social_tiktok: formData.social_tiktok || undefined,
    payout_method: formData.payout_method || undefined,
    payout_account: formData.payout_account || undefined,
    language_preference: language,
    status: 'pending_verification',
    sign_up_completed_at: new Date().toISOString(),
  };

  const doctor = await base44.entities.Doctor.create(doctorData);

  // Fraud cross-check (phone/clinic-address dedup against existing doctors)
  // — non-fatal, doesn't block or delay signup completion either way.
  try {
    await base44.functions.invoke('runFraudIntelligence', {
      doctor_id: doctor.id,
      phone: formData.phone,
      clinic_address: [formData.clinic_name, formData.clinic_city, formData.clinic_country].filter(Boolean).join(', '),
    });
  } catch (_) { /* non-fatal — admin can re-run manually from the verification dashboard */ }

  try {
    await saveUserOnboardingProfile({
      role: 'doctor',
      status: 'completed',
      linkedEntityName: 'Doctor',
      linkedEntityId: doctor.id,
      profileData: { ...formData, ...doctorData },
    });
  } catch (_) { /* non-fatal — Doctor entity is created */ }

  // Auto-assign specialties + pricing (non-fatal)
  try {
    if (formData.specialties && formData.specialties.length > 0) {
      const masterProcs = await base44.entities.MasterProcedure.list('-created_date', 500);

      const specialtyData = formData.specialties.map((spec) => {
        const matched = masterProcs.find((mp) => mp.en_name === spec);
        return {
          doctor_id: doctor.id,
          procedure_id: matched?.procedure_id || spec,
          procedure_name: spec,
          category: matched?.category || 'General',
        };
      });

      if (specialtyData.length > 0) {
        await base44.entities.DoctorSpecialty.bulkCreate(specialtyData);
      }

      if (formData.procedurePrices && Object.keys(formData.procedurePrices).length > 0) {
        const pricingData = Object.entries(formData.procedurePrices)
          .filter(([, price]) => price !== '' && price !== null && price > 0)
          .map(([procedure_name, doctor_price_usd]) => {
            const matched = masterProcs.find((mp) => mp.en_name === procedure_name);
            return {
              doctor_id: doctor.id,
              procedure_id: matched?.procedure_id || procedure_name,
              procedure_name,
              doctor_price_usd: parseFloat(doctor_price_usd),
            };
          });
        if (pricingData.length > 0) {
          await base44.entities.DoctorPricing.bulkCreate(pricingData);
        }
      }
    }
  } catch (_) { /* non-fatal — pricing/specialty creation */ }

  // No direct verification-kickoff call here — matches the classic form's
  // real behavior exactly: autoTriggerDoctorVerification (cron, every 30
  // min) picks up any 'pending_verification' doctor with a license on file
  // and starts the real pipeline (runDoctorVerification, initiatePartnerVerification).
  return doctor;
}
