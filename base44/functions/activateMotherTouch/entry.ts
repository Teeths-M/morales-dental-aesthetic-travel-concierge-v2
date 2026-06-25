import { createHandler, ok, err } from '../_shared/createHandler.ts';

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

const BRAND   = 'Morales Dental & Aesthetics';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function sendSms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

function companionActivationEmail({ companionName, patientName, patientAllergies, mealPlan, hotelAddress, procedureType, scheduleText, caseRef }: {
  companionName: string; patientName: string; patientAllergies: string; mealPlan: string;
  hotelAddress: string; procedureType: string; scheduleText: string; caseRef: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${BRAND}</div>
  <div style="width:120px;height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:10px 0;"></div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">🤱 Mother's Touch — Assignment Activated</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">
    Hello ${e(companionName)}, your patient needs you.
  </h1>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#40514a;">
    <strong>${e(patientName)}</strong> has just completed their procedure and is now in recovery.
    You have been matched as their Mother's Touch companion. Please review the patient brief below
    and make your way to their location at the scheduled time.
  </p>

  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:24px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Patient</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(patientName)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Procedure</td><td style="padding:10px 0;color:#13221d;font-size:14px;">${e(procedureType)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Location</td><td style="padding:10px 0;color:#13221d;font-size:14px;">${e(hotelAddress || 'See dashboard for address')}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Case Reference</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(caseRef)}</td></tr>
  </table>

  ${patientAllergies ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 16px;border-radius:0 12px 12px 0;margin-bottom:20px;">
    <div style="font-size:12px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;color:#dc2626;margin-bottom:6px;">⚠️ Allergies & Dietary Restrictions</div>
    <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">${e(patientAllergies)}</p>
  </div>` : ''}

  ${mealPlan ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 16px;border-radius:0 12px 12px 0;margin-bottom:20px;">
    <div style="font-size:12px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;color:#166534;margin-bottom:6px;">✅ AI Recovery Meal Plan</div>
    <p style="margin:0;font-size:13px;color:#14532d;line-height:1.8;white-space:pre-line;">${e(mealPlan)}</p>
  </div>` : ''}

  <div style="background:#f8faf9;border:1px solid #e7ede9;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
    <div style="font-size:12px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;color:#29483d;margin-bottom:10px;">📅 Your Schedule</div>
    <p style="margin:0;font-size:13px;color:#40514a;line-height:1.8;">${e(scheduleText)}</p>
  </div>

  <a href="${APP_URL}/companion-dashboard" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;">
    Open Companion Dashboard →
  </a>
  <p style="margin:24px 0 0;font-size:13px;color:#64746d;line-height:1.6;">
    Please upload receipts via the dashboard after each grocery purchase. The patient will approve expenses in real time.
    Contact Morales via WhatsApp immediately if you have any concerns about the patient's wellbeing.
  </p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, handshake_number } = await body();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const patientName     = caseRecord.client_name || 'Patient';
  const procedures      = (caseRecord.procedures || []).join(', ') || 'Medical procedure';
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
  const scheduleText = scheduleLines.join('\n');
  const tasks: Promise<unknown>[] = [];

  // Email companion
  if (companion.email) {
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: companion.email,
      subject: `Mother's Touch Assignment — ${patientName} | ${BRAND}`,
      body: companionActivationEmail({
        companionName: companion.full_name || companion.email,
        patientName, patientAllergies: allergies, mealPlan: aiMealPlan,
        hotelAddress: hotelAddr, procedureType: procedures, scheduleText, caseRef,
      }),
    }));
  }

  // SMS companion
  if (companion.phone) {
    tasks.push(sendSms(companion.phone,
      `Hi ${companion.full_name?.split(' ')[0] || 'Companion'}, you have a new Mother's Touch assignment. ${patientName} needs you after their procedure in ${destCountry}. Check your portal for details: ${APP_URL}/companion-dashboard — ${BRAND}`
    ));
  }

  // Notify patient
  if (caseRecord.client_email) {
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: caseRecord.client_email,
      subject: `Your Mother's Touch companion is ready — ${caseRef} | ${BRAND}`,
      body: `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="padding:28px 32px;border-bottom:1px solid #2A3F4A;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">${BRAND}</div>
  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-top:8px;">🤱 Mother's Touch — Activated</div>
</td></tr>
<tr><td style="padding:28px 32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#fff;">
    You're not alone, ${e(patientName.split(' ')[0])}.
  </h1>
  <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;">
    Your recovery companion <strong style="color:#fff;">${e(companion.full_name || 'Your Companion')}</strong> has been notified and briefed.
    They know your dietary needs, your allergies, and your hotel address. They will be with you for your meals and recovery visits.
  </p>
  <div style="background:#0a1a0a;border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:16px 18px;margin-bottom:20px;">
    <p style="margin:0;font-size:13px;color:#4ade80;line-height:1.8;">${scheduleText.replace(/\n/g, '<br/>')}</p>
  </div>
  <p style="margin:0 0 20px;font-size:13px;color:rgba(255,255,255,0.5);">
    You do not need to pay anything. All companion costs are covered by Morales and will be requested through the app for your approval only.
  </p>
  <a href="${APP_URL}/dashboard" style="display:inline-block;background:${GOLD};color:#060B16;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;">
    View My Journey →
  </a>
  <p style="margin:20px 0 0;font-size:12px;color:#475569;text-align:center;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`,
    }));
  }

  // SMS patient
  if (caseRecord.client_phone) {
    tasks.push(sendSms(caseRecord.client_phone,
      `Hi ${patientName.split(' ')[0]}, your Mother's Touch companion ${companion.full_name || 'is assigned'} and briefed. First visit: ${scheduleLines[0] || 'today at 6 PM'}. You are not alone. — ${BRAND}`
    ));
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
