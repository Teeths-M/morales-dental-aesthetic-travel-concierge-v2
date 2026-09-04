/**
 * submitPartnerQuoteCore — the real write logic behind "Automation Gate,"
 * extracted from submitPartnerQuote/entry.ts so it has exactly one real
 * implementation. submitPartnerQuote itself (the portal-authenticated path)
 * calls this; twilioPartnerReplyWebhook (a new, service-role caller with no
 * user session — a Twilio webhook can't carry a Base44 login) calls it
 * directly rather than round-tripping through the requireAuth:true HTTP
 * endpoint, which it could not pass anyway.
 *
 * Additive improvement made while extracting, benefiting both callers: a
 * real logJourneyEvent call on a successful quote, so the patient sees
 * "your travel agency confirmed pricing" as a real M-Care chat bubble —
 * submitPartnerQuote never did this before.
 */
import { computePrevHash } from './auditHashChain.ts';
import { logJourneyEvent } from './logJourneyEvent.ts';

export type PartnerType = 'travel' | 'driver' | 'companion' | 'clinic';

export interface ApplyPartnerQuoteResult {
  case_id: string;
  partner_type: PartnerType;
  quote_confirmed: true;
  all_quotas_confirmed: boolean;
  pending_quotes?: string[];
  pipeline_advanced?: boolean;
  message: string;
}

const PARTNER_LABEL: Record<PartnerType, string> = {
  travel: 'your travel agency',
  driver: 'your driver',
  companion: 'your recovery companion service',
  clinic: 'the clinic',
};

export async function applyPartnerQuote(
  base44: any,
  params: { case_id: string; partner_type: PartnerType; amount: number },
): Promise<ApplyPartnerQuoteResult> {
  const { case_id: caseId, partner_type, amount } = params;
  const quotedAmount = Number(amount || 0);
  const now = new Date().toISOString();

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId);

  const update: Record<string, unknown> = {};
  switch (partner_type) {
    case 'travel':
      update.itinerary_status = 'CONFIRMED';
      if (quotedAmount > 0) update.flight_cost = quotedAmount;
      break;
    case 'driver':
      update.transfer_status = 'CONFIRMED';
      if (quotedAmount > 0) update.local_transfer_cost = quotedAmount;
      break;
    case 'companion':
      update.companion_quote_status = 'CONFIRMED';
      if (quotedAmount > 0) update.companion_cost = quotedAmount;
      break;
    case 'clinic':
      update.clinic_quote_status = 'CONFIRMED';
      if (quotedAmount > 0) update.clinic_cost = quotedAmount;
      break;
  }

  await base44.asServiceRole.entities.CaseRecord.update(caseId, update);
  const fresh = await base44.asServiceRole.entities.CaseRecord.get(caseId);

  if (caseRecord?.client_email) {
    await logJourneyEvent(base44, {
      case_id: caseId,
      client_email: caseRecord.client_email,
      event_type: 'partner_quote_confirmed',
      source: 'submitPartnerQuoteCore',
      message_text: quotedAmount > 0
        ? `${PARTNER_LABEL[partner_type]} confirmed pricing — $${quotedAmount.toFixed(2)}.`
        : `${PARTNER_LABEL[partner_type]} confirmed.`,
      priority: 'low',
      action_taken: `partner_type=${partner_type} amount=${quotedAmount}`,
      tool_result: { partner_type, amount: quotedAmount },
      user_action_required: false,
      escalation_occurred: false,
    });
  }

  const allConfirmed = (
    (fresh.itinerary_status === 'CONFIRMED' || fresh.itinerary_status === 'SUBMITTED') &&
    (fresh.transfer_status === 'CONFIRMED' || fresh.transfer_status === 'SUBMITTED') &&
    (fresh.companion_quote_status === 'CONFIRMED') &&
    (fresh.clinic_quote_status === 'CONFIRMED')
  );

  if (allConfirmed && !fresh.all_quotas_confirmed) {
    await base44.asServiceRole.entities.CaseRecord.update(caseId, {
      all_quotas_confirmed: true,
      status: 'Vendor-Pending',
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'all_quotas_confirmed_auto_pricing',
      actor_id: 'system',
      actor_role: 'system',
      actor_name: 'Morales Automation Gate',
      resource_type: 'CaseRecord',
      resource_id: caseId,
      case_id: caseId,
      sensitive: false,
      timestamp: now,
      details: {
        triggering_partner: partner_type,
        travel: fresh.itinerary_status,
        driver: fresh.transfer_status,
        companion: fresh.companion_quote_status,
        clinic: fresh.clinic_quote_status,
      },
      prev_hash: await computePrevHash(base44),
    });

    base44.asServiceRole.functions?.invoke?.('calculatePackagePrice', {
      case_id: caseId,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {});

    return {
      case_id: caseId,
      partner_type,
      quote_confirmed: true,
      all_quotas_confirmed: true,
      pipeline_advanced: true,
      message: 'All 4 partner quotes confirmed. Package pricing calculation triggered automatically.',
    };
  }

  const pending = [
    fresh.itinerary_status !== 'CONFIRMED' && fresh.itinerary_status !== 'SUBMITTED' ? 'travel' : null,
    fresh.transfer_status !== 'CONFIRMED' && fresh.transfer_status !== 'SUBMITTED' ? 'driver' : null,
    fresh.companion_quote_status !== 'CONFIRMED' ? 'companion' : null,
    fresh.clinic_quote_status !== 'CONFIRMED' ? 'clinic' : null,
  ].filter(Boolean) as string[];

  return {
    case_id: caseId,
    partner_type,
    quote_confirmed: true,
    all_quotas_confirmed: false,
    pending_quotes: pending,
    message: `Quote from ${partner_type} saved. Waiting for: ${pending.join(', ')}.`,
  };
}
