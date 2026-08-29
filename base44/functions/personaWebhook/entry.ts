// personaWebhook — receives Persona's inquiry completion events, verifies
// the HMAC-SHA256 signature, then records sanitized VerificationEvidence,
// any FraudSignal (presentation-attack detection — ONE signal, never the
// sole basis), and updates the IdentityVerification to one of the four
// user-facing statuses (verified / needs_review / unable_to_verify /
// expired_document). Never auto-denies or accuses.
//
// Public endpoint (no user auth) — uses asServiceRole after signature
// validation. The webhook URL to register in Persona is:
//   https://sentinel-dental-care.base44.app/functions/personaWebhook

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyWebhookSignature, parseInquiryResult, mapToUserFacingStatus } from '../../shared/personaAdapter.ts';
import { logTrustScanEvent } from '../../shared/trustScanAudit.ts';
import { documentsStatus } from '../../shared/trustScanLevels.ts';

async function handler(req: Request): Promise<Response> {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('Persona-Signature') || req.headers.get('persona-signature');

    const valid = await verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    // Persona webhook payload: { data: { attributes: { name, status, ... } }, meta: { inquiry-id, ... } }
    const inquiryId = event?.meta?.['inquiry-id'] || event?.data?.attributes?.['inquiry-id'] || event?.data?.id;
    const eventName = event?.data?.attributes?.name || event?.data?.attributes?.status || 'unknown';

    if (!inquiryId) {
      return Response.json({ received: true, note: 'No inquiry id in payload' });
    }

    const base44 = createClientFromRequest(req);

    // Find the IdentityVerification backed by this inquiry.
    const matches = await base44.asServiceRole.entities.IdentityVerification.filter({
      persona_inquiry_id: inquiryId,
    }, '-created_date', 5);

    if (!matches || matches.length === 0) {
      // No matching verification — could be a stale/replayed webhook. Ack
      // 200 so Persona doesn't retry indefinitely, but log it.
      console.warn('[personaWebhook] no IdentityVerification for inquiry', inquiryId);
      return Response.json({ received: true, matched: false });
    }

    const verification = matches[0];
    const result = parseInquiryResult(event?.data);
    const userFacingStatus = mapToUserFacingStatus(result);
    const now = new Date();

    // 1. Record a VerificationEvidence row per meaningful sub-check. No raw
    //    PII — only pass/fail, source, confidence, and sanitized metadata.
    const evidenceRows = buildEvidenceRows(verification.id, 'identity', verification.subject_email, result);
    const evidenceIds: string[] = [];
    for (const ev of evidenceRows) {
      try {
        const created = await base44.asServiceRole.entities.VerificationEvidence.create({ ...ev, created_at: now.toISOString() });
        if (created?.id) evidenceIds.push(created.id);
      } catch (err) {
        console.warn('[personaWebhook] evidence write failed', err?.message || err);
      }
    }

    // 2. If a presentation-attack signal was detected, record it as ONE
    //    FraudSignal — is_sole_basis is always false. It routes the case
    //    to human review, never auto-rejects.
    if (result.presentationAttack.detected) {
      try {
        await base44.asServiceRole.entities.FraudSignal.create({
          verification_id: verification.id,
          verification_kind: 'identity',
          subject_email: verification.subject_email,
          signal_type: result.presentationAttack.confidence != null && result.presentationAttack.confidence > 0.7 ? 'deepfake_detected' : 'presentation_attack',
          severity: result.presentationAttack.confidence != null && result.presentationAttack.confidence > 0.7 ? 'high' : 'medium',
          confidence_score: result.presentationAttack.confidence ?? 50,
          detected_by: 'vendor',
          source_name: 'Persona',
          description: result.presentationAttack.note || 'Presentation-attack signal from identity provider. One signal among many — never the sole basis for a decision.',
          is_sole_basis: false,
          created_at: now.toISOString(),
        });
        await logTrustScanEvent(base44.asServiceRole, {
          event_type: 'trustscan_fraud_signal_recorded',
          actor_id: 'persona-webhook',
          resource_type: 'IdentityVerification',
          resource_id: verification.id,
          details: { signal_type: 'presentation_attack', confidence: result.presentationAttack.confidence, is_sole_basis: false },
          sensitive: true,
        });
      } catch (err) {
        console.warn('[personaWebhook] fraud signal write failed', err?.message || err);
      }
    }

    // 3. Update the IdentityVerification to the user-facing status. If the
    //    status is anything other than 'verified', auto-create a
    //    VerificationReview task so a human decides — never auto-deny.
    const docStatus = result.documentChecks.expiry_date ? documentsStatus(result.documentChecks.expiry_date, now) : 'none';

    const updated = await base44.asServiceRole.entities.IdentityVerification.update(verification.id, {
      status: userFacingStatus,
      persona_inquiry_status: result.status,
      document_checks: result.documentChecks,
      selfie_liveness: result.selfieLiveness,
      presentation_attack_signal: result.presentationAttack,
      confidence_score: result.confidenceScore,
      result_summary: buildResultSummary(userFacingStatus, result),
      evidence_ids: [...(verification.evidence_ids || []), ...evidenceIds],
      reviewed_at: userFacingStatus === 'verified' ? now.toISOString() : null,
      verified_at: userFacingStatus === 'verified' ? now.toISOString() : null,
      updated_at: now.toISOString(),
    });

    // Auto-route non-verified outcomes to human review. M-Care never
    // auto-denies or accuses — it creates a review task with the sanitized
    // evidence summary and explains the next safe action.
    if (userFacingStatus !== 'verified' && userFacingStatus !== 'expired_document') {
      try {
        await base44.asServiceRole.entities.VerificationReview.create({
          verification_id: verification.id,
          verification_kind: 'identity',
          subject_email: verification.subject_email,
          subject_name: verification.subject_name,
          review_type: userFacingStatus === 'unable_to_verify' ? 'manual_review' : 'manual_review',
          reason: `Automated routing: identity verification returned '${userFacingStatus}' (Persona status: ${result.status}).`,
          status: 'open',
          priority: userFacingStatus === 'unable_to_verify' ? 'high' : 'medium',
          evidence_summary: {
            user_facing_status: userFacingStatus,
            confidence: result.confidenceScore,
            document_liveness: result.documentChecks.document_liveness,
            face_match_score: result.selfieLiveness.face_match_score,
            face_match_passed: result.selfieLiveness.face_match_passed,
            presentation_attack: result.presentationAttack.detected,
            inquiry_id: inquiryId,
          },
          sla_due_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });
      } catch (err) {
        console.warn('[personaWebhook] review task create failed', err?.message || err);
      }
    }

    // 4. If verified, upsert the TrustProfile for the subject.
    if (userFacingStatus === 'verified') {
      try {
        await upsertTrustProfileOnVerified(base44, verification, now);
      } catch (err) {
        console.warn('[personaWebhook] trust profile upsert failed', err?.message || err);
      }
    }

    await logTrustScanEvent(base44.asServiceRole, {
      event_type: 'trustscan_inquiry_completed',
      actor_id: 'persona-webhook',
      resource_type: 'IdentityVerification',
      resource_id: verification.id,
      details: { status: userFacingStatus, confidence: result.confidenceScore, inquiry_id: inquiryId, event_name: eventName, documents_status: docStatus },
      sensitive: true,
    });

    return Response.json({ received: true, status: userFacingStatus, verificationId: verification.id });
  } catch (error: any) {
    console.error('[personaWebhook] fatal', error?.message || error);
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

function buildEvidenceRows(verificationId: string, kind: 'identity' | 'partner', subjectEmail: string, result: any): any[] {
  const rows: any[] = [];
  const sourceName = 'Persona';
  rows.push({
    verification_id: verificationId, verification_kind: kind, subject_email: subjectEmail,
    evidence_type: 'document_capture', check_name: 'Document capture (front/back)',
    result: (result.documentChecks.front_captured && result.documentChecks.back_captured) ? 'passed' : 'inconclusive',
    source_name: sourceName, source_type: 'vendor', confidence_score: null, checked_at: new Date().toISOString(),
    vendor_reference: result.inquiryId, raw_pii_stored: false, metadata: { front: result.documentChecks.front_captured, back: result.documentChecks.back_captured },
  });
  rows.push({
    verification_id: verificationId, verification_kind: kind, subject_email: subjectEmail,
    evidence_type: 'mrz_ocr', check_name: 'MRZ / OCR extraction',
    result: result.documentChecks.mrz_extracted ? 'passed' : 'inconclusive',
    source_name: sourceName, source_type: 'vendor', confidence_score: null, checked_at: new Date().toISOString(),
    vendor_reference: result.inquiryId, raw_pii_stored: false, metadata: {},
  });
  rows.push({
    verification_id: verificationId, verification_kind: kind, subject_email: subjectEmail,
    evidence_type: 'expiry_check', check_name: 'Document expiry',
    result: result.documentChecks.expiry_valid ? 'passed' : 'failed',
    source_name: sourceName, source_type: 'vendor', confidence_score: null, checked_at: new Date().toISOString(),
    vendor_reference: result.inquiryId, raw_pii_stored: false, metadata: { expiry_date: result.documentChecks.expiry_date },
  });
  rows.push({
    verification_id: verificationId, verification_kind: kind, subject_email: subjectEmail,
    evidence_type: 'tamper_detection', check_name: 'Document tamper detection',
    result: result.documentChecks.tamper_detected ? 'failed' : 'passed',
    source_name: sourceName, source_type: 'vendor', confidence_score: null, checked_at: new Date().toISOString(),
    vendor_reference: result.inquiryId, raw_pii_stored: false, metadata: {},
  });
  rows.push({
    verification_id: verificationId, verification_kind: kind, subject_email: subjectEmail,
    evidence_type: 'document_liveness', check_name: 'Document liveness',
    result: result.documentChecks.document_liveness === 'passed' ? 'passed' : (result.documentChecks.document_liveness === 'failed' ? 'failed' : 'inconclusive'),
    source_name: sourceName, source_type: 'vendor', confidence_score: null, checked_at: new Date().toISOString(),
    vendor_reference: result.inquiryId, raw_pii_stored: false, metadata: {},
  });
  if (result.documentChecks.nfc_chip_read !== 'not_checked') {
    rows.push({
      verification_id: verificationId, verification_kind: kind, subject_email: subjectEmail,
      evidence_type: 'nfc_chip', check_name: 'NFC chip read',
      result: result.documentChecks.nfc_chip_read === 'supported_passed' ? 'passed' : 'inconclusive',
      source_name: sourceName, source_type: 'vendor', confidence_score: null, checked_at: new Date().toISOString(),
      vendor_reference: result.inquiryId, raw_pii_stored: false, metadata: { nfc: result.documentChecks.nfc_chip_read },
    });
  }
  rows.push({
    verification_id: verificationId, verification_kind: kind, subject_email: subjectEmail,
    evidence_type: 'selfie_liveness', check_name: 'Active selfie liveness challenge',
    result: result.selfieLiveness.challenge_completed ? 'passed' : 'inconclusive',
    source_name: sourceName, source_type: 'vendor', confidence_score: null, checked_at: new Date().toISOString(),
    vendor_reference: result.inquiryId, raw_pii_stored: false, metadata: { challenges: result.selfieLiveness.challenges },
  });
  rows.push({
    verification_id: verificationId, verification_kind: kind, subject_email: subjectEmail,
    evidence_type: 'face_match', check_name: 'Face match to document portrait',
    result: result.selfieLiveness.face_match_passed ? 'passed' : 'inconclusive',
    source_name: sourceName, source_type: 'vendor', confidence_score: result.selfieLiveness.face_match_score ?? null, checked_at: new Date().toISOString(),
    vendor_reference: result.inquiryId, raw_pii_stored: false, metadata: { score: result.selfieLiveness.face_match_score },
  });
  if (result.presentationAttack.detected) {
    rows.push({
      verification_id: verificationId, verification_kind: kind, subject_email: subjectEmail,
      evidence_type: 'presentation_attack', check_name: 'Presentation-attack / deepfake signal',
      result: 'inconclusive',
      source_name: sourceName, source_type: 'vendor', confidence_score: result.presentationAttack.confidence ?? null, checked_at: new Date().toISOString(),
      vendor_reference: result.inquiryId, raw_pii_stored: false, metadata: { note: result.presentationAttack.note, is_sole_basis: false },
    });
  }
  return rows;
}

function buildResultSummary(status: string, result: any): string {
  const parts: string[] = [];
  parts.push(`Identity verification ${status === 'verified' ? 'completed' : status === 'expired_document' ? 'blocked (expired document)' : status === 'unable_to_verify' ? 'could not be completed' : 'needs human review'}.`);
  parts.push(`Document liveness: ${result.documentChecks.document_liveness}.`);
  parts.push(`Face match: ${result.selfieLiveness.face_match_passed ? 'passed' : 'inconclusive'}${result.selfieLiveness.face_match_score != null ? ` (${result.selfieLiveness.face_match_score})` : ''}.`);
  parts.push(`Liveness challenge: ${result.selfieLiveness.challenge_completed ? 'completed' : 'incomplete'}.`);
  if (result.presentationAttack.detected) {
    parts.push('A presentation-attack signal was recorded as one input among many — a human reviewer will assess it. This is never the sole basis for a decision.');
  }
  parts.push('Checked by Persona. Raw document images remain with the provider; M-Care stores only the result.');
  return parts.join(' ');
}

async function upsertTrustProfileOnVerified(base44: any, verification: any, now: Date): Promise<void> {
  const existing = await base44.asServiceRole.entities.TrustProfile.filter({
    subject_email: verification.subject_email,
  }, '-created_date', 1);
  const profile = existing && existing.length > 0 ? existing[0] : null;
  const docStatus = verification.document_checks?.expiry_date ? documentsStatus(verification.document_checks.expiry_date, now) : 'none';
  const payload: any = {
    subject_type: verification.subject_type,
    subject_email: verification.subject_email,
    subject_user_id: verification.subject_user_id,
    subject_partner_type: verification.subject_partner_type,
    subject_partner_id: verification.subject_partner_id,
    subject_name: verification.subject_name,
    verification_level: 'identity_verified',
    identity_verified: true,
    identity_verified_at: now.toISOString(),
    documents_status: docStatus,
    sandbox: verification.sandbox ?? true,
    last_updated_at: now.toISOString(),
  };
  if (profile) {
    await base44.asServiceRole.entities.TrustProfile.update(profile.id, payload);
  } else {
    await base44.asServiceRole.entities.TrustProfile.create({
      ...payload,
      verification_level: 'identity_verified',
      limitations: ['Identity verified against a single government document and an active selfie liveness challenge.', 'Verified from trusted sources, with human review when anything is uncertain. Not a guarantee against all fraud.'],
    });
  }
}

Deno.serve(handler);