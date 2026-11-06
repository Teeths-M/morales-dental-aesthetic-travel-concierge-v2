/**
 * Reading a time that came from the M-Care backend.
 *
 * The backend sends times with no timezone, in UTC ("2026-06-03T01:20:52.204000"; checked against a live record on
 * 2026-11-01), while a time made in the browser ends in "Z" ("2026-11-01T22:16:05.123Z"). Browsers read a date-time
 * with no timezone as LOCAL time, so a server time read directly with new Date() lands hours off for anyone outside
 * UTC: four hours late in Trinidad, three hours early in Istanbul. That put the time under each chat message wrong,
 * kept M-Care's unread dot on (or off) for hours, and broke ordering between server and browser messages.
 *
 * serverTimeMs reads both forms correctly. Use it wherever a backend `created_date`/`updated_date` is shown,
 * compared with the clock, or sorted against a time made in the browser.
 */
const HAS_ZONE = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

/** Milliseconds since 1970 for a backend or browser time (string, Date or number), or NaN if it can't be read. */
export function serverTimeMs(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;
  let s = value.trim();
  if (!s) return NaN;
  // The backend sends six-digit fractions ("…52.204000"); keep the three every browser reads.
  s = s.replace(/(\.\d{3})\d+/, '$1');
  // A date-time with no timezone is UTC. (A date on its own is already read as UTC.)
  if (/T\d/.test(s) && !HAS_ZONE.test(s)) s += 'Z';
  return Date.parse(s);
}
