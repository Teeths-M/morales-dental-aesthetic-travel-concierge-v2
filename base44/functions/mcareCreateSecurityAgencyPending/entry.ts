import { createHandler, ok, err } from '../../shared/createHandler.ts';

// mcareCreateSecurityAgencyPending — the M-Care agent's equivalent of
// SecurityAgencySignup.jsx's inline submit logic. Same reasoning as
// mcareCreateDoctorPending/mcareCreateTravelAgencyPending: the agent used to
// be granted raw create/update access on SecurityAgency directly, with no
// field-level restriction, which could set verification_status/status to
// anything.
//
// Same hardcoded invariant as the classic form: status is ALWAYS
// 'pending_verification' and verification_status is ALWAYS 'pending_review'
// here, never anything the caller/LLM passes.
Deno.serve(createHandler(async ({ base44, user, body }) => {
    const payload = await body();
    const {
      agency_name, contact_person, email, phone, country, city,
      license_number, years_in_operation, personnel_count, background_types,
      services_offered, operational_regions, has_armored_vehicles,
      response_time_minutes, license_doc_url, insurance_doc_url,
    } = payload || {};

    if (!agency_name || !contact_person || !email || !phone || !country) {
      return err('agency_name, contact_person, email, phone, and country are required');
    }

    const agencyData = {
      agency_name,
      contact_person,
      email,
      phone,
      country,
      city: city || undefined,
      license_number: license_number || undefined,
      years_in_operation: Number(years_in_operation) || 0,
      personnel_count: personnel_count || undefined,
      background_types: background_types || undefined,
      services_offered: services_offered || undefined,
      operational_regions: operational_regions || undefined,
      has_armored_vehicles: !!has_armored_vehicles,
      response_time_minutes: Number(response_time_minutes) || 0,
      license_doc_url: license_doc_url || undefined,
      insurance_doc_url: insurance_doc_url || undefined,
      status: 'pending_verification',
      verification_status: 'pending_review',
      submitted_at: new Date().toISOString(),
    };
    Object.keys(agencyData).forEach((k) => agencyData[k] === undefined && delete agencyData[k]);

    const agency = await base44.entities.SecurityAgency.create(agencyData);

    // Non-fatal onboarding-profile write + role grant — same "Partner
    // Onboarding Lockout" fix as mcareCreateDoctorPending. Must not be skipped.
    try {
      const now = new Date().toISOString();
      const profileData = {
        user_email: user.email,
        user_name: user.full_name || agency_name,
        role: 'security_agency',
        status: 'completed',
        linked_entity_name: 'SecurityAgency',
        linked_entity_id: agency.id,
        profile_data: { ...payload, ...agencyData },
        last_updated_at: now,
        completed_at: now,
      };
      const existing = await base44.entities.UserOnboardingProfile.filter({ user_email: user.email, role: 'security_agency' });
      const profile = existing.length > 0
        ? await base44.entities.UserOnboardingProfile.update(existing[0].id, profileData)
        : await base44.entities.UserOnboardingProfile.create(profileData);

      await base44.functions.invoke('syncTenantRole', {
        tenant_id: profile.id,
        tenant_type: 'security_agency',
        tenant_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'security_agency',
        linked_entity_name: 'SecurityAgency',
        linked_entity_id: agency.id,
        onboarding_status: 'completed',
      });
    } catch (e) { /* non-fatal — SecurityAgency entity is already created */ }

    // Non-fatal welcome email, matches the classic form.
    base44.functions.invoke('sendPartnerWelcomeEmail', {
      partner_type: 'security_agency',
      partner_id: agency.id,
    }).catch(() => { /* non-fatal */ });

    // Non-fatal verification kickoff, matches the classic form.
    try {
      await base44.functions.invoke('initiatePartnerVerification', {
        partner_id: agency.id,
        partner_type: 'security_agency',
        documents: [license_doc_url, insurance_doc_url].filter(Boolean),
      });
    } catch (e) { /* non-fatal */ }

    return ok({ security_agency_id: agency.id, status: agency.status });
}, { name: 'mcareCreateSecurityAgencyPending' }));
