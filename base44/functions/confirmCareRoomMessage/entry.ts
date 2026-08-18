import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── confirmCareRoomMessage ────────────────────────────────────────────────
// The only place a Care Room confirmation is ever actually recorded. Only
// the party the message was addressed to (to_party) may confirm it — not
// the sender, not the other party, not an unrelated case member. Posts a
// small, real m_care-authored acknowledgment to the OTHER party so both
// sides end up with the same confirmation on record, matching the audit-
// trail behavior Portia asked for ("did both sides understand?").

const BodySchema = strictObject({
  message_id: Fields.shortText(100),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { message_id } = await body<{ message_id?: string }>();
  if (!message_id) return err('message_id is required');

  const message = await base44.asServiceRole.entities.QuoteMessage.get(message_id).catch(() => null);
  if (!message) return err('Message not found', 404);
  if (!message.requires_confirmation) return err('This message does not require confirmation');
  if (message.confirmed) return ok({ already_confirmed: true });

  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  const role = user?.role || 'client';
  const callerParty = ['doctor', 'local_doctor'].includes(role) ? 'doctor' : 'patient';
  const callerEmail = user?.email || '';

  // Only the addressed party may confirm — and only if their own email is
  // the one denormalised onto this exact message.
  const isAddressedParty = message.to_party === callerParty
    && ((callerParty === 'doctor' && message.doctor_email === callerEmail)
      || (callerParty === 'patient' && message.patient_email === callerEmail));

  if (!isAdmin && !isAddressedParty) return err('Only the person this message was addressed to can confirm it', 403);

  const now = new Date().toISOString();
  await base44.asServiceRole.entities.QuoteMessage.update(message_id, {
    confirmed: true,
    confirmed_at: now,
  });

  const otherParty = message.to_party === 'doctor' ? 'patient' : 'doctor';
  const confirmerLabel = callerParty === 'patient' ? 'Patient' : 'Doctor';

  await base44.asServiceRole.entities.QuoteMessage.create({
    case_id: message.case_id,
    quote_id: '',
    patient_email: message.patient_email,
    doctor_email: message.doctor_email,
    from_party: 'm_care',
    from_id: '',
    to_party: otherParty,
    message_type: 'message',
    body: `${confirmerLabel} confirmed they understood: "${String(message.body || '').slice(0, 200)}"`,
    body_translated: '',
    recipient_language: '',
    contact_scrubbed: false,
    status: 'unread',
    requires_confirmation: false,
    confirmed: false,
    created_at: now,
  }).catch(() => {});

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'case_message_posted',
    actor_id: user?.id || callerParty, actor_role: callerParty, actor_name: callerEmail || callerParty,
    resource_type: 'QuoteMessage', resource_id: message_id, case_id: message.case_id,
    sensitive: true, timestamp: now,
    details: { action: 'confirmed', original_message_id: message_id },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ confirmed: true });
}, { name: 'confirmCareRoomMessage', requireAuth: true, bodySchema: BodySchema }));
