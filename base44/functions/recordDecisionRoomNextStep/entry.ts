import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

/**
 * recordDecisionRoomNextStep — the no-pressure 4-choice menu: "Request
 * another consult," "Ask a question," "Proceed to planning," or "Not now."
 * Routes to real, already-existing functions rather than inventing new
 * mechanics for any of the four.
 */

const bodySchema = strictObject({
  virtual_consultation_id: Fields.shortText(100),
  next_step: z.enum(['request_another_consult', 'ask_a_question', 'proceed_to_planning', 'not_now']),
  question_text: Fields.optionalText(2000),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { virtual_consultation_id, next_step, question_text } = await body<{
    virtual_consultation_id: string; next_step: string; question_text?: string;
  }>();

  const vc = await base44.asServiceRole.entities.VirtualConsultation.get(virtual_consultation_id).catch(() => null);
  if (!vc) return err('Consultation not found', 404);
  if (user!.email !== vc.client_email && !['admin', 'platform_admin'].includes(user!.role)) return err('Forbidden', 403);

  const nowISO = new Date().toISOString();
  let routedTo: string | null = null;

  if (next_step === 'ask_a_question') {
    if (vc.case_id) {
      await base44.functions.invoke('postCaseMessage', {
        case_id: vc.case_id,
        to_party: 'doctor',
        message_type: 'info_request',
        body: (question_text || 'I have a follow-up question about my consultation.').slice(0, 2000),
      }).catch(() => {});
      routedTo = 'postCaseMessage';
    } else {
      await base44.functions.invoke('flagIntakeHandoff', {
        user_email: vc.client_email,
        reason: 'Traveler has a question after a virtual consultation, before a case exists yet.',
      }).catch(() => {});
      routedTo = 'flagIntakeHandoff';
    }
  } else if (next_step === 'proceed_to_planning') {
    if (vc.case_id) {
      await base44.functions.invoke('createJourneyPlan', {
        case_id: vc.case_id,
        goal: `Move forward after the virtual consultation with Dr. ${vc.doctor_name || 'your matched doctor'}.`,
        steps: [{ description: 'Review the consultation Decision Room and confirm next steps with the care team.' }],
      }).catch(() => {});
      routedTo = 'createJourneyPlan';
    } else {
      // No real case exists yet — the real next action is the existing
      // consultation-fee/booking path, not a new charge call.
      routedTo = 'consultation_fee_step';
    }
  }

  await base44.asServiceRole.entities.VirtualConsultation.update(virtual_consultation_id, {
    decision_next_step: next_step,
    decision_next_step_at: nowISO,
    decision_next_step_note: question_text || '',
    updated_at: nowISO,
  });

  if (vc.case_id && vc.client_email) {
    await logJourneyEvent(base44, {
      case_id: vc.case_id,
      client_email: vc.client_email,
      event_type: 'virtual_consultation_decision_recorded',
      source: 'recordDecisionRoomNextStep',
      message_text: 'I\'ve recorded what you\'d like to do next after your consultation.',
      priority: 'low',
      action_taken: `Recorded decision: ${next_step}`,
      tool_result: { next_step, routed_to: routedTo },
    });
  }

  return ok({ virtual_consultation_id, next_step, routed_to: routedTo });
}, { name: 'recordDecisionRoomNextStep', requireAuth: true, bodySchema }));
