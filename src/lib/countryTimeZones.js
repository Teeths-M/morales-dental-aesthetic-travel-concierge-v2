/**
 * countryTimeZones — the trip country's IANA time zone.
 *
 * WHY THIS TABLE EXISTS
 * The theme has to follow the journey's local clock ("it's night where your
 * treatment is"), but a CaseRecord only stores `procedure_country` — a name,
 * never a zone. This maps that country to the single zone most of its
 * population lives in.
 *
 * WHAT IT IS NOT
 * Not location detection. A country can span several zones; this returns the
 * representative one and callers label it as the trip's country zone, never as
 * "you are here". Nothing here reads GPS or IP geolocation, and an unknown
 * country returns null so the caller falls through to the traveller's own
 * chosen zone or the device's — never to a guess.
 *
 * Keys are both the lower-case country name (accents and punctuation folded)
 * and the ISO-2 code, so either form coming out of a record resolves.
 */

export const COUNTRY_TIME_ZONES = {
  // Caribbean
  'trinidad and tobago': 'America/Port_of_Spain', tt: 'America/Port_of_Spain',
  jamaica: 'America/Jamaica', jm: 'America/Jamaica',
  barbados: 'America/Barbados', bb: 'America/Barbados',
  guyana: 'America/Guyana', gy: 'America/Guyana',
  grenada: 'America/Grenada', gd: 'America/Grenada',
  'saint lucia': 'America/St_Lucia', lc: 'America/St_Lucia',
  bahamas: 'America/Nassau', bs: 'America/Nassau',
  'dominican republic': 'America/Santo_Domingo', do: 'America/Santo_Domingo',
  haiti: 'America/Port-au-Prince', ht: 'America/Port-au-Prince',
  cuba: 'America/Havana', cu: 'America/Havana',
  'puerto rico': 'America/Puerto_Rico', pr: 'America/Puerto_Rico',

  // North America
  'united states': 'America/New_York', 'united states of america': 'America/New_York', usa: 'America/New_York', us: 'America/New_York',
  canada: 'America/Toronto', ca: 'America/Toronto',
  mexico: 'America/Mexico_City', mx: 'America/Mexico_City',

  // Central America
  'costa rica': 'America/Costa_Rica', cr: 'America/Costa_Rica',
  panama: 'America/Panama', pa: 'America/Panama',
  guatemala: 'America/Guatemala', gt: 'America/Guatemala',
  honduras: 'America/Tegucigalpa', hn: 'America/Tegucigalpa',
  'el salvador': 'America/El_Salvador', sv: 'America/El_Salvador',
  nicaragua: 'America/Managua', ni: 'America/Managua',
  belize: 'America/Belize', bz: 'America/Belize',

  // South America
  colombia: 'America/Bogota', co: 'America/Bogota',
  venezuela: 'America/Caracas', ve: 'America/Caracas',
  ecuador: 'America/Guayaquil', ec: 'America/Guayaquil',
  peru: 'America/Lima', pe: 'America/Lima',
  bolivia: 'America/La_Paz', bo: 'America/La_Paz',
  brazil: 'America/Sao_Paulo', br: 'America/Sao_Paulo',
  argentina: 'America/Argentina/Buenos_Aires', ar: 'America/Argentina/Buenos_Aires',
  chile: 'America/Santiago', cl: 'America/Santiago',
  uruguay: 'America/Montevideo', uy: 'America/Montevideo',
  paraguay: 'America/Asuncion', py: 'America/Asuncion',

  // Europe
  'united kingdom': 'Europe/London', gb: 'Europe/London', uk: 'Europe/London',
  ireland: 'Europe/Dublin', ie: 'Europe/Dublin',
  france: 'Europe/Paris', fr: 'Europe/Paris',
  spain: 'Europe/Madrid', es: 'Europe/Madrid',
  portugal: 'Europe/Lisbon', pt: 'Europe/Lisbon',
  italy: 'Europe/Rome', it: 'Europe/Rome',
  germany: 'Europe/Berlin', de: 'Europe/Berlin',
  netherlands: 'Europe/Amsterdam', nl: 'Europe/Amsterdam',
  belgium: 'Europe/Brussels', be: 'Europe/Brussels',
  switzerland: 'Europe/Zurich', ch: 'Europe/Zurich',
  austria: 'Europe/Vienna', at: 'Europe/Vienna',
  greece: 'Europe/Athens', gr: 'Europe/Athens',
  poland: 'Europe/Warsaw', pl: 'Europe/Warsaw',
  'czech republic': 'Europe/Prague', czechia: 'Europe/Prague', cz: 'Europe/Prague',
  hungary: 'Europe/Budapest', hu: 'Europe/Budapest',
  turkey: 'Europe/Istanbul', turkiye: 'Europe/Istanbul', tr: 'Europe/Istanbul',
  russia: 'Europe/Moscow', ru: 'Europe/Moscow',
  ukraine: 'Europe/Kyiv', ua: 'Europe/Kyiv',

  // Africa
  morocco: 'Africa/Casablanca', ma: 'Africa/Casablanca',
  egypt: 'Africa/Cairo', eg: 'Africa/Cairo',
  nigeria: 'Africa/Lagos', ng: 'Africa/Lagos',
  ghana: 'Africa/Accra', gh: 'Africa/Accra',
  kenya: 'Africa/Nairobi', ke: 'Africa/Nairobi',
  'south africa': 'Africa/Johannesburg', za: 'Africa/Johannesburg',
  ethiopia: 'Africa/Addis_Ababa', et: 'Africa/Addis_Ababa',
  tanzania: 'Africa/Dar_es_Salaam', tz: 'Africa/Dar_es_Salaam',

  // Middle East
  'united arab emirates': 'Asia/Dubai', uae: 'Asia/Dubai', ae: 'Asia/Dubai',
  'saudi arabia': 'Asia/Riyadh', sa: 'Asia/Riyadh',
  qatar: 'Asia/Qatar', qa: 'Asia/Qatar',
  oman: 'Asia/Muscat', om: 'Asia/Muscat',
  bahrain: 'Asia/Bahrain', bh: 'Asia/Bahrain',
  kuwait: 'Asia/Kuwait', kw: 'Asia/Kuwait',
  israel: 'Asia/Jerusalem', il: 'Asia/Jerusalem',
  jordan: 'Asia/Amman', jo: 'Asia/Amman',
  lebanon: 'Asia/Beirut', lb: 'Asia/Beirut',

  // Asia
  india: 'Asia/Kolkata', in: 'Asia/Kolkata',
  pakistan: 'Asia/Karachi', pk: 'Asia/Karachi',
  bangladesh: 'Asia/Dhaka', bd: 'Asia/Dhaka',
  'sri lanka': 'Asia/Colombo', lk: 'Asia/Colombo',
  thailand: 'Asia/Bangkok', th: 'Asia/Bangkok',
  vietnam: 'Asia/Ho_Chi_Minh', vn: 'Asia/Ho_Chi_Minh',
  cambodia: 'Asia/Phnom_Penh', kh: 'Asia/Phnom_Penh',
  malaysia: 'Asia/Kuala_Lumpur', my: 'Asia/Kuala_Lumpur',
  singapore: 'Asia/Singapore', sg: 'Asia/Singapore',
  indonesia: 'Asia/Jakarta', id: 'Asia/Jakarta',
  philippines: 'Asia/Manila', ph: 'Asia/Manila',
  china: 'Asia/Shanghai', cn: 'Asia/Shanghai',
  'hong kong': 'Asia/Hong_Kong', hk: 'Asia/Hong_Kong',
  taiwan: 'Asia/Taipei', tw: 'Asia/Taipei',
  japan: 'Asia/Tokyo', jp: 'Asia/Tokyo',
  'south korea': 'Asia/Seoul', korea: 'Asia/Seoul', kr: 'Asia/Seoul',

  // Oceania
  australia: 'Australia/Sydney', au: 'Australia/Sydney',
  'new zealand': 'Pacific/Auckland', nz: 'Pacific/Auckland',
};

/** Folds case, accents and punctuation so "Costa  Rica" and "costa-rica" agree. */
export function normalizeCountryKey(country) {
  if (typeof country !== 'string') return '';
  return country
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The representative IANA zone for a trip country, or null when the country is
 * unknown — never a fabricated zone.
 */
export function timeZoneForCountry(country) {
  const key = normalizeCountryKey(country);
  if (!key) return null;
  return COUNTRY_TIME_ZONES[key] || null;
}