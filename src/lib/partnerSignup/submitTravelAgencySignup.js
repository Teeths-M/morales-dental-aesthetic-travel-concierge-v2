// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches TravelAgencySignupStep3.jsx
import { base44 } from '@/api/base44Client';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';
import { SKIPPED } from '@/lib/mcareFlow/travelAgencySignupGraph';

/**
 * submitTravelAgencySignup — the ONE place a real TravelAgency account gets
 * created. Extracted from TravelAgencySignupStep3.jsx's handleSubmit
 * (2026-08), same reasoning and same pattern as submitDoctorSignup.js: the
 * classic multi-step form and M-Care's conversational signup call the exact
 * same sequence, so a chat-driven signup can never diverge from the form's
 * safety/data properties — there is only one function that does this.
 *
 * Enforces the auth-gate-before-create ordering itself, same "Partner
 * Onboarding Lockout" fix as submitDoctorSignup.js: a guest completing
 * signup would otherwise get a real TravelAgency record with no
 * 'travel_agency' role granted, permanently locking them out of their own
 * dashboard. Throws 'AUTH_REQUIRED' so any caller can catch it and show its
 * own sign-in prompt.
 *
 * Does NOT set status/verification fields to anything but
 * 'pending_verification' — activation only ever happens later, via the
 * verification pipeline, never here and never by a direct entity update.
 */
export async function submitTravelAgencySignup(formData, language = 'en') {
  const currentUser = await base44.auth.me().catch(() => null);
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }

  const agencyData = {
    agency_name: formData.agency_name,
    email: formData.email,
    phone: formData.phone,
    contact_person: formData.contact_person,
    headquarters_country: formData.headquarters_country,
    headquarters_city: formData.headquarters_city,
    website_url: formData.website_url,
    medical_travel_experience_years: Number(formData.medical_travel_experience_years) || 0,
    emergency_support_available: !!formData.emergency_support_available,
    service_regions: formData.service_regions,
    services_offered: formData.services_offered,
    service_options: formData.service_options,
    payout_method: formData.payout_method,
    payout_account: formData.payout_account,
    business_license_url: formData.business_license_url === SKIPPED ? '' : (formData.business_license_url || ''),
    language_preference: language,
    is_agency: true,
    status: 'pending_verification',
    sign_up_completed_at: new Date().toISOString(),
  };

  const agency = await base44.entities.TravelAgency.create(agencyData);

  try {
    await saveUserOnboardingProfile({
      role: 'travel_agency',
      status: 'completed',
      linkedEntityName: 'TravelAgency',
      linkedEntityId: agency.id,
      profileData: { ...formData, ...agencyData },
    });
  } catch (_) { /* non-fatal — TravelAgency entity is created */ }

  try {
    await base44.functions.invoke('initiatePartnerVerification', {
      partner_id: agency.id,
      partner_type: 'travel_agency',
      documents: agencyData.business_license_url ? [agencyData.business_license_url] : [],
    });
  } catch (_) { /* non-fatal */ }

  return agency;
}
