import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { guardedStatusUpdate, BOOKING } from '../_shared/bookingState.ts';
import { appendSample, computeStats } from '../_shared/priceStats.ts';
import { z, strictObject, Fields } from '../_shared/validate.ts';

const LineItemSchema = strictObject({
  procedure: z.string().trim().max(200),
  qty: z.coerce.number().optional(),
  unit_price_usd: z.coerce.number(),
});

const SubmitDoctorQuoteSchema = strictObject({
  quote_id: Fields.shortText(100),
  line_items: z.array(LineItemSchema).max(50).optional().default([]),
  total_usd: z.coerce.number().optional(),
  currency: z.string().trim().max(10).optional(),
  doctor_notes: z.string().max(1000).optional().default(''),
  reviewed_consultation: z.boolean().optional().default(false),
});

/**
 * submitDoctorQuote — a matched doctor submits a firm invoice for a patient request.
 *
 * INVARIANTS:
 *   • The caller must OWN the quote (user.email === quote.doctor_email) unless admin.
 *   • The doctor must attest reviewed_consultation === true before a quote is accepted.
 *   • The doctor's submitted total is AUTHORITATIVE; any patient_facing_summary is
 *     advisory only and never changes the number.
 *   • Every firm quote feeds the auto-learning per-procedure×country estimate
 *     (aggregate median/range only — never exposes an individual quote).
 *
 * Requires: entities DoctorQuote + DoctorQuoteRequest + ProcedurePriceStats.
 */

interface LineItem { procedure: string; qty?: number; unit_price_usd: number }

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { quote_id, line_items, total_usd, currency, doctor_notes, reviewed_consultation } = await body<{
    quote_id?: string; line_items?: LineItem[]; total_usd?: number;
    currency?: string; doctor_notes?: string; reviewed_consultation?: boolean;
  }>();

  if (!quote_id) return err('quote_id is required');

  const quote = await base44.asServiceRole.entities.DoctorQuote.get(quote_id).catch(() => null);
  if (!quote) return err('Quote not found', 404);

  // ── Ownership: the doctor may only submit their OWN quote (admins exempt) ────
  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  if (!isAdmin && (user?.email || '').toLowerCase() !== String(quote.doctor_email || '').toLowerCase()) {
    return err('This quote does not belong to you.', 403);
  }

  if (quote.status === 'chosen' || quote.status === 'not_chosen') {
    return err('This request has already been decided.', 409);
  }

  // ── The doctor must attest they reviewed the consultation ───────────────────
  if (reviewed_consultation !== true) {
    return err('Please confirm you have reviewed the consultation before submitting a quote.');
  }

  const total = Number(total_usd || 0);
  if (!(total > 0)) return err('A quote total greater than 0 is required.');

  const items: LineItem[] = Array.isArray(line_items) ? line_items : [];
  const now = new Date().toISOString();

  // Doctor name for the (in-portal) patient-facing summary.
  const doctor = quote.doctor_id
    ? await base44.asServiceRole.entities.Doctor.get(quote.doctor_id).catch(() => null)
    : null;
  const request = await base44.asServiceRole.entities.DoctorQuoteRequest.get(quote.request_id).catch(() => null);
  const procedures: string[] = request?.procedures || items.map((i) => i.procedure).filter(Boolean);

  // Advisory only — never alters the authoritative total. (AI translation layers on later.)
  const patientFacingSummary =
    `${doctor?.full_name || 'The doctor'} quoted $${total.toLocaleString('en-US')} for ${procedures.join(', ') || 'your procedure'}` +
    (doctor_notes ? `. Note: ${String(doctor_notes).slice(0, 400)}` : '.');

  // ── Store the firm quote ────────────────────────────────────────────────────
  await base44.asServiceRole.entities.DoctorQuote.update(quote_id, {
    line_items: items,
    total_usd: total,
    currency: currency || 'USD',
    doctor_notes: String(doctor_notes || '').slice(0, 1000),
    reviewed_consultation: true,
    patient_facing_summary: patientFacingSummary,
    status: 'submitted',
    submitted_at: now,
  });

  // ── Move the request + case into "quotes in" (first firm quote) ─────────────
  if (request && request.status === 'awaiting_quotes') {
    await base44.asServiceRole.entities.DoctorQuoteRequest.update(request.id, { status: 'quotes_in' }).catch(() => {});
  }
  if (quote.case_id) {
    await guardedStatusUpdate(base44, quote.case_id, BOOKING.QUOTES_IN).catch(() => { /* already past this state */ });
  }

  // ── Auto-learning: feed the per-procedure × country estimate ────────────────
  const country = quote.doctor_country || doctor?.clinic_country || '';
  // Price per procedure: use the line item if present, else split the total evenly.
  const perProcedure: Record<string, number> = {};
  if (items.length > 0) {
    for (const it of items) {
      if (it.procedure && Number(it.unit_price_usd) > 0) perProcedure[it.procedure] = Number(it.unit_price_usd);
    }
  } else if (procedures.length > 0) {
    const even = Math.round(total / procedures.length);
    for (const p of procedures) perProcedure[p] = even;
  }
  await Promise.allSettled(Object.entries(perProcedure).map(async ([procName, price]) => {
    if (!procName || !(price > 0)) return;
    const rows = await base44.asServiceRole.entities.ProcedurePriceStats.filter(
      { procedure_name: procName, country }, '-last_recomputed_at', 1,
    ).catch(() => []);
    const existing = rows[0];
    const samples = appendSample(existing?.samples, price);
    const stats = computeStats(samples);
    const payload = {
      procedure_name: procName, country, samples,
      sample_count: stats.sample_count, median_usd: stats.median_usd,
      p25_usd: stats.p25_usd, p75_usd: stats.p75_usd, min_usd: stats.min_usd, max_usd: stats.max_usd,
      last_quote_at: now, last_recomputed_at: now,
    };
    if (existing) await base44.asServiceRole.entities.ProcedurePriceStats.update(existing.id, payload).catch(() => {});
    else await base44.asServiceRole.entities.ProcedurePriceStats.create(payload).catch(() => {});
  }));

  // ── Audit ───────────────────────────────────────────────────────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'doctor_quote_submitted',
    actor_id: quote.doctor_id || 'doctor', actor_role: 'doctor',
    actor_name: doctor?.full_name || quote.doctor_email || 'Doctor',
    resource_type: 'DoctorQuote', resource_id: quote_id, case_id: quote.case_id || '',
    sensitive: false, timestamp: now,
    details: { total_usd: total, request_id: quote.request_id },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ quote_id, status: 'submitted', total_usd: total });
}, { name: 'submitDoctorQuote', requireAuth: true, allowedRoles: ['doctor', 'local_doctor', 'admin', 'platform_admin'], bodySchema: SubmitDoctorQuoteSchema }));
