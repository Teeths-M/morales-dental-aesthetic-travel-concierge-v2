// ── M-Care router — single-turn routing decision ────────────────────────────
// Powers M-Care's core "one continuous agent, not three separate quick-action
// mini-tools" loop (CLAUDE.md, "M-Care super-agent, Phase 3"). On a local
// knowledge-base miss, ONE routing decision picks between M-Care's existing,
// already-shipped specialized flows (booking intent, doctor availability by
// NL, doctor signup) or a direct conversational answer — replacing "the user
// must already know which quick-action button to press" with "M figures out
// what they need from what they actually typed or said."
//
// Deliberately NOT an iterative multi-tool loop like _shared/mRecon.ts's
// runMReconLoop: mRecon's tools return DATA that feeds back into further
// reasoning (gather several checks, then brief). M-Care's tools are
// mutually-exclusive UI hand-offs — there is exactly one decision to make per
// message, not a sequence to accumulate. Reusing mRecon's iteration-loop
// shape for a single-decision problem would just re-ask the same question
// pointlessly; what IS reused from that proven pattern is the discipline that
// actually matters: a fixed, hardcoded toolset that is never caller-suppliable,
// an injectable `decide` function for testability, and fail-closed behavior —
// any decide() failure or malformed/out-of-allowlist response always falls
// back to "answer" (the existing, unmodified moralesAssist/InvokeLLM path),
// never a fabricated routing decision.
//
// Every tool below wraps an ALREADY-SHIPPED, independently-safe entry point
// (parseBookingIntent, the applyDoctorAvailability flow, DoctorSignupChatFlow's
// own submitDoctorSignup). This router only ever decides WHICH one and
// narrates WHY — it never writes anything itself, and the actual write for
// each still requires its own existing explicit human confirm step, untouched
// by this file.

export const ROUTE_TOOLS = [
  {
    name: 'startBookingIntent',
    description: 'The user wants to book, look for, or ask about booking a specific procedure and/or destination (e.g. "I want veneers in Mexico", "book me a rhinoplasty", "find me a dentist in Cancun").',
  },
  {
    name: 'startAvailabilityIntent',
    description: "A logged-in doctor wants to update or state their own availability (e.g. \"I'm free Tuesdays and Thursdays\", \"mark me open next month\").",
  },
  {
    name: 'startDoctorSignup',
    description: 'The user wants to become a partner doctor or sign up as one (e.g. "how do I join as a doctor", "I want to sign up as a partner").',
  },
  {
    name: 'startTravelAgencySignup',
    description: 'The user wants to become a partner travel agency or sign up as one (e.g. "how do I join as a travel agency", "I want to book flights and hotels for patients").',
  },
] as const;

export type RouteToolName = typeof ROUTE_TOOLS[number]['name'];

export const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['route', 'answer'] },
    tool_name: { type: 'string' },
    reasoning: { type: 'string' },
  },
  required: ['action', 'reasoning'],
};

export function buildRoutingPrompt(message: string, allowedTools: string[]): string {
  const toolLines = ROUTE_TOOLS.filter((t) => allowedTools.includes(t.name))
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n') || '(none available right now — always choose "answer")';

  return `You are M-Care's routing brain for a medical/aesthetic travel concierge platform. A user just sent ONE message. A local knowledge base already tried and found no direct match. Decide whether this message should hand off to one specialized flow, or just needs a direct conversational answer.

USER MESSAGE:
${message}

ALLOWED FLOWS (only these — never invent or choose one not listed):
${toolLines}

Return JSON only:
{ "action": "route" or "answer", "tool_name": "<one of the allowed flow names above, only if action is route>", "reasoning": "<one short, warm, first-person sentence shown directly to the user explaining what you're about to do, e.g. \\"Let's get that booked for you — one moment.\\" — if action is answer, a brief one-sentence reasoning is still fine but is not shown to the user>" }

Rules:
- Only choose "route" if the message clearly matches one allowed flow's purpose.
- If no allowed flow clearly matches, or it's a general question, choose "answer".
- Never choose a tool_name that isn't in the ALLOWED FLOWS list above.`;
}

export interface RouteDecision {
  action: 'route' | 'answer';
  tool_name: RouteToolName | null;
  reasoning: string;
}

const FAIL_CLOSED: RouteDecision = { action: 'answer', tool_name: null, reasoning: '' };

/**
 * Makes exactly one routing decision. Fail-closed: any decide() failure or
 * malformed/out-of-allowlist response returns FAIL_CLOSED ('answer') rather
 * than fabricating a route — the existing moralesAssist/InvokeLLM answer path
 * is always a safe fallback, so failing open to "just answer" can never
 * strand the user.
 */
export async function decideRoute(
  message: string,
  allowedTools: string[],
  decide: (prompt: string) => Promise<any>,
): Promise<RouteDecision> {
  if (allowedTools.length === 0) return FAIL_CLOSED;

  let decision: any;
  try {
    decision = await decide(buildRoutingPrompt(message, allowedTools));
  } catch (_) {
    return FAIL_CLOSED;
  }

  if (!decision || typeof decision !== 'object' || decision.action !== 'route') {
    return FAIL_CLOSED;
  }

  const toolName = decision.tool_name;
  const isAllowed = typeof toolName === 'string'
    && allowedTools.includes(toolName)
    && ROUTE_TOOLS.some((t) => t.name === toolName);

  if (!isAllowed) return FAIL_CLOSED;

  return {
    action: 'route',
    tool_name: toolName,
    reasoning: typeof decision.reasoning === 'string' ? decision.reasoning.slice(0, 300) : '',
  };
}
