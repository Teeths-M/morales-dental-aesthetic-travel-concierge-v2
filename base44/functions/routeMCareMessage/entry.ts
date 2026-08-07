import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';

// ── routeMCareMessage ────────────────────────────────────────────────────────
// M-Care super-agent Phase 3: one routing decision per message, replacing
// "click the right quick-action button first" with "M figures out what you
// need from what you typed or said." Public (requireAuth: false) — a
// logged-out visitor must be able to reach booking/doctor-signup routing —
// but still derives role from a real session when one exists, entirely
// server-side, never trusting a caller-supplied role.
//
// The routing decision logic is inlined here (self-contained) because
// cross-folder relative imports to ../../shared/mCareRouter.ts fail to bundle
// in the function runtime — see the platform's CLI bundling limitations.

// Every tool M-Care can hand the user off to from a free-text message.
type RouteToolName =
  | 'startBookingIntent'
  | 'startDoctorSignup'
  | 'startTravelAgencySignup'
  | 'startAvailabilityIntent';

// The structured shape we ask the LLM to return. InvokeLLM's
// response_json_schema requires a root object, never an array.
const DECISION_SCHEMA = {
  type: 'object' as const,
  properties: {
    action: { type: 'string', enum: ['route', 'answer'] },
    tool_name: {
      type: ['string', 'null'],
      enum: [
        'startBookingIntent',
        'startDoctorSignup',
        'startTravelAgencySignup',
        'startAvailabilityIntent',
        '',
      ],
    },
    reasoning: { type: 'string' },
  },
  required: ['action', 'tool_name', 'reasoning'],
};

interface RouteDecision {
  action: 'route' | 'answer';
  tool_name: RouteToolName | null;
  reasoning: string;
}

/**
 * Ask the LLM to pick exactly one allowed tool for the user's message, or
 * fall back to 'answer' (M-Care just replies in chat). Fail-closed: any
 * malformed/uncertain LLM output becomes 'answer' with no tool — never an
 * invented tool name, never a tool the caller's role isn't allowed to use.
 */
async function decideRoute(
  message: string,
  allowedTools: RouteToolName[],
  llmCall: (prompt: string) => Promise<{ action: string; tool_name: string | null; reasoning?: string }>,
): Promise<RouteDecision> {
  if (allowedTools.length === 0) {
    return { action: 'answer', tool_name: null, reasoning: 'No routing tools available for this role.' };
  }

  const toolList = allowedTools.map((t) => `- ${t}`).join('\n');
  const prompt = `You are a routing layer for the M-Care medical-travel concierge. Read the user's message and decide whether it maps to one of these handoff tools, or should just be answered in chat.

Available tools:
${toolList}

Tool meanings:
- startBookingIntent: the user wants to book or explore a medical/cosmetic procedure or trip (e.g. "I want a tummy tuck", "looking into dental implants", "help me plan my surgery trip").
- startDoctorSignup: the user identifies as a doctor/clinic wanting to join Morales as a partner.
- startTravelAgencySignup: the user identifies as a travel agency wanting to join as a partner.
- startAvailabilityIntent: a partnered doctor is declaring or updating their availability/capacity.

Respond with JSON only:
{ "action": "route", "tool_name": "<one of the tools above>", "reasoning": "<short reason>" }
or, if the message does not clearly match any allowed tool:
{ "action": "answer", "tool_name": "", "reasoning": "<short reason>" }

Never invent a tool_name that is not in the list. If unsure, choose "answer".

User message: """${message}"""`;

  let raw: { action: string; tool_name: string | null; reasoning?: string };
  try {
    raw = await llmCall(prompt);
  } catch (_) {
    // LLM failure is never a reason to route somewhere wrong — answer instead.
    return { action: 'answer', tool_name: null, reasoning: 'Routing LLM unavailable.' };
  }

  const action = raw?.action === 'route' ? 'route' : 'answer';
  const requested = (raw?.tool_name ?? '').toString().trim() as RouteToolName | '';
  const tool_name =
    action === 'route' && requested && allowedTools.includes(requested as RouteToolName)
      ? (requested as RouteToolName)
      : null;

  // If the LLM said "route" but picked a tool the role isn't allowed (or an
  // unknown name), fail closed to a plain answer — never honor an over-broad
  // routing request.
  if (action === 'route' && !tool_name) {
    return { action: 'answer', tool_name: null, reasoning: 'Requested tool not permitted for this role.' };
  }

  return { action, tool_name, reasoning: (raw?.reasoning ?? '').toString().slice(0, 500) };
}

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