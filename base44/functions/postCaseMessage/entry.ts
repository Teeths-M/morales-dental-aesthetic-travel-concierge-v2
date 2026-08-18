import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { scrubContact } from '../../shared/contactScrub.ts';
import { guardText } from '../../shared/blocker.ts';
import { translateText } from '../../shared/translateText.ts';

/**
 * postCaseMessage — the two-way clarification thread (doctor/partner ↔ patient).
 * Also the Care Room's real message substrate once a doctor is confirmed:
 * called with just case_id (no quote_id), this thread becomes an ongoing,
 * case-wide channel — CaseThread.jsx already renders it that way.
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
 *   • CARE ROOM (M-Care as third participant): after a human message is stored,
 *     three best-effort, non-blocking steps run — translate if the two parties'
 *     languages differ; parse the message for a confirmable appointment/instruction
 *     fact (parseCareRoomMessage — parse-only, never writes) and, if found, post a
 *     follow-up m_care message asking the recipient to explicitly confirm it; and,
 *     for an appointment-shaped fact, a best-effort check against CaseRecord.procedure_date
 *     for a possible conflict. None of this can block or fail the human's own send —
 *     every step is wrapped and swallowed. M-Care only ever flags here; it never
 *     resolves, diagnoses, or silently rewrites anything.
 *
 * Requires: entity QuoteMessage (+ DoctorQuote / DoctorQuoteRequest for context).
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
    ? await base44.asServiceRole.entities.DoctorQuoteRequest.get(quote.request_id).catch(() => null)
    : null;
  // The Care Room's post-confirmation ongoing thread is called with just
  // case_id (no quote/request context) — fall back to CaseRecord for the
  // patient/doctor emails that scope the thread's RLS.
  const caseRec = await base44.asServiceRole.entities.CaseRecord.get(caseId).catch(() => null);

  // From/to. Doctors and partners have their own roles; everyone else is the patient.
  const role = user?.role || 'client';
  const fromParty = ['doctor', 'local_doctor'].includes(role) ? 'doctor'
    : ['travel_agency', 'taxi_service', 'companion', 'security_agency'].includes(role) ? role
    : (role === 'admin' || role === 'platform_admin') ? 'admin' : 'patient';

  // ── Malicious Action Blocker ──────────────────────────────────────────────
  // Partner threads are where disintermediation actually happens, so this is
  // the first call site. The engine handles the stage distinction that this
  // function already made: pre-selection a phone number is an attempt to be
  // chosen off-platform and is refused; post-selection the parties have a real
  // operational relationship and may exchange details, because a patient
  // landing in an unfamiliar city needs to be able to call the clinic.
  //
  // What is blocked at BOTH stages is stated intent to leave — "pay me
  // directly", "let's continue outside the platform", "skip the screening".
  // From a chosen surgeon that is the more dangerous version, not the less: it
  // evades the escrow and the safety guarantees the selection bought.
  //
  // guardText flags, writes the audit row and notifies admins. It never
  // throws, and it lets a covert-SOS message through untouched.
  const preSelection = !request || request.status !== 'selected';
  const guard = await guardText(base44, text, {
    scope: preSelection ? 'message' : 'message_selected',
    userEmail: user?.email || '',
    caseId,
    source: 'postCaseMessage',
  });

  if (guard.blocked) {
    // 403, not 400: this is a refusal, not a malformed request. The message is
    // final by design — an appeal button is a loophole.
    return err(guard.message || 'This action has been blocked.', 403);
  }

  // scrubContact still runs pre-selection as the belt-and-braces redaction of
  // anything the blocker allowed through but that should not be persisted.
  const scrub = preSelection
    ? scrubContact(guard.cleanText)
    : { clean: String(guard.cleanText), redactedCount: 0 };
  const now = new Date().toISOString();

  const message = await base44.asServiceRole.entities.QuoteMessage.create({
    case_id: caseId,
    quote_id: quote_id || '',
    patient_email: request?.patient_email || caseRec?.client_email || '',   // denormalised so RLS scopes the thread to its participants
    doctor_email: quote?.doctor_email || caseRec?.doctor_email || '',
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
  const recipientEmail = message.to_party === 'doctor'
    ? (quote?.doctor_email || caseRec?.doctor_email)
    : (request?.patient_email || caseRec?.client_email);
  const portalUrl = message.to_party === 'doctor'
    ? (quote?.request_id ? `${APP_URL}/doctor-dashboard?request=${quote.request_id}` : `${APP_URL}/doctor-dashboard`)
    : (quote?.request_id ? `${APP_URL}/my-quotes?request=${quote.request_id}` : `${APP_URL}/dashboard`);
  if (recipientEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: recipientEmail, subject: `You have a new message — ${BRAND}`,
      body: nudgeEmail(portalUrl),
    }).catch(() => {});
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'case_message_posted',
    actor_id: user?.id || fromParty, actor_role: fromParty, actor_name: user?.email || fromParty,
    resource_type: 'QuoteMessage', resource_id: message.id, case_id: caseId,
    sensitive: true, timestamp: now,
    details: { message_type, from_party: fromParty, contact_scrubbed: scrub.redactedCount > 0 },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  // ── Care Room reactive pipeline ─────────────────────────────────────────
  // Best-effort, fully wrapped — nothing here can fail or delay the human's
  // own send, which has already succeeded above. Only runs for a genuine
  // human-authored message (never on an m_care message itself, so M-Care
  // never reacts to its own output) once both parties are actually known.
  if ((fromParty === 'patient' || fromParty === 'doctor') && caseRec) {
    try {
      const patientEmail = message.patient_email;
      const doctorEmail = message.doctor_email;
      const recipientParty = message.to_party;

      const consultation = caseRec.consultation_id
        ? await base44.asServiceRole.entities.Consultation.get(caseRec.consultation_id).catch(() => null)
        : null;
      const doctorRecords = doctorEmail
        ? await base44.asServiceRole.entities.Doctor.filter({ email: doctorEmail }, '-created_date', 1).catch(() => [])
        : [];
      const doctorLang = doctorRecords[0]?.language_preference || 'en';
      const patientLang = consultation?.preferred_language || 'en';
      const senderLang = fromParty === 'doctor' ? doctorLang : patientLang;
      const recipientLang = recipientParty === 'doctor' ? doctorLang : patientLang;

      // 1. Translate, only if the two parties' languages actually differ.
      if (senderLang && recipientLang && senderLang !== recipientLang) {
        const translated = await translateText(base44, message.body, senderLang, recipientLang);
        if (translated && translated !== message.body) {
          await base44.asServiceRole.entities.QuoteMessage.update(message.id, {
            body_translated: translated,
            recipient_language: recipientLang,
          }).catch(() => {});
        }
      }

      // 2. Parse for a confirmable fact (parse-only — never writes itself).
      const parseRes = await base44.functions.invoke('parseCareRoomMessage', { text: message.body }).catch(() => null);
      const parsed = (parseRes && typeof parseRes === 'object' && 'data' in parseRes) ? (parseRes as any).data : parseRes;

      if (parsed?.is_confirmable && parsed?.fact_type) {
        await base44.asServiceRole.entities.QuoteMessage.create({
          case_id: caseId,
          quote_id: '',
          patient_email: patientEmail,
          doctor_email: doctorEmail,
          from_party: 'm_care',
          from_id: '',
          to_party: recipientParty,
          message_type: 'message',
          body: `${parsed.summary} Please confirm you understood.`,
          body_translated: '',
          recipient_language: '',
          contact_scrubbed: false,
          status: 'unread',
          requires_confirmation: true,
          confirmed: false,
          created_at: new Date().toISOString(),
        }).catch(() => {});

        // 3. Best-effort logistics-conflict check — the only clean, single
        //    source of a scheduled date this app has today is
        //    CaseRecord.procedure_date; a real conflict elsewhere (e.g. a
        //    driver pickup time) may be missed given how scattered that data
        //    is. Never a hard stop, never a diagnosis — a flag only.
        if (parsed.fact_type === 'appointment' && parsed.extracted_date && caseRec.procedure_date) {
          const existingDate = String(caseRec.procedure_date).slice(0, 10);
          if (existingDate && existingDate !== parsed.extracted_date) {
            await base44.asServiceRole.entities.QuoteMessage.create({
              case_id: caseId,
              quote_id: '',
              patient_email: patientEmail,
              doctor_email: doctorEmail,
              from_party: 'm_care',
              from_id: '',
              to_party: 'both',
              message_type: 'message',
              body: `Heads up — this mentions ${parsed.extracted_date}${parsed.extracted_time ? ' at ' + parsed.extracted_time : ''}, but the procedure date on file is ${existingDate}. Worth confirming which is correct before travel is finalized.`,
              body_translated: '',
              recipient_language: '',
              contact_scrubbed: false,
              status: 'unread',
              requires_confirmation: false,
              confirmed: false,
              created_at: new Date().toISOString(),
            }).catch(() => {});
          }
        }
      }
    } catch (_) {
      // Never let the reactive layer affect the human's own message send.
    }
  }

  return ok({ message_id: message.id, contact_scrubbed: scrub.redactedCount > 0, redactions: scrub.redactedCount });
}, { name: 'postCaseMessage', requireAuth: true }));
