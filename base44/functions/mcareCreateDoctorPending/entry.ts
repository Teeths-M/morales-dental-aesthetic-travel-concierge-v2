import { createHandler, ok, err } from '../../shared/createHandler.ts';

// mcareCreateDoctorPending — the M-Care agent's equivalent of
// src/lib/partnerSignup/submitDoctorSignup.js. That function is the ONE
// gated place a real Doctor account gets created for the classic form and
// the (pre-native-agent) chat flow; it's browser-only and can't be called
// directly as an agent tool. This is its Deno counterpart, so the native
// M-Care agent (base44/agents/m_care.jsonc) has a real, gated creation path
// instead of the raw Doctor entity create/update access it used to be
// granted directly — a real vulnerability: with no field-level restriction
// in Base44's tool_configs, that raw grant let the agent set
// verification_status/status to anything at all, bypassing both the
// verification pipeline and runDoctorVerificationScan's own ownership gate.
//
// Same hardcoded invariant as submitDoctorSignup.js: status is ALWAYS
// 'pending_verification' here, never anything the caller/LLM passes.
// Activation only ever happens later, via the real verification pipeline.
Deno.serve(createHandler(async ({ base44, user, body }) => {
    const payload = await body();
    const {
      full_name, email, phone, clinic_country, clinic_city, clinic_name,
      specialty, years_experience, license_number, license_country,
      website_url, professional_background, bio,
    } = payload || {};

    if (!full_name || !email || !clinic_country || !clinic_city) {
      return err('full_name, email, clinic_country, and clinic_city are required');
    }

    const doctorData = {
      full_name,
      email,
      phone: phone || undefined,
      clinic_country,
      clinic_city,
      clinic_name: clinic_name || undefined,
      specialty: specialty || undefined,
      professional_background: professional_background || undefined,
      years_experience: Number(years_experience) || 0,
      bio: bio || undefined,
      license_number: license_number || undefined,
      license_country: license_country || undefined,
      website_url: website_url || undefined,
      language_preference: 'en',
      status: 'pending_verification',
      sign_up_completed_at: new Date().toISOString(),
    };
    Object.keys(doctorData).forEach((k) => doctorData[k] === undefined && delete doctorData[k]);

    const doctor = await base44.entities.Doctor.create(doctorData);

    // Non-fatal fraud cross-check, matches submitDoctorSignup.js.
    try {
      await base44.functions.invoke('runFraudIntelligence', {
        doctor_id: doctor.id,
        phone: phone || '',
        clinic_address: [clinic_name, clinic_city, clinic_country].filter(Boolean).join(', '),
      });
    } catch (e) { /* non-fatal — admin can re-run manually */ }

    // Non-fatal onboarding-profile write + role grant — this is the exact
    // step that fixed the 2026-07-24 "Partner Onboarding Lockout" bug
    // (a real Doctor record with no role granted permanently locks the
    // doctor out of their own dashboard). Must not be skipped.
    try {
      const now = new Date().toISOString();
      const profileData = {
        user_email: user.email,
        user_name: user.full_name || full_name,
        role: 'doctor',
        status: 'completed',
        linked_entity_name: 'Doctor',
        linked_entity_id: doctor.id,
        profile_data: { ...payload, ...doctorData },
        last_updated_at: now,
        completed_at: now,
      };
      const existing = await base44.entities.UserOnboardingProfile.filter({ user_email: user.email, role: 'doctor' });
      const profile = existing.length > 0
        ? await base44.entities.UserOnboardingProfile.update(existing[0].id, profileData)
        : await base44.entities.UserOnboardingProfile.create(profileData);

      await base44.functions.invoke('syncTenantRole', {
        tenant_id: profile.id,
        tenant_type: 'doctor',
        tenant_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'doctor',
        linked_entity_name: 'Doctor',
        linked_entity_id: doctor.id,
        onboarding_status: 'completed',
      });
    } catch (e) { /* non-fatal — Doctor entity is already created */ }

    return ok({ doctor_id: doctor.id, status: doctor.status });
}, { name: 'mcareCreateDoctorPending' }));
