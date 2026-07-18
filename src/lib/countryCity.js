/**
 * countryCity — the single source of truth for "which cities belong to this
 * country", used by every country/city dropdown pair on the platform.
 *
 * Two datasets have to agree here and historically did not:
 *   • src/lib/countries.js — all 195 countries, because a traveller can come
 *     from anywhere.
 *   • src/lib/cityData.json — curated cities, but only for the 29 markets M
 *     actually coordinates in.
 *
 * So ~167 countries have no city list, and that is expected, not a bug. The
 * rule this module encodes is: a country we have no city list for must still
 * let the user type their city. A dropdown that offers nothing and accepts
 * nothing is a dead end, and dead ends are exactly what the M Ease Manifesto
 * forbids ("Can't spell my name but I can book on M"). Callers use
 * `hasCityList` to decide between pick-from-list and type-your-own; they must
 * never leave the user with neither.
 */
import cityData from '@/lib/cityData.json';
import { COUNTRY_NAMES } from '@/lib/countries';

/**
 * Country names that differ between the two datasets, or that users and older
 * records commonly store in another form. Keys are lower-cased aliases, values
 * are the exact key used inside cityData.json.
 *
 * 'Czechia' → 'Czech Republic' is a real defect this fixes: the 195-country
 * picker offers "Czechia", cityData.json is keyed "Czech Republic", so picking
 * Czechia silently produced zero cities.
 */
const COUNTRY_ALIASES = {
  'czechia': 'Czech Republic',
  'czech republic': 'Czech Republic',
  'usa': 'United States',
  'u.s.a.': 'United States',
  'us': 'United States',
  'u.s.': 'United States',
  'united states of america': 'United States',
  'uk': 'United Kingdom',
  'u.k.': 'United Kingdom',
  'great britain': 'United Kingdom',
  'england': 'United Kingdom',
  'uae': 'United Arab Emirates',
  'u.a.e.': 'United Arab Emirates',
  'emirates': 'United Arab Emirates',
  'trinidad': 'Trinidad and Tobago',
  'tobago': 'Trinidad and Tobago',
  'dr': 'Dominican Republic',
  'holland': 'Netherlands',
  'south korea': 'South Korea',
  'korea': 'South Korea',
  'turkiye': 'Turkey',
  'türkiye': 'Turkey',

  // src/lib/translations.js writes "Trinidad & Tobago" with an ampersand while
  // cityData.json uses "and" — so the doctor signup city list came back empty
  // for Trinidad, M's own home market.
  'trinidad & tobago': 'Trinidad and Tobago',
  'trinidad y tobago': 'Trinidad and Tobago',
  'trinité-et-tobago': 'Trinidad and Tobago',
  'trinidad e tobago': 'Trinidad and Tobago',
  'trinidad und tobago': 'Trinidad and Tobago',

  // Localised country names. The signup wizards render country names in the
  // user's language (translations.js), but cityData.json is keyed in English —
  // so a Spanish, French, Portuguese or German user picked a country and got an
  // empty city list for almost every option. These map the localised label back
  // to the English key.
  'estados unidos': 'United States',
  'états-unis': 'United States',
  'vereinigte staaten': 'United States',
  'canadá': 'Canada',
  'kanada': 'Canada',
  'méxico': 'Mexico',
  'mexique': 'Mexico',
  'mexiko': 'Mexico',
  'reino unido': 'United Kingdom',
  'royaume-uni': 'United Kingdom',
  'vereinigtes königreich': 'United Kingdom',
  'españa': 'Spain',
  'espagne': 'Spain',
  'espanha': 'Spain',
  'spanien': 'Spain',
  'francia': 'France',
  'frança': 'France',
  'frankreich': 'France',
  'alemania': 'Germany',
  'allemagne': 'Germany',
  'alemanha': 'Germany',
  'deutschland': 'Germany',
  'brasil': 'Brazil',
  'brésil': 'Brazil',
  'brasilien': 'Brazil',
  'colombie': 'Colombia',
  'colômbia': 'Colombia',
  'kolumbien': 'Colombia',
  'jamaïque': 'Jamaica',
  'jamaika': 'Jamaica',
  'república dominicana': 'Dominican Republic',
  'république dominicaine': 'Dominican Republic',
  'dominikanische republik': 'Dominican Republic',
  'tailandia': 'Thailand',
  'thaïlande': 'Thailand',
  'tailândia': 'Thailand',
  'turquía': 'Turkey',
  'turquie': 'Turkey',
  'turquia': 'Turkey',
  'türkei': 'Turkey',
  'inde': 'India',
  'índia': 'India',
  'indien': 'India',
  'corea del sur': 'South Korea',
  'corée du sud': 'South Korea',
  'coreia do sul': 'South Korea',
  'australie': 'Australia',
  'austrália': 'Australia',

  // Nationality adjectives. Booking stores form.nationality ("Venezuelan"),
  // not a country name, so the city list has to resolve the adjective too.
  'american': 'United States',
  'canadian': 'Canada',
  'mexican': 'Mexico',
  'venezuelan': 'Venezuela',
  'colombian': 'Colombia',
  'brazilian': 'Brazil',
  'argentine': 'Argentina',
  'argentinian': 'Argentina',
  'spanish': 'Spain',
  'british': 'United Kingdom',
  'french': 'France',
  'german': 'Germany',
  'australian': 'Australia',
  'indian': 'India',
  'turkish': 'Turkey',
  'thai': 'Thailand',
  'costa rican': 'Costa Rica',
  'panamanian': 'Panama',
  'dominican': 'Dominican Republic',
  'jamaican': 'Jamaica',
  'trinidadian': 'Trinidad and Tobago',
  'south african': 'South Africa',
  'emirati': 'United Arab Emirates',
  'singaporean': 'Singapore',
  'malaysian': 'Malaysia',
  'filipino': 'Philippines',
  'indonesian': 'Indonesia',
  'polish': 'Poland',
  'hungarian': 'Hungary',
  'czech': 'Czech Republic',
};

/**
 * Resolves whatever a form or a stored record calls a country to the exact key
 * used by cityData.json. Returns '' when there is nothing usable.
 * @param {string} country
 * @returns {string}
 */
export function normalizeCountry(country) {
  if (!country || typeof country !== 'string') return '';
  const trimmed = country.trim();
  if (!trimmed) return '';
  if (cityData[trimmed]) return trimmed;              // already exact
  const alias = COUNTRY_ALIASES[trimmed.toLowerCase()];
  if (alias && cityData[alias]) return alias;
  // Case-insensitive match as a last resort ("mexico" → "Mexico").
  const hit = Object.keys(cityData).find((k) => k.toLowerCase() === trimmed.toLowerCase());
  return hit || '';
}

/**
 * Cities for a country, or [] when we have no curated list for it.
 * @param {string} country
 * @returns {string[]}
 */
export function getCitiesForCountry(country) {
  const key = normalizeCountry(country);
  return key ? cityData[key] : [];
}

/**
 * Do we have a curated city list for this country? Drives whether the city
 * field is a picker or a free-text entry — never neither.
 * @param {string} country
 * @returns {boolean}
 */
export function hasCityList(country) {
  return getCitiesForCountry(country).length > 0;
}

/**
 * Is this city valid for this country? Used to decide whether a previously
 * chosen city survives a country change. Any city is considered valid for a
 * country we have no list for, since the user typed it themselves.
 * @param {string} country
 * @param {string} city
 * @returns {boolean}
 */
export function isCityInCountry(country, city) {
  if (!city) return true;
  const cities = getCitiesForCountry(country);
  if (cities.length === 0) return true;
  return cities.some((c) => c.toLowerCase() === String(city).trim().toLowerCase());
}

/**
 * The city value that should survive a country change: keep it when it is
 * still valid for the new country, otherwise clear it. Clearing a city the
 * user already typed for an uncovered country would be data loss, which is why
 * this is not an unconditional reset.
 * @param {string} nextCountry
 * @param {string} currentCity
 * @returns {string}
 */
export function cityAfterCountryChange(nextCountry, currentCity) {
  return isCityInCountry(nextCountry, currentCity) ? (currentCity || '') : '';
}

/** All 195 countries, for the country side of the pair. */
export const ALL_COUNTRY_OPTIONS = COUNTRY_NAMES.map((n) => ({ value: n, label: n }));

/**
 * The markets M actually coordinates in — an explicit list, deliberately NOT
 * derived from cityData's keys.
 *
 * It used to be `Object.keys(cityData)`, which worked only while city data and
 * served markets happened to be the same 29 countries. Once cityData was
 * expanded to all 195 for the city pickers, deriving from it would have
 * silently advertised M as operating in every country on earth. City data is
 * geography; served markets is a business fact. They are separate now.
 *
 * Add a country here when M genuinely onboards partners in it.
 */
export const SERVED_COUNTRIES = [
  'Argentina', 'Australia', 'Brazil', 'Canada', 'Colombia', 'Costa Rica',
  'Czech Republic', 'Dominican Republic', 'France', 'Germany', 'Hungary',
  'India', 'Indonesia', 'Jamaica', 'Malaysia', 'Mexico', 'Panama',
  'Philippines', 'Poland', 'Singapore', 'South Africa', 'Spain', 'Thailand',
  'Trinidad and Tobago', 'Turkey', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Venezuela',
];

/** Served markets as {value,label} options — for destination/market pickers. */
export const SERVED_COUNTRY_OPTIONS = [...SERVED_COUNTRIES]
  .sort((a, b) => a.localeCompare(b))
  .map((n) => ({ value: n, label: n }));

/** Placeholder copy, kept in one place so every pair reads identically. */
export const CITY_PLACEHOLDER = {
  noCountry: 'Please select a country first',
  picker: 'Select or type your city',
  freeText: 'Enter your city',
};
