import { createHandler, ok, err } from '../../shared/createHandler.ts';

// mcareCreateTaxiServicePending — the M-Care agent's equivalent of
// TaxiServiceSignupStep3.jsx's inline submit logic. Same reasoning as
// mcareCreateDoctorPending/mcareCreateTravelAgencyPending: the agent used to
// be granted raw create/update access on TaxiService directly, with no
// field-level restriction, which could set verification_status/status to
// anything, bypassing reviewTaxiServiceVerification's own gate.
//
// Same hardcoded invariant as the classic form: status is ALWAYS
// 'pending_verification' here, never anything the caller/LLM passes.
// license_verified/insurance_verified are never accepted from the caller —
// only license_self_attested/insurance_self_attested (the applicant's own
// claim, not verification) may be set, exactly matching the classic form's
// checkbox behavior.
Deno.serve(createHandler(async ({ base44, user, body }) => {
    const payload = await body();
    const {
      agency_name, contact_person, email, phone,
      operating_country, operating_city, vehicle_types,
      service_radius_km, patient_assistance, vehicle_photo_url,
      driver_license_number, insurance_provider,
      license_self_attested, insurance_self_attested,
    } = payload || {};

    if (!agency_name || !contact_person || !email || !phone || !operating_country || !operating_city || !vehicle_types?.length) {
      return err('agency_name, contact_person, email, phone, operating_country, operating_city, and vehicle_types are required');
    }

    const taxiData = {
      agency_name,
      company_name: agency_name,
      contact_person,
      driver_name: contact_person,
      email,
      phone,
      operating_country,
      operating_city,
      vehicle_types,
      service_radius_km: Number(service_radius_km) || 0,
      patient_assistance: patient_assistance || undefined,
      vehicle_photo_url: vehicle_photo_url || undefined,
      driver_license_number: driver_license_number || undefined,
      insurance_provider: insurance_provider || undefined,
      license_self_attested: !!license_self_attested,
      insurance_self_attested: !!insurance_self_attested,
      is_agency: true,
      language_preference: 'en',
      status: 'pending_verification',
      sign_up_completed_at: new Date().toISOString(),
    };
    Object.keys(taxiData).forEach((k) => taxiData[k] === undefined && delete taxiData[k]);

    const taxi = await base44.entities.TaxiService.create(taxiData);

    // Non-fatal onboarding-profile write + role grant — same "Partner
    // Onboarding Lockout" fix as mcareCreateDoctorPending. Must not be skipped.
    try {
      const now = new Date().toISOString();
      const profileData = {
        user_email: user.email,
        user_name: user.full_name || agency_name,
        role: 'taxi_service',
        status: 'completed',
        linked_entity_name: 'TaxiService',
        linked_entity_id: taxi.id,
        profile_data: { ...payload, ...taxiData },
        last_updated_at: now,
        completed_at: now,
      };
      const existing = await base44.entities.UserOnboardingProfile.filter({ user_email: user.email, role: 'taxi_service' });
      const profile = existing.length > 0
        ? await base44.entities.UserOnboardingProfile.update(existing[0].id, profileData)
        : await base44.entities.UserOnboardingProfile.create(profileData);

      await base44.functions.invoke('syncTenantRole', {
        tenant_id: profile.id,
        tenant_type: 'taxi_service',
        tenant_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'taxi_service',
        linked_entity_name: 'TaxiService',
        linked_entity_id: taxi.id,
        onboarding_status: 'completed',
      });
    } catch (e) { /* non-fatal — TaxiService entity is already created */ }

    // Non-fatal verification kickoff, matches the classic form.
    try {
      await base44.functions.invoke('initiatePartnerVerification', {
        partner_id: taxi.id,
        partner_type: 'taxi_service',
        documents: vehicle_photo_url ? [vehicle_photo_url] : [],
      });
    } catch (e) { /* non-fatal */ }

    return ok({ taxi_service_id: taxi.id, status: taxi.status });
}, { name: 'mcareCreateTaxiServicePending' }));
