// lib/companion/companionService.js
import { base44 } from '@/api/base44Client';
import { ACCOUNT_TYPES } from './constants';
import { saveUserOnboardingProfile } from '@/lib/onboardingProfile';

/**
 * Creates a companion profile in the database
 * @param {Object} formData - Form data from signup
 * @param {string} accountType - 'individual' or 'agency'
 * @returns {Promise<Object>} Created companion record
 */
export async function createCompanionProfile(formData, accountType) {
  const companionData = {
    agency_name: formData.agency_name || formData.full_name || 'Individual Companion',
    full_name: accountType === ACCOUNT_TYPES.INDIVIDUAL ? formData.full_name : formData.agency_name,
    contact_person: accountType === ACCOUNT_TYPES.INDIVIDUAL ? formData.full_name : formData.contact_person,
    email: formData.email,
    phone: formData.phone,
    country: formData.country,
    city: formData.city,
    languages: formData.languages,
    primary_language: formData.languages[0] || 'en',
    years_experience: parseExperience(formData.years_experience),
    bio: generateBio(formData, accountType),
    hourly_rate_usd: 0,
    daily_rate_usd: 0,
    service_regions: [formData.country],
    available_for_medical_procedures: formData.has_medical_training === 'yes',
    medical_training: formData.has_medical_training === 'yes' ? 'Basic caregiving training' : '',
    payout_method: 'stripe',
    payout_account: '',
    sign_up_completed_at: new Date().toISOString(),
    is_agency: accountType === ACCOUNT_TYPES.AGENCY,
  };

  const companion = await base44.entities.Companion.create(companionData);
  // Grants this account the 'companion' role COMPANION_PORTAL_ROLES requires
  // to open /companion-dashboard — this call was missing entirely (unlike
  // doctor/taxi/travel-agency, which at least attempted it), so no companion
  // signup, ever, could reach their own dashboard. Caller (useCompanionSignup)
  // gates submission on an authenticated session first, since this throws for
  // a guest.
  await saveUserOnboardingProfile({
    role: 'companion',
    status: 'completed',
    linkedEntityName: 'Companion',
    linkedEntityId: companion.id,
    profileData: { ...formData, ...companionData },
  });
  try {
    await base44.functions.invoke('initiatePartnerVerification', {
      partner_id: companion.id,
      partner_type: 'companion',
      documents: [],
    });
  } catch (_) { /* non-fatal */ }
  // Welcome email with dashboard link — non-blocking, a mail hiccup must
  // never fail the signup itself.
  base44.functions.invoke('sendPartnerWelcomeEmail', {
    partner_type: 'companion',
    partner_id: companion.id,
  }).catch(() => { /* non-fatal */ });
  return companion;
}

/**
 * Parse experience string to number
 * @param {string} experience - Experience level string
 * @returns {number} Years of experience
 */
function parseExperience(experience) {
  const match = experience.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Generate bio based on account type
 * @param {Object} formData - Form data
 * @param {string} accountType - Account type
 * @returns {string} Bio text
 */
function generateBio(formData, accountType) {
  if (accountType === ACCOUNT_TYPES.INDIVIDUAL) {
    return `Caregiver with ${formData.years_experience} experience. Available ${formData.availability}.`;
  }
  return `Professional companion agency serving ${formData.country}. Specializing in tour guide and companion services.`;
}