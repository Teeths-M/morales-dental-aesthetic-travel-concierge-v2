/**
 * callTrustedContact — Guardian Tier 1: a real, adaptive AI phone call to an
 * already-trusted contact on file (family/emergency contact), never a
 * stranger and never an emergency-services number. Full autonomy is
 * acceptable here (per the spec this implements) because the contact
 * already knows the patient and can independently judge what's happening —
 * this is NOT the Tier 2 emergency-services boundary, which stays strictly
 * human-in-the-loop and is not touched by this function at all.
 *
 * The contact is always resolved from real, already-on-file data via
 * getOrderedCaseContacts — never a caller-supplied phone number — matching
 * RULE 3's "no invented data" discipline extended to a new capability.
 *
 * Disclosure requirement: the call's opening line ("I'm an AI assistant
 * calling on behalf of...") is authored in the Retell agent's own prompt
 * (Retell dashboard config, not this file — see voiceCallAdapter.ts's
 * header) so it can never be skipped or improvised per call; this function
 * only supplies the real, bounded situational variables that prompt
 * interpolates.
 *
 * Recording: unconditionally off in this build (see callConsentPolicy.ts) —
 * a real per-region signal isn't wired in yet, so the policy always
 * resolves to "do not record," and that decision is respected as-is,
 * never overridden here.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { getOrderedCaseContacts } from '../../shared/emergencyContacts.ts';
import { placeOutboundCall } from '../../shared/voiceCallAdapter.ts';
import { resolveRecordingConsentPolicy } from '../../shared/callConsentPolicy.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

const bodySchema = strictObject({
  case_id: Fields.shortText(100),
  contact_priority: z.coerce.number().int().min(1).max(10).optional().default(1),
  situation_summary: Fields.shortText(400),
  requested_action: Fields.shortText(300),
  trigger: z.enum(['chat_request', 'distress_confirm', 'sos_tap', 'missed_checkin']),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, contact_priority, situation_summary, requested_action, trigger } = await body();

  const cases = await base44.entities.CaseRecord.filter({ id: case_id });
  const caseRecord = cases[0];
  if (!caseRecord || caseRecord.client_email !== user.email) {
    return err('Case not found or access denied.', 403);
  }

  const contacts = await getOrderedCaseContacts(base44, caseRecord);
  const contact = contacts.find((c) => c.priority === contact_priority && c.phone) || contacts.find((c) => c.phone);

  if (!contact || !contact.phone) {
    return ok({
      success: false,
      message: 'No phone number is on file for a trusted contact yet.',
    });
  }

  const consent = resolveRecordingConsentPolicy(null);
  const now = new Date();
  const patientName = caseRecord.client_name || user.full_name || 'the patient';

  const callResult = await placeOutboundCall({
    toNumber: contact.phone,
    dynamicVariables: {
      patient_name: patientName,
      contact_name: contact.name,
      contact_relationship: contact.relationship || 'contact',
      situation_summary,
      requested_action,
    },
    metadata: { case_id, trigger },
  });

  if (!callResult.supported) {
    const failureMessage: string = callResult.message;
    await logJourneyEvent(base44, {
      case_id,
      client_email: user.email,
      event_type: 'guardian_call_placed',
      source: 'callTrustedContact',
      message_text: `I wasn't able to place a live call to ${contact.name} — ${failureMessage}`,
      priority: 'medium',
      action_taken: `call_unsupported reason=${failureMessage}`,
      tool_result: { supported: false },
      user_action_required: true,
      escalation_occurred: false,
    });
    return ok({ success: false, message: failureMessage });
  }

  await base44.asServiceRole.entities.GuardianCallLog.create({
    case_id,
    client_email: user.email,
    contact_name: contact.name,
    contact_relationship: contact.relationship || '',
    contact_phone: contact.phone,
    contact_priority: contact.priority,
    trigger,
    situation_summary,
    requested_action,
    call_status: 'initiated',
    retell_call_id: callResult.call_id,
    recording_enabled: false,
    consent_policy_reason: consent.reason,
    started_at: now.toISOString(),
    created_at: now.toISOString(),
  });

  await logJourneyEvent(base44, {
    case_id,
    client_email: user.email,
    event_type: 'guardian_call_placed',
    source: 'callTrustedContact',
    message_text: `I'm calling ${contact.name} now to let them know what's happening — I'll tell you what they say as soon as the call ends.`,
    priority: 'high',
    action_taken: `retell_call_id=${callResult.call_id}`,
    tool_result: { supported: true, call_id: callResult.call_id },
    user_action_required: false,
    escalation_occurred: false,
  });

  return ok({ success: true, contact_name: contact.name, call_id: callResult.call_id });
}, {
  name: 'callTrustedContact',
  requireAuth: true,
  bodySchema,
  rateLimit: { max: 5, windowSeconds: 600 },
}));
