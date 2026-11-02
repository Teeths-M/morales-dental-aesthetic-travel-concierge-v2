import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { normalizeCurrency, parseAmountMinor } from '../../shared/partnerMoney.ts';

/**
 * respondPartnerQuote — the partner's answer, written only by that partner.
 *
 * Ownership is checked against the request's own partner_email, not against
 * anything the caller says about itself. A partner can acknowledge, ask for
 * more information, decline, or give a firm price with its own validity — and
 * every one of those writes a separate response row so the traveller sees the
 * sequence rather than only the final state.
 *
 * A 'quoted' response is the ONLY shape allowed to carry an amount. An
 * acknowledgement can therefore never be read as a price.
 */

const text = (value: unknown, max = 400) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const list = (value: unknown, max = 30) => (
  Array.isArray(value) ? value.map((v) => text(v, 160)).filter(Boolean).slice(0, max) : []
);

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const payload = await body<any>();
  const requestId = text(payload.request_id, 100);
  const responseType = text(payload.response_type, 30);

  if (!requestId) return err('request_id is required.', 400);
  if (!['acknowledged', 'info_needed', 'declined', 'quoted'].includes(responseType)) {
    return err('Choose one of: acknowledged, info_needed, declined, quoted.', 400);
  }

  const request = await base44.asServiceRole.entities.PartnerQuoteRequest.get(requestId).catch(() => null);
  if (!request) return err('Request not found.', 404);

  const isAdmin = ['admin', 'platform_admin'].includes(user!.role);
  if (request.partner_email !== user!.email && !isAdmin) {
    return err('That request was sent to another partner.', 403);
  }
  if (['DECLINED', 'EXPIRED'].includes(request.state) && responseType !== 'declined') {
    return err('This request is closed.', 409);
  }

  let amountMinor: number | null = null;
  let currency = text(payload.currency, 3).toUpperCase();
  let validUntil = text(payload.valid_until, 10);

  if (responseType === 'quoted') {
    currency = normalizeCurrency(currency || 'USD') || '';
    if (!currency) return err('A valid currency is required with a quote.', 400);
    amountMinor = parseAmountMinor(payload.amount, currency);
    if (amountMinor === null) return err('Enter the quoted price as a number.', 400);
    if (!validUntil) return err('A quote needs a valid-until date so the traveller knows how long it holds.', 400);
  }

  const nowIso = new Date().toISOString();

  const response = await base44.asServiceRole.entities.PartnerQuoteResponse.create({
    request_id: request.id,
    rate_card_id: request.rate_card_id,
    partner_id: request.partner_id,
    partner_email: request.partner_email,
    traveler_email: request.traveler_email,
    response_type: responseType,
    amount_minor: responseType === 'quoted' ? amountMinor : undefined,
    currency: responseType === 'quoted' ? currency : undefined,
    valid_until: responseType === 'quoted' ? validUntil : undefined,
    inclusions: list(payload.inclusions),
    exclusions: list(payload.exclusions),
    conditions: text(payload.conditions, 2000),
    info_requested: responseType === 'info_needed' ? text(payload.info_requested, 1000) : undefined,
    notes: text(payload.notes, 1000),
    created_by: user!.email,
    created_at: nowIso,
    is_final: responseType === 'quoted' || responseType === 'declined',
  });

  const stateByType: Record<string, string> = {
    acknowledged: 'ACKNOWLEDGED',
    info_needed: 'ACKNOWLEDGED',
    declined: 'DECLINED',
    quoted: 'QUOTE_CONFIRMED',
  };

  const updated = await base44.asServiceRole.entities.PartnerQuoteRequest.update(request.id, {
    state: stateByType[responseType],
    partner_response_at: nowIso,
    quoted_amount_minor: responseType === 'quoted' ? amountMinor : request.quoted_amount_minor,
    quoted_currency: responseType === 'quoted' ? currency : request.quoted_currency,
    quoted_valid_until: responseType === 'quoted' ? validUntil : request.quoted_valid_until,
    audit_trail: [...(request.audit_trail || []), {
      at: nowIso,
      state: stateByType[responseType],
      actor: user!.email,
      note: responseType === 'quoted'
        ? 'Partner confirmed a price for this specific request.'
        : `Partner responded: ${responseType.replace(/_/g, ' ')}.`,
    }],
  });

  return ok({
    request: updated,
    response,
    message: responseType === 'quoted'
      ? 'Quote recorded. The traveller sees it exactly as you wrote it.'
      : 'Response recorded. No price was set by this reply.',
  });
}, { name: 'respondPartnerQuote', requireAuth: true, rateLimit: { max: 30, windowSeconds: 600 } }));