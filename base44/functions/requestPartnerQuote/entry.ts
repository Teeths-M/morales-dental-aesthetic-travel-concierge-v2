import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { logProviderContactAttempt } from '../../shared/logProviderContactAttempt.ts';
import { derivePricingStatus } from '../../shared/partnerCatalogue.ts';
import { formatMinor } from '../../shared/partnerMoney.ts';

/**
 * requestPartnerQuote — a traveller asking one named partner for a firm price.
 *
 * Three invariants this function exists to enforce:
 *  1. NOTHING is sent without an explicit consent flag from the traveller in
 *     this same call. The exact fields being shared are frozen on the request,
 *     so "what was agreed" is a record, not a reconstruction.
 *  2. A double tap is one request. The idempotency key is derived from the
 *     traveller, the offer and a fingerprint of the shared details.
 *  3. The state says what actually happened. SENT means a provider accepted the
 *     message; it is never upgraded to "partner responded" anywhere.
 *
 * It never books, reserves or charges. Accepting a returned quote is a separate
 * decision that only opens the existing booking route.
 */

const text = (value: unknown, max = 300) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : null);

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function requestRef(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `QR-${out}`;
}

// The traveller's note, the requested services and the listing's own name are typed text: escape them so nothing
// typed can add links or markup to the email a partner receives.
const escapeHtml = (value: unknown) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function partnerEmailBody(input: {
  serviceName: string;
  partnerName: string;
  details: Record<string, unknown>;
  ref: string;
  appUrl: string;
}): string {
  const rows = Object.entries(input.details)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `<li style="margin-bottom:6px;"><strong style="text-transform:capitalize;">${key.replace(/_/g, ' ')}:</strong> ${escapeHtml(String(value).slice(0, 400))}</li>`)
    .join('');
  const serviceName = escapeHtml(input.serviceName);
  const partnerName = escapeHtml(input.partnerName);

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f8f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
  <tr><td style="background:#d4af37;padding:18px 24px;border-radius:8px 8px 0 0;">
    <span style="font-size:13px;font-weight:800;letter-spacing:2px;color:#000000;">M-CARE</span>
  </td></tr>
  <tr><td style="padding:24px;">
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#060b16;">New customer quote request</p>
    <p style="margin:0 0 16px;font-size:14px;color:#5b6b7a;line-height:1.6;">
      ${partnerName ? `${partnerName}, a` : 'A'} traveller is asking for a firm price on
      <strong>${serviceName}</strong>. Reference ${input.ref}.
    </p>
    <p style="margin:0 0 6px;font-size:13px;color:#060b16;font-weight:700;">What they asked for</p>
    <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;color:#060b16;line-height:1.6;">${rows || '<li>No extra details provided.</li>'}</ul>
    <p style="margin:0 0 18px;font-size:12.5px;color:#5b6b7a;line-height:1.6;">
      Only these details were shared. If this is not something you can price, please decline in your portal
      so the traveller is not left waiting.
    </p>
    <a href="${input.appUrl}/partner-pricing" style="display:inline-block;background:#d4af37;color:#000000;font-size:14px;font-weight:700;padding:12px 24px;border-radius:7px;text-decoration:none;">Review and respond</a>
  </td></tr>
  </table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const payload = await body<any>();
  const action = text(payload.action, 30) || 'create';
  const nowIso = new Date().toISOString();
  const appUrl = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');

  // ── The traveller's own decision on a returned quote ──────────────────────
  if (action === 'decide') {
    const requestId = text(payload.request_id, 100);
    const decision = text(payload.decision, 20);
    if (!requestId || !['accepted', 'declined'].includes(decision)) {
      return err('request_id and decision (accepted|declined) are required.', 400);
    }
    const request = await base44.asServiceRole.entities.PartnerQuoteRequest.get(requestId).catch(() => null);
    if (!request) return err('Request not found.', 404);
    if (request.traveler_email !== user!.email) return err('That request belongs to another traveller.', 403);
    if (!request.quoted_amount_minor && decision === 'accepted') {
      return err('There is no firm price on this request to accept yet.', 409);
    }

    const updated = await base44.asServiceRole.entities.PartnerQuoteRequest.update(requestId, {
      traveler_decision: decision,
      decided_at: nowIso,
      audit_trail: [...(request.audit_trail || []), {
        at: nowIso, state: request.state, actor: user!.email, note: `Traveller ${decision} the quote.`,
      }],
    });

    return ok({
      request: updated,
      // Accepting opens the existing booking route. It never charges anything.
      next_step: decision === 'accepted'
        ? 'Quote accepted. Continue in the normal booking flow to confirm and pay — nothing has been charged.'
        : 'Quote declined. Nothing was booked.',
    });
  }

  // ── Create a request ──────────────────────────────────────────────────────
  if (payload.consent !== true) {
    return err('The traveller must explicitly agree to share these details before a partner is contacted.', 400);
  }

  const rateCardId = text(payload.rate_card_id, 100);
  if (!rateCardId) return err('rate_card_id is required.', 400);

  const card = await base44.asServiceRole.entities.PartnerRateCard.get(rateCardId).catch(() => null);
  if (!card) return err('That offer is no longer available.', 404);
  if (card.status !== 'active') return err('This offer is not currently open for requests.', 409);

  // The listing must be live as well, or a traveller's trip details would be emailed to a partner who isn't
  // approved yet (a price is 'active' as soon as it's saved; its listing only goes live for an approved partner).
  const service = await base44.asServiceRole.entities.PartnerService.get(card.service_id).catch(() => null);
  if (!service || service.status !== 'active') return err('This offer is not currently open for requests.', 409);

  const status = derivePricingStatus(card);
  if (status === 'EXPIRED' || status === 'WITHDRAWN') {
    return err('This offer is no longer valid, so the partner cannot be asked to honour it.', 409);
  }

  // ── The exact, minimal details being shared ───────────────────────────────
  const details = {
    destination: text(payload.destination ?? card.location_label, 200),
    travel_start: text(payload.travel_start, 10),
    travel_end: text(payload.travel_end, 10),
    nights: num(payload.nights),
    travelers: Math.min(Math.max(num(payload.travelers) || 1, 1), 20),
    requested_services: Array.isArray(payload.requested_services)
      ? payload.requested_services.map((s: unknown) => text(s, 120)).filter(Boolean).slice(0, 10)
      : [],
    note: text(payload.note, 600),
  };

  const idempotencyKey = await sha256(`${user!.email}|${rateCardId}|${JSON.stringify(details)}`);
  const existing = await base44.asServiceRole.entities.PartnerQuoteRequest
    .filter({ idempotency_key: idempotencyKey }, '-created_date', 1)
    .catch(() => []);
  if (existing.length > 0) {
    return ok({
      request: existing[0],
      duplicate: true,
      message: `This request was already sent (${existing[0].request_ref}).`,
    });
  }

  const created = await base44.asServiceRole.entities.PartnerQuoteRequest.create({
    request_ref: requestRef(),
    rate_card_id: card.id,
    service_id: card.service_id,
    partner_id: card.partner_id,
    partner_email: card.partner_email,
    partner_type: card.partner_type,
    traveler_email: user!.email,
    traveler_name: user!.full_name || '',
    case_id: text(payload.case_id, 100) || undefined,
    details_shared: details,
    consent_given_by: user!.email,
    consent_at: nowIso,
    state: 'PREPARED',
    channel: 'email',
    attempt_count: 0,
    expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    traveler_decision: 'pending',
    idempotency_key: idempotencyKey,
    audit_trail: [{ at: nowIso, state: 'PREPARED', actor: user!.email, note: 'Traveller consented to sharing the listed details.' }],
  });

  // ── One real send attempt, recorded honestly ──────────────────────────────
  let sendOk = false;
  let sendError = '';
  let providerRef = '';
  try {
    const result = await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'M-Care Medical Travel Safety',
      to: card.partner_email,
      subject: `Quote request ${created.request_ref} — ${card.service_name}`,
      body: partnerEmailBody({
        serviceName: card.service_name,
        partnerName: card.partner_display_name || '',
        details,
        ref: created.request_ref,
        appUrl,
      }),
    });
    sendOk = true;
    providerRef = typeof result === 'string' ? result : '';
  } catch (e: any) {
    sendError = e?.message || 'Send failed';
  }

  const attemptedAt = new Date().toISOString();
  const updated = await base44.asServiceRole.entities.PartnerQuoteRequest.update(created.id, {
    state: sendOk ? 'SENT' : 'FAILED',
    sent_at: sendOk ? attemptedAt : undefined,
    attempt_count: 1,
    last_attempt_at: attemptedAt,
    provider_ref: providerRef || undefined,
    failure_detail: sendOk ? undefined : sendError,
    audit_trail: [...(created.audit_trail || []), {
      at: attemptedAt,
      state: sendOk ? 'SENT' : 'FAILED',
      actor: 'system',
      note: sendOk ? 'Request sent to the partner by email.' : `Send failed: ${sendError}`,
    }],
  });

  // ContactAttempt only accepts the five established partner types; anything
  // else is logged as 'other' rather than coerced into a type it is not.
  const contactPartnerType = ['doctor', 'travel_agency', 'taxi_service', 'companion', 'security_agency']
    .includes(card.partner_type) ? card.partner_type : 'other';

  await logProviderContactAttempt(base44, {
    partner_type: contactPartnerType,
    partner_id: card.partner_id,
    partner_name: card.partner_display_name || '',
    channel: 'email',
    purpose: 'quote_request',
    recipient: card.partner_email,
    initiated_by: 'requestPartnerQuote',
    result: sendOk ? 'sent' : 'failed',
    error_detail: sendOk ? undefined : sendError,
  }).catch(() => {});

  return ok({
    request: updated,
    sent: sendOk,
    price_shown_at_request: formatMinor(card.amount_minor, card.currency),
    price_was_current: status === 'CURRENT_PARTNER_CONFIRMED',
    message: sendOk
      ? `Request ${created.request_ref} sent to ${card.partner_display_name || 'the partner'}. They have not answered yet.`
      : `The request could not be delivered. Nothing reached the partner — ${sendError}`,
  });
}, { name: 'requestPartnerQuote', requireAuth: true, rateLimit: { max: 12, windowSeconds: 600 } }));