/**
 * icsBuilder — the real RFC-5545 .ics writer + Google Calendar deep-link
 * builder, extracted verbatim (behavior-preserving) from
 * generateItineraryCalendar/entry.ts, which previously declared these
 * locally. generateItineraryCalendar now imports from here instead — one
 * real ICS writer in this repo, not two.
 */

const BRAND = 'Morales Medical Travel Safety';

/** Format date as YYYYMMDDTHHMMSSZ (ICS format). */
export function icsDate(iso: string, timeStr?: string): string {
  const d = new Date(iso);
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setUTCHours(h || 0, m || 0, 0, 0);
  } else {
    d.setUTCHours(8, 0, 0, 0);
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function addHours(isoDate: string, hours: number, timeStr?: string): string {
  const d = new Date(isoDate);
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setUTCHours(h || 0, m || 0, 0, 0);
  }
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export interface ICSEvent {
  uid: string;
  start: string;
  end: string;
  summary: string;
  description: string;
  location: string;
}

export function buildICS(patientName: string, events: ICSEvent[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${BRAND}//Morales Journey Itinerary//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Morales Journey',
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

export function googleCalUrl(summary: string, start: string, end: string, description: string, location: string): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary,
    dates: `${start}/${end}`,
    details: description,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
