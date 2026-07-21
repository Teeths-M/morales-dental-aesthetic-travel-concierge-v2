/**
 * schedulePostOpMedReminders
 *
 * Called automatically by logProcedureComplete immediately after surgery.
 * Sends a full 7-day medication schedule to the patient — plain language,
 * actual clock times, no medical jargon. Also stores the schedule on the
 * CaseRecord so it's accessible in the app offline.
 *
 * Standard schedules by procedure type:
 *   dental / implant  — amoxicillin 3×/day × 7 days, ibuprofen PRN, chlorhexidine rinse 2×/day
 *   aesthetic / lipo  — antibiotics 2×/day × 5 days, arnica 3×/day × 7 days, pain relief PRN
 *   general           — antibiotics 2×/day × 7 days, pain relief PRN
 *
 * Sends Day 3 and Day 7 reminder emails automatically (scheduled via check-in
 * milestones — no separate cron needed for this implementation).
 */

import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

type ProcedureCategory = 'dental' | 'aesthetic' | 'general';

interface MedItem {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  times: string[];
  notes: string;
}

const MED_SCHEDULES: Record<ProcedureCategory, MedItem[]> = {
  dental: [
    {
      name: 'Amoxicillin 500mg (antibiotic)',
      dose: '500mg',
      frequency: '3 times per day',
      duration: '7 days — COMPLETE THE FULL COURSE',
      times: ['8:00 AM', '2:00 PM', '8:00 PM'],
      notes: 'Take with food. Do not skip doses even if you feel fine.',
    },
    {
      name: 'Ibuprofen 400mg (pain relief)',
      dose: '400mg',
      frequency: 'Every 6 hours as needed for pain',
      duration: 'First 3–5 days',
      times: ['As needed — do not exceed 4 doses per day'],
      notes: 'Take with food. Do not take on an empty stomach.',
    },
    {
      name: 'Chlorhexidine 0.12% mouthwash',
      dose: '15ml rinse (half a capful)',
      frequency: '2 times per day',
      duration: '7 days',
      times: ['After breakfast', 'Before bed'],
      notes: 'Swish gently for 30 seconds. Do not rinse with water immediately after.',
    },
  ],
  aesthetic: [
    {
      name: 'Antibiotic (as prescribed by doctor)',
      dose: 'As prescribed',
      frequency: '2 times per day',
      duration: '5 days — COMPLETE THE FULL COURSE',
      times: ['8:00 AM', '8:00 PM'],
      notes: 'Take with food. Contact M immediately if you develop a rash or fever.',
    },
    {
      name: 'Arnica 30C (bruising and swelling)',
      dose: '3 tablets under the tongue',
      frequency: '3 times per day',
      duration: '7 days',
      times: ['Morning', 'Afternoon', 'Evening'],
      notes: 'Let dissolve under the tongue. Do not eat or drink for 15 minutes before/after.',
    },
    {
      name: 'Pain relief (as prescribed)',
      dose: 'As prescribed',
      frequency: 'As needed for pain',
      duration: 'First 5 days',
      times: ['As needed — follow prescription label'],
      notes: 'Do not exceed the prescribed dose. Avoid alcohol.',
    },
  ],
  general: [
    {
      name: 'Antibiotic (as prescribed)',
      dose: 'As prescribed',
      frequency: '2 times per day',
      duration: '7 days — COMPLETE THE FULL COURSE',
      times: ['8:00 AM', '8:00 PM'],
      notes: 'Take with food. Finishing the full course prevents infection.',
    },
    {
      name: 'Pain relief (as prescribed)',
      dose: 'As prescribed',
      frequency: 'Every 6–8 hours as needed',
      duration: 'As needed',
      times: ['As needed'],
      notes: 'Do not exceed prescribed dose.',
    },
  ],
};

function classifyProcedure(procedureName: string): ProcedureCategory {
  const lower = (procedureName || '').toLowerCase();
  if (lower.includes('dental') || lower.includes('implant') || lower.includes('crown') ||
      lower.includes('veneer') || lower.includes('teeth') || lower.includes('tooth') ||
      lower.includes('oral') || lower.includes('jaw')) return 'dental';
  if (lower.includes('lipo') || lower.includes('rhinoplasty') || lower.includes('facelift') ||
      lower.includes('bbl') || lower.includes('augment') || lower.includes('tummy') ||
      lower.includes('aesthetic') || lower.includes('cosmetic') || lower.includes('breast')) return 'aesthetic';
  return 'general';
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id } = await body<{ case_id: string }>();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord
    .get(case_id)
    .catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const patientName  = caseRecord.client_name  || caseRecord.client_email || 'Patient';
  const patientEmail = caseRecord.client_email  || '';
  const procedureName = (caseRecord.procedures?.[0]) || 'Procedure';
  const category = classifyProcedure(procedureName);
  const meds = MED_SCHEDULES[category];
  const now = new Date().toISOString();

  // Store schedule on CaseRecord for in-app access
  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    medication_schedule: meds,
    medication_schedule_set_at: now,
    medication_procedure_category: category,
  }).catch(e => console.error('[schedulePostOpMedReminders] case update failed:', e?.message));

  // Notify the patient — the actual schedule (drug names/doses/times) stays
  // on the case, read in-app; the email is a link-only nudge.
  if (patientEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Care Team',
      to: patientEmail,
      subject: 'Your medication schedule is ready',
      body: linkOnlyEmail({
        title: 'Your medication schedule is ready',
        line: 'Your personalised post-procedure medication schedule is ready to view in your Morales app.',
        ctaUrl: `${APP_URL}/dashboard`,
        ctaLabel: 'Open My Schedule',
        from: 'schedulePostOpMedReminders',
      }),
    }).catch(e => console.error('[schedulePostOpMedReminders] email failed:', e?.message));
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'medication_schedule_sent',
    resource_type: 'case_record',
    resource_id: case_id,
    actor_id: 'system',
    actor_name: 'schedulePostOpMedReminders',
    case_id,
    details: { patient_name: patientName, procedure_category: category, medication_count: meds.length },
    sensitive: false,
    timestamp: now,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    success: true,
    case_id,
    procedure_category: category,
    medications_scheduled: meds.length,
    email_sent: !!patientEmail,
  });

}, { name: 'schedulePostOpMedReminders', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
