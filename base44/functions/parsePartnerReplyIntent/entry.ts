import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── parsePartnerReplyIntent ──────────────────────────────────────────────
// A travel-agency/taxi-service partner just replied by SMS to a real quote
// request, instead of logging into their portal. This ONLY parses; it never
// writes anything — same "parse, then confirm, then act" discipline as
// parseCareRoomMessage/parseAvailabilityIntent/parseBookingIntent.
// twilioPartnerReplyWebhook (the real caller) decides whether the parse is
// confident enough to actually apply, and applyPartnerQuote
// (submitPartnerQuoteCore.ts) is the only place a quote is ever recorded.
//
// Deliberately conservative: a single, unambiguous "$450 confirmed" style
// reply is the target case. Anything vague, partial, or off-topic must come
// back needs_human_review:true rather than a guessed number — a wrong price
// silently applied to a real case is worse than asking a human to look at
// one text message.

const BodySchema = strictObject({
  text: Fields.shortText(500),
});

const SYSTEM_PROMPT = `A travel agency or taxi/driver company was texted a quote request for a medical-travel patient's trip (flights, hotel, and/or ground transport). This is their reply. Decide whether it clearly states a single total price AND a clear confirmation, or whether it needs a human to review it instead.

Extract:
- is_quote_reply: true only if this message is actually responding to the quote request (a price, an availability answer, or a question about the request) — false for anything unrelated.
- amount: the single total price they quoted, as a plain number with no currency symbol (e.g. 450), or null if no clear single number is stated. If the message states two separate numbers (e.g. "flight $300, hotel $150") that are not clearly a single combined total, return amount: null and needs_human_review: true rather than adding them yourself.
- currency: a 3-letter currency code if stated or clearly implied (default "USD" if a bare "$" or no currency is mentioned), otherwise null.
- confirmed: true only if they clearly confirm/accept the job at that price (e.g. "confirmed", "yes", "that works", "booked") — false if they're only asking a question, negotiating, or declining.
- needs_human_review: true whenever the message is ambiguous, partial, a question, a decline, a counter-offer, or anything else a person should read before any price is applied to the case. When in doubt, true.
- review_reason: a short plain-language reason when needs_human_review is true, otherwise empty string.

Return ONLY valid JSON, no markdown fences.`;

Deno.serve(createHandler(async ({ base44, body }) => {
  const { text } = await body<{ text?: string }>();
  if (!text) return err('text is required');

  const safeText = sanitizePromptInput(text, 500).text;

  let is_quote_reply = false;
  let amount: number | null = null;
  let currency: string | null = null;
  let confirmed = false;
  let needs_human_review = true;
  let review_reason = 'Could not confidently parse this reply.';

  try {
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: `${SYSTEM_PROMPT}\n\nReply: ${safeText}\n\nRespond now (JSON only):`,
      response_json_schema: {
        type: 'object',
        properties: {
          is_quote_reply: { type: 'boolean' },
          amount: { type: ['number', 'null'] },
          currency: { type: ['string', 'null'] },
          confirmed: { type: 'boolean' },
          needs_human_review: { type: 'boolean' },
          review_reason: { type: 'string' },
        },
        required: ['is_quote_reply', 'amount', 'currency', 'confirmed', 'needs_human_review', 'review_reason'],
      },
    });
    if (llmResult && typeof llmResult === 'object') {
      const r = llmResult as Record<string, unknown>;
      is_quote_reply = r.is_quote_reply === true;
      amount = typeof r.amount === 'number' && Number.isFinite(r.amount) && r.amount > 0 ? r.amount : null;
      currency = typeof r.currency === 'string' && /^[A-Z]{3}$/.test(r.currency) ? r.currency : (amount != null ? 'USD' : null);
      confirmed = r.confirmed === true;
      needs_human_review = r.needs_human_review === true || amount == null || !confirmed;
      review_reason = typeof r.review_reason === 'string' ? r.review_reason.slice(0, 300) : '';
      if (needs_human_review && !review_reason) {
        review_reason = amount == null ? 'No single clear price found.' : 'Reply did not clearly confirm.';
      }
    }
  } catch (_) {
    // LLM unavailable — return a needs-review parse rather than block the
    // real webhook reply that's waiting on this.
    review_reason = 'Automatic parsing was unavailable.';
  }

  return ok({ is_quote_reply, amount, currency, confirmed, needs_human_review, review_reason });
}, { name: 'parsePartnerReplyIntent', requireAuth: false, rateLimit: { max: 30, windowSeconds: 300 }, bodySchema: BodySchema }));
