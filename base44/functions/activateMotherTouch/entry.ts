import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { linkOnlyEmail, linkOnlySms } from '../_shared/notify.ts';

/**
 * activateMotherTouch
 *
 * Step 1 of the Mother's Touch workflow.
 * Triggered automatically when HS5 (Clinic Arrival) is confirmed.
 *
 * Flow:
 * 1. Load case + dietary profile
 * 2. Find the nearest available vetted companion (matching language + location)
 * 3. Create MothersTouchAssignment + MealDelivery schedule
 * 4. Notify companion: patient brief, dietary restrictions, hotel address
 * 5. Notify patient: your companion is [Name], they'll be with you at [time]
 * 6. Update CaseRecord with mother_touch_active = true
 */

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

async function sendSms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, handshake_number } = await body();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const patientName     = caseRecord.client_name || 'Patient';
  const caseRef         = case_id.slice(-8).toUpperCase();
  const now             = new Date().toISOString();
  const recoveryDays    = caseRecord.recovery_days || 3;

  // Load dietary profile
  const dietary = caseRecord.dietary_profile_id
    ? await base44.asServiceRole.entities.DietaryProfile.get(caseRecord.dietary_profile_id).catch(() => null)
    : null;
  const allergies  = dietary?.allergies     || caseRecord.allergies     || '';
  const aiMealPlan = dietary?.ai_recovery_plan || caseRecord.ai_recovery_plan || '';
  const hotelAddr  = caseRecord.hotel_address || caseRecord.hotel_name || '';
  const destCountry = caseRecord.procedure_country || '';

  // ── Auto-match companion ───────────────────────────────────────────────────
  // Prefer companions in the same country, verified, available, with food prep skills
  let companions = await base44.asServiceRole.entities.Companion.filter({
    verification_status: 'verified',
    is_available: true,
  }).catch(() => []);

  // Prefer destination-country companions
  const local = companions.filter((c: any) => (c.service_regions || []).includes(destCountry));
  const companion = local[0] ?? companions[0] ?? null;

  if (!companion) {
    return err('No available vetted companions found for this location. Please assign manually from admin.');
  }

  // ── Build meal delivery schedule ───────────────────────────────────────────
  const scheduleLines: string[] = [];
  const today = new Date();
  const deliveries = [];

  for (let day = 0; day < recoveryDays; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const meals = day === 0
      ? [{ type: 'dinner',    hour: 18 }]
      : [{ type: 'breakfast', hour: 8  }, { type: 'lunch', hour: 12 }, { type: 'dinner', hour: 18 }];

    for (const meal of meals) {
      const mealDate = new Date(date);
      mealDate.setHours(meal.hour, 0, 0, 0);
      scheduleLines.push(`${dateStr} ${meal.hour}:00 — ${meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}`);
      deliveries.push({ meal_type: meal.type, scheduled_for: mealDate.toISOString() });
    }
  }

  // ── Create MothersTouchAssignment ──────────────────────────────────────────
  const assignment = await base44.asServiceRole.entities.MothersTouchAssignment.create({
    case_id,
    companion_id:         companion.id,
    companion_name:       companion.full_name || companion.email,
    companion_whatsapp:   companion.phone || '',
    patient_name:         patientName,
    patient_email:        caseRecord.client_email,
    lodging_address:      hotelAddr,
    dietary_parameters:   [allergies, aiMealPlan].filter(Boolean).join('\n\n') || 'No restrictions noted',
    service_dates:        deliveries.map(d => d.scheduled_for.split('T')[0]),
    status:               'active',
    care_baseline_fee_usd:  companion.daily_rate_usd || 40,
    grocery_budget_usd:   30 * recoveryDays,
    platform_commission_rate: 0.175,
    created_at:           now,
  });

  // ── Create individual MealDelivery records ────────────────────────────────
  for (const d of deliveries) {
    await base44.asServiceRole.entities.MealDelivery.create({
      mothers_touch_assignment_id: assignment.id,
      case_id,
      companion_id:   companion.id,
      patient_email:  caseRecord.client_email,
      meal_type:      d.meal_type,
      scheduled_for:  d.scheduled_for,
      status:         'scheduled',
    }).catch(() => {});
  }

  // ── Update CaseRecord ──────────────────────────────────────────────────────
  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    companion_assignment_id: assignment.id,
    companion_quote_status:  'CONFIRMED',
  });

  // ── Dispatch notifications ─────────────────────────────────────────────────
  // Allergies, meal plan, hotel address and schedule all stay in-platform —
  // already stored above on MothersTouchAssignment/CaseRecord and surfaced by
  // the companion dashboard (DietaryInfoCard). Outbound is link-only.
  const scheduleText = scheduleLines.join('\n');
  const tasks: Promise<unknown>[] = [];

  // Email companion
  if (companion.email) {
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: companion.email,
      subject: "A new Mother's Touch assignment is ready",
      body: linkOnlyEmail({
        title: "A new Mother's Touch assignment is ready",
        line: 'A patient needs your support after their procedure. Open your dashboard for the full brief — dietary needs, allergies, location and schedule.',
        ctaUrl: `${APP_URL}/companion-dashboard`,
        ctaLabel: 'Open Companion Dashboard',
        brand: BRAND,
        from: 'activateMotherTouch',
      }),
    }));
  }

  // SMS companion
  if (companion.phone) {
    tasks.push(sendSms(companion.phone, linkOnlySms({
      line: "You have a new Mother's Touch assignment — check your portal for the full brief.",
      url: `${APP_URL}/companion-dashboard`,
      from: 'activateMotherTouch',
    })));
  }

  // Notify patient
  if (caseRecord.client_email) {
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: caseRecord.client_email,
      subject: 'Your Mother\'s Touch companion is ready',
      body: linkOnlyEmail({
        title: "You're not alone",
        line: 'Your recovery companion has been notified and briefed — they know your dietary needs, allergies and hotel address. Open your journey to see your schedule.',
        ctaUrl: `${APP_URL}/dashboard`,
        ctaLabel: 'View My Journey',
        brand: BRAND,
        from: 'activateMotherTouch',
      }),
    }));
  }

  // SMS patient
  if (caseRecord.client_phone) {
    tasks.push(sendSms(caseRecord.client_phone, linkOnlySms({
      line: 'Your Mother\'s Touch companion is assigned and briefed. You are not alone — check the app for your schedule.',
      url: `${APP_URL}/dashboard`,
      from: 'activateMotherTouch',
    })));
  }

  // Push notification — gentle triple buzz when companion is assigned
  if (caseRecord.client_email) {
    tasks.push(
      base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
        user_email: caseRecord.client_email,
        title:      '🤱 Your Companion Is Ready',
        body:       `${companion.full_name || 'Your companion'} is briefed and on the way. First visit: ${scheduleLines[0] || 'today at 6 PM'}.`,
        url:        '/dashboard',
        type:       'companion',
        tag:        `companion-${case_id}`,
      }).catch(() => {}) ?? Promise.resolve()
    );
  }

  await Promise.allSettled(tasks);

  return ok({
    assignment_id:    assignment.id,
    companion_name:   companion.full_name || companion.email,
    meals_scheduled:  deliveries.length,
    recovery_days:    recoveryDays,
    patient_notified: !!(caseRecord.client_email || caseRecord.client_phone),
  });
}, { name: 'activateMotherTouch', requireAuth: false }));
