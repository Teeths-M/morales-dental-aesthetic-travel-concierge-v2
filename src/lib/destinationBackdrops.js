/**
 * destinationBackdrops — the country photo behind the top of the M-Safe screen.
 *
 * The country comes from the visitor's own internet connection (useAutoLocation's
 * approximate IP lookup, no permission prompt), so someone who scans a QR code in
 * Barbados sees Barbados. Anywhere without a photo gets the plain navy sky that
 * CountryBackdrop.jsx draws, never a guess.
 *
 * Photos: Pixabay, free for commercial use with no credit required
 * (https://pixabay.com/service/license-summary/). Chosen without recognisable
 * faces and without landmarks whose image rights are claimed or trademarked
 * (Christ the Redeemer, the Petronas Towers, Marina Bay Sands). Each entry keeps
 * its Pixabay page so the source stays on record. Files live in
 * public/destinations/<code>.webp, 1280 px wide.
 */

export const BACKDROPS = {
  TT: { place: "Trinidad's north coast", source: 'https://pixabay.com/photos/north-coast-trinidad-1773469/' },
  JM: { place: 'Jamaican beach at dawn', source: 'https://pixabay.com/photos/dawn-in-jamaika-beach-palms-sand-2053540/' },
  BB: { place: 'Bathsheba, Barbados', source: 'https://pixabay.com/photos/blue-stone-caribbean-nature-sky-69779/' },
  DO: { place: 'Palms at sunset, Dominican Republic', source: 'https://pixabay.com/photos/tropical-vacation-sunset-palm-2444998/' },
  CU: { place: 'The Malecón, Havana', source: 'https://pixabay.com/photos/car-sunrise-havana-night-travel-2151324/' },
  LC: { place: 'The Pitons, Saint Lucia', source: 'https://pixabay.com/photos/pitons-st-lucia-saint-lucia-3104113/' },
  BR: { place: 'Rio de Janeiro and Sugarloaf', source: 'https://pixabay.com/photos/rio-de-janeiro-brazil-city-urban-1963744/' },
  MX: { place: 'Mexico City at night', source: 'https://pixabay.com/photos/long-exposition-night-dark-darling-3705717/' },
  CO: { place: 'Cartagena, Colombia', source: 'https://pixabay.com/photos/cartagena-de-indias-colombia-city-674706/' },
  CR: { place: 'Arenal Volcano, Costa Rica', source: 'https://pixabay.com/photos/volcano-clouds-sunset-5182907/' },
  PA: { place: 'Panama City bay', source: 'https://pixabay.com/photos/panama-bay-architecture-skyline-182959/' },
  AR: { place: 'Buenos Aires at night', source: 'https://pixabay.com/photos/buenos-aires-argentina-night-245393/' },
  VE: { place: 'Caracas at sunset', source: 'https://pixabay.com/photos/caracas-venezuela-sunset-clouds-4539664/' },
  TH: { place: 'Wat Arun, Bangkok', source: 'https://pixabay.com/photos/bangkok-thailand-temple-gold-7997157/' },
  IN: { place: 'Gateway of India, Mumbai', source: 'https://pixabay.com/photos/india-mumbai-bombay-gate-building-294/' },
  TR: { place: 'Eyüp, Istanbul', source: 'https://pixabay.com/photos/ey%C3%BCp-sultan-istanbul-turkey-mosque-10525007/' },
  MY: { place: 'Penang Bridge', source: 'https://pixabay.com/photos/twilight-penang-bridge-7429902/' },
  PH: { place: 'Manila Bay at night', source: 'https://pixabay.com/photos/manila-manila-bay-city-night-2309658/' },
  KR: { place: 'The Han River, Seoul', source: 'https://pixabay.com/photos/night-view-bridge-river-building-7603847/' },
  TW: { place: 'Taipei at night', source: 'https://pixabay.com/photos/taiwan-city-cityscape-travel-high-5460063/' },
  HU: { place: 'Parliament, Budapest', source: 'https://pixabay.com/photos/river-city-budapest-hungary-9010602/' },
  PL: { place: 'Wawel Castle, Kraków', source: 'https://pixabay.com/photos/poland-krakow-night-city-wawel-82017/' },
  EG: { place: 'Felucca on the Nile', source: 'https://pixabay.com/photos/felucca-nile-sunset-flow-sailboat-7237715/' },
  IL: { place: 'Tel Aviv at night', source: 'https://pixabay.com/photos/tel-aviv-israel-city-skyline-2827030/' },
  JO: { place: 'Wadi Rum at sunset', source: 'https://pixabay.com/photos/desert-wadi-rum-jordan-sunset-4954346/' },
  ES: { place: 'Gran Vía, Madrid', source: 'https://pixabay.com/photos/madrid-spain-city-cityscape-urban-2111814/' },
  PT: { place: '25 de Abril Bridge, Lisbon', source: 'https://pixabay.com/photos/lisbon-portugal-bridge-river-2276961/' },
  SG: { place: 'Singapore River at night', source: 'https://pixabay.com/photos/singapore-river-skyline-building-1490396/' },
  US: { place: 'Miami at night', source: 'https://pixabay.com/photos/miami-florida-skyline-city-50553/' },
  CA: { place: 'Toronto skyline', source: 'https://pixabay.com/photos/buildings-cn-tower-river-waterfront-2297210/' },
  GB: { place: 'Tower Bridge, London', source: 'https://pixabay.com/photos/tower-bridge-river-london-5762070/' },
};

// For the few cases where a lookup returns a country name instead of a code
// (the server fallback, or a CaseRecord's procedure_country).
const NAME_TO_CODE = {
  'trinidad and tobago': 'TT', 'trinidad & tobago': 'TT', trinidad: 'TT', tobago: 'TT',
  jamaica: 'JM', barbados: 'BB', 'dominican republic': 'DO', cuba: 'CU',
  'saint lucia': 'LC', 'st lucia': 'LC', 'st. lucia': 'LC',
  brazil: 'BR', brasil: 'BR', mexico: 'MX', 'méxico': 'MX', colombia: 'CO', 'costa rica': 'CR',
  panama: 'PA', 'panamá': 'PA', argentina: 'AR', venezuela: 'VE',
  thailand: 'TH', india: 'IN', turkey: 'TR', turkiye: 'TR', 'türkiye': 'TR', malaysia: 'MY',
  philippines: 'PH', 'south korea': 'KR', korea: 'KR', 'republic of korea': 'KR', 'korea, republic of': 'KR',
  taiwan: 'TW', hungary: 'HU', poland: 'PL', egypt: 'EG', israel: 'IL', jordan: 'JO',
  spain: 'ES', 'españa': 'ES', portugal: 'PT', singapore: 'SG',
  'united states': 'US', 'united states of america': 'US', usa: 'US', 'u.s.': 'US', 'u.s.a.': 'US',
  canada: 'CA', 'united kingdom': 'GB', uk: 'GB', 'great britain': 'GB', england: 'GB', scotland: 'GB', wales: 'GB',
};

function codeFromString(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  return NAME_TO_CODE[s.toLowerCase()] || null;
}

/**
 * The first real two-letter country code among the inputs. Each input may be a
 * code ("tt"), a name ("Trinidad and Tobago"), or a location object with
 * country_code / country. Returns null when nothing usable is there.
 */
export function countryCodeFrom(...inputs) {
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string') {
      const code = codeFromString(input);
      if (code) return code;
      continue;
    }
    if (typeof input === 'object') {
      const code = codeFromString(input.country_code) || codeFromString(input.country);
      if (code) return code;
    }
  }
  return null;
}

/** The photo for a country, or null when there isn't one. */
export function backdropFor(code) {
  const c = codeFromString(code);
  if (!c || !BACKDROPS[c]) return null;
  return { code: c, src: `/destinations/${c.toLowerCase()}.webp`, ...BACKDROPS[c] };
}

/** The flag emoji for a two-letter code ("BR" -> 🇧🇷), or '' when it isn't one. */
export function flagEmoji(code) {
  if (typeof code !== 'string' || !/^[A-Za-z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...code.toUpperCase().split('').map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/**
 * Whether this device draws flag emoji as flags. Windows shows them as two
 * plain letters ("BR"), so the flag is left out there; phones and Macs draw them.
 */
export function deviceShowsFlagEmoji(userAgent = (typeof navigator !== 'undefined' ? navigator.userAgent : '')) {
  return !/Windows/i.test(userAgent || '');
}

/** A readable country name for a code, using the browser's own list where it has one. */
export function countryLabel(code, fallbackName = '') {
  if (typeof code === 'string' && /^[A-Za-z]{2}$/.test(code)) {
    try {
      const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase());
      // An unassigned code comes back as itself or as "Unknown Region".
      if (name && name.toUpperCase() !== code.toUpperCase() && name !== 'Unknown Region') return name;
    } catch { /* older browser: use the fallback below */ }
  }
  return fallbackName || '';
}
