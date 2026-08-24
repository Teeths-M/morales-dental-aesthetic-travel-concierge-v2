/**
 * flightSearchAdapter — dormant flight-search + flight-status adapter, same
 * discipline as currencyConvert.ts: modeled on registryLookup.ts's
 * { supported: boolean } shape, zero callers required to break if these
 * env vars are unset. Until real keys exist, both functions honestly
 * report unavailable rather than inventing a flight number, schedule,
 * status, or price — the real gap this repo has documented since before
 * this file existed (calculateTravelPackagePrice's own comment already
 * says "in production use Amadeus/Sabre API"; checkFlightStatus/entry.ts
 * was a labeled FlightStats stub with a fully commented-out real
 * implementation).
 *
 * Two genuinely different vendor categories, not one — confirmed by real
 * research, not assumed: flight-tracking APIs (AeroDataBox, FlightAware,
 * Flightradar24) are built for STATUS/tracking lookups by flight number,
 * not multi-airline itinerary SEARCH. A real "direct, then 1-stop, then
 * 2-stop options with prices" search needs a GDS/OTA-shaped API instead —
 * Amadeus's Self-Service Flight Offers Search is the one this repo already
 * hints at, has a genuine free self-service tier, and is real,
 * well-documented REST + OAuth2. So this file adapts two different real
 * vendors for two different real capabilities, not one vendor doing both.
 *
 * NOTE: both request/response shapes below are written from each vendor's
 * own public documentation, not verified against a live call (no key
 * exists yet to test with) — re-confirm against Amadeus's and
 * AeroDataBox's current docs before either path is ever exercised for
 * real. Portia chose this "build the scaffolding now" path directly
 * (2026) — see CLAUDE.md — matching the exact currencyConvert.ts
 * precedent: it goes live with zero further code the moment real keys
 * (AMADEUS_API_KEY / AMADEUS_API_SECRET, AERODATABOX_API_KEY) are added
 * as Base44 secrets.
 */

// ── Flight SEARCH (Amadeus Self-Service Flight Offers Search) ────────────────

export type FlightLeg = {
  carrier_code: string;
  flight_number: string;
  from: string; // IATA airport code
  to: string; // IATA airport code
  depart_at: string; // ISO datetime
  arrive_at: string; // ISO datetime
};

export type FlightOffer = {
  legs: FlightLeg[];
  stops: number;
  duration_minutes: number | null;
  price_estimate: { amount: number; currency: string } | null;
};

export type FlightSearchResult =
  | { supported: false; message: string }
  | {
      supported: true;
      source: 'amadeus';
      as_of: string;
      direct: FlightOffer[];
      one_stop: FlightOffer[];
      two_stop: FlightOffer[];
      notes?: string;
    };

// Module-level, in-memory only — a warm isolate reuses a still-valid OAuth2
// token instead of re-authenticating on every search call. Cleared
// naturally the moment the isolate recycles; never persisted.
let amadeusToken: { value: string; expiresAt: number } | null = null;

async function getAmadeusToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (amadeusToken && Date.now() < amadeusToken.expiresAt) return amadeusToken.value;
  try {
    const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.access_token) return null;
    // Refresh a little before real expiry to avoid a request racing an
    // about-to-expire token.
    const ttlMs = Math.max(0, (Number(data.expires_in) || 1800) - 60) * 1000;
    amadeusToken = { value: data.access_token, expiresAt: Date.now() + ttlMs };
    return data.access_token;
  } catch {
    return null;
  }
}

function classifyOffer(itinerary: any): FlightOffer | null {
  const segments = itinerary?.segments;
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const legs: FlightLeg[] = segments.map((s: any) => ({
    carrier_code: s?.carrierCode || '',
    flight_number: s?.number ? `${s.carrierCode || ''}${s.number}` : '',
    from: s?.departure?.iataCode || '',
    to: s?.arrival?.iataCode || '',
    depart_at: s?.departure?.at || '',
    arrive_at: s?.arrival?.at || '',
  }));
  // ISO 8601 duration like "PT5H30M" — parsed loosely, honest null on a
  // shape this doesn't recognize rather than a wrong number.
  let durationMinutes: number | null = null;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(itinerary?.duration || '');
  if (m) durationMinutes = (Number(m[1] || 0) * 60) + Number(m[2] || 0);
  return { legs, stops: segments.length - 1, duration_minutes: durationMinutes, price_estimate: null };
}

export async function searchFlightOffers(
  origin: string,
  destination: string,
  departDate: string,
  returnDate?: string,
): Promise<FlightSearchResult> {
  const clientId = Deno.env.get('AMADEUS_API_KEY');
  const clientSecret = Deno.env.get('AMADEUS_API_SECRET');
  if (!clientId || !clientSecret) {
    return {
      supported: false,
      message: 'Real-time flight search is not connected yet — needs AMADEUS_API_KEY and AMADEUS_API_SECRET added as Base44 secrets to activate. I cannot invent flight numbers, schedules, or prices.',
    };
  }

  const token = await getAmadeusToken(clientId, clientSecret);
  if (!token) {
    return { supported: false, message: 'Flight search authentication failed — the configured Amadeus credentials could not be used.' };
  }

  try {
    const params = new URLSearchParams({
      originLocationCode: origin.toUpperCase(),
      destinationLocationCode: destination.toUpperCase(),
      departureDate: departDate,
      adults: '1',
      max: '20',
    });
    if (returnDate) params.set('returnDate', returnDate);

    const res = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { supported: false, message: `Flight search failed (HTTP ${res.status}).` };
    }
    const data = await res.json();
    const offers: FlightOffer[] = (Array.isArray(data?.data) ? data.data : [])
      .flatMap((offer: any) => (Array.isArray(offer?.itineraries) ? offer.itineraries : [])
        .map((it: any) => {
          const built = classifyOffer(it);
          if (built && offer?.price?.total) {
            built.price_estimate = { amount: Number(offer.price.total), currency: offer.price.currency || 'USD' };
          }
          return built;
        }))
      .filter((o: FlightOffer | null): o is FlightOffer => !!o);

    return {
      supported: true,
      source: 'amadeus',
      as_of: new Date().toISOString(),
      direct: offers.filter((o) => o.stops === 0),
      one_stop: offers.filter((o) => o.stops === 1),
      two_stop: offers.filter((o) => o.stops >= 2),
      notes: offers.length === 0 ? 'No offers returned for this exact route/date — try nearby dates or a connecting hub.' : undefined,
    };
  } catch {
    return { supported: false, message: 'Flight search request failed.' };
  }
}

// ── Flight STATUS (AeroDataBox via RapidAPI) ──────────────────────────────────

export type FlightStatusValue = 'scheduled' | 'in_progress' | 'landed' | 'delayed' | 'cancelled' | 'diverted' | 'unknown';

export type FlightStatusResult =
  | { supported: false; message: string }
  | {
      supported: true;
      source: 'aerodatabox';
      status: FlightStatusValue;
      delay_minutes: number;
      arrival_terminal: string | null;
      arrival_gate: string | null;
      checked_at: string;
    };

const AERODATABOX_STATUS_MAP: Record<string, FlightStatusValue> = {
  Expected: 'scheduled',
  EnRoute: 'in_progress',
  Departed: 'in_progress',
  Approaching: 'in_progress',
  Landed: 'landed',
  Delayed: 'delayed',
  Canceled: 'cancelled',
  Cancelled: 'cancelled',
  Diverted: 'diverted',
  Unknown: 'unknown',
};

export async function getFlightStatus(flightNumber: string, date: string): Promise<FlightStatusResult> {
  const apiKey = Deno.env.get('AERODATABOX_API_KEY');
  if (!apiKey) {
    return {
      supported: false,
      message: 'Real-time flight status is not connected yet — needs AERODATABOX_API_KEY added as a Base44 secret to activate. I cannot invent a status.',
    };
  }

  try {
    const dateOnly = date.split('T')[0];
    const res = await fetch(`https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber)}/${dateOnly}`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { supported: false, message: `Flight status lookup failed (HTTP ${res.status}).` };
    }
    const data = await res.json();
    const flight = Array.isArray(data) ? data[0] : data;
    if (!flight) {
      return { supported: false, message: `No flight found for ${flightNumber} on ${dateOnly}.` };
    }

    const rawStatus = flight?.status as string | undefined;
    const status = (rawStatus && AERODATABOX_STATUS_MAP[rawStatus]) || 'unknown';

    const scheduledArr = flight?.arrival?.scheduledTime?.utc;
    const actualArr = flight?.arrival?.actualTime?.utc || flight?.arrival?.revisedTime?.utc;
    let delayMinutes = 0;
    if (scheduledArr && actualArr) {
      delayMinutes = Math.round((new Date(actualArr).getTime() - new Date(scheduledArr).getTime()) / 60000);
    }

    return {
      supported: true,
      source: 'aerodatabox',
      status,
      delay_minutes: delayMinutes,
      arrival_terminal: flight?.arrival?.terminal || null,
      arrival_gate: flight?.arrival?.gate || null,
      checked_at: new Date().toISOString(),
    };
  } catch {
    return { supported: false, message: 'Flight status request failed.' };
  }
}
