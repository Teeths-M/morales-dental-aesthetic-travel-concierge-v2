import { createHandler, ok, err } from '../_shared/createHandler.ts';

/**
 * submitPartnerQuote — Automation Gate
 *
 * Every partner quote submission flows through here. After saving the quote:
 * 1. Updates the partner-specific cost field + quote status on CaseRecord
 * 2. Checks if ALL 4 partner quotes are now confirmed
 * 3. If all confirmed → auto-fires calculatePackagePrice → sendPayNowEmail
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

  const quotedAmount = Number(amount || 0);
  const now = new Date().toISOString();

  // ── Update the appropriate fields for this partner type ───────────────────
  const update: Record<string, unknown> = {};

  switch (partner_type) {
    case 'travel':
      // Travel agency quotes flight + hotel together (amount = combined)
      update.itinerary_status = 'CONFIRMED';
      if (quotedAmount > 0) update.flight_cost = quotedAmount; // stored as combined travel cost
      break;

    case 'driver':
      // Chauffeur submits transfer legs — mark confirmed when any submission received
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

  // Reload to get fresh state after update
  const fresh = await base44.asServiceRole.entities.CaseRecord.get(caseId);

  // ── Check if ALL 4 partner quotes are now confirmed ───────────────────────
  const allConfirmed = (
    (fresh.itinerary_status      === 'CONFIRMED' || fresh.itinerary_status      === 'SUBMITTED') &&
    (fresh.transfer_status       === 'CONFIRMED' || fresh.transfer_status       === 'SUBMITTED') &&
    (fresh.companion_quote_status === 'CONFIRMED') &&
    (fresh.clinic_quote_status    === 'CONFIRMED')
  );

  if (allConfirmed && !fresh.all_quotas_confirmed) {
    // Mark all quotas confirmed and fire pricing calculation automatically
    await base44.asServiceRole.entities.CaseRecord.update(caseId, {
      all_quotas_confirmed: true,
      status: 'Vendor-Pending', // calculatePackagePrice will move it to Proposal-Sent
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type:   'all_quotas_confirmed_auto_pricing',
      actor_id:     'system',
      actor_role:   'system',
      actor_name:   'Morales Automation Gate',
      resource_type:'CaseRecord',
      resource_id:  caseId,
      case_id:      caseId,
      sensitive:    false,
      timestamp:    now,
      details: {
        triggering_partner: partner_type,
        travel:   fresh.itinerary_status,
        driver:   fresh.transfer_status,
        companion:fresh.companion_quote_status,
        clinic:   fresh.clinic_quote_status,
      },
    });

    // Auto-fire: calculatePackagePrice → sendPayNowEmail (async, non-blocking)
    base44.asServiceRole.functions?.invoke?.('calculatePackagePrice', { case_id: caseId }).catch(() => {});

    return ok({
      case_id: caseId,
      partner_type,
      quote_confirmed: true,
      all_quotas_confirmed: true,
      pipeline_advanced: true,
      message: 'All 4 partner quotes confirmed. Package pricing calculation triggered automatically.',
    });
  }

  // Log which quotes are still pending
  const pending = [
    fresh.itinerary_status      !== 'CONFIRMED' && fresh.itinerary_status      !== 'SUBMITTED' ? 'travel'    : null,
    fresh.transfer_status       !== 'CONFIRMED' && fresh.transfer_status       !== 'SUBMITTED' ? 'driver'    : null,
    fresh.companion_quote_status !== 'CONFIRMED'                                               ? 'companion' : null,
    fresh.clinic_quote_status    !== 'CONFIRMED'                                               ? 'clinic'    : null,
  ].filter(Boolean);

  return ok({
    case_id: caseId,
    partner_type,
    quote_confirmed: true,
    all_quotas_confirmed: false,
    pending_quotes: pending,
    message: `Quote from ${partner_type} saved. Waiting for: ${pending.join(', ')}.`,
  });
}, { name: 'submitPartnerQuote', requireAuth: false }));
