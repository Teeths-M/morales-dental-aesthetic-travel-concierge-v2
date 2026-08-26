import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

/**
 * flagInterpreterMoment — a real user tap ("Flag this moment"), not
 * automated inference (there is no live transcript to infer from while
 * Daily is dormant). Appends to a bounded, audit-visible event log and, when
 * a real case exists, posts a durable Care Room message so the flag survives
 * the call, not just an ephemeral in-call toast.
 */

const MAX_EVENTS = 20;

const bodySchema = strictObject({
  virtual_consultation_id: Fields.shortText(100),
  note: Fields.optionalText(500),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { virtual_consultation_id, note } = await body<{ virtual_consultation_id: string; note?: string }>();

  const vc = await base44.asServiceRole.entities.VirtualConsultation.get(virtual_consultation_id).catch(() => null);
  if (!vc) return err('Consultation not found', 404);

  const isPatient = user!.email === vc.client_email;
  const isDoctor = user!.email === vc.doctor_email;
  if (!isPatient && !isDoctor) return err('Forbidden', 403);

  const flaggedBy: 'patient' | 'doctor' = isPatient ? 'patient' : 'doctor';
  const existing: any[] = Array.isArray(vc.interpreter_flag_events) ? vc.interpreter_flag_events : [];
  const updated = [
    ...existing,
    { at: new Date().toISOString(), flagged_by: flaggedBy, note: note || '' },
  ].slice(-MAX_EVENTS);

  await base44.asServiceRole.entities.VirtualConsultation.update(virtual_consultation_id, {
    interpreter_flag_events: updated,
    updated_at: new Date().toISOString(),
  });

  if (vc.case_id) {
    await base44.functions.invoke('postCaseMessage', {
      case_id: vc.case_id,
      to_party: 'both',
      message_type: 'message',
      body: 'This moment was flagged as consent, diagnosis, treatment, or risk-relevant — a qualified human interpreter is recommended for this part of the conversation. AI translation is not a substitute here.',
    }).catch(() => {});
  }

  return ok({ virtual_consultation_id, flagged_by: flaggedBy, total_flags: updated.length });
}, { name: 'flagInterpreterMoment', requireAuth: true, bodySchema }));
