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

function classifyProcedure(procedureName: string): string {
  const lower = (procedureName || '').toLowerCase();
  if (lower.includes('dental') || lower.includes('implant') || lower.includes('oral') ||
      lower.includes('teeth') || lower.includes('crown') || lower.includes('veneer')) return 'dental';
  if (lower.includes('lipo') || lower.includes('rhinoplasty') || lower.includes('facelift') ||
      lower.includes('bbl') || lower.includes('tummy') || lower.includes('breast') ||
      lower.includes('aesthetic') || lower.includes('cosmetic')) return 'aesthetic';
  return 'general';
}

function buildInstructionsEmail(
  patientName: string,
  procedureName: string,
  doctorName: string,
  outcomeNotes: string,
  standardCare: string[],
): string {
  const firstName = patientName?.split(' ')[0] || patientName;
  const lines: string[] = [
    `Dear ${firstName},`,
    ``,
    `Your ${procedureName} is complete. Below are your care instructions from Dr. ${doctorName} and your Morales care team.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `FROM YOUR DOCTOR`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    outcomeNotes
      ? outcomeNotes
      : 'Your procedure went well. Follow the care instructions below.',
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `POST-OPERATIVE CARE — FOLLOW EXACTLY`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
  ];

  standardCare.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`);
  });

  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`CONTACT M IMMEDIATELY IF:`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`• Temperature above 38.5°C / 101.3°F`);
  lines.push(`• Pain that does not improve after taking pain relief`);
  lines.push(`• Signs of infection: redness, warmth, discharge, or unusual odour`);
  lines.push(`• Difficulty breathing or chest pain`);
  lines.push(`• Any symptom that concerns you — we are here 24 hours`);
  lines.push(``);
  lines.push(`Open the Morales app → Secure Line.`);
  lines.push(`Or reply to this email. We check it continuously.`);
  lines.push(``);
  lines.push(`You are in safe hands. Rest well.`);
  lines.push(``);
  lines.push(`— Dr. ${doctorName} and the Morales Care Team`);

  return lines.join('\n');
}

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
  const doctorName    = caseRecord.doctor_name    || caseRecord.doctor_email || 'your doctor';
  const procedureName = caseRecord.procedures?.[0] || 'your procedure';
  const notes         = outcome_notes || caseRecord.procedure_outcome_notes || '';
  const category      = classifyProcedure(procedureName);
  const standardCare  = STANDARD_CARE[category] || STANDARD_CARE.general;
  const now           = new Date().toISOString();

  if (patientEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: `Dr. ${doctorName} via Morales`,
      to: patientEmail,
      subject: `Your post-op care instructions — ${procedureName}`,
      body: buildInstructionsEmail(patientName, procedureName, doctorName, notes, standardCare),
    }).catch(e => console.error('[sendPostOpInstructions] email failed:', e?.message));
  }

  // SMS — short version with the key rule and Secure Line reminder
  if (patientPhone) {
    const firstName = patientName.split(' ')[0];
    await sendSms(
      patientPhone,
      `Morales: ${firstName}, your post-op care instructions have been sent to your email. Key rule: ${standardCare[0]} Questions? Open the app → Secure Line.`,
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
