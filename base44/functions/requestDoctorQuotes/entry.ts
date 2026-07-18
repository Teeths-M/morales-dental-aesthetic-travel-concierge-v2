import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { guardedStatusUpdate, BOOKING } from '../_shared/bookingState.ts';

/**
 * requestDoctorQuotes — the marketplace fan-out. Replaces the old single-doctor
 * auto-assignment. After Safe-T clears, invite matched specialist doctors to submit
 * a firm quote; the patient later compares and chooses (selectDoctorQuote).
 *
 * INVARIANTS (M Principle — do not regress):
 *   • FAIL-CLOSED SAFETY GATE: a doctor is contacted ONLY when the case's
 *     safe_t_result === 'PASSED'. PENDING (waiver/review), BLOCKED, or missing →
 *     refuse to fan out. AI/this function cannot clear a safety decision.
 *   • DE-IDENTIFIED UNTIL CHOSEN: the de-identified summary (first name + country +
 *     clinical facts) is stored on the QuoteRequest and read IN-PORTAL; full identity
 *     / contact / PHI is revealed only to the chosen doctor (selectDoctorQuote).
 *   • ON-PLATFORM / LINK-ONLY OUT: the outbound email carries NO name, country,
 *     procedure, or price — only a teaser + a secure deep-link into the doctor portal.
 *   • Only verified, active doctors are invited.
 *
 * Requires: entities DoctorQuoteRequest + DoctorQuote (defined in base44/entities).
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
const BRAND = 'Morales Medical Travel Safety';
const MAX_DOCTORS = 8;
const QUOTE_WINDOW_HOURS = 72;
const VERIFIED = new Set(['verified', 'auto_verified', 'manually_approved']);

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[_-]+/g, ' ').trim();

// A doctor specialises in one of the requested procedures if any DoctorSpecialty
// procedure_name overlaps (normalised, substring either direction) any case procedure.
function specialtyMatches(specialtyNames: string[], procedures: string[]): boolean {
  const procs = procedures.map(norm).filter(Boolean);
  return specialtyNames.some((sp) => {
    const s = norm(sp);
    return procs.some((p) => p && (s.includes(p) || p.includes(s)));
  });
}

// De-identified summary that lives IN-PORTAL. First name + country are permitted here
// (read only inside M by a verified doctor); no contact details, no full name.
function deidentifiedSummary(c: any): string {
  const firstName = String(c.client_name || '').trim().split(/\s+/)[0] || 'A patient';
  const country = c.client_country || c.patient_country || '—';
  const procs = (Array.isArray(c.procedures) ? c.procedures : []).filter(Boolean).join(', ') || 'a procedure';
  const facts: string[] = [];
  facts.push(c.smoking_status ? 'smoker' : 'non-smoker');
  if (c.medical_conditions && c.medical_conditions !== 'None') facts.push(`conditions: ${c.medical_conditions}`);
  if (c.medications && c.medications !== 'None') facts.push('on medication');
  return `${firstName}, ${country} — ${procs}${facts.length ? ` (${facts.join('; ')})` : ''}`;
}

// Link-only outbound invite: no PHI, no name, no procedure, no price — teaser + link.
function inviteEmail(portalUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:20px;overflow:hidden;">
<tr><td style="padding:28px 32px;border-bottom:1px solid #2A3F4A;">
  <div style="font-size:26px;font-weight:900;color:#D4AF37;">M</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-top:6px;">${BRAND}</div>
</td></tr>
<tr><td style="padding:28px 32px;">
  <p style="font-size:16px;color:#fff;margin:0 0 12px;font-weight:700;">You have a new patient pricing request.</p>
  <p style="font-size:14px;color:rgba(255,255,255,0.6);margin:0 0 24px;line-height:1.6;">
    A patient is requesting a quote for a procedure you specialise in. For their privacy, the details are in your secure portal — please log in to review the request and submit a fair, transparent quote.
  </p>
  <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:14px 32px;border-radius:99px;text-decoration:none;">Open My Portal →</a>
  <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:24px 0 0;">No patient details are shared outside Morales — everything stays in your portal.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { consultation_id, case_id } = await body<{ consultation_id?: string; case_id?: string }>();

  // ── Resolve the case ───────────────────────────────────────────────────────
  let caseRecord: any = null;
  if (case_id) {
    caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  } else if (consultation_id) {
    const rows = await base44.asServiceRole.entities.CaseRecord.filter(
      { consultation_id }, '-created_date', 1,
    ).catch(() => []);
    caseRecord = rows[0] || null;
  } else {
    return err('case_id or consultation_id is required');
  }
  if (!caseRecord) return err('Case not found', 404);
  const caseId = caseRecord.id;

  // ── FAIL-CLOSED SAFETY GATE ────────────────────────────────────────────────
  // A doctor is contacted only when Safe-T has genuinely cleared this case. A
  // waiver-required (PENDING) or blocked case never fans out. This function has no
  // capability to clear a safety decision.
  if (caseRecord.safe_t_result !== 'PASSED') {
    return ok({
      fanned_out: false,
      reason: 'safe_t_not_cleared',
      safe_t_result: caseRecord.safe_t_result || 'PENDING',
      message: 'Safe-T has not cleared this case — no doctor has been contacted.',
    });
  }
  // A held case is never fanned out (defence in depth alongside the gate above).
  if (caseRecord.status === BOOKING.ADMIN_REVIEW) {
    return ok({ fanned_out: false, reason: 'admin_review_hold', message: 'Case is under admin review.' });
  }

  // ── Idempotency: one open request per case ─────────────────────────────────
  const existing = await base44.asServiceRole.entities.DoctorQuoteRequest.filter(
    { case_id: caseId }, '-created_date', 1,
  ).catch(() => []);
  if (existing && existing.length > 0) {
    return ok({ fanned_out: false, already_requested: true, quote_request_id: existing[0].id });
  }

  const procedures: string[] = Array.isArray(caseRecord.procedures) ? caseRecord.procedures.filter(Boolean) : [];
  if (procedures.length === 0) return err('Case has no procedures to quote');

  // ── Match verified, active specialist doctors ──────────────────────────────
  const activeDoctors = await base44.asServiceRole.entities.Doctor.filter(
    { status: 'active' }, '-created_date', 500,
  ).catch(() => []);
  const verifiedDoctors = activeDoctors.filter((d: any) =>
    d.license_verified === true && VERIFIED.has(d.verification_status));

  const specialties = await base44.asServiceRole.entities.DoctorSpecialty.list('-created_date', 2000).catch(() => []);
  const specialtiesByDoctor: Record<string, string[]> = {};
  for (const sp of specialties as any[]) {
    if (!sp.doctor_id) continue;
    (specialtiesByDoctor[sp.doctor_id] ||= []).push(sp.procedure_name);
  }

  const matched = verifiedDoctors
    .filter((d: any) => specialtyMatches(specialtiesByDoctor[d.id] || [], procedures))
    .slice(0, MAX_DOCTORS);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + QUOTE_WINDOW_HOURS * 3600_000).toISOString();
  const isMinor = caseRecord.guardian_required === true || caseRecord.risk_level === 'high';

  // ── Create the QuoteRequest (de-identified summary lives here, read in-portal) ─
  const quoteRequest = await base44.asServiceRole.entities.DoctorQuoteRequest.create({
    case_id: caseId,
    consultation_id: caseRecord.consultation_id || consultation_id || '',
    patient_email: caseRecord.client_email || '',
    patient_first_name: String(caseRecord.client_name || '').trim().split(/\s+/)[0] || '',
    patient_country: caseRecord.client_country || caseRecord.patient_country || '',
    procedures,
    deidentified_summary: isMinor ? '' : deidentifiedSummary(caseRecord), // minors: withhold until Admin-Review
    is_minor: isMinor,
    safety_status: 'cleared',
    status: matched.length > 0 ? 'awaiting_quotes' : 'held',
    chosen_quote_id: '',
    expires_at: expiresAt,
  });

  // ── One pending DoctorQuote per matched doctor + a LINK-ONLY invite ─────────
  const portalUrl = `${APP_URL}/doctor-dashboard?request=${quoteRequest.id}`;
  let invited = 0;
  await Promise.allSettled(matched.map(async (d: any) => {
    await base44.asServiceRole.entities.DoctorQuote.create({
      request_id: quoteRequest.id,
      case_id: caseId,
      patient_email: caseRecord.client_email || '',          // denormalised for RLS + the patient board
      doctor_id: d.id,
      doctor_email: d.email,
      doctor_country: d.clinic_country || '',
      procedures,                                             // denormalised so the doctor reads it from their own quote
      deidentified_summary: quoteRequest.deidentified_summary,
      status: 'pending',
      reviewed_consultation: false,
      reminder_stage: 0,
    });
    if (d.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: d.email,
        subject: `New patient pricing request — ${BRAND}`,
        body: inviteEmail(portalUrl),
      });
    }
    invited++;
  }));

  // ── Advance the case into the quote-collection state (guarded) ──────────────
  // safeT4LifeScan leaves a cleared case at 'Safe-T-Reviewed'; normalise defensively.
  if (caseRecord.status === BOOKING.SUBMITTED) {
    await guardedStatusUpdate(base44, caseId, BOOKING.SAFE_T_REVIEWED).catch(() => {});
  }
  await guardedStatusUpdate(base44, caseId, BOOKING.AWAITING_QUOTES, {
    quote_request_id: quoteRequest.id,
  }).catch((e) => console.error('[requestDoctorQuotes] status advance failed:', e.message));

  // ── Audit (append-only, hash-chained) ──────────────────────────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'doctor_quotes_requested',
    actor_id: 'system', actor_role: 'system', actor_name: 'Morales Marketplace',
    resource_type: 'DoctorQuoteRequest', resource_id: quoteRequest.id, case_id: caseId,
    sensitive: false, timestamp: now.toISOString(),
    details: { procedures, doctors_invited: invited, expires_at: expiresAt, is_minor: isMinor },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    fanned_out: true,
    quote_request_id: quoteRequest.id,
    doctors_invited: invited,
    expires_at: expiresAt,
    message: invited > 0
      ? `${invited} specialist${invited === 1 ? '' : 's'} invited to quote. Their details stay in-portal.`
      : 'No matching verified specialists yet — request logged; widen the search or onboard doctors.',
  });
}, { name: 'requestDoctorQuotes', requireAuth: true }));
