/**
 * sendPostOpInstructions
 *
 * Formats the doctor's outcome notes into plain-language post-op care
 * instructions and delivers them to the patient via email + SMS summary.
 *
 * Called automatically by logProcedureComplete when outcome_notes are provided.
 * Can also be called manually by admin if notes were added after the fact.
 *
 * Combines doctor's specific notes with standard post-op care rules for the
 * procedure category so the patient has everything in one place.
 */

import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { linkOnlyEmail, linkOnlySms } from '../_shared/notify.ts';
import { classifyProcedureCategory } from '../_shared/procedureCategory.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

async function sendSms(to: string, body: string): Promise<void> {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !sid.startsWith('AC')) return;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${sid}:${auth}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  }).catch(e => console.warn('[sendPostOpInstructions] SMS failed:', e.message));
}

const STANDARD_CARE: Record<string, string[]> = {
  dental: [
    'Do not eat solid food for 24 hours. Soft foods only (yogurt, soup, mashed potato) for 5 days.',
    'No hot drinks, alcohol, or smoking for 48 hours.',
    'Do not touch the surgical area with your tongue or fingers.',
    'Sleep with your head elevated (extra pillow) for the first 3 nights.',
    'Gentle salt-water rinses starting 24 hours after surgery — 1 teaspoon salt in a glass of warm water, 3 times daily.',
    'Some bleeding for 24–48 hours is normal. Bite gently on gauze for 30 minutes if bleeding is heavy.',
  ],
  aesthetic: [
    'Do not apply pressure or massage the treated area for 2 weeks.',
    'Sleep on your back — do not put pressure on surgical sites.',
    'No direct sun exposure to treated areas for 6 weeks. SPF 50+ if going outside.',
    'No strenuous exercise, bending, or lifting for 3 weeks.',
    'Compression garments (if provided) must be worn as instructed.',
    'Swelling and bruising are normal and peak at Day 3. They will reduce by Day 10–14.',
  ],
  general: [
    'Rest completely for the first 24 hours.',
    'Do not drive or operate machinery for 24 hours after anaesthesia.',
    'Drink plenty of water. Eat light meals.',
    'Do not lift anything heavy for 48 hours.',
    'Keep the surgical area clean and dry.',
    'Contact M immediately if you develop fever, unusual pain, or any unexpected symptoms.',
  ],
};

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, outcome_notes } = await body<{ case_id: string; outcome_notes?: string }>();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord
    .get(case_id)
    .catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const patientName   = caseRecord.client_name   || caseRecord.client_email || 'Patient';
  const patientEmail  = caseRecord.client_email   || '';
  const patientPhone  = caseRecord.client_phone   || '';
  const procedureName = caseRecord.procedures?.[0] || 'your procedure';
  const notes         = outcome_notes || caseRecord.procedure_outcome_notes || '';
  const category      = classifyProcedureCategory(procedureName);
  const standardCare  = STANDARD_CARE[category] || STANDARD_CARE.general;
  const now           = new Date().toISOString();

  // Notify the patient — the doctor's outcome notes and full care
  // instructions stay on the case, read in-app; outbound is link-only.
  if (patientEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Care Team',
      to: patientEmail,
      subject: 'Your post-op care instructions are ready',
      body: linkOnlyEmail({
        title: 'Your post-op care instructions are ready',
        line: 'Your doctor’s notes and post-procedure care instructions are ready to view in your Morales app.',
        ctaUrl: `${APP_URL}/dashboard`,
        ctaLabel: 'Open My Instructions',
        from: 'sendPostOpInstructions',
      }),
    }).catch(e => console.error('[sendPostOpInstructions] email failed:', e?.message));
  }

  if (patientPhone) {
    await sendSms(
      patientPhone,
      linkOnlySms({
        line: 'Your post-op care instructions are ready — check your email or open the app.',
        url: `${APP_URL}/dashboard`,
        from: 'sendPostOpInstructions',
      }),
    );
  }

  // Store notes on case for in-app access
  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    procedure_outcome_notes: notes,
    post_op_instructions_sent_at: now,
    post_op_instructions_category: category,
  }).catch(e => console.error('[sendPostOpInstructions] case update failed:', e?.message));

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'post_op_instructions_sent',
    resource_type: 'case_record',
    resource_id: case_id,
    actor_id: 'system',
    actor_name: 'sendPostOpInstructions',
    case_id,
    details: { patient_name: patientName, procedure_category: category, has_doctor_notes: !!notes },
    sensitive: false,
    timestamp: now,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    success: true,
    case_id,
    email_sent: !!patientEmail,
    sms_sent: !!patientPhone,
    procedure_category: category,
    standard_rules_count: standardCare.length,
  });

}, { name: 'sendPostOpInstructions', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
