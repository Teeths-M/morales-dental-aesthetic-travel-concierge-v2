/**
 * logJourneyEvent — writes a JourneyEvent record so the frontend (polling
 * useJourneyEvents, 20s interval) can render a proactive M-Care chat bubble
 * without needing the agent SDK to inject a message into a live conversation
 * (it can't — see JourneyEvent.jsonc's own description).
 *
 * Never throws — a logging failure must never block or fail the real action
 * it's recording, same discipline as logCrisisReroute.ts / logProviderContactAttempt.ts.
 *
 * message_text must always be pre-written, deterministic copy the caller
 * builds from data it actually confirmed — never an LLM call, never a claim
 * of an action beyond what really happened.
 */
export async function logJourneyEvent(base44: any, params: {
  case_id: string;
  client_email: string;
  event_type: string;
  source: string;
  message_text: string;
  action_taken?: string;
  tool_result?: Record<string, unknown>;
  user_action_required?: boolean;
  escalation_occurred?: boolean;
}): Promise<void> {
  try {
    await base44.asServiceRole.entities.JourneyEvent.create({
      case_id: params.case_id,
      client_email: params.client_email,
      event_type: params.event_type,
      source: params.source,
      message_text: params.message_text,
      action_taken: params.action_taken || '',
      tool_result: params.tool_result || {},
      user_action_required: params.user_action_required ?? false,
      escalation_occurred: params.escalation_occurred ?? false,
    });
  } catch (error) {
    console.error('[logJourneyEvent]', error);
  }
}
