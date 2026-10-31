/**
 * mobileTheme — the pure half of the automatic day/night theme.
 *
 * Everything here is a function of (mode, instant, IANA zone). No React, no
 * storage, no network, no location. That is deliberate: the rules are the part
 * that has to be provable, so they are testable on their own (tests/mobileTheme.test.js)
 * while MobileThemeContext only wires them to the app.
 *
 * THE RULES
 * - Light from 06:00 to 17:59 local, dark from 18:00 to 05:59 local.
 * - "Local" always means a real IANA zone evaluated through Intl, never a
 *   hardcoded UTC offset — so daylight saving is handled by the platform's own
 *   tz database rather than by arithmetic we would get wrong twice a year.
 * - Time zone priority: active journey destination → traveller's own chosen
 *   zone → device zone → UTC as an honest fallback that claims nothing.
 *
 * Why the boundary is a computed duration rather than a repeating interval:
 * a timer that fires exactly at the transition costs nothing while the app is
 * open, and it is recomputed from scratch every time it fires, so a DST jump
 * simply lands on the next correct boundary instead of drifting.
 */

export const THEME_MODES = ['auto', 'light', 'dark'];
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 18;
/** The labelled fallback when no zone can be established at all. */
export const FALLBACK_TIME_ZONE = 'UTC';

/** Returns 'auto' | 'light' | 'dark', or null when the value is not one of them. */
export function normalizeThemeMode(value) {
  return THEME_MODES.includes(value) ? value : null;
}

/** True only for a zone the runtime's own tz database accepts. */
export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * The device's zone. This is the browser's own setting, which is a user
 * preference rather than a location claim — it is never labelled as position.
 */
export function detectDeviceTimeZone() {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(zone) ? zone : null;
  } catch (_) {
    return null;
  }
}

/**
 * Priority resolution. An invalid or missing journey zone falls through rather
 * than being "corrected" into something plausible.
 */
export function resolveTimeZone({ journeyTimeZone, travelerTimeZone, deviceTimeZone } = {}) {
  if (isValidTimeZone(journeyTimeZone)) return { timeZone: journeyTimeZone, source: 'journey' };
  if (isValidTimeZone(travelerTimeZone)) return { timeZone: travelerTimeZone, source: 'traveler' };
  if (isValidTimeZone(deviceTimeZone)) return { timeZone: deviceTimeZone, source: 'device' };
  return { timeZone: FALLBACK_TIME_ZONE, source: 'fallback' };
}

// Formatters are expensive to build and this runs on every tick.
const formatterCache = new Map();

function zonedFormatter(timeZone) {
  const zone = isValidTimeZone(timeZone) ? timeZone : FALLBACK_TIME_ZONE;
  if (!formatterCache.has(zone)) {
    formatterCache.set(zone, new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }));
  }
  return formatterCache.get(zone);
}

/**
 * Wall-clock time in the zone: { hour, minute, second }. Reading the wall clock
 * this way (instead of computing an offset by hand) is what makes DST correct —
 * the tz database answers, we never subtract.
 */
export function zoneParts(date, timeZone) {
  try {
    const parts = zonedFormatter(timeZone).formatToParts(date);
    const pick = (type) => Number(parts.find((p) => p.type === type)?.value);
    const hour = pick('hour');
    const minute = pick('minute');
    const second = pick('second');
    if (![hour, minute, second].every(Number.isFinite)) return null;
    return { hour, minute, second };
  } catch (_) {
    return null;
  }
}

/** Minutes since local midnight, or null when the zone cannot be read. */
export function minutesOfDay(date, timeZone) {
  const parts = zoneParts(date, timeZone);
  if (!parts) return null;
  return parts.hour * 60 + parts.minute;
}

/** Light between 06:00 and 17:59 local; dark otherwise. */
export function isDaytime(date, timeZone) {
  const minutes = minutesOfDay(date, timeZone);
  if (minutes === null) return true; // unreadable zone: stay on the calm, readable light theme
  return minutes >= DAY_START_HOUR * 60 && minutes < DAY_END_HOUR * 60;
}

/**
 * Milliseconds until the next 06:00 or 18:00 boundary in that zone. Used to
 * schedule exactly one wake-up; the value is advisory, so a caller clamps it.
 */
export function nextBoundaryDelayMs(date, timeZone) {
  const parts = zoneParts(date, timeZone);
  if (!parts) return null;
  const nowMinutes = parts.hour * 60 + parts.minute;
  const targets = [DAY_START_HOUR * 60, DAY_END_HOUR * 60];
  let diff = Infinity;
  for (const target of targets) {
    let delta = (target - nowMinutes + 1440) % 1440;
    if (delta === 0) delta = 1440; // the boundary is "now" — wait for the next one
    diff = Math.min(diff, delta);
  }
  if (!Number.isFinite(diff)) return null;
  return Math.max(1000, diff * 60 * 1000 - parts.second * 1000);
}

/** "18:42" in the zone, for the settings card. */
export function zoneClockLabel(date, timeZone) {
  const parts = zoneParts(date, timeZone);
  if (!parts) return null;
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

/** "America/Port_of_Spain" → "Port of Spain", for honest, readable labelling. */
export function zoneFriendlyName(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone) return null;
  const tail = timeZone.split('/').pop() || timeZone;
  return tail.replace(/_/g, ' ');
}

/**
 * The theme actually applied. A manual choice always wins; Auto asks the zone
 * what time it is right now.
 */
export function resolveResolvedTheme(mode, date, timeZone) {
  if (mode === 'light') return 'day';
  if (mode === 'dark') return 'night';
  return isDaytime(date, timeZone) ? 'day' : 'night';
}