import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../_shared/internalAuth.ts';

async function encodePortalToken(payload: object): Promise<string> {
  const secret = (() => {
    // FAIL CLOSED. This used to fall back to 'change-me-in-production', a value
    // published in this repository — so anyone who could read the repo could
    // mint a portal token for any case and read a patient's record. Refusing to
    // sign is a support ticket; a forgeable token is a breach.
    const s = Deno.env.get('PORTAL_TOKEN_SECRET');
    if (!s || s === 'change-me-in-production') {
      throw new Error('PORTAL_TOKEN_SECRET is not set — refusing to sign or verify a portal token.');
    }
    return s;
  })();
  const data = JSON.stringify({ ...payload, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

/**
 * sendLocalDoctorReferral — creates a LocalDoctorReferral record, generates a
 * secure portal token, and sends the referral email to the M Local doctor.
 * Called by checkMissedRecoveryCheckins when matchLocalDoctor returns a match.
 */
Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, local_doctor_id, internal_secret } = await body();

  // SECURITY: this endpoint creates a referral record, emails a real doctor
  // with a patient's name/procedure, and hands back a portal token — for any
  // case_id/local_doctor_id with no proof the caller is the internal cron job
  // this is meant for. Only checkMissedRecoveryCheckins calls it.
  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

  if (!case_id || !local_doctor_id) return err('case_id and local_doctor_id are required');

  // Load case for patient context in the email
  const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: case_id }, '-created_date', 1);
  if (!cases.length) return err('Case not found');
  const caseRecord = cases[0];

  // Load the M Local doctor
  const doctors = await base44.asServiceRole.entities.Doctor.filter({ id: local_doctor_id }, '-created_date', 1);
  if (!doctors.length) return err('Local doctor not found');
  const doctor = doctors[0];

  // Generate HMAC portal token (7-day expiry)
  const token = await encodePortalToken({
    case_id,
    partner_id: local_doctor_id,
    portal_type: 'local_doctor',
  });
  const portalUrl = `${Deno.env.get('APP_URL') || 'https://app.moralesmedical.com'}/portal/local-doctor/${token}`;

  // Create the referral record
  const referral = await base44.asServiceRole.entities.LocalDoctorReferral.create({
    case_id,
    local_doctor_id,
    portal_token: token,
    status: 'pending',
    created_date: new Date().toISOString(),
    patient_country: caseRecord.patient_country || caseRecord.client_country || null,
  });

  // Send referral email to the M Local doctor
  await base44.asServiceRole.entities.EmailNotification.create({
    to: doctor.email,
    subject: `M Local Referral — Patient Needs Follow-Up Care`,
    template: 'local_doctor_referral',
    template_data: {
      doctor_name: doctor.full_name || doctor.name || 'Doctor',
      patient_first_name: caseRecord.client_name?.split(' ')[0] || 'your patient',
      procedure: caseRecord.procedure_name || caseRecord.procedure || 'their procedure',
      portal_url: portalUrl,
      expires_in: '7 days',
    },
    sent_at: new Date().toISOString(),
  });

  return ok({
    referral_id: referral.id,
    portal_url: portalUrl,
    doctor_email: doctor.email,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
}, { name: 'sendLocalDoctorReferral', requireAuth: false, allowedRoles: [] }));
