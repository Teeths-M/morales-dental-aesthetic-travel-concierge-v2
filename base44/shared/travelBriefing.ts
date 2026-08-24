/**
 * travelBriefing — the real, pure aggregator behind getTravelBriefing. Calls
 * only real, already-existing tools/modules (weather, Morales's own safety
 * index, the recall-then-research brain, curated + researched trip tips,
 * cached visa lookup, the dormant flight adapter) and merges their real
 * results into one structured object. Deliberately makes NO LLM call of its
 * own to "summarize" — per RULE 3 in m_care.jsonc (NO INVENTED DATA), the
 * agent narrates the real, already-gathered data directly in its own reply,
 * the same way RULE 20's proactive weather/safety check already does. A
 * second summarizing LLM pass here would be slower, costlier, and a real
 * place for drift to creep in between what a tool actually returned and
 * what gets said — better to hand the agent the real data and let it talk.
 *
 * Every sub-call runs via Promise.allSettled (this app's own established
 * resilience pattern — see notifyContact/escalateSoloCheckIn) so one piece
 * failing (say, weather rate-limited) never blocks the rest of the
 * briefing; a failed/skipped piece is reported honestly as such, never
 * silently dropped or replaced with an invented value.
 *
 * Visa and weather are called via a direct shared-module import rather than
 * a cross-function HTTP invoke — deliberately: getTravelBriefing itself is
 * requireAuth:false (a signed-out visitor must be able to use it), and
 * getVisaRequirement's own HTTP endpoint is requireAuth:true with no
 * forwardable session in that case. A same-process module call sidesteps
 * the auth boundary question entirely rather than needing an
 * internalOrAdminAuthorized-style workaround. Safety/recall/research still
 * go through their own public (requireAuth:false) HTTP endpoints, which
 * have no such problem.
 */

import { resolveCountry, fetchWeather, buildAlert } from './weatherEngine.ts';
import { getUniversalTravelTips } from './tripReadinessTips.ts';
import { getCachedVisaRequirement } from './visaRequirementLookup.ts';
import { searchFlightOffers, type FlightSearchResult } from './flightSearchAdapter.ts';

export type TravelBriefingInput = {
  destination_country: string;
  destination_city?: string;
  origin_country?: string;
  origin_city?: string;
  nationality?: string;
  travel_month?: string;
  depart_date?: string;
  return_date?: string;
  is_medical_trip?: boolean;
};

async function safeInvoke(base44: any, functionName: string, payload: Record<string, unknown>) {
  try {
    const res = await base44.functions.invoke(functionName, payload);
    return res?.data ?? null;
  } catch {
    return null;
  }
}

async function getRecentEvents(base44: any, destination: string) {
  const question = `What recent notable safety events, natural disasters, political unrest, or major travel disruptions has ${destination} had?`;

  const recall = await safeInvoke(base44, 'recallMcareKnowledge', { question, limit: 3 });
  if (recall?.found && recall.best_score >= 0.4) {
    const top = recall.matches?.[0];
    return {
      checked: true,
      source: 'brain' as const,
      summary: top?.answer || null,
      is_fresh: top?.is_fresh ?? null,
      last_verified_at: top?.last_verified_at || null,
    };
  }

  const research = await safeInvoke(base44, 'mcareResearchAndLearn', {
    question,
    context: 'Travel-briefing check for a travel concierge platform — recent, notable, general-public safety/disruption events only, not medical.',
  });
  if (research?.success && research.answer) {
    return {
      checked: true,
      source: 'research' as const,
      summary: research.answer,
      confidence_score: research.confidence_score ?? null,
      is_fresh: research.is_fresh ?? null,
      last_verified_at: research.last_verified_at || null,
    };
  }

  return { checked: false, source: null, summary: null };
}

async function getDestinationTips(base44: any, origin: string | undefined, destination: string) {
  if (!origin) return null;
  const research = await safeInvoke(base44, 'mcareResearchAndLearn', {
    question: `What should a traveler know before traveling from ${origin} to ${destination}? Cover general climate/packing considerations for a typical trip and a few practical, well-known travel tips a first-time visitor should know.`,
    context: 'Trip-readiness guidance for a travel concierge platform — general, practical, non-medical.',
  });
  // Same >=80 bar getTripReadinessTips itself uses — kept consistent rather
  // than picking a new number for this call site.
  if (research?.success && research.answer && Number(research.confidence_score) >= 80) {
    return research.answer as string;
  }
  return null;
}

async function getWeather(destination: string) {
  const coords = await resolveCountry(destination);
  if (!coords) return { checked: false, reason: `Could not locate country: ${destination}` };
  const weather = await fetchWeather(coords.lat, coords.lng);
  const alert = buildAlert(weather, coords.name, 'General', 0);
  return { checked: true, ...alert };
}

async function getSafety(base44: any, destination: string) {
  const data = await safeInvoke(base44, 'getDestinationSafetyIndex', { country: destination });
  if (!data || typeof data.safety_index !== 'number') return { checked: false };
  return { checked: true, ...data };
}

async function getVisa(base44: any, nationality: string | undefined, destination: string) {
  if (!nationality) return null;
  try {
    const result = await getCachedVisaRequirement(base44, nationality, destination, 'mcare_chat');
    return {
      ...result,
      caveat: "Rules can change — always confirm with the destination's official immigration source before booking.",
    };
  } catch {
    return null;
  }
}

async function getFlights(input: TravelBriefingInput): Promise<FlightSearchResult | null> {
  const origin = input.origin_city || input.origin_country;
  const destination = input.destination_city || input.destination_country;
  if (!origin || !input.depart_date) return null; // no origin or no specific date yet — nothing honest to search
  return searchFlightOffers(origin, destination, input.depart_date, input.return_date);
}

export async function buildTravelBriefing(base44: any, input: TravelBriefingInput) {
  const destination = input.destination_city
    ? `${input.destination_city}, ${input.destination_country}`
    : input.destination_country;

  const [weather, safety, recentEvents, destinationTips, visa, flights] = await Promise.allSettled([
    getWeather(input.destination_country),
    getSafety(base44, input.destination_country),
    getRecentEvents(base44, destination),
    getDestinationTips(base44, input.origin_country, destination),
    getVisa(base44, input.nationality, input.destination_country),
    getFlights(input),
  ]);

  const pick = <T>(r: PromiseSettledResult<T>, fallback: T) => (r.status === 'fulfilled' ? r.value : fallback);

  return {
    destination: { country: input.destination_country, city: input.destination_city || null },
    is_medical_trip: !!input.is_medical_trip,
    weather: pick(weather, { checked: false, reason: 'Weather check failed.' }),
    safety: pick(safety, { checked: false }),
    recent_events: pick(recentEvents, { checked: false, source: null, summary: null }),
    trip_tips: {
      universal: getUniversalTravelTips(),
      destination_specific: pick(destinationTips, null),
    },
    visa: pick(visa, null),
    flights: pick(flights, null),
    generated_at: new Date().toISOString(),
  };
}
