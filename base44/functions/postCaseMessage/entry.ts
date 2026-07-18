import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { scrubContact } from '../_shared/contactScrub.ts';

/**
 * postCaseMessage — the two-way clarification thread (doctor/partner ↔ patient).
 *
 * INVARIANTS:
 *   • ON-PLATFORM: at the QUOTE stage (request not yet 'selected'), direct contact
 *     channels are scrubbed from the body so the booking can't be pulled off M and
 *     identity isn't leaked before selection. Prices/clinical text are preserved.
 *   • A doctor's "info_request" pauses that quote's SLA (status → needs_more_info).
 *   • Outbound is LINK-ONLY: the recipient is nudged to open their portal; the message
 *     body itself lives in-portal.
 *   • A patient's answer that flags new medical info re-runs the deterministic Safe-T
 *     scan (fail-closed — a clarification can raise a flag, never clear one).
 *
 * Requires: entity CaseMessage (+ DoctorQuote / QuoteRequest for context).
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
const BRAND = 'Morales Medical Travel Safety';
const MSG_TYPES = new Set(['info_request', 'message', 'answer']);

function nudgeEmail(portalUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%"><tr><td align="center">
<table style="max-width:520px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:18px;">
<tr><td style="padding:26px 30px;">
  <div style="font-size:22px;font-weight:900;color:#D4AF37;margin-bottom:12px;">M</div>
  <p style="font-size:15px;color:#fff;margin:0 0 10px;font-weight:700;">You have a new message.</p>
  <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 20px;line-height:1.6;">Open your Morales portal to read it and reply. For privacy, messages stay in-portal.</p>
  <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:12px 28px;border-radius:99px;text-decoration:none;">Open My Portal →</a>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, quote_id, to_party, message_type, body: text, contains_medical_update } = await body<{
    case_id?: string; quote_id?: string; to_party?: string; message_type?: string;
    body?: string; contains_medical_update?: boolean;
  }>();

  if (!message_type || !MSG_TYPES.has(message_type)) return err('message_type must be info_request | message | answer');
  if (!text || !String(text).trim()) return err('message body is required');
  if (!case_id && !quote_id) return err('case_id or quote_id is required');

  // Resolve context.
  const quote = quote_id ? await base44.asServiceRole.entities.DoctorQuote.get(quote_id).catch(() => null) : null;
  const caseId = case_id || quote?.case_id;
  if (!caseId) return err('Could not resolve the case for this message', 404);
  const request = quote?.request_id
    ? await base44.asServiceRole.entities.QuoteRequest.get(quote.request_id).catch(() => null)
    : null;

  // From/to. Doctors and partners have their own roles; everyone else is the patient.
  const role = user?.role || 'client';
  const fromParty = ['doctor', 'local_doctor'].includes(role) ? 'doctor'
    : ['travel_agency', 'taxi_service', 'companion', 'security_agency'].includes(role) ? role
    : (role === 'admin' || role === 'platform_admin') ? 'admin' : 'patient';

  // ON-PLATFORM: scrub contact channels while the request is still at the quote stage
  // (i.e., before the patient has chosen a doctor). Once selected, the chosen parties
  // may exchange details freely.
  const preSelection = !request || request.status !== 'selected';
  const scrub = preSelection ? scrubContact(text) : { clean: String(text), redactedCount: 0 };
  const now = new Date().toISOString();

  const message = await base44.asServiceRole.entities.CaseMessage.create({
    case_id: caseId,
    quote_id: quote_id || '',
    from_party: fromParty,
    from_id: user?.id || '',
    to_party: to_party || (fromParty === 'patient' ? 'doctor' : 'patient'),
    message_type,
    body: scrub.clean.slice(0, 4000),
    body_translated: '',
    recipient_language: '',
    contact_scrubbed: scrub.redactedCount > 0,
    status: 'unread',
    created_at: now,
  });

  // A doctor's request for more info pauses their quote's SLA.
  if (message_type === 'info_request' && quote_id) {
    await base44.asServiceRole.entities.DoctorQuote.update(quote_id, { status: 'needs_more_info' }).catch(() => {});
  }

  // A patient answer flagged as new medical info re-runs the deterministic Safe-T gate.
  // Fail-closed: the scan can only add caution. (The case profile update that carries
  // the new fact is handled by the intake/answer flow that sets this flag.)
  if (message_type === 'answer' && contains_medical_update === true) {
    await base44.functions.invoke('safeT4LifeScan', { caseId }).catch(() => {});
  }

  // LINK-ONLY notify the recipient (best-effort). We nudge; the content stays in-portal.
  const recipientEmail = message.to_party === 'doctor' ? quote?.doctor_email : request?.patient_email;
  const portalUrl = message.to_party === 'doctor'
    ? `${APP_URL}/doctor-dashboard?request=${quote?.request_id || ''}`
    : `${APP_URL}/my-quotes?request=${quote?.request_id || ''}`;
  if (recipientEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: recipientEmail, subject: `You have a new message — ${BRAND}`,
      body: nudgeEmail(portalUrl),
    }).catch(() => {});
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'case_message_posted',
    actor_id: user?.id || fromParty, actor_role: fromParty, actor_name: user?.email || fromParty,
    resource_type: 'CaseMessage', resource_id: message.id, case_id: caseId,
    sensitive: true, timestamp: now,
    details: { message_type, from_party: fromParty, contact_scrubbed: scrub.redactedCount > 0 },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ message_id: message.id, contact_scrubbed: scrub.redactedCount > 0, redactions: scrub.redactedCount });
}, { name: 'postCaseMessage', requireAuth: true }));
