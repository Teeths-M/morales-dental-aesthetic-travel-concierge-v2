import { createHandler, ok } from '../../shared/createHandler.ts';
import { z, strictObject } from '../../shared/validate.ts';
import { buildTravelBriefing } from '../../shared/travelBriefing.ts';

/**
 * getTravelBriefing — the real M-Care agent tool behind RULE 36 (TRAVEL
 * INTELLIGENCE) in m_care.jsonc. One call, real weather + Morales's own
 * destination safety index + recent notable events + curated/researched
 * trip tips + (when a nationality is given) the real cached visa/entry
 * requirement + (when an origin and a specific date are given) real flight
 * offers — all real tool results, assembled by shared/travelBriefing.ts,
 * with zero LLM call of its own. See that file's own header for the full
 * "why no summarizing LLM pass here" reasoning.
 *
 * Public (requireAuth: false) — matches every other travel/weather/safety
 * tool this agent already has (checkWeatherAlerts, getDestinationSafetyIndex,
 * recallMcareKnowledge, mcareResearchAndLearn), so a signed-out visitor
 * planning a trip gets the same real briefing a logged-in traveler would.
 */

const bodySchema = strictObject({
  destination_country: z.string().trim().min(1, 'Required').max(100),
  destination_city: z.string().trim().max(100).optional(),
  origin_country: z.string().trim().max(100).optional(),
  origin_city: z.string().trim().max(100).optional(),
  nationality: z.string().trim().max(100).optional(),
  travel_month: z.string().trim().max(50).optional(),
  depart_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be a date (YYYY-MM-DD)').optional(),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be a date (YYYY-MM-DD)').optional(),
  is_medical_trip: z.boolean().optional(),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const input = await body<z.infer<typeof bodySchema>>();
  const briefing = await buildTravelBriefing(base44, input);
  return ok(briefing);
}, { name: 'getTravelBriefing', requireAuth: false, bodySchema }));
