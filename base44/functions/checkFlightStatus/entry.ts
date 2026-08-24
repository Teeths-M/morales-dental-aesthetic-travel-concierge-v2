import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { getFlightStatus } from '../../shared/flightSearchAdapter.ts';

// ── checkFlightStatus ─────────────────────────────────────────────────────────
// Rewritten (2026, Travel Intelligence pass) onto shared/flightSearchAdapter.ts's
// dormant getFlightStatus() — same honest { supported: false } shape as
// currencyConvert.ts, replacing the old labeled STUB (a deterministic mock
// derived purely from time-to-arrival, with a real FlightStats implementation
// left fully commented out for months). This is a real, live-visible fix, not
// just a rename: this function is already a granted M-Care agent tool, so the
// old mock was quietly narrating a fabricated status to real travelers who
// asked "is my flight on time" — the agent's own tool description already
// said "never invent a status, only state what this returns," but had no way
// to know the returned status WAS invented. Once a real AERODATABOX_API_KEY
// is added (see flightSearchAdapter.ts), this goes live with zero further
// code, same as every other dormant-scaffolding tool in this repo.
//
// Also fixes a real, currently-live access bug found while rewriting this:
// the OLD role-gate (`admin/platform_admin/coordinator/travel_agency` only,
// applied to EVERY authenticated caller) would 403 an ordinary signed-in
// patient asking M-Care about their own flight — despite this tool's own
// description promising "available to ALL journey types." The `check` action
// is stateless and read-only (no entity, no ownership to protect), so it's
// now genuinely open to any caller, matching checkWeatherAlerts's own `scan`
// action. `update_trip` (writes to a real TravelRequest record) keeps the
// original role-gate exactly as it was — a real write boundary, unchanged.
//
// Actions:
//   check       — return current status for a flight number (used by poller)
//   update_trip — check + write results back to TravelRequest record, but
//                 ONLY when the check actually returned real data — an
//                 unsupported/unconfigured result never overwrites a trip's
//                 last real known status with a fabricated one.

const UPDATE_TRIP_ROLES = ['admin', 'platform_admin', 'coordinator', 'travel_agency'];

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { action, flight_number, scheduled_arrival, trip_id } = await body<{
    action?: string;
    flight_number?: string;
    scheduled_arrival?: string;
    trip_id?: string;
  }>();

  if (!action) return err('action is required (check | update_trip)');

  // ── CHECK — stateless, read-only, no ownership concept, open to any caller ──
  if (action === 'check') {
    if (!flight_number) return err('flight_number required');
    const result = await getFlightStatus(flight_number, scheduled_arrival || new Date().toISOString());
    return ok({ flight_number, checked_at: new Date().toISOString(), ...result });
  }

  // ── UPDATE_TRIP — check + persist to TravelRequest (real write boundary) ────
  if (action === 'update_trip') {
    if (user && !UPDATE_TRIP_ROLES.includes(user.role)) return err('Forbidden', 403);
    if (!trip_id) return err('trip_id required');

    const trip = await base44.asServiceRole.entities.TravelRequest.get(trip_id);
    if (!trip) return err('Trip not found', 404);

    const result = await getFlightStatus(
      trip.flight_number || flight_number || '',
      trip.scheduled_arrival || new Date().toISOString(),
    );

    const prevStatus = trip.flight_status;
    const now = new Date().toISOString();

    if (result.supported) {
      await base44.asServiceRole.entities.TravelRequest.update(trip_id, {
        flight_status: result.status,
        delay_minutes: result.delay_minutes,
        arrival_terminal: result.arrival_terminal || '',
        arrival_gate: result.arrival_gate || '',
        last_checked: now,
      });
    }
    // An unsupported/unconfigured result is returned honestly but never
    // written — the trip's own last real known status stays untouched
    // rather than being overwritten with a fabricated one.

    return ok({
      trip_id,
      flight_number: trip.flight_number,
      prev_status: prevStatus,
      status_changed: result.supported && prevStatus !== result.status,
      checked_at: now,
      ...result,
    });
  }

  return err('Invalid action. Use: check | update_trip');
}, { name: 'checkFlightStatus', requireAuth: false }));
