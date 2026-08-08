import { createHandler, ok, err } from '../../shared/createHandler.ts';

// mcareCreateCompanionPending — the M-Care agent's equivalent of
// src/lib/companion/companionService.js's createCompanionProfile. Same
// reasoning as mcareCreateDoctorPending/mcareCreateTravelAgencyPending: the
// agent used to be granted raw create/update access on Companion directly,
// with no field-level restriction, which could set verification_status/
// status to anything.
//
// Same hardcoded invariant as the classic form: status is ALWAYS
// 'pending_verification' here, never anything the caller/LLM passes.
// full_name is used for an individual companion, agency_name for an agency —
// mirrored exactly from companionService.js's own field mapping.
Deno.serve(createHandler(async ({ base44, user, body }) => {
    const payload = await body();
    const {
      is_agency, full_name, agency_name, contact_person, email, phone,
      country, city, languages, certifications, specializations,
      years_experience, available_for_medical_procedures, medical_training,
      service_regions,
    } = payload || {};

    const resolvedAgencyName = agency_name || full_name || 'Individual Companion';
    const resolvedContactPerson = is_agency ? (contact_person || agency_name) : (full_name || contact_person);

    if (!resolvedAgencyName || !resolvedContactPerson || !email || !phone || !country || !languages?.length) {
      return err('agency_name (or full_name), contact_person, email, phone, country, and languages are required');
    }

    const companionData = {
      agency_name: resolvedAgencyName,
      full_name: is_agency ? undefined : full_name,
      contact_person: resolvedContactPerson,
      email,
      phone,
      country,
      city: city || undefined,
      languages,
      primary_language: languages[0] || 'en',
      certifications: certifications || undefined,
      specializations: specializations || undefined,
      years_experience: Number(years_experience) || 0,
      available_for_medical_procedures: !!available_for_medical_procedures,
      medical_training: medical_training || undefined,
      service_regions: service_regions || [country],
      payout_method: 'stripe',
      is_agency: !!is_agency,
      status: 'pending_verification',
      sign_up_completed_at: new Date().toISOString(),
    };
    Object.keys(companionData).forEach((k) => companionData[k] === undefined && delete companionData[k]);

    const companion = await base44.entities.Companion.create(companionData);

    // Non-fatal onboarding-profile write + role grant — same "Partner
    // Onboarding Lockout" fix as mcareCreateDoctorPending. Must not be skipped.
    try {
      const now = new Date().toISOString();
      const profileData = {
        user_email: user.email,
        user_name: user.full_name || resolvedAgencyName,
        role: 'companion',
        status: 'completed',
        linked_entity_name: 'Companion',
        linked_entity_id: companion.id,
        profile_data: { ...payload, ...companionData },
        last_updated_at: now,
        completed_at: now,
      };
      const existing = await base44.entities.UserOnboardingProfile.filter({ user_email: user.email, role: 'companion' });
      const profile = existing.length > 0
        ? await base44.entities.UserOnboardingProfile.update(existing[0].id, profileData)
        : await base44.entities.UserOnboardingProfile.create(profileData);

      await base44.functions.invoke('syncTenantRole', {
        tenant_id: profile.id,
        tenant_type: 'companion',
        tenant_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'companion',
        linked_entity_name: 'Companion',
        linked_entity_id: companion.id,
        onboarding_status: 'completed',
      });
    } catch (e) { /* non-fatal — Companion entity is already created */ }

    // Non-fatal verification kickoff, matches the classic form.
    try {
      await base44.functions.invoke('initiatePartnerVerification', {
        partner_id: companion.id,
        partner_type: 'companion',
        documents: [],
      });
    } catch (e) { /* non-fatal */ }

    return ok({ companion_id: companion.id, status: companion.status });
}, { name: 'mcareCreateCompanionPending' }));
