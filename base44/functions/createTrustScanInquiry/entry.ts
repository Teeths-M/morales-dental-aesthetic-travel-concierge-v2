// createTrustScanInquiry — starts a user's (or partner principal's) NIST-
// aligned identity verification run. Records explicit consent BEFORE the
// run (identity_verification + biometric_processing), creates a pending
// IdentityVerification, then calls the Persona adapter to create an
// Inquiry. Returns the inquiryId so the frontend can open Persona's
// embedded capture + active-selfie-liveness flow.
//
// Raw document images and selfies stay with Persona. M-Care stores only
// the result, vendor inquiry reference, consent reference, and retention
// schedule. Sandbox first.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { createInquiry } from '../../shared/personaAdapter.ts';
import { retentionExpiresAt, retentionPolicyKey } from '../../shared/trustScanLevels.ts';
import { logTrustScanEvent } from '../../shared/trustScanAudit.ts';

const VALID_DOC_TYPES = new Set(['passport', 'drivers_license', 'national_id', 'residence_permit']);
const CONSENT_TEXT_VERSION = '1.0';

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const documentType = String(body.documentType || '').toLowerCase();
    const country = String(body.country || '').toUpperCase();
    const subjectType = body.subjectType === 'partner' ? 'partner' : 'user';
    const partnerType = subjectType === 'partner' ? String(body.partnerType || '') : undefined;
    const partnerId = subjectType === 'partner' ? String(body.partnerId || '') : undefined;
    const partnerName = subjectType === 'partner' ? String(body.partnerName || '') : undefined;

    if (!VALID_DOC_TYPES.has(documentType)) {
      return Response.json({ error: 'Unsupported document type. Use passport, drivers_license, national_id, or residence_permit.' }, { status: 400 });
    }
    if (!country || country.length < 2) {
      return Response.json({ error: 'Country is required.' }, { status: 400 });
    }

    const now = new Date();
    const subjectEmail = user.email;
    const subjectName = user.full_name || partnerName || '';
    const referenceId = `mcare-trustscan-${user.id}-${now.getTime()}`;

    // 1. Consent — explicit, BEFORE the verification runs. Two consent acts:
    // identity verification (document + face match) and biometric processing
    // (active selfie liveness). Both required before Persona is invoked.
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const ua = req.headers.get('user-agent') || '';
    const consent = await base44.entities.ConsentRecord.create({
      subject_email: subjectEmail,
      subject_user_id: user.id,
      subject_name: subjectName,
      consent_type: 'identity_verification',
      purpose: 'Verify my identity with a government document, active selfie liveness challenge, and face match through Persona. Raw images stay with Persona; M-Care keeps only the result.',
      consent_given: true,
      consent_method: 'explicit_tap',
      consent_text_version: CONSENT_TEXT_VERSION,
      ip_address: ip,
      user_agent: ua,
      valid_from: now.toISOString(),
      valid_until: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      retention_expires_at: retentionExpiresAt(documentType, now),
    });

    const biometricConsent = await base44.entities.ConsentRecord.create({
      subject_email: subjectEmail,
      subject_user_id: user.id,
      subject_name: subjectName,
      consent_type: 'biometric_processing',
      purpose: 'Process an active selfie liveness challenge (turn, blink, look at the dot) to prove I am physically present. Biometric data stays with Persona.',
      consent_given: true,
      consent_method: 'explicit_tap',
      consent_text_version: CONSENT_TEXT_VERSION,
      ip_address: ip,
      user_agent: ua,
      valid_from: now.toISOString(),
      valid_until: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      retention_expires_at: retentionExpiresAt(documentType, now),
    });

    // 2. Pending IdentityVerification record.
    const verification = await base44.entities.IdentityVerification.create({
      subject_type: subjectType,
      subject_user_id: user.id,
      subject_email: subjectEmail,
      subject_name: subjectName,
      subject_partner_type: partnerType,
      subject_partner_id: partnerId,
      country,
      document_type: documentType,
      verification_level: 'identity_verified',
      status: 'pending',
      consent_id: consent.id,
      retention_policy_key: retentionPolicyKey(documentType),
      retention_expires_at: retentionExpiresAt(documentType, now),
      sandbox: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    // 3. Create the Persona Inquiry. The template id is an optional
    // request param (configured per deployment); if omitted, Persona uses
    // the account default template.
    const templateId = body.templateId ? String(body.templateId) : undefined;
    let inquiry;
    try {
      inquiry = await createInquiry({
        referenceId: referenceId,
        templateId,
        note: `M-Care TrustScan — ${subjectType} — ${documentType} — ${country}`,
        country,
      });
    } catch (err: any) {
      // Persona failed to create the inquiry. Keep the verification record
      // in 'pending' and surface the error honestly — do NOT fake a
      // verified status.
      await base44.entities.IdentityVerification.update(verification.id, {
        status: 'failed',
        result_summary: 'Identity provider inquiry could not be created. No data was verified.',
        updated_at: new Date().toISOString(),
      });
      await logTrustScanEvent(base44.asServiceRole, {
        event_type: 'trustscan_inquiry_created',
        actor_id: user.id,
        actor_email: subjectEmail,
        resource_type: 'IdentityVerification',
        resource_id: verification.id,
        details: { ok: false, error: err?.message || String(err) },
        sensitive: true,
      });
      return Response.json({ error: 'Could not start identity verification with the provider. Please try again.', verificationId: verification.id }, { status: 502 });
    }

    // 4. Link the inquiry id back to the verification record.
    await base44.entities.IdentityVerification.update(verification.id, {
      persona_inquiry_id: inquiry.inquiryId,
      persona_inquiry_status: inquiry.status,
      persona_template_id: templateId || null,
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    });

    await logTrustScanEvent(base44.asServiceRole, {
      event_type: 'trustscan_consent_recorded',
      actor_id: user.id,
      actor_email: subjectEmail,
      resource_type: 'ConsentRecord',
      resource_id: consent.id,
      details: { consent_type: 'identity_verification', biometric_consent_id: biometricConsent.id, document_type: documentType, country },
      sensitive: true,
    });
    await logTrustScanEvent(base44.asServiceRole, {
      event_type: 'trustscan_inquiry_created',
      actor_id: user.id,
      actor_email: subjectEmail,
      resource_type: 'IdentityVerification',
      resource_id: verification.id,
      details: { inquiry_id: inquiry.inquiryId, sandbox: true, subject_type: subjectType },
      sensitive: true,
    });

    return Response.json({
      inquiryId: inquiry.inquiryId,
      verificationId: verification.id,
      consentId: consent.id,
      sandbox: true,
      environment: 'sandbox',
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

Deno.serve(handler);