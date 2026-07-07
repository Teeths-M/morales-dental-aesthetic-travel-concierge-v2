import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { reportIncident } from '../_shared/incidentReporting.ts';

/**
 * reportIncident
 *
 * Frontend-originated incident capture — must work for guests and broken-auth
 * sessions, so requireAuth is false and identity is resolved best-effort.
 * Upsert semantics: unknown incident_code creates a new record (+ alert email
 * on critical/high severity); known incident_code only appends
 * user_description (no re-email) — this is how "report the crash" and "user
 * typed what happened afterward" share one endpoint.
 *
 * Input: { incident_code, severity?, source?, feature?, page?, session_id?,
 *          browser?, device?, error_message?, stack_trace?, api_response?,
 *          user_description?, sentry_event_id? }
 * Output: { incident_code }
 */

const MAX_DESCRIPTION_LENGTH = 2000;

Deno.serve(createHandler(async ({ base44, body }) => {
  const {
    incident_code, severity, source, feature, page, session_id,
    browser, device, error_message, stack_trace, api_response,
    user_description, sentry_event_id,
  } = await body();

  if (!incident_code) return err('incident_code is required');

  let userEmail: string | null = null;
  try {
    const authedUser = await base44.auth.me();
    userEmail = authedUser?.email || null;
  } catch (_) {
    userEmail = null;
  }

  const result = await reportIncident({
    base44,
    incidentCode: String(incident_code),
    severity,
    source,
    feature,
    page,
    userEmail,
    sessionId: session_id,
    browser,
    device,
    errorMessage: error_message,
    stackTrace: stack_trace,
    apiResponse: api_response,
    userDescription: user_description ? String(user_description).slice(0, MAX_DESCRIPTION_LENGTH) : undefined,
    sentryEventId: sentry_event_id,
  });

  if (!result) return err('Could not record incident');

  return ok(result);
}, { name: 'reportIncident', requireAuth: false }));
