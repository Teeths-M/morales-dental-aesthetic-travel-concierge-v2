import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { decideRoute, DECISION_SCHEMA, type RouteToolName } from '../../shared/mCareRouter.ts';

// ── routeMCareMessage ────────────────────────────────────────────────────────
// M-Care super-agent Phase 3: one routing decision per message, replacing
// "click the right quick-action button first" with "M figures out what you
// need from what you typed or said." Public (requireAuth: false) — a
// logged-out visitor must be able to reach booking/doctor-signup routing —
// but still derives role from a real session when one exists, entirely
// server-side, never trusting a caller-supplied role. See
// _shared/mCareRouter.ts for the decision logic and its fail-closed contract.

const BodySchema = strictObject({
  message: Fields.shortText(500),
});

const PARTNER_OR_ADMIN_ROLES = ['admin', 'platform_admin', 'doctor', 'travel_agency', 'companion', 'taxi_service'];

function allowedToolsForRole(role: string | undefined): RouteToolName[] {
  const tools: RouteToolName[] = [];
  if (!role || !PARTNER_OR_ADMIN_ROLES.includes(role)) {
    // Logged-out visitor and 'patient' are the same population for these —
    // matches MCareOrb.jsx's canBookProcedure/canBecomeDoctorPartner/
    // canBecomeTravelPartner gating.
    tools.push('startBookingIntent', 'startDoctorSignup', 'startTravelAgencySignup');
  }
  if (role === 'doctor') {
    tools.push('startAvailabilityIntent');
  }
  return tools;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { message } = await body<{ message: string }>();

  // requireAuth is false (visitors must reach this), so fetch the session
  // manually and fail open to "no user" — never blocks an anonymous caller,
  // but still gives a real logged-in doctor their real role server-side
  // rather than trusting anything the client claims about itself.
  let user: { role?: string } | null = null;
  try {
    user = await base44.auth.me();
  } catch (_) { /* no session — treated as a visitor below */ }

  const allowedTools = allowedToolsForRole(user?.role);
  const safeMessage = sanitizePromptInput(message, 500).text;

  if (!safeMessage) return ok({ action: 'answer', tool_name: null, reasoning: '' });

  const decision = await decideRoute(safeMessage, allowedTools, async (prompt) => {
    return base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt,
      response_json_schema: DECISION_SCHEMA,
    });
  });

  return ok(decision);
}, { name: 'routeMCareMessage', requireAuth: false, bodySchema: BodySchema }));
