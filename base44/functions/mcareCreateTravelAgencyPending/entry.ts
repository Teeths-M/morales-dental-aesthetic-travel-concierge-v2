import { createHandler, ok, err } from '../../shared/createHandler.ts';

// mcareCreateTravelAgencyPending — the M-Care agent's equivalent of
// src/lib/partnerSignup/submitTravelAgencySignup.js. Same reasoning as
// mcareCreateDoctorPending: that function is the ONE gated place a real
// TravelAgency account gets created, but it's browser-only, so the native
// M-Care agent needs its own gated tool instead of the raw TravelAgency
// entity create/update access it used to be granted directly — which had no
// field-level restriction and could set verification_status/iata_verified
// to anything, bypassing reviewTravelAgencyVerification's own admin gate.
//
// Same hardcoded invariant as submitTravelAgencySignup.js: status is ALWAYS
// 'pending_verification' here, never anything the caller/LLM passes.
Deno.serve(createHandler(async ({ base44, user, body }) => {
    const payload = await body();
    const {
      agency_name, email, phone, contact_person, headquarters_country,
      headquarters_city, website_url, medical_travel_experience_years,
      emergency_support_available, service_regions, services_offered,
    } = payload || {};

    if (!agency_name || !email || !headquarters_country || !headquarters_city) {
      return err('agency_name, email, headquarters_country, and headquarters_city are required');
    }

    const agencyData = {
      agency_name,
      email,
      phone: phone || undefined,
      contact_person: contact_person || undefined,
      headquarters_country,
      headquarters_city,
      website_url: website_url || undefined,
      medical_travel_experience_years: Number(medical_travel_experience_years) || 0,
      emergency_support_available: !!emergency_support_available,
      service_regions: service_regions || undefined,
      services_offered: services_offered || undefined,
      language_preference: 'en',
      is_agency: true,
      status: 'pending_verification',
      sign_up_completed_at: new Date().toISOString(),
    };
    Object.keys(agencyData).forEach((k) => agencyData[k] === undefined && delete agencyData[k]);

    const agency = await base44.entities.TravelAgency.create(agencyData);

    // Non-fatal onboarding-profile write + role grant — same "Partner
    // Onboarding Lockout" fix as mcareCreateDoctorPending. Must not be skipped.
    try {
      const now = new Date().toISOString();
      const profileData = {
        user_email: user.email,
        user_name: user.full_name || agency_name,
        role: 'travel_agency',
        status: 'completed',
        linked_entity_name: 'TravelAgency',
        linked_entity_id: agency.id,
        profile_data: { ...payload, ...agencyData },
        last_updated_at: now,
        completed_at: now,
      };
      const existing = await base44.entities.UserOnboardingProfile.filter({ user_email: user.email, role: 'travel_agency' });
      const profile = existing.length > 0
        ? await base44.entities.UserOnboardingProfile.update(existing[0].id, profileData)
        : await base44.entities.UserOnboardingProfile.create(profileData);

      await base44.functions.invoke('syncTenantRole', {
        tenant_id: profile.id,
        tenant_type: 'travel_agency',
        tenant_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'travel_agency',
        linked_entity_name: 'TravelAgency',
        linked_entity_id: agency.id,
        onboarding_status: 'completed',
      });
    } catch (e) { /* non-fatal — TravelAgency entity is already created */ }

    // Non-fatal verification kickoff, matches submitTravelAgencySignup.js.
    try {
      await base44.functions.invoke('initiatePartnerVerification', {
        partner_id: agency.id,
        partner_type: 'travel_agency',
        documents: [],
      });
    } catch (e) { /* non-fatal */ }

    return ok({ agency_id: agency.id, status: agency.status });
}, { name: 'mcareCreateTravelAgencyPending' }));