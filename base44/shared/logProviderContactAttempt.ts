/**
 * logProviderContactAttempt — a small, NEVER-THROWING logging helper for the
 * real outbound-to-provider sends this platform already makes (assignTravelAgency,
 * assignChauffeurServices, assignDoctorToCase, initiatePartnerVerification's
 * applicant-outcome notice).
 *
 * It does NOT send anything itself — every caller already did the real send
 * before calling this. This only writes the ContactAttempt audit row, so
 * outreach that already happens is actually auditable (channel, recipient,
 * purpose, result, timestamp) instead of leaving no trace beyond a console.log.
 *
 * PHI SAFETY: `recipient`/`partner_name` must only ever be the PROVIDER's own
 * business contact info — never a patient's name, email, phone, or any
 * clinical detail. Callers pass provider-facing fields only.
 *
 * Logging must never block or fail the real send that calls it — the entire
 * body is wrapped in try/catch, and any failure is swallowed after a
 * console.error, matching logCrisisReroute.ts's exact discipline.
 */

export type ContactAttemptFields = {
  case_id?: string;
  partner_type: 'doctor' | 'travel_agency' | 'taxi_service' | 'companion' | 'security_agency' | 'other';
  partner_id?: string;
  partner_name?: string;
  channel: 'email' | 'sms' | 'whatsapp';
  purpose: 'quote_request' | 'case_assignment' | 'verification_notification' | 'mcare_outreach' | 'other';
  recipient?: string;
  initiated_by: string;
  result: 'sent' | 'failed' | 'skipped';
  error_detail?: string;
};

export async function logProviderContactAttempt(base44: any, fields: ContactAttemptFields): Promise<void> {
  try {
    await base44.asServiceRole.entities.ContactAttempt.create({
      case_id: fields.case_id || '',
      partner_type: fields.partner_type,
      partner_id: fields.partner_id || '',
      partner_name: fields.partner_name || '',
      channel: fields.channel,
      purpose: fields.purpose,
      recipient: fields.recipient || '',
      initiated_by: fields.initiated_by,
      result: fields.result,
      error_detail: fields.error_detail || '',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[logProviderContactAttempt] failed to log — not blocking the real send', error);
  }
}
