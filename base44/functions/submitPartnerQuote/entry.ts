import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject } from '../../shared/validate.ts';
import { applyPartnerQuote } from '../../shared/submitPartnerQuoteCore.ts';

const SubmitPartnerQuoteSchema = strictObject({
  case_id: z.string().trim().max(100).optional(),
  consultation_id: z.string().trim().max(100).optional(),
  partner_type: z.enum(['travel', 'driver', 'companion', 'clinic']),
  amount: z.coerce.number().optional(),
});

/**
 * submitPartnerQuote — Automation Gate
 *
 * Every portal-authenticated partner quote submission flows through here.
 * The real write logic (per-partner-type field update, all-4-confirmed
 * check, auto-fired pricing) lives in submitPartnerQuoteCore.ts's
 * applyPartnerQuote() — shared with twilioPartnerReplyWebhook, which calls
 * it directly since a Twilio webhook has no Base44 session this
 * requireAuth:true endpoint could accept anyway.
 *
 * This replaces the old manual admin step of "wait for all quotes then calculate."
 * The pipeline is now fully automatic: doctor confirms → 4 quota emails →
 * partners submit → this gate detects completion → pricing calculated → Pay Now sent.
 *
 * partner_type values:
 *   'travel'    — Travel agency (flight + hotel)
 *   'driver'    — Chauffeur (any leg submission marks driver as confirmed)
 *   'companion' — Recovery companion service
 *   'clinic'    — Clinic facility fee (submitted by doctor)
 */

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, consultation_id, partner_type, amount } = await body();

  if (!partner_type) return err('partner_type is required (travel|driver|companion|clinic)');
  if (!['travel', 'driver', 'companion', 'clinic'].includes(partner_type)) {
    return err(`Invalid partner_type: ${partner_type}`);
  }

  // Resolve case_id — portals only have consultation_id
  let caseId = case_id;
  if (!caseId && consultation_id) {
    const rows = await base44.asServiceRole.entities.CaseRecord.filter(
      { consultation_id }, '-created_date', 1
    ).catch(() => []);
    caseId = rows[0]?.id ?? null;
  }
  if (!caseId) return err('case_id or consultation_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const result = await applyPartnerQuote(base44, { case_id: caseId, partner_type, amount: Number(amount || 0) });
  return ok(result);
}, { name: 'submitPartnerQuote', requireAuth: true, bodySchema: SubmitPartnerQuoteSchema }));
