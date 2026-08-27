// personaAdapter.ts — wraps Persona's Inquiry API for document capture,
// document-liveness, active selfie liveness, and face-match. Per the PRD:
// "Use a specialized identity-verification/KYC provider through a backend
// adapter; do not build document forensics from scratch." Raw identity
// documents stay with Persona; M-Care stores only the result, vendor
// reference, and sanitized evidence metadata.
//
// Persona API reference (Inquiry API):
//   Create:  POST https://withpersona.com/api/v1/inquiries
//   Retrieve: GET https://withpersona.com/api/v1/inquiries/{id}
//   Webhook: signed with HMAC-SHA256 in the `Persona-Signature` header
//
// Sandbox first: do not claim Persona's exact features are live until the
// production API key and webhook results confirm them.

import { secrets } from 'base44:runtime';

const PERSONA_BASE = 'https://withpersona.com/api/v1';
const PERSONA_VERSION = '2023-01-05';

export interface InquiryResult {
  inquiryId: string;
  status: string;
  resultCode: string | null;
  documentChecks: {
    mrz_extracted: boolean;
    expiry_valid: boolean;
    expiry_date: string | null;
    tamper_detected: boolean;
    document_liveness: 'passed' | 'failed' | 'not_checked' | 'inconclusive';
    nfc_chip_read: 'supported_passed' | 'supported_failed' | 'not_supported' | 'not_checked';
    front_captured: boolean;
    back_captured: boolean;
  };
  selfieLiveness: {
    challenge_completed: boolean;
    challenges: string[];
    face_match_score: number | null;
    face_match_passed: boolean;
  };
  presentationAttack: {
    detected: boolean;
    confidence: number | null;
    note: string;
  };
  confidenceScore: number;
  raw: any;
}

function authHeaders(): Record<string, string> {
  const key = secrets.get('PERSONA_API_KEY');
  if (!key) throw new Error('PERSONA_API_KEY secret is not set. Add it in dashboard settings.');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Persona-Version': PERSONA_VERSION,
  };
}

// Create a Persona Inquiry. The frontend opens Persona's embedded flow
// with the returned inquiryId; the user completes document capture +
// active selfie liveness inside Persona; the result arrives via webhook.
export async function createInquiry(opts: {
  referenceId: string;
  templateId?: string;
  note?: string;
  country?: string;
}): Promise<{ inquiryId: string; status: string }> {
  const attributes: Record<string, any> = {
    'reference-id': opts.referenceId,
  };
  if (opts.templateId) attributes['inquiry-template-id'] = opts.templateId;
  if (opts.note) attributes['note'] = opts.note;
  const res = await fetch(`${PERSONA_BASE}/inquiries`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ data: { attributes } }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Persona createInquiry failed ${res.status}: ${txt}`);
  }
  const body = await res.json();
  const inquiry = body?.data;
  if (!inquiry?.id) throw new Error('Persona createInquiry returned no inquiry id');
  return { inquiryId: inquiry.id, status: inquiry.attributes?.status || 'pending' };
}

// Retrieve an inquiry's current state (used by getMyIdentityStatus polling
// when a webhook hasn't landed yet).
export async function retrieveInquiry(inquiryId: string): Promise<InquiryResult> {
  const res = await fetch(`${PERSONA_BASE}/inquiries/${inquiryId}`, { headers: authHeaders() });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Persona retrieveInquiry failed ${res.status}: ${txt}`);
  }
  const body = await res.json();
  return parseInquiryResult(body?.data);
}

// Verify a Persona webhook signature. Persona signs the raw request body
// with HMAC-SHA256 using the webhook secret and base64-encodes the digest
// in the `Persona-Signature` header. Returns false if the secret is unset
// or the signature does not match — the caller must 401 in that case.
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretName = 'PERSONA_WEBHOOK_SECRET'
): Promise<boolean> {
  const secret = secrets.get(secretName);
  if (!secret || !signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  // timing-safe-ish comparison
  if (expected.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  return diff === 0;
}

// Normalize a Persona inquiry into M-Care's sanitized shape. No raw PII is
// retained — only pass/fail booleans, the expiry date (needed for the
// 6-month sentinel rule), scores, and the vendor inquiry id.
export function parseInquiryResult(inquiry: any): InquiryResult {
  const attrs = inquiry?.attributes || {};
  const fields = attrs.fields || {};
  const status = attrs.status || 'unknown';
  const resultCode = attrs['reason-code'] || attrs.reason_code || null;

  const mrz = fields['government-id'] || fields.mrz || {};
  const docLiveness = attrs['document-liveness'] || {};
  const selfieMatch = attrs['selfie-match'] || attrs['face-match'] || {};
  const govId = fields['government-id'] || {};

  const challenges: string[] = (attrs['selfie-liveness-challenges'] as string[]) || [];
  const presentationAttack = attrs['presentation-attack'] || {};

  const confidence = computeConfidence({
    status,
    documentLiveness: docLiveness,
    selfieMatch,
    presentationAttack,
  });

  return {
    inquiryId: inquiry?.id || '',
    status,
    resultCode,
    documentChecks: {
      mrz_extracted: !!mrz.mrz || !!govId.mrz,
      expiry_valid: !!govId['expiry-date-valid'] || !!mrz['expiry-date-valid'],
      expiry_date: govId['expiry-date'] || mrz['expiry-date'] || null,
      tamper_detected: !!attrs['tamper-detected'] || !!govId['tamper-detected'],
      document_liveness: mapResult(docLiveness.status, 'not_checked'),
      nfc_chip_read: mapNfc(govId['nfc-chip-read'] || attrs['nfc-chip-read']),
      front_captured: !!govId['front-side-captured'] || !!attrs['front-captured'],
      back_captured: !!govId['back-side-captured'] || !!attrs['back-captured'],
    },
    selfieLiveness: {
      challenge_completed: !!attrs['selfie-liveness-completed'] || challenges.length > 0,
      challenges,
      face_match_score: typeof selfieMatch.score === 'number' ? selfieMatch.score : null,
      face_match_passed: selfieMatch.status === 'passed' || selfieMatch.passed === true,
    },
    presentationAttack: {
      detected: presentationAttack.detected === true || presentationAttack.status === 'flagged',
      confidence: typeof presentationAttack.confidence === 'number' ? presentationAttack.confidence : null,
      note: presentationAttack.note || '',
    },
    confidenceScore: confidence,
    raw: attrs,
  };
}

function mapResult(v: any, fallback: 'passed' | 'failed' | 'not_checked' | 'inconclusive'): 'passed' | 'failed' | 'not_checked' | 'inconclusive' {
  if (v === 'passed' || v === 'success' || v === true) return 'passed';
  if (v === 'failed' || v === 'failure') return 'failed';
  if (v === 'inconclusive' || v === 'review') return 'inconclusive';
  return fallback;
}

function mapNfc(v: any): 'supported_passed' | 'supported_failed' | 'not_supported' | 'not_checked' {
  if (v === 'supported_passed' || v === 'passed') return 'supported_passed';
  if (v === 'supported_failed' || v === 'failed') return 'supported_failed';
  if (v === 'not_supported' || v === 'unsupported') return 'not_supported';
  return 'not_checked';
}

// Compute an honest 0-100 confidence from the sub-checks. A failed document
// liveness or face-match drops it sharply; an inconclusive presentation-attack
// signal only nudges it (never the sole basis).
function computeConfidence(opts: any): number {
  let score = 50;
  const { status, documentLiveness, selfieMatch, presentationAttack } = opts;
  if (status === 'completed' || status === 'approved') score += 30;
  if (documentLiveness?.status === 'passed') score += 10;
  if (selfieMatch?.status === 'passed' || selfieMatch?.passed) score += 8;
  if (presentationAttack?.detected) score -= 25;
  if (presentationAttack?.confidence != null && presentationAttack.confidence > 0.7) score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Map a Persona inquiry result to M-Care's only four user-facing statuses.
// presentation_attack is NEVER the sole basis — if the only failing signal
// is an uncertain presentation-attack, the outcome is 'needs_review'
// (human), never 'unable_to_verify'.
export function mapToUserFacingStatus(result: InquiryResult): 'verified' | 'needs_review' | 'unable_to_verify' | 'expired_document' {
  const { status, documentChecks, selfieLiveness, presentationAttack, resultCode } = result;
  // Expired document is its own honest status.
  if (documentChecks.expiry_date && !documentChecks.expiry_valid) return 'expired_document';
  if (resultCode === 'document_expired') return 'expired_document';

  const completed = status === 'completed' || status === 'approved';
  const docOk = documentChecks.document_liveness !== 'failed' && !documentChecks.tamper_detected;
  const faceOk = selfieLiveness.face_match_passed;
  const livenessOk = selfieLiveness.challenge_completed;

  if (completed && docOk && faceOk && livenessOk && !presentationAttack.detected) return 'verified';

  // A tampered document or a failed face-match is a real fail — but still
  // human-reviewed, never auto-accusation. Route to 'unable_to_verify' only
  // when a concrete check failed (not an uncertain AI signal alone).
  const concreteFail = documentChecks.tamper_detected || documentChecks.document_liveness === 'failed' || (faceOk === false && selfieLiveness.face_match_score !== null && (selfieLiveness.face_match_score ?? 0) < 40);
  if (concreteFail) return 'unable_to_verify';

  // Everything else (including an uncertain presentation-attack signal
  // alone) goes to human review.
  return 'needs_review';
}