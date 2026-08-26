import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { mapDoctorTrustStatus } from '../../shared/providerTrustStatus.ts';
import { checkProviderBookingEligibility } from '../../shared/providerBookingEligibility.ts';

/**
 * getProviderTrustProfile — real Provider Trust Profile facts for a patient,
 * per the "show facts, not a vague badge" spec: legal business identity and
 * country, license number/authority/last verification date, facility
 * location/accreditation, languages, consultation price, cancellation
 * policy, M-Care partner status, complaint/escalation path, source links,
 * and a normalized Verified / Pending verification / Not available status.
 *
 * Public (matches Doctor's own established public-read philosophy —
 * Providers.jsx/Discover.jsx already query it unauthenticated). Never says
 * "scam-proof" or "guaranteed" — states exactly what was verified, when, and
 * what wasn't.
 */

const bodySchema = strictObject({ doctor_id: Fields.shortText(100) });

Deno.serve(createHandler(async ({ base44, body }) => {
  const { doctor_id } = await body<{ doctor_id: string }>();

  const doctor = await base44.asServiceRole.entities.Doctor.get(doctor_id).catch(() => null);
  if (!doctor) return err('Provider not found', 404);

  const [highReports, criticalReports] = await Promise.all([
    base44.asServiceRole.entities.ProviderConcernReport.filter({
      doctor_id, severity: 'high', status: 'actioned',
    }).catch(() => []),
    base44.asServiceRole.entities.ProviderConcernReport.filter({
      doctor_id, severity: 'critical', status: 'actioned',
    }).catch(() => []),
  ]);
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recentHigh = (highReports as any[]).filter((r) => new Date(r.created_at).getTime() >= ninetyDaysAgo).length;
  const recentCritical = (criticalReports as any[]).filter((r) => new Date(r.created_at).getTime() >= ninetyDaysAgo).length;

  const eligibility = checkProviderBookingEligibility(doctor, { high: recentHigh, critical: recentCritical });
  const trust_status = mapDoctorTrustStatus(doctor);

  return ok({
    doctor_id,
    trust_status, // 'verified' | 'pending_verification' | 'not_available'
    can_book: eligibility.eligible,
    booking_notes: eligibility.eligible ? [] : eligibility.reasons,
    identity: {
      full_name: doctor.full_name || null,
      legal_business_name: doctor.legal_business_name || null,
      legal_business_country: doctor.legal_business_country || doctor.clinic_country || null,
      specialty: doctor.specialty || null,
    },
    license: {
      number: doctor.license_number || null,
      authority: doctor.license_authority || null,
      issuance_country: doctor.country || null,
      last_verified_at: doctor.credential_verified_date || null,
      last_checked_at: doctor.license_last_checked_at || null,
      verification_method: doctor.verification_method || null,
    },
    facility: {
      clinic_name: doctor.clinic_name || null,
      clinic_city: doctor.clinic_city || null,
      clinic_country: doctor.clinic_country || null,
      accreditation: Array.isArray(doctor.accreditation) ? doctor.accreditation : [],
    },
    languages: doctor.language_preference ? [doctor.language_preference] : [],
    consultation: {
      price_amount: doctor.consultation_price_amount ?? null,
      price_currency: doctor.consultation_price_currency || 'USD',
      cancellation_policy: doctor.cancellation_policy || 'Not yet specified by this provider.',
    },
    escalation: {
      contact_name: doctor.escalation_contact_name || null,
      contact_email: doctor.escalation_contact_email || null,
      contact_phone: doctor.escalation_contact_phone || null,
    },
    source_links: Array.isArray(doctor.evidence_links) ? doctor.evidence_links : [],
    disclosure: 'This shows exactly what Morales has verified and when. It is not a guarantee of outcome or a claim this provider is risk-free.',
  });
}, { name: 'getProviderTrustProfile', requireAuth: false, bodySchema }));
