import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';

// ── cacheWelcomePayload ───────────────────────────────────────────────────────
// Builds a fully-resolved welcome payload from:
//   - TravelRequest record (flight, driver, destination)
//   - LocalizedGreeting template (4 seeded destinations)
//   - Patient preferred language (from TravelRequest or default 'en')
//
// Called by:
//   - pollActiveTripFlights when flight transitions to in_progress or landed
//   - useFlightTracking hook directly from the frontend
//
// Returns the payload so the frontend can write it to localStorage via
// offlineWelcomeCache.js — zero-internet welcome display at arrival.
//
// Template substitution — no LLM required:
//   {{patient_name}}    → trip.user_name
//   {{driver_name}}     → trip.driver_name
//   {{destination_city}}→ trip.destination_city
//   {{gate}}            → trip.arrival_gate
//   {{terminal}}        → trip.arrival_terminal

// ── Seed greetings (4 medical-tourism starter countries) ──────────────────────
// Admin can override via LocalizedGreeting entity. These are the hard-coded
// defaults used when no entity row exists for a country/language combo.
const SEED_GREETINGS = {
  TH: {
    en: {
      greeting_template: 'Sawadee krap! Welcome to {{destination_city}}, {{patient_name}}. Thailand is delighted to have you.',
      driver_line: 'Your driver {{driver_name}} is waiting for you at the arrivals exit. They are holding a sign with your name.',
      cultural_note: 'The wai greeting (palms pressed together) is a sign of respect. Your driver may greet you this way.',
    },
  },
  MX: {
    es: {
      greeting_template: '¡Bienvenido/a a {{destination_city}}, {{patient_name}}! Estamos muy contentos de recibirte.',
      driver_line: 'Tu chofer {{driver_name}} te está esperando en la salida de llegadas internacionales.',
      cultural_note: 'Mexico is warm and family-oriented. Your team is here to make you feel completely at home.',
    },
    en: {
      greeting_template: 'Welcome to {{destination_city}}, {{patient_name}}! We are thrilled to have you here.',
      driver_line: 'Your driver {{driver_name}} is waiting at the international arrivals exit.',
      cultural_note: 'Mexico is warm and family-oriented. Your team is here to make you feel at home.',
    },
  },
  TR: {
    en: {
      greeting_template: 'Hoş geldiniz — Welcome to {{destination_city}}, {{patient_name}}! We are honoured to have you in Turkey.',
      driver_line: 'Your driver {{driver_name}} is waiting at the arrivals hall, holding a Morales Concierge sign.',
      cultural_note: 'Turkish hospitality (misafirperverlik) is deeply valued. Expect warm, attentive care from your entire team.',
    },
  },
  HU: {
    en: {
      greeting_template: 'Üdvözöljük! Welcome to {{destination_city}}, {{patient_name}}. Budapest\'s finest medical team is ready for you.',
      driver_line: 'Your driver {{driver_name}} awaits you in the arrivals hall. They are holding a sign with the Morales logo.',
      cultural_note: 'Hungary has a proud tradition of medical excellence. Your procedure is in expert hands.',
    },
  },
};

// Stub for local Twilio number routing
// TO ACTIVATE: set MORALES_LOCAL_CONCIERGE_NUMBERS in env as JSON:
//   { "TH": "+66XXXXXXXXX", "MX": "+52XXXXXXXXX", "TR": "+90XXXXXXXXX", "HU": "+36XXXXXXXXX" }
function getConciergeNumber(countryCode) {
  try {
    const map = JSON.parse(Deno.env.get('MORALES_LOCAL_CONCIERGE_NUMBERS') || '{}');
    return map[countryCode] || Deno.env.get('MORALES_FALLBACK_CONCIERGE_NUMBER') || null;
  } catch (_) {
    return null;
  }
}

function substituteTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    // Allow scheduler or any authenticated user
    if (user && !['admin', 'platform_admin', 'coordinator', 'travel_agency', 'patient'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { trip_id, trigger } = await req.json();
    if (!trip_id) return Response.json({ error: 'trip_id required' }, { status: 400 });

    const trip = await base44.asServiceRole.entities.TravelRequest.get(trip_id);
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

    const countryCode = (trip.destination_country || '').toUpperCase().slice(0, 2);
    const lang = (trip.preferred_language || 'en').toLowerCase().slice(0, 2);

    // Resolve greeting: entity first, then seed fallback
    let greetingRow = null;
    try {
      const rows = await base44.asServiceRole.entities.LocalizedGreeting.filter({
        country_code: countryCode,
        language: lang,
        active: true,
      });
      greetingRow = rows[0] || null;
    } catch (_) { /* entity may not exist yet */ }

    // Fall back to seed table (country → lang → en)
    const seed = SEED_GREETINGS[countryCode];
    if (!greetingRow && seed) {
      const seedRow = seed[lang] || seed['en'] || Object.values(seed)[0];
      if (seedRow) {
        greetingRow = {
          greeting_template: seedRow.greeting_template,
          driver_line:       seedRow.driver_line,
          cultural_note:     seedRow.cultural_note,
        };
      }
    }

    // Generic fallback (unknown destination)
    if (!greetingRow) {
      greetingRow = {
        greeting_template: 'Welcome to {{destination_city}}, {{patient_name}}! Your Morales Concierge team is here for you.',
        driver_line: 'Your driver {{driver_name}} is waiting at the arrivals exit.',
        cultural_note: '',
      };
    }

    // Template substitution
    const vars = {
      patient_name:     trip.user_name     || 'Valued Patient',
      driver_name:      trip.driver_name   || 'your driver',
      destination_city: trip.destination_city || 'your destination',
      gate:             trip.arrival_gate  || '',
      terminal:         trip.arrival_terminal || '',
    };

    const greeting  = substituteTemplate(greetingRow.greeting_template, vars);
    const driverLine = substituteTemplate(greetingRow.driver_line || '', vars);

    const now = new Date().toISOString();

    const payload = {
      trip_id,
      cached_at:        now,
      trigger:          trigger || 'manual',
      greeting,
      driver_line:      driverLine,
      cultural_note:    greetingRow.cultural_note || '',
      patient_name:     vars.patient_name,
      destination_city: vars.destination_city,
      driver_name:      vars.driver_name,
      driver_photo_url: trip.driver_photo_url || null,
      arrival_terminal: trip.arrival_terminal || null,
      arrival_gate:     trip.arrival_gate     || null,
      flight_number:    trip.flight_number    || null,
      flight_status:    trip.flight_status    || 'unknown',
      concierge_phone:  getConciergeNumber(countryCode),
      // Pickup handshake details — reuses Task 1 OfflineHandshake checkpoint
      pickup_handshake_type: 'driver_pickup',
    };

    // Mark trip as welcome-cached
    await base44.asServiceRole.entities.TravelRequest.update(trip_id, {
      welcome_cached_at: now,
    });

    return Response.json({ success: true, payload });

  } catch (err) {
    console.error('[cacheWelcomePayload]', err);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'cacheWelcomePayload', requireAuth: false }));
