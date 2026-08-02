// ── M Recon — agentic travel-readiness briefing (demo) — pure logic ──────────
// Buildathon showcase (Aug 16, 2026 judging — "Novel use of Agentic AI" is an
// explicit scored criterion). A real tool-calling loop: the LLM is given a
// fixed toolset and decides for itself which tools are relevant to THIS trip
// and in what order, rather than a hardcoded sequence. Only checkRedViolations
// is real — it calls the deterministic getViolations engine read-only, same
// as existing code, and never modifies or bypasses it. Every other tool
// returns input-sensitive fixture data (real visa/clinic/weather/safety
// integration is explicitly out of scope for this demo).

import { getViolations } from './procedureCompatibility.ts';

export const MAX_ITERATIONS = 8;

export const TOOLS = [
  {
    name: 'checkRedViolations',
    description: 'Checks the disclosed procedures for dangerous combinations using the real deterministic safety engine. Only relevant if the trip involves 2+ medical procedures — a single procedure or none cannot have a combination violation.',
  },
  {
    name: 'checkVisaRequirement',
    description: 'Checks visa/entry requirements for the destination country. Relevant for any trip.',
  },
  {
    name: 'checkClinicStatus',
    description: 'Checks whether the named clinic is currently operating. Only relevant if the trip involves a medical procedure at a specific clinic.',
  },
  {
    name: 'checkWeatherAlert',
    description: 'Checks for active weather alerts at the destination around the travel dates. Relevant for any trip.',
  },
  {
    name: 'checkDestinationSafety',
    description: 'Checks the general safety index for the destination. Relevant for any trip.',
  },
] as const;

export const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['call_tool', 'finish'] },
    tool_name: { type: 'string' },
    reasoning: { type: 'string' },
    final_briefing: { type: 'string' },
  },
};

// Deterministic pseudo-random from a string seed — same input always produces
// the same fixture (testable, reproducible), different inputs visibly differ.
export function seededHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

export function fixtureVisaRequirement(tripDetails: any) {
  const country = tripDetails.destination_country || 'the destination country';
  const bucket = seededHash(country) % 3;
  if (bucket === 0) {
    return { visa_required: false, notes: `Not required for stays under 90 days in ${country}.`, source: 'demo fixture' };
  }
  if (bucket === 1) {
    return { visa_required: true, notes: `eVisa required for ${country} — apply online 3-5 days before travel.`, source: 'demo fixture' };
  }
  return { visa_required: true, notes: `Visa on arrival available in ${country} for most nationalities.`, source: 'demo fixture' };
}

export function fixtureClinicStatus(tripDetails: any) {
  const clinic = tripDetails.clinic_name || 'the named clinic';
  const bucket = seededHash(clinic) % 5;
  const operating = bucket === 4 ? 'unknown' : 'operating';
  const confidence = operating === 'operating' ? 80 + (seededHash(clinic) % 16) : 0;
  return {
    operating,
    confidence,
    summary: operating === 'operating'
      ? `${clinic} shows current operating signals.`
      : `Could not confirm current operating status for ${clinic} automatically.`,
    source: 'demo fixture',
  };
}

export function fixtureWeatherAlert(tripDetails: any) {
  const key = `${tripDetails.destination_city || ''}|${tripDetails.travel_date || ''}`;
  const bucket = seededHash(key) % 4;
  if (bucket === 0) {
    return { has_alert: true, summary: `Moderate heat advisory expected around your travel dates in ${tripDetails.destination_city || 'the destination'}.`, source: 'demo fixture' };
  }
  return { has_alert: false, summary: 'No active weather alerts for the travel window.', source: 'demo fixture' };
}

export function fixtureDestinationSafety(tripDetails: any) {
  const key = tripDetails.destination_country || tripDetails.destination_city || 'destination';
  const index = 60 + (seededHash(key) % 36); // 60-95
  const label = index >= 85 ? 'low risk' : index >= 70 ? 'moderate' : 'elevated — review advisories';
  return { safety_index: index, label, source: 'demo fixture' };
}

/** Dispatches a tool call by name. checkRedViolations is the only real one — it
 * always re-derives from the live getViolations engine, never a fixture. */
export function runTool(name: string, tripDetails: any) {
  switch (name) {
    case 'checkRedViolations': {
      const items = (tripDetails.procedures || []).map((p: string) => ({ title: p }));
      return getViolations(items, tripDetails.conditions || []);
    }
    case 'checkVisaRequirement':
      return fixtureVisaRequirement(tripDetails);
    case 'checkClinicStatus':
      return fixtureClinicStatus(tripDetails);
    case 'checkWeatherAlert':
      return fixtureWeatherAlert(tripDetails);
    case 'checkDestinationSafety':
      return fixtureDestinationSafety(tripDetails);
    default:
      return null;
  }
}

export function buildPrompt(tripDetails: any, trace: any[]) {
  const traceText = trace.length === 0
    ? 'none yet'
    : trace.map(t => `- called ${t.tool} (reasoning: ${t.reasoning}) → result: ${JSON.stringify(t.result)}`).join('\n');

  return `You are M Recon, a travel-readiness agent for a medical/travel safety platform. You are given TRIP DETAILS and a fixed set of TOOLS. Decide which tools are actually relevant to THIS SPECIFIC trip and call them one at a time. When you have covered everything relevant, finish with a short plain-language briefing.

TRIP DETAILS:
${JSON.stringify(tripDetails)}

AVAILABLE TOOLS:
${TOOLS.map(t => `- ${t.name}: ${t.description}`).join('\n')}

STEPS TAKEN SO FAR:
${traceText}

Decide your NEXT action. Return JSON only:
{ "action": "call_tool" or "finish", "tool_name": "<one of the tool names above, only if call_tool>", "reasoning": "<one short sentence explaining why>", "final_briefing": "<a short plain-language travel-readiness summary, only if action is finish>" }

Rules:
- Never call a tool that already appears in STEPS TAKEN SO FAR.
- Skip checkClinicStatus entirely if there is no medical procedure involved in this trip.
- Skip checkRedViolations if there are fewer than 2 procedures (no combination is possible).
- Finish once every relevant tool has been called — do not call a tool that isn't relevant just to be thorough.`;
}

/**
 * Runs the full agentic loop given an injectable decision function (so tests
 * can mock the LLM call without touching Deno/InvokeLLM). Fail-closed: any
 * decision-function failure or malformed response stops the loop and returns
 * whatever trace completed so far plus an explicit error — never a fabricated
 * finished briefing.
 */
export async function runMReconLoop(
  tripDetails: any,
  decide: (prompt: string) => Promise<any>
): Promise<{ trace: any[]; final_briefing: string | null; error: string | null }> {
  const trace: any[] = [];
  const calledTools = new Set<string>();
  let finalBriefing: string | null = null;
  let errorMessage: string | null = null;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let decision: any;
    try {
      decision = await decide(buildPrompt(tripDetails, trace));
    } catch (_) {
      errorMessage = 'reasoning incomplete — the agent could not complete its reasoning';
      break;
    }

    if (!decision || typeof decision.action !== 'string') {
      errorMessage = 'reasoning incomplete — the agent returned an unreadable decision';
      break;
    }

    if (decision.action === 'finish') {
      finalBriefing = decision.final_briefing || 'No further checks were needed for this trip.';
      break;
    }

    if (decision.action === 'call_tool' && decision.tool_name && !calledTools.has(decision.tool_name)
      && TOOLS.some(t => t.name === decision.tool_name)) {
      const result = runTool(decision.tool_name, tripDetails);
      calledTools.add(decision.tool_name);
      trace.push({ step: i + 1, tool: decision.tool_name, reasoning: decision.reasoning || '', result });
    } else {
      trace.push({ step: i + 1, tool: null, reasoning: decision.reasoning || '(unrecognized action)', result: null, skipped: true });
    }
  }

  if (!finalBriefing && !errorMessage) {
    errorMessage = 'reasoning incomplete — the agent did not finish within the step limit';
  }

  return { trace, final_briefing: finalBriefing, error: errorMessage };
}
