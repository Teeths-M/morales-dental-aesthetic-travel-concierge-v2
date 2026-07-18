import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';

/**
 * generateItineraryCalendar — Booking.com Calendar Sync Model
 *
 * Generates a .ics calendar file for the patient's complete journey:
 * flight departure, arrival, hotel check-in, clinic appointment,
 * companion meal delivery, and return flight.
 *
 * Also generates a Google Calendar deep-link for 1-tap add.
 * Stores the .ics in PassportVault as document_type 'other'.
 * Returns: { ics_content, google_cal_url, vault_id }
 */

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// Format date as YYYYMMDDTHHMMSSZ (ICS format)
function icsDate(iso: string, timeStr?: string): string {
  const d = new Date(iso);
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setUTCHours(h || 0, m || 0, 0, 0);
  } else {
    d.setUTCHours(8, 0, 0, 0);
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function addHours(isoDate: string, hours: number, timeStr?: string): string {
  const d = new Date(isoDate);
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setUTCHours(h || 0, m || 0, 0, 0);
  }
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

interface ICSEvent {
  uid: string;
  start: string;
  end: string;
  summary: string;
  description: string;
  location: string;
}

function buildICS(patientName: string, events: ICSEvent[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${BRAND}//Morales Journey Itinerary//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Morales Journey — ${patientName}`,
    'X-WR-TIMEZONE:UTC',
    ...events.flatMap(ev => [
      'BEGIN:VEVENT',
      `UID:${ev.uid}@moralesdentalandaesthetics.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${ev.start}`,
      `DTEND:${ev.end}`,
      `SUMMARY:${ev.summary.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${ev.description.replace(/\n/g, '\\n').replace(/,/g, '\\,')}`,
      ev.location ? `LOCATION:${ev.location.replace(/,/g, '\\,')}` : '',
      'END:VEVENT',
    ].filter(Boolean)),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

function googleCalUrl(summary: string, start: string, end: string, description: string, location: string): string {
  const params = new URLSearchParams({
    action:  'TEMPLATE',
    text:    summary,
    dates:   `${start}/${end}`,
    details: description,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id } = await body();
  if (!case_id) return err('case_id is required');

  const c = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!c) return err('Case not found', 404);

  const patientName = c.client_name || 'Patient';
  const procedures  = (c.procedures || []).join(', ') || 'Medical Procedure';
  const dest        = c.procedure_country || 'Destination';
  const origin      = c.client_country || 'Origin';
  const caseRef     = case_id.slice(-8).toUpperCase();
  const depDate     = c.departure_date || c.procedure_date;

  if (!depDate) return err('No departure_date on case — cannot generate calendar');

  // Load supplementary data
  const [agencies, drivers] = await Promise.all([
    base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }).catch(() => []),
    base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []),
  ]);
  const agency = (agencies as any[])[0];

  const events: ICSEvent[] = [];
  const uid = (label: string) => `${label}-${caseRef}-${Date.now()}`;

  // ── Event 1: Home pickup by driver ───────────────────────────────────────
  events.push({
    uid: uid('pickup'),
    start:    icsDate(depDate, '07:00'),
    end:      icsDate(depDate, '08:30'),
    summary:  `🚗 Driver Pickup — Morales Journey Begins`,
    description: `Your Morales driver will pick you up from home.\n\nCase Ref: ${caseRef}\nConcierge: ${APP_URL}/dashboard`,
    location: origin,
  });

  // ── Event 2: Departure flight ────────────────────────────────────────────
  events.push({
    uid: uid('flight-out'),
    start:    icsDate(depDate, '10:00'),
    end:      icsDate(depDate, '14:00'),
    summary:  `✈️ Departure Flight — ${origin} → ${dest}`,
    description: `${c.flight_details || 'Flight details confirmed — see your vault for booking reference.'}\n\nHotel: ${c.hotel_name || 'See confirmation'}\n\nCase Ref: ${caseRef}`,
    location: `${origin} International Airport`,
  });

  // ── Event 3: Hotel check-in (arrival day) ────────────────────────────────
  events.push({
    uid: uid('hotel'),
    start:    icsDate(depDate, '15:00'),
    end:      icsDate(depDate, '16:00'),
    summary:  `🏨 Hotel Check-In — ${c.hotel_name || dest}`,
    description: `Your hotel in ${dest} is booked and confirmed.\n\n${c.hotel_address ? `Address: ${c.hotel_address}\n\n` : ''}Case Ref: ${caseRef}`,
    location: c.hotel_address || c.hotel_name || dest,
  });

  // ── Event 4: Clinic appointment ──────────────────────────────────────────
  // Prefer the doctor-confirmed procedure_date (confirmProcedureDate); fall back to
  // the old departure + 1 estimate only when no real date has been set yet.
  if (c.booking_type !== 'travel_only') {
    let procIso;
    if (c.procedure_date) {
      procIso = new Date(c.procedure_date).toISOString().split('T')[0];
    } else {
      const procDate = new Date(depDate);
      procDate.setUTCDate(procDate.getUTCDate() + 1);
      procIso = procDate.toISOString().split('T')[0];
    }
    events.push({
      uid: uid('clinic'),
      start:    icsDate(procIso, '10:00'),
      end:      icsDate(procIso, '14:00'),
      summary:  `🏥 Clinic Appointment — ${procedures}`,
      description: `Your procedure with your Morales-assigned doctor.\n\nProcedure: ${procedures}\nDoctor: See your dashboard\n\nCase Ref: ${caseRef}\n\nIMPORTANT: Arrive 30 minutes early. Do not eat 6 hours before if anaesthesia is involved.`,
      location: c.clinic_selected || dest,
    });

    // ── Event 5: Companion meal delivery ─────────────────────────────────────
    events.push({
      uid: uid('companion'),
      start:    icsDate(procIso, '19:00'),
      end:      icsDate(procIso, '20:00'),
      summary:  `🍽️ Companion Meal Delivery — Recovery Day 1`,
      description: `Your Morales recovery companion will deliver your personalised recovery meal.\n\nDietary preferences have been communicated.\nCase Ref: ${caseRef}`,
      location: c.hotel_address || c.hotel_name || dest,
    });
  }

  // ── Event 6: Return flight (departure + recovery days + 1) ───────────────
  const recoveryDays = c.recovery_days || 3;
  const returnDate   = new Date(depDate);
  returnDate.setUTCDate(returnDate.getUTCDate() + 1 + recoveryDays);
  const returnIso = returnDate.toISOString().split('T')[0];
  events.push({
    uid: uid('flight-return'),
    start:    icsDate(returnIso, '10:00'),
    end:      icsDate(returnIso, '16:00'),
    summary:  `✈️ Return Flight — ${dest} → ${origin}`,
    description: `Your return journey home after your Morales experience.\n\nCase Ref: ${caseRef}\nConcierge: ${APP_URL}/dashboard`,
    location: `${dest} International Airport`,
  });

  // ── Event 7: Home drop-off ───────────────────────────────────────────────
  events.push({
    uid: uid('home'),
    start:    icsDate(returnIso, '17:00'),
    end:      icsDate(returnIso, '18:30'),
    summary:  `🏠 Welcome Home — Journey Complete`,
    description: `Your Morales driver will drop you home from the airport. The Golden M is nearly yours.\n\nCase Ref: ${caseRef}`,
    location: origin,
  });

  const icsContent = buildICS(patientName, events);
  const b64        = btoa(String.fromCharCode(...new TextEncoder().encode(icsContent)));

  // Store in vault
  let vaultId: string | null = null;
  try {
    const vaultEntry = await base44.asServiceRole.entities.PassportVault.create({
      passport_token:     `ICS_${caseRef}_${Date.now()}`,
      user_email:         c.client_email,
      document_type:      'other',
      encrypted_file_uri: `data:text/calendar;base64,${b64}`,
      file_name:          `Morales_Journey_${caseRef}.ics`,
      mime_type:          'text/calendar',
      file_size_bytes:    icsContent.length,
      status:             'active',
      uploaded_at:        new Date().toISOString(),
      is_emergency_accessible: false,
    });
    vaultId = vaultEntry?.id ?? null;
  } catch (_) {}

  // Google Calendar quick-add URL for the clinic appointment
  const clinicEvent = events.find(e => e.uid.startsWith('clinic'));
  const googleCalLink = clinicEvent
    ? googleCalUrl(clinicEvent.summary, clinicEvent.start, clinicEvent.end, clinicEvent.description, clinicEvent.location)
    : null;

  // Link-only notice — the calendar (which contains addresses) is saved to the
  // vault; the patient adds/downloads it from their portal. No itinerary in the email.
  if (c.client_email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: c.client_email,
      subject: `Your journey calendar is ready | ${BRAND}`,
      body: linkOnlyEmail({
        title: 'Your journey calendar is ready.',
        line: 'Your complete itinerary — flights, hotel, clinic, and return — is saved to your Morales portal. Open it to add everything to your calendar in one tap.',
        ctaUrl: `${APP_URL}/dashboard/journey`,
        ctaLabel: 'Open My Journey',
      }),
    }).catch(() => {});
  }

  return ok({ case_id, events_count: events.length, vault_id: vaultId, google_cal_url: googleCalLink, ics_content: icsContent });
}, { name: 'generateItineraryCalendar', requireAuth: false }));
