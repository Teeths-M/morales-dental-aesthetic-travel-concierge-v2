import { createHandler, ok } from '../../shared/createHandler.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

// ── notifyProximityAlert ──────────────────────────────────────────────────────
// Called by the client (useSurroundingAwareness hook) when the proximity sweep
// detects a new nearby emergency-service place. If the user has an active
// case, logs a JourneyEvent so the alert shows as a gold M-Care chat bubble
// (same pattern as departure reminders) — via the shared logJourneyEvent
// helper rather than a hand-rolled create, so this stays consistent with
// every other JourneyEvent writer in the app and inherits its one real
// safety property for free: priority decides delivery breadth. 'low' (used
// here — this is routine, ambient information, not urgent) means in-app
// only; a push was previously fired unconditionally regardless of priority,
// which both contradicted that established rule and would have meant a push
// notification on every single place walked past — exactly the noisy-nag
// outcome explicitly decided against for this feature. Fixed by routing
// through logJourneyEvent instead of a second, parallel push call.
//
// The in-app "detected places" history on NearbyHelp is rendered client-side
// from localStorage (detectedPlaces) — this function only handles the
// server-delivered channel (JourneyEvent → chat bubble) that can't be done
// from the browser.

const schema = strictObject({
  place_name: Fields.shortText(200),
  category: Fields.shortText(50),
  category_label: Fields.shortText(50),
  lat: z.number(),
  lng: z.number(),
  address: z.string().max(300).optional().default(''),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { place_name, category, category_label, lat, lng, address } = await body();

  const cases = await base44.asServiceRole.entities.CaseRecord
    .filter({ client_email: user.email }, '-created_date', 1)
    .catch(() => []);
  const activeCase = cases?.[0];

  let journeyEventLogged = false;
  if (activeCase) {
    await logJourneyEvent(base44, {
      case_id: activeCase.id,
      client_email: user.email,
      event_type: 'proximity_help_detected',
      source: 'notifyProximityAlert',
      message_text: `You're near ${place_name} (${category_label}) — saved here in case of emergency.`,
      priority: 'low',
      action_taken: `Proximity alert: ${category} detected near user — ${place_name}`,
      tool_result: { place_name, category, category_label, lat, lng, address },
    });
    journeyEventLogged = true;
  }

  return ok({ success: true, journeyEventLogged });
}, { name: 'notifyProximityAlert', requireAuth: true, bodySchema: schema }));