// Same env-var-with-fallback line already used in sendTravelCountdownReminders/entry.ts.
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

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
 *
 * priority is required and is the one central place JourneyEvent decides
 * whether to also push-notify: 'low' stays app-only (the patient sees it
 * next time they open M-Care); 'medium'/'high'/'critical' additionally fire
 * a real push via sendPushNotification (best-effort, non-fatal) so a patient
 * who never opens the app still learns about it. SMS is deliberately not
 * wired here yet — see CLAUDE.md Phase 50 for why (several writers already
 * send their own SMS independently; a generic rule here would double-text).
 */
export async function logJourneyEvent(base44: any, params: {
  case_id: string;
  client_email: string;
  event_type: string;
  source: string;
  message_text: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
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
      priority: params.priority,
      action_taken: params.action_taken || '',
      tool_result: params.tool_result || {},
      user_action_required: params.user_action_required ?? false,
      escalation_occurred: params.escalation_occurred ?? false,
    });
  } catch (error) {
    console.error('[logJourneyEvent]', error);
  }

  if (params.priority === 'low') return;

  try {
    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_email: params.client_email,
      title: 'M-Care',
      body: params.message_text,
      url: `${APP_URL}/?mcare=open`,
      icon: '/mcare-logo.png',
      tag: params.event_type,
      urgent: params.priority === 'high' || params.priority === 'critical',
      internal_secret: Deno.env.get('CRON_SECRET'),
    });
  } catch (error) {
    console.error('[logJourneyEvent] push notification failed', error);
  }
}