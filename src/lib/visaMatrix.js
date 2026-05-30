/**
 * Visa Matrix — evaluates origin nationality vs procedure destination country.
 * Returns: 'exempt' | 'evisa' | 'embassy' | 'unknown'
 *
 * Primary focus: Caribbean / Latin America destinations (our core markets).
 * Explicit route overrides take priority over regional defaults.
 */

// ── Explicit route overrides: [origin, destination] → status ──────────────
// These fire FIRST before any regional fallback.
const EXPLICIT_ROUTES = [
  // US / Canada / UK → LATAM & Caribbean → exempt
  { origins: ['American', 'Canadian'], destinations: ['Mexico', 'Dominican Republic', 'Colombia', 'Costa Rica', 'Panama', 'Jamaica', 'Belize'], status: 'exempt' },
  { origins: ['British', 'Irish', 'Australian', 'New Zealander'], destinations: ['Dominican Republic', 'Jamaica', 'Barbados', 'Trinidad and Tobago', 'Trinidad', 'Colombia'], status: 'exempt' },
  // Schengen → LATAM → exempt
  { origins: ['French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish'], destinations: ['Colombia', 'Dominican Republic', 'Costa Rica', 'Panama', 'Jamaica'], status: 'exempt' },
  // India → Caribbean → evisa
  { origins: ['Indian'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Jamaica', 'Barbados', 'Grenada', 'Saint Lucia'], status: 'evisa' },
  // China → LATAM → evisa
  { origins: ['Chinese'], destinations: ['Colombia', 'Dominican Republic', 'Costa Rica', 'Panama'], status: 'evisa' },
  // Russia / CIS → Caribbean → evisa
  { origins: ['Russian', 'Ukrainian', 'Georgian'], destinations: ['Dominican Republic', 'Colombia', 'Jamaica'], status: 'evisa' },
  // LATAM intra-region → mostly exempt
  { origins: ['Brazilian', 'Argentine', 'Chilean', 'Peruvian', 'Ecuadorian', 'Colombian', 'Mexican'], destinations: ['Colombia', 'Dominican Republic', 'Panama', 'Costa Rica', 'Belize'], status: 'exempt' },
  // Venezuelan → restricted
  { origins: ['Venezuelan'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Barbados', 'Saint Lucia', 'Grenada'], status: 'embassy' },
  // African → Caribbean → embassy
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Jamaica', 'Barbados'], status: 'embassy' },
];

// ── Regional defaults ──────────────────────────────────────────────────────
const EXEMPT_TO_CARIBBEAN = [
  'American', 'British', 'Canadian', 'French', 'German', 'Dutch', 'Italian',
  'Spanish', 'Portuguese', 'Australian', 'New Zealander', 'Irish', 'Swedish',
  'Norwegian', 'Danish', 'Finnish', 'Swiss', 'Belgian', 'Austrian', 'Japanese',
  'South Korean', 'Singaporean', 'Israeli', 'Emirati',
];

const EVISA_TO_CARIBBEAN = [
  'Indian', 'Chinese', 'Russian', 'Brazilian', 'Argentine', 'Colombian',
  'Mexican', 'Peruvian', 'Chilean', 'Ecuadorian',
  'Egyptian', 'Moroccan', 'Jordanian', 'Lebanese', 'Turkish', 'Ukrainian', 'Georgian',
];

const CARIBBEAN_DESTINATIONS = [
  'Trinidad and Tobago', 'Trinidad', 'Tobago', 'Jamaica', 'Barbados',
  'Saint Lucia', 'Grenada', 'Antigua', 'Dominican Republic', 'Guyana',
  'Suriname', 'Belize', 'Panama', 'Costa Rica', 'Colombia', 'Mexico',
];

function matchesList(value, list) {
  return list.some(item => value.toLowerCase().includes(item.toLowerCase()) || item.toLowerCase().includes(value.toLowerCase()));
}

export function checkVisaRequirement(originNationality, procedureCountry) {
  if (!originNationality || !procedureCountry) return 'unknown';
  const origin = originNationality.trim();
  const dest = procedureCountry.trim();

  // Same country → always exempt
  if (origin.toLowerCase().includes(dest.toLowerCase())) return 'exempt';

  // Check explicit route overrides first
  for (const route of EXPLICIT_ROUTES) {
    const originMatch = route.origins.some(o => o.toLowerCase() === origin.toLowerCase());
    const destMatch = matchesList(dest, route.destinations);
    if (originMatch && destMatch) return route.status;
  }

  // Regional fallback
  const isCaribbean = matchesList(dest, CARIBBEAN_DESTINATIONS);
  if (isCaribbean) {
    if (EXEMPT_TO_CARIBBEAN.includes(origin)) return 'exempt';
    if (EVISA_TO_CARIBBEAN.includes(origin)) return 'evisa';
    return 'embassy';
  }

  // Non-Caribbean fallback
  if (EXEMPT_TO_CARIBBEAN.includes(origin)) return 'evisa';
  return 'embassy';
}

// Alias for consistent naming
export const getVisaRequirement = checkVisaRequirement;

export const EVISA_LINKS = {
  'Trinidad and Tobago': 'https://immigration.gov.tt',
  'Trinidad': 'https://immigration.gov.tt',
  'Jamaica': 'https://evisa.gov.jm',
  'Dominican Republic': 'https://migracion.gob.do',
  'Costa Rica': 'https://visas.migracion.go.cr',
  'Colombia': 'https://cancilleria.gov.co/tramites_servicios/visas',
  'Panama': 'https://www.migracion.gob.pa',
};

export function getEvisaLink(procedureCountry) {
  for (const [key, url] of Object.entries(EVISA_LINKS)) {
    if (procedureCountry?.toLowerCase().includes(key.toLowerCase())) return url;
  }
  return 'https://www.iatatravelcentre.com/';
}