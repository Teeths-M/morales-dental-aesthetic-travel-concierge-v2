import { createHandler, ok } from '../../shared/createHandler.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';

// ── notifyProximityAlert ──────────────────────────────────────────────────────
// Called by the client (useSurroundingAwareness hook) when the proximity sweep
// detects a new nearby emergency-service place. Does two things:
//   1. If the user has an active case, creates a JourneyEvent so the alert shows
//      as a gold M-Care chat bubble (same pattern as departure reminders).
//   2. Sends a native push notification via the Core integration so the user is
//      aware even if they're not looking at the app.
//
// The in-app bubble on NearbyHelp is rendered client-side from localStorage
// (detectedPlaces) — this function only handles the server-delivered channels
// (push + JourneyEvent) that can't be done from the browser.

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
  const now = new Date().toISOString();

  // ── 1. JourneyEvent (if the user has a case) ──────────────────────────────
  let journeyEventCreated = false;
  try {
    const cases = await base44.asServiceRole.entities.CaseRecord
      .filter({ client_email: user.email }, '-created_date', 1)
      .catch(() => []);
    const activeCase = cases?.[0];
    if (activeCase) {
      await base44.asServiceRole.entities.JourneyEvent.create({
        case_id: activeCase.id,
        client_email: user.email,
        event_type: 'proximity_help_detected',
        source: 'notifyProximityAlert',
        message_text: `You're near ${place_name} (${category_label}) — saved here in case of emergency.`,
        priority: 'low',
        action_taken: `Proximity alert: ${category} detected near user — ${place_name}`,
        tool_result: { place_name, category, category_label, lat, lng, address },
        user_action_required: false,
        escalation_occurred: false,
      });
      journeyEventCreated = true;
    }
  } catch (e) {
    console.error('[notifyProximityAlert] JourneyEvent creation failed:', e);
  }

  // ── 2. Push notification ───────────────────────────────────────────────────
  let pushSent = false;
  try {
    await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id: user.id,
      title: `M · ${category_label} nearby`,
      content: `${place_name} is close by — saved in case of emergency. Tap for directions.`,
      action_label: 'Directions',
      action_url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    pushSent = true;
  } catch (e) {
    console.error('[notifyProximityAlert] push failed:', e);
  }

  return ok({ success: true, journeyEventCreated, pushSent });
}, { name: 'notifyProximityAlert', requireAuth: true, bodySchema: schema }));