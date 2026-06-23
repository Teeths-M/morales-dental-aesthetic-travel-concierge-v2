import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── checkFlightStatus ─────────────────────────────────────────────────────────
// STUB: Returns a mocked flight status. Replace with live FlightStats API.
//
// TO ACTIVATE WITH LIVE FLIGHTSTATS:
//   1. Sign up at https://developer.flightstats.com
//   2. Set env vars in Base44 project settings:
//        FLIGHTSTATS_APP_ID  = your_app_id
//        FLIGHTSTATS_APP_KEY = your_app_key
//   3. Replace the `mockFlightData()` call with `liveFlightLookup()` below.
//
// Actions:
//   check       — return current status for a flight number (used by poller)
//   update_trip — check + write results back to TravelRequest record

// ── Live FlightStats implementation (uncomment when keys are configured) ─────
// async function liveFlightLookup(flightNumber: string, departureDateUtc: string) {
//   const appId  = Deno.env.get('FLIGHTSTATS_APP_ID');
//   const appKey = Deno.env.get('FLIGHTSTATS_APP_KEY');
//   if (!appId || !appKey) throw new Error('FLIGHTSTATS_APP_ID / FLIGHTSTATS_APP_KEY not set');
//
//   const [carrier, num] = flightNumber.match(/^([A-Z]{2})(\d+)$/)?.slice(1) || [flightNumber.slice(0,2), flightNumber.slice(2)];
//   const [year, month, day] = departureDateUtc.split('T')[0].split('-');
//   const url = `https://api.flightstats.com/flex/flightstatus/rest/v2/json/flight/status/${carrier}/${num}/arr/${year}/${month}/${day}`;
//
//   const resp = await fetch(url, {
//     headers: { appId, appKey }
//   });
//   if (!resp.ok) throw new Error(`FlightStats ${resp.status}`);
//   const data = await resp.json();
//
//   const fs = data.flightStatuses?.[0];
//   if (!fs) return { status: 'unknown', delay_minutes: 0 };
//
//   const fsStatus = fs.status;              // A=Active, L=Landed, D=Diverted, C=Cancelled
//   const delayMins = fs.delays?.arrivalGateDelayMinutes ?? 0;
//   const statusMap = { A: 'in_progress', L: 'landed', D: 'delayed', C: 'cancelled', S: 'scheduled', U: 'unknown' };
//   return {
//     status: statusMap[fsStatus] || 'unknown',
//     delay_minutes: delayMins,
//     arrival_terminal: fs.airportResources?.arrivalTerminal || null,
//     arrival_gate: fs.airportResources?.arrivalGate || null,
//   };
// }

// ── MOCK: returns deterministic status based on scheduled_arrival ─────────────
// Logic: >2h to arrival = scheduled, 30min-2h = in_progress, <30min = landed.
// Pass simulate_status to override (useful in staging/demos).
function mockFlightData(flightNumber, scheduledArrival, simulateStatus) {
  if (simulateStatus) {
    const delay = simulateStatus === 'delayed' ? 45 : 0;
    return {
      status: simulateStatus,
      delay_minutes: delay,
      arrival_terminal: 'B',
      arrival_gate: 'B14',
      source: 'mock',
    };
  }

  const now = Date.now();
  const arrTs = new Date(scheduledArrival).getTime();
  const minsToArrival = (arrTs - now) / 60_000;

  let status = 'scheduled';
  if (minsToArrival < 0) status = 'landed';
  else if (minsToArrival < 30) status = 'in_progress';
  else if (minsToArrival < 120) status = 'in_progress';

  return {
    status,
    delay_minutes: 0,
    arrival_terminal: 'A',
    arrival_gate: 'A7',
    source: 'mock',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    // Allow scheduler (no user session) or authenticated users
    if (user && !['admin', 'platform_admin', 'coordinator', 'travel_agency'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, flight_number, scheduled_arrival, simulate_status, trip_id } = body;

    if (!action) return Response.json({ error: 'action required' }, { status: 400 });

    // ── CHECK ───────────────────────────────────────────────────────────────
    if (action === 'check') {
      if (!flight_number) return Response.json({ error: 'flight_number required' }, { status: 400 });
      const result = mockFlightData(flight_number, scheduled_arrival || new Date().toISOString(), simulate_status);
      return Response.json({ success: true, flight_number, ...result, checked_at: new Date().toISOString() });
    }

    // ── UPDATE_TRIP — check + persist to TravelRequest ────────────────────
    if (action === 'update_trip') {
      if (!trip_id) return Response.json({ error: 'trip_id required' }, { status: 400 });

      const trip = await base44.asServiceRole.entities.TravelRequest.get(trip_id);
      if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

      const result = mockFlightData(
        trip.flight_number || flight_number || 'XX000',
        trip.scheduled_arrival || new Date().toISOString(),
        simulate_status
      );

      const prevStatus = trip.flight_status;
      const now = new Date().toISOString();

      await base44.asServiceRole.entities.TravelRequest.update(trip_id, {
        flight_status:     result.status,
        delay_minutes:     result.delay_minutes,
        arrival_terminal:  result.arrival_terminal,
        arrival_gate:      result.arrival_gate,
        last_checked:      now,
      });

      return Response.json({
        success: true,
        trip_id,
        flight_number: trip.flight_number,
        prev_status: prevStatus,
        new_status: result.status,
        status_changed: prevStatus !== result.status,
        delay_minutes: result.delay_minutes,
        arrival_terminal: result.arrival_terminal,
        arrival_gate: result.arrival_gate,
        checked_at: now,
        source: result.source,
      });
    }

    return Response.json({ error: 'Invalid action. Use: check | update_trip' }, { status: 400 });

  } catch (err) {
    console.error('[checkFlightStatus]', err);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
