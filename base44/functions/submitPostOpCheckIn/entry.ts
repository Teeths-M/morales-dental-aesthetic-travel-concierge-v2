/**
 * submitPostOpCheckIn
 *
 * Public endpoint — no auth required. Patient submits their recovery check-in
 * via the link emailed to them (token-gated, one-time use).
 *
 * On submission:
 * 1. Validates token and marks check-in as submitted
 * 2. If pain ≥ 7 or concerns flagged → sets needs_doctor_followup = true
 * 3. Notifies doctor by email if follow-up needed
 * 4. Creates AuditLog entry
 */
import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { z, strictObject, Fields } from '../_shared/validate.ts';

const SubmitPostOpCheckInSchema = strictObject({
  token: Fields.shortText(200),
  rating: Fields.boundedInt(1, 5),
  pain_level: Fields.boundedInt(0, 10).optional(),
  note: z.string().max(2000).optional().default(''),
  concerns: z.array(z.string().max(200)).max(20).optional().default([]),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { token, rating, pain_level, note, concerns } = await body();

  if (!token)  return err('token is required');
  if (!rating || rating < 1 || rating > 5) return err('rating must be 1–5');

  // Find check-in by token
  const records = await base44.asServiceRole.entities.PostOpCheckIn.filter({ response_token: token }).catch(() => []);
  if (!records.length) return err('Invalid or expired check-in link', 404);

  const rec = records[0];
  if (rec.status === 'submitted') return ok({ success: true, already_submitted: true });

  const needsFollowup = (pain_level ?? 0) >= 7 || (concerns && concerns.length > 0);
  const now = new Date().toISOString();

  // Mark as submitted
  await base44.asServiceRole.entities.PostOpCheckIn.update(rec.id, {
    rating,
    pain_level:             pain_level ?? null,
    note:                   note || '',
    concerns:               concerns || [],
    needs_doctor_followup:  needsFollowup,
    status:                 'submitted',
    submitted_at:           now,
    response_token:         '', // invalidate token after use
  });

  // Notify doctor if follow-up needed
  if (needsFollowup && rec.doctor_email) {
    const firstName = (rec.patient_name || 'Patient').split(' ')[0];
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales — Recovery Alert',
      to:        rec.doctor_email,
      subject:   `⚠️ Day ${rec.day} Recovery Flag — ${rec.patient_name} needs follow-up`,
      body: `<p>Your patient <strong>${rec.patient_name}</strong> submitted their Day ${rec.day} post-op check-in and flagged a concern.</p>
<table><tr><td>Recovery rating</td><td><strong>${rating}/5</strong></td></tr>
<tr><td>Pain level</td><td><strong>${pain_level}/10</strong></td></tr>
${concerns?.length ? `<tr><td>Concerns</td><td><strong>${concerns.join(', ')}</strong></td></tr>` : ''}
${note ? `<tr><td>Patient note</td><td>${note}</td></tr>` : ''}
</table>
<p>Please follow up with ${firstName} at your earliest convenience.</p>
<p>Procedure: ${rec.procedure}<br/>Case: ${rec.case_id}</p>`,
    }).catch(() => {});
  }

  // Admin notification always
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales — Recovery Check-In Submitted',
      to:        adminEmail,
      subject:   `Day ${rec.day} Check-In — ${rec.patient_name} (Rating: ${rating}/5${needsFollowup ? ' ⚠️ FOLLOW-UP NEEDED' : ''})`,
      body:      `<p>${rec.patient_name} submitted Day ${rec.day} post-op check-in.</p><p>Rating: ${rating}/5 | Pain: ${pain_level}/10</p>${needsFollowup ? '<p><strong>⚠️ Doctor follow-up required.</strong></p>' : ''}<p>${note || ''}</p>`,
    }).catch(() => {});
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type:  'post_op_checkin_submitted',
    actor_email: rec.patient_email,
    resource_id: rec.case_id,
    details:     { day: rec.day, rating, pain_level, needs_doctor_followup: needsFollowup, concerns },
    timestamp:   now,
    prev_hash:   await computePrevHash(base44),
  }).catch(() => {});

  return ok({ success: true, day: rec.day, needs_followup: needsFollowup });
}, { name: 'submitPostOpCheckIn', requireAuth: false, bodySchema: SubmitPostOpCheckInSchema }));
