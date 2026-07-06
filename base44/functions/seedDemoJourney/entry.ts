import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Seeds one CaseRecord in a rich, mid-journey state (Travel-Coordination, 50%
// deposit paid, doctor confirmed) so the patient dashboard and admin case views
// have something compelling to show instead of an empty state. Admin-only,
// idempotent (safe to click more than once — reuses the existing record rather
// than creating duplicates), and clearly tagged as demo data throughout.

const DEMO_EMAIL = 'demo.sofia.morales@morales-internal.demo';

Deno.serve(createHandler(async ({ base44 }) => {
  const existing = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: DEMO_EMAIL });
  if (existing.length > 0) {
    return ok({
      status: 'already_exists',
      case_id: existing[0].id,
      proposal_token: existing[0].proposal_token,
      message: 'Demo journey already seeded — reused the existing record instead of creating a duplicate.',
    });
  }

  // Best-effort: reference a real active doctor so any code that looks up
  // Doctor.get(doctor_selected) doesn't hit a dead reference. Falls back to a
  // placeholder if no doctors exist yet — never fails the whole seed over this.
  let doctorId = '';
  let doctorEmail = 'demo.doctor@morales-internal.demo';
  let doctorName = 'Dr. Alejandro Reyes (Demo)';
  try {
    const doctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' }, '-created_date', 1);
    if (doctors?.[0]) {
      doctorId = doctors[0].id;
      doctorEmail = doctors[0].email || doctorEmail;
      doctorName = doctors[0].full_name || doctorName;
    }
  } catch (_) { /* Doctor lookup unavailable — placeholder is fine for demo purposes */ }

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

  const treatmentCost = 3500;
  const flightCost = 800;
  const hotelCost = 600;
  const pickupCost = 100;
  const dropoffCost = 100;
  const localTransferCost = 150;
  const baseCost = treatmentCost + flightCost + hotelCost + pickupCost + dropoffCost + localTransferCost;
  const markup = 0.35;
  const finalPrice = Math.round(baseCost * (1 + markup) * 100) / 100;
  const amountPaid = Math.round(finalPrice * 0.5 * 100) / 100;
  const amountRemaining = Math.round((finalPrice - amountPaid) * 100) / 100;

  let caseRecord;
  try {
    caseRecord = await base44.asServiceRole.entities.CaseRecord.create({
      client_name: 'Sofia Morales (DEMO)',
      client_email: DEMO_EMAIL,
      client_phone: '+1-555-0100',
      client_country: 'United States',
      procedure_country: 'Venezuela',
      procedures: ['Dental Implants', 'Smile Makeover'],
      consultation_summary: 'Demo patient seeded for buildathon judge walkthrough — safe to delete, not a real patient.',
      status: 'Travel-Coordination',
      safe_t_result: 'PASSED',
      doctor_selected: doctorId,
      doctor_email: doctorEmail,
      doctor_confirmation_status: 'CONFIRMED',
      doctor_notified_at: daysAgo(6),
      doctor_confirmed_at: daysAgo(5),
      treatment_cost: treatmentCost,
      recovery_days: 7,
      treatment_duration: 3,
      flight_cost: flightCost,
      flight_details: 'Round-trip · Miami (MIA) → Caracas (CCS) · window seats requested',
      hotel_cost: hotelCost,
      hotel_name: 'Hotel Eurobuilding Caracas',
      hotel_address: 'Calle La Guairita, Chuao, Caracas, Venezuela',
      itinerary_status: 'CONFIRMED',
      pickup_cost: pickupCost,
      dropoff_cost: dropoffCost,
      local_transfer_cost: localTransferCost,
      transfer_status: 'CONFIRMED',
      base_cost: baseCost,
      markup_percentage: markup,
      final_package_price: finalPrice,
      deposit_option: '50%',
      payment_status: '50% Paid',
      consultation_fee_paid: true,
      consultation_fee_amount: 49,
      amount_paid: amountPaid,
      amount_remaining: amountRemaining,
      proposal_sent_at: daysAgo(5),
      itinerary_sent: true,
      travel_confirmed: true,
      transfer_confirmed: true,
      admin_notes: 'SEED DEMO DATA — created by seedDemoJourney for buildathon judge walkthrough. Safe to delete; not a real patient.',
      timeline_log: [
        { timestamp: daysAgo(7), action: 'created', details: 'Case created from consultation' },
        { timestamp: daysAgo(7), action: 'safe_t_reviewed', details: 'SAFE-T 4LIFE review passed — low risk' },
        { timestamp: daysAgo(6), action: 'doctor_notified', details: `Doctor ${doctorName} notified for review` },
        { timestamp: daysAgo(5), action: 'doctor_confirmed', details: `Doctor ${doctorName} confirmed availability and procedure quote` },
        { timestamp: daysAgo(5), action: 'proposal_sent', details: 'Full travel package proposal sent to patient' },
        { timestamp: daysAgo(4), action: 'payment_confirmed_by_stripe_webhook', details: `Webhook confirmed: 50% Paid — $${amountPaid}` },
        { timestamp: daysAgo(3), action: 'travel_coordination', details: 'Flights, hotel, and transfers confirmed — patient in travel coordination stage' },
      ],
    });
  } catch (e) {
    console.error('[seedDemoJourney] CaseRecord.create failed:', e);
    return err('Failed to create demo case record.', 500);
  }

  const proposalToken = `prop_${caseRecord.id}`;
  await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, { proposal_token: proposalToken });

  return ok({
    status: 'created',
    case_id: caseRecord.id,
    client_name: 'Sofia Morales (DEMO)',
    client_email: DEMO_EMAIL,
    proposal_token: proposalToken,
    doctor_referenced: !!doctorId,
    message: 'Demo journey seeded — visible on the patient dashboard and admin case views.',
  });
}, { name: 'seedDemoJourney', allowedRoles: ['admin', 'platform_admin'] }));
