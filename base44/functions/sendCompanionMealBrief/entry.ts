import { createHandler, ok, err } from '../_shared/createHandler.ts';

const BRAND   = 'Morales Medical Travel Safety';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function mealBriefEmail({ companionName, patientName, procedures, cuisine, comfortFoods, companionNotes, aiPlan, caseRef, deliveryDate }: {
  companionName: string; patientName: string; procedures: string; cuisine: string;
  comfortFoods: string; companionNotes: string; aiPlan: string; caseRef: string; deliveryDate: string;
}) {
  const hasPlan = aiPlan && aiPlan.trim().length > 20;
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;">
  <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">${BRAND}</div>
  <div style="width:120px;height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:12px 0;"></div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">Recovery Meal Brief — Companion</div>
</td></tr>
<tr><td style="padding:32px;">
  <div style="font-size:28px;margin-bottom:16px;">🍽️</div>
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">
    Your patient's recovery brief is ready.
  </h1>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#40514a;">
    Dear ${e(companionName)}, you have been assigned to support <strong>${e(patientName)}</strong> during their recovery. Here is everything you need to prepare their meals and provide comfort.
  </p>

  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:24px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Patient</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(patientName)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Procedure(s)</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(procedures)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Delivery Date</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(deliveryDate)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Case Reference</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(caseRef)}</td></tr>
  </table>

  <!-- Dietary preferences -->
  <div style="background:#f8faf9;border:1px solid #e7ede9;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#29483d;font-weight:700;margin-bottom:12px;">🌿 Dietary Preferences</div>
    <table width="100%" cellspacing="0" cellpadding="0">
      ${cuisine ? `<tr><td style="padding:6px 0;color:#64746d;font-size:13px;width:45%;">Preferred cuisine</td><td style="padding:6px 0;color:#13221d;font-size:13px;font-weight:600;">${e(cuisine)}</td></tr>` : ''}
      ${comfortFoods ? `<tr><td style="padding:6px 0;color:#64746d;font-size:13px;">Comfort foods</td><td style="padding:6px 0;color:#13221d;font-size:13px;">${e(comfortFoods)}</td></tr>` : ''}
    </table>
  </div>

  ${companionNotes ? `<div style="background:#fff8ed;border-left:4px solid #e8a020;border-radius:0 12px 12px 0;padding:14px 16px;margin-bottom:20px;">
    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#9a6500;font-weight:700;margin-bottom:6px;">📋 Special Notes</div>
    <p style="margin:0;font-size:14px;color:#40514a;line-height:1.6;">${e(companionNotes)}</p>
  </div>` : ''}

  ${hasPlan ? `<div style="background:#060B1608;border:1px solid #2A3F4A30;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#29483d;font-weight:700;margin-bottom:10px;">✨ AI Recovery Meal Plan</div>
    <p style="margin:0;font-size:13px;color:#40514a;line-height:1.8;white-space:pre-line;">${e(aiPlan)}</p>
  </div>` : ''}

  <!-- Guidelines -->
  <div style="background:#f0f9f4;border:1px solid #c6e8d3;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#166534;font-weight:700;margin-bottom:10px;">🏥 Post-Procedure Meal Guidelines</div>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#40514a;line-height:1.8;">
      <li>Soft, easy-to-digest foods for the first 48 hours post-surgery</li>
      <li>Avoid hot, spicy, or hard foods unless cleared by the doctor</li>
      <li>Ensure adequate hydration — water, broths, and gentle herbal teas</li>
      <li>Small portions, 5–6 times per day rather than 3 large meals</li>
      <li>Always confirm any allergen concerns with the patient before preparation</li>
    </ul>
  </div>

  <a href="${APP_URL}/companion-dashboard" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;">
    Open Companion Dashboard →
  </a>
  <p style="margin:24px 0 0;font-size:13px;color:#64746d;line-height:1.6;">
    Contact the Morales team immediately if the patient reports any adverse reactions or discomfort.<br/>
    Thank you for providing compassionate, professional care.
  </p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, companion_email } = await body();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found');

  // Load dietary profile
  const dietary = caseRecord.dietary_profile_id
    ? await base44.asServiceRole.entities.DietaryProfile.get(caseRecord.dietary_profile_id).catch(() => null)
    : null;

  const patientName   = caseRecord.client_name || 'Patient';
  const procedures    = (caseRecord.procedures || []).join(', ') || 'Procedure TBC';
  const caseRef       = case_id.slice(-8).toUpperCase();
  const deliveryDate  = caseRecord.procedure_date
    ? new Date(caseRecord.procedure_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'To be confirmed';

  const cuisine        = dietary?.preferred_cuisine || caseRecord.preferred_cuisine || '';
  const comfortFoods   = dietary?.comfort_foods     || caseRecord.comfort_foods     || '';
  const companionNotes = dietary?.companion_notes   || caseRecord.companion_notes   || '';
  const aiPlan         = dietary?.ai_recovery_plan  || caseRecord.ai_recovery_plan  || '';

  // Determine companion email(s)
  const targets: string[] = [];
  if (companion_email) targets.push(companion_email);

  if (!targets.length) {
    // Auto-find assigned companions for this case
    const assignments = await base44.asServiceRole.entities.CompanionAssignment.filter({ case_id }).catch(() => []);
    for (const ca of assignments) {
      if (ca.companion_id) {
        const c = await base44.asServiceRole.entities.Companion.get(ca.companion_id).catch(() => null);
        if (c?.email) targets.push(c.email);
      }
    }
  }

  if (!targets.length) return err('No companion email found for this case');

  const tasks = targets.map(to => {
    const companionName = to.split('@')[0]; // fallback name
    return base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to,
      subject: `Recovery Meal Brief — ${patientName} | ${BRAND}`,
      body: mealBriefEmail({ companionName, patientName, procedures, cuisine, comfortFoods, companionNotes, aiPlan, caseRef, deliveryDate }),
    });
  });

  await Promise.allSettled(tasks);

  return ok({ sent_to: targets, patient: patientName, case_ref: caseRef });
}, { name: 'sendCompanionMealBrief', requireAuth: false }));
