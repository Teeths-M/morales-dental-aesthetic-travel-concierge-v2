/**
 * msafeWelcome — what the M-Safe welcome card says, built only from real data.
 * Pure, so tests/msafeWelcome.test.js checks it directly.
 *
 * Portia's north-star mockup showed an invented "police activity near
 * Copacabana" alert. M-Care has no live street-incident feed, so the card shows
 * an alert only when M-Care really sent one (a high or critical JourneyEvent),
 * with its real time, and saved places only when the case has them.
 */
import { serverTimeMs } from './serverTime.js';

const ALERT_PRIORITIES = new Set(['high', 'critical']);
const DAY_MS = 24 * 60 * 60 * 1000;

/** "Good morning" / "Good afternoon" / "Good evening" for the visitor's own clock. */
export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "just now", "5 minutes ago", "2 hours ago", "3 days ago". '' for a bad date. Backend times are read as UTC. */
export function timeAgo(when, now = new Date()) {
  const t = serverTimeMs(when);
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((now.getTime() - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** The newest high or critical update M-Care really sent in the last week, or null. */
export function pickLatestAlert(events, now = new Date(), maxAgeDays = 7) {
  if (!Array.isArray(events)) return null;
  const cutoff = now.getTime() - maxAgeDays * DAY_MS;
  return events
    .filter((e) => e && ALERT_PRIORITIES.has(e.priority) && typeof e.message_text === 'string' && e.message_text.trim())
    .filter((e) => {
      const t = serverTimeMs(e.created_date);
      return !Number.isNaN(t) && t >= cutoff;
    })
    .sort((a, b) => serverTimeMs(b.created_date) - serverTimeMs(a.created_date))[0] || null;
}

/** The places saved on the traveler's case, as short labels ("Hotel", "Clinic"). */
export function savedPlacesFrom(caseRecord) {
  if (!caseRecord) return [];
  const places = [];
  if (typeof caseRecord.hotel_address === 'string' && caseRecord.hotel_address.trim()) places.push('Hotel');
  if (typeof caseRecord.clinic_address === 'string' && caseRecord.clinic_address.trim()) places.push('Clinic');
  return places;
}

/**
 * The welcome card's headline and opening line.
 *   atDestination: the traveler has a case and is in its destination country.
 *   tripLabel:     the case's destination name, when there is a case.
 */
export function welcomeCopy({ atDestination = false, hasTrip = false, countryName = '', flag = '', tripLabel = '', firstName = '', now = new Date() } = {}) {
  if (atDestination && countryName) {
    return {
      title: `Welcome to ${countryName}!${flag ? ` ${flag}` : ''}`,
      body: "Your trip is active and I'm keeping watch. Here's what you should know:",
    };
  }
  const title = `${greetingFor(now)}${firstName ? `, ${firstName}` : ''}${flag ? ` ${flag}` : ''}`;
  if (hasTrip) {
    return {
      title,
      body: tripLabel
        ? `I'm keeping watch over your trip to ${tripLabel}. Here's where things stand:`
        : "I'm keeping watch over your trip. Here's where things stand:",
    };
  }
  return {
    title,
    body: "Tell me the procedure you're considering and where. I'll find verified doctors, plan every step, and watch over your trip.",
  };
}
