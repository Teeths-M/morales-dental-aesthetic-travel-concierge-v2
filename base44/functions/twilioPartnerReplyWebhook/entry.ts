/**
 * twilioPartnerReplyWebhook — Inbound SMS handler for partner quote replies.
 *
 * A travel agency or taxi/driver company that was texted a quote request
 * (assignTravelAgency/assignChauffeurServices, via the dedicated
 * TWILIO_PARTNER_PHONE_NUMBER — never the patient-safety number) can reply
 * "$450 confirmed" instead of logging into their portal. This is the
 * receiving end.
 *
 * Deliberately separate from twilioSafetySmsWebhook/twilioSmsHandshakeWebhook
 * — a distinct Twilio number with its own "a message comes in" webhook, so
 * this can never collide with or regress the existing patient-safety/driver-
 * handshake SMS routing. No user login required — validated by Twilio
 * signature + MessageSid idempotency + phone lookup, same discipline as
 * those two functions.
 *
 * A price only ever gets applied to a real case when the parse is confident
 * AND exactly one pending case matches the sender's phone — any ambiguity
 * (multiple candidates, an unparseable reply, no match at all) routes to a
 * human rather than guess. Misattributing a price to the wrong case is worse
 * than a delayed human review.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifyTwilioSignature, phonesMatch, twimlReply } from '../../shared/verifyTwilioSignature.ts';
import { applyPartnerQuote } from '../../shared/submitPartnerQuoteCore.ts';
import { logProviderContactAttempt } from '../../shared/logProviderContactAttempt.ts';

type Candidate = {
  case_id: string;
  partner_type: 'travel' | 'driver';
  partner_id: string;
  partner_name: string;
};

Deno.serve(async (req) => {
  try {
    const { request, errorTwiml } = await verifyTwilioSignature(req, 'twilioPartnerReplyWebhook');
    if (errorTwiml) return errorTwiml;
    const { from, body, messageSid } = request!;

    const base44 = createClientFromRequest(req);

    // ── Idempotency: ignore duplicate MessageSid ────────────────────────────
    if (messageSid) {
      try {
        const existing = await base44.asServiceRole.entities.NotificationLog.filter(
          { provider_message_id: messageSid }, '-created_at', 1,
        );
        if (existing?.length > 0) return twimlReply('Already processed. Thank you.');
      } catch (_) {}
    }

    const now = new Date().toISOString();
    const logEntry = async (status: string, notes: string, caseId?: string) => {
      try {
        await base44.asServiceRole.entities.NotificationLog.create({
          channel: 'sms',
          case_id: caseId || '',
          recipient_type: 'partner',
          recipient_phone: from,
          message_type: 'inbound_partner_reply',
          provider_message_id: messageSid,
          status,
          escalation_level: 0,
          notes: `From: ${from} | Body: ${body} | ${notes}`,
          created_at: now,
        });
      } catch (_) {}
    };

    // ── Correlate the sender's phone to a real, active partner ──────────────
    const [agencies, taxis] = await Promise.all([
      base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }, '-created_date', 200).catch(() => []),
    ]);

    const matchedAgency = (agencies as any[]).find((a) => phonesMatch(a.phone, from) || phonesMatch(a.whatsapp_number, from));
    const matchedTaxi = (taxis as any[]).find((t) => phonesMatch(t.phone, from));

    if (!matchedAgency && !matchedTaxi) {
      await logEntry('unrecognized_sender', 'No TravelAgency/TaxiService phone match');
      return twimlReply("Thanks for your message — we don't recognize this number for an open quote request. Please contact Morales support if you believe this is an error.");
    }

    // ── Find the pending case(s) this reply could be about ───────────────────
    const candidates: Candidate[] = [];

    if (matchedAgency) {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter(
        { travel_vendor_id: matchedAgency.id }, '-created_date', 20,
      ).catch(() => []);
      for (const c of cases as any[]) {
        if (c.itinerary_status !== 'CONFIRMED') {
          candidates.push({ case_id: c.id, partner_type: 'travel', partner_id: matchedAgency.id, partner_name: matchedAgency.agency_name || 'Travel partner' });
        }
      }
    }

    if (matchedTaxi) {
      const [asOrigin, asDest] = await Promise.all([
        base44.asServiceRole.entities.CaseRecord.filter({ origin_driver_id: matchedTaxi.id }, '-created_date', 20).catch(() => []),
        base44.asServiceRole.entities.CaseRecord.filter({ destination_driver_id: matchedTaxi.id }, '-created_date', 20).catch(() => []),
      ]);
      const seen = new Set<string>();
      for (const c of [...(asOrigin as any[]), ...(asDest as any[])]) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        if (c.transfer_status !== 'CONFIRMED') {
          candidates.push({ case_id: c.id, partner_type: 'driver', partner_id: matchedTaxi.id, partner_name: matchedTaxi.driver_name || matchedTaxi.company_name || 'Driver' });
        }
      }
    }

    if (candidates.length === 0) {
      await logEntry('no_pending_case', 'Partner matched but no open quote request found');
      return twimlReply("Thanks — we don't see an open quote request for your number right now. If you're expecting one, please contact Morales support.");
    }

    if (candidates.length > 1) {
      // Real, disclosed limitation: never guess which of several open
      // requests a short reply is about. Log for a human, ask the partner to
      // use their portal link instead, which is unambiguous per-case.
      await logEntry('ambiguous_multiple_pending', `${candidates.length} open requests for this number`);
      await logProviderContactAttempt(base44, {
        partner_type: candidates[0].partner_type === 'travel' ? 'travel_agency' : 'taxi_service',
        partner_id: candidates[0].partner_id,
        partner_name: candidates[0].partner_name,
        channel: 'sms',
        purpose: 'other',
        recipient: from,
        initiated_by: 'twilioPartnerReplyWebhook',
        result: 'skipped',
        error_detail: 'multiple open quote requests for this number — needs human review',
      });
      return twimlReply("Thanks — you have more than one open request with us right now, so I can't tell which one this is for. Please reply using your portal link so it applies to the right case, or contact Morales support.");
    }

    const target = candidates[0];

    // ── Parse the free-text reply ────────────────────────────────────────────
    const parseRes = await base44.asServiceRole.functions.invoke('parsePartnerReplyIntent', { text: body }).catch(() => null);
    const parsed = parseRes?.data || {};

    if (!parsed.is_quote_reply || parsed.needs_human_review || parsed.amount == null || !parsed.confirmed) {
      await logEntry('needs_review', parsed.review_reason || 'Reply not confidently a confirmed single-price quote', target.case_id);
      await logProviderContactAttempt(base44, {
        case_id: target.case_id,
        partner_type: target.partner_type === 'travel' ? 'travel_agency' : 'taxi_service',
        partner_id: target.partner_id,
        partner_name: target.partner_name,
        channel: 'sms',
        purpose: 'other',
        recipient: from,
        initiated_by: 'twilioPartnerReplyWebhook',
        result: 'skipped',
        error_detail: parsed.review_reason || 'not confidently parsed',
      });
      return twimlReply("Thanks for your reply — for us to apply it automatically, please text back a single total price and confirmation, e.g. \"$450, confirmed\". Or use your portal link to submit a full quote.");
    }

    // ── Apply the confirmed quote through the one real write path ───────────
    const result = await applyPartnerQuote(base44, {
      case_id: target.case_id,
      partner_type: target.partner_type,
      amount: parsed.amount,
    });

    await logEntry('quote_applied', `amount=${parsed.amount} currency=${parsed.currency || 'USD'}`, target.case_id);
    await logProviderContactAttempt(base44, {
      case_id: target.case_id,
      partner_type: target.partner_type === 'travel' ? 'travel_agency' : 'taxi_service',
      partner_id: target.partner_id,
      partner_name: target.partner_name,
      channel: 'sms',
      purpose: 'other',
      recipient: from,
      initiated_by: 'twilioPartnerReplyWebhook',
      result: 'sent',
    });

    return twimlReply(`Thanks! Quote of $${Number(parsed.amount).toFixed(2)} confirmed and logged for case ${target.case_id.slice(-8).toUpperCase()}. — Morales`);
  } catch (error) {
    console.error('[twilioPartnerReplyWebhook]', error);
    return twimlReply('Error processing your reply. Please contact Morales support or use your portal link.');
  }
});
