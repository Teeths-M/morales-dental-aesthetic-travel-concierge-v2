import { createHandler, ok } from '../../shared/createHandler.ts';
import { z, strictObject } from '../../shared/validate.ts';
import { searchFlightOffers } from '../../shared/flightSearchAdapter.ts';

/**
 * searchFlights — real-time flight-offer search (direct / one-stop /
 * two-stop), dormant until a real Amadeus key is configured. See
 * flightSearchAdapter.ts's own header for the full "why Amadeus, why
 * dormant scaffolding" reasoning. Honestly returns { supported: false }
 * rather than inventing a schedule or price — see RULE 36 in
 * m_care.jsonc, which tells the agent exactly how to relay that.
 *
 * Public (requireAuth: false) — matches the rest of M-Care's travel/
 * weather/safety tool set, all reachable by a signed-out visitor.
 */

const bodySchema = strictObject({
  origin: z.string().trim().min(1, 'Required').max(100),
  destination: z.string().trim().min(1, 'Required').max(100),
  depart_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be a date (YYYY-MM-DD)'),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be a date (YYYY-MM-DD)').optional(),
});

Deno.serve(createHandler(async ({ body }) => {
  const { origin, destination, depart_date, return_date } = await body<z.infer<typeof bodySchema>>();

  const result = await searchFlightOffers(origin, destination, depart_date, return_date);

  return ok({
    origin,
    destination,
    depart_date,
    return_date: return_date || null,
    ...result,
  });
}, { name: 'searchFlights', requireAuth: false, bodySchema }));
