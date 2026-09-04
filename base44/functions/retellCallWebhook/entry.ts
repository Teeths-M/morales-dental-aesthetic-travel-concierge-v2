/**
 * retellCallWebhook — receives Retell AI's real post-call event for a call
 * placed by callTrustedContact, and turns it into the real chat bubble the
 * patient sees ("I called your mom — she says she's coming now"). Stays
 * outside createHandler (which parses JSON) — the signature check needs the
 * exact raw bytes Retell signed, same reasoning as stripeIdentityWebhook.
 *
 * Event shape is written from Retell's public docs, not verified against a
 * live webhook (no account exists yet) — re-confirm the exact nesting
 * before this is trusted live. Reads defensively (optional chaining
 * throughout) so an unexpected shape degrades to an honest "couldn't
 * confirm details" message rather than throwing.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifyRetellSignature } from '../../shared/verifyRetellSignature.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

Deno.serve(async (req) => {
  try {
    const { event, errorResponse } = await verifyRetellSignature(req);
    if (errorResponse) return errorResponse;

    const eventType = event?.event;
    if (eventType !== 'call_analyzed' && eventType !== 'call_ended') {
      return Response.json({ received: true, skipped: true });
    }

    const call = event?.call;
    const callId = call?.call_id;
    if (!callId) {
      return Response.json({ error: 'Missing call_id' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const existing = await base44.asServiceRole.entities.GuardianCallLog.filter({ retell_call_id: callId });
    const logRow = existing[0];
    if (!logRow) {
      // A webhook for a call this app never placed — ignore, don't error
      // (Retell retries on non-2xx, and there is nothing to fix by retrying).
      return Response.json({ received: true, skipped: true, reason: 'unknown_call_id' });
    }
    if (logRow.call_status === 'completed' || logRow.call_status === 'failed') {
      return Response.json({ received: true, status: 'already_processed' });
    }

    const analysis = call?.call_analysis || {};
    const custom = analysis?.custom_analysis_data || {};
    const callStatus = call?.call_status === 'error' ? 'failed'
      : call?.call_status === 'not-connected' ? 'no_answer'
      : 'completed';

    const willHelp = typeof custom.contact_will_help === 'boolean' ? custom.contact_will_help : undefined;
    const etaOrNote = typeof custom.contact_eta_or_note === 'string' ? custom.contact_eta_or_note : '';
    const summary = typeof analysis.call_summary === 'string' ? analysis.call_summary : '';
    const successful = typeof analysis.call_successful === 'boolean' ? analysis.call_successful : undefined;

    await base44.asServiceRole.entities.GuardianCallLog.update(logRow.id, {
      call_status: callStatus,
      call_outcome_summary: summary,
      ...(willHelp !== undefined ? { contact_will_help: willHelp } : {}),
      contact_eta_or_note: etaOrNote,
      ...(successful !== undefined ? { call_successful: successful } : {}),
      ended_at: new Date().toISOString(),
    });

    const messageText = callStatus === 'no_answer'
      ? `I called ${logRow.contact_name}, but the call wasn't answered.`
      : callStatus === 'failed'
        ? `I tried calling ${logRow.contact_name}, but the call didn't go through.`
        : summary
          ? `I called ${logRow.contact_name} — ${summary}`
          : `I called ${logRow.contact_name} — I wasn't able to confirm the details of what was said.`;

    await logJourneyEvent(base44, {
      case_id: logRow.case_id,
      client_email: logRow.client_email,
      event_type: 'guardian_call_outcome',
      source: 'retellCallWebhook',
      message_text: messageText,
      priority: callStatus === 'completed' ? 'high' : 'medium',
      action_taken: `call_status=${callStatus} will_help=${willHelp ?? 'unknown'}`,
      tool_result: { call_status: callStatus, contact_will_help: willHelp, call_successful: successful },
      user_action_required: callStatus !== 'completed',
      escalation_occurred: callStatus !== 'completed',
    });

    return Response.json({ received: true });
  } catch (error) {
    console.error('[retellCallWebhook]', error);
    return Response.json({ error: 'Internal error processing webhook.' }, { status: 500 });
  }
});
