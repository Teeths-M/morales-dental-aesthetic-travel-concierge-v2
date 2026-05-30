/**
 * Visa Matrix — evaluates origin nationality vs procedure destination country.
 * Returns: 'exempt' | 'evisa' | 'embassy' | 'unknown'
 *
 * Updated: May 2026 — sources: Wikipedia Visa Policy pages, doyouneedvisa.com
 * Primary focus: Caribbean / Latin America destinations (our core markets).
 * Explicit route overrides take priority over regional defaults.
 */

// ── Explicit route overrides: [origin, destination] → status ──────────────
// These fire FIRST before any regional fallback.
const EXPLICIT_ROUTES = [
  // ── VENEZUELA entries (source: en.wikipedia.org/wiki/Visa_policy_of_Venezuela) ──
  // CARICOM / Caribbean → Venezuela → exempt
  {
    origins: ['Trinidadian', 'Jamaican', 'Barbadian', 'Grenadian', 'Antiguan', 'Belizean', 'Dominican', 'Vincentian', 'Kittitian'],
    destinations: ['Venezuela'],
    status: 'exempt',
  },
  // LATAM → Venezuela → exempt
  {
    origins: ['Brazilian', 'Argentine', 'Colombian', 'Ecuadorian', 'Mexican', 'Bolivian', 'Peruvian', 'Chilean', 'Costa Rican', 'Uruguayan'],
    destinations: ['Venezuela'],
    status: 'exempt',
  },
  // Western nations → Venezuela → exempt
  {
    origins: ['American', 'British', 'Canadian', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Irish', 'Japanese', 'Russian'],
    destinations: ['Venezuela'],
    status: 'exempt',
  },
  // Saint Lucian → Venezuela → embassy (Saint Lucia NOT on Venezuela exempt list)
  {
    origins: ['Saint Lucian', 'St. Lucian'],
    destinations: ['Venezuela'],
    status: 'embassy',
  },

  // ── COLOMBIA entries ──
  {
    origins: ['American', 'Canadian', 'British', 'Irish', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish'],
    destinations: ['Colombia'],
    status: 'exempt',
  },
  {
    origins: ['Trinidadian', 'Jamaican', 'Barbadian', 'Grenadian', 'Brazilian', 'Argentine', 'Chilean', 'Peruvian', 'Ecuadorian', 'Mexican', 'Uruguayan', 'Costa Rican', 'Bolivian'],
    destinations: ['Colombia'],
    status: 'exempt',
  },
  { origins: ['Indian', 'Chinese', 'Russian'], destinations: ['Colombia'], status: 'evisa' },

  // ── DOMINICAN REPUBLIC entries ──
  {
    origins: ['American', 'Canadian', 'British', 'Irish', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Japanese'],
    destinations: ['Dominican Republic'],
    status: 'exempt',
  },
  {
    origins: ['Trinidadian', 'Jamaican', 'Barbadian', 'Grenadian', 'Saint Lucian', 'St. Lucian', 'Brazilian', 'Argentine', 'Chilean', 'Colombian', 'Mexican', 'Peruvian', 'Ecuadorian'],
    destinations: ['Dominican Republic'],
    status: 'exempt',
  },
  { origins: ['Russian', 'Ukrainian', 'Chinese', 'Indian'], destinations: ['Dominican Republic'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African'], destinations: ['Dominican Republic'], status: 'embassy' },

  // ── JAMAICA entries ──
  {
    origins: ['American', 'Canadian', 'British', 'Irish', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish'],
    destinations: ['Jamaica'],
    status: 'exempt',
  },
  {
    origins: ['Trinidadian', 'Barbadian', 'Grenadian', 'Saint Lucian', 'St. Lucian', 'Brazilian', 'Argentine', 'Colombian', 'Mexican'],
    destinations: ['Jamaica'],
    status: 'exempt',
  },
  { origins: ['Indian', 'Chinese'], destinations: ['Jamaica'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African'], destinations: ['Jamaica'], status: 'embassy' },

  // ── BARBADOS entries (CARICOM free movement applies) ──
  {
    origins: ['American', 'Canadian', 'British', 'Irish', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Japanese'],
    destinations: ['Barbados'],
    status: 'exempt',
  },
  {
    origins: ['Trinidadian', 'Jamaican', 'Grenadian', 'Saint Lucian', 'St. Lucian', 'Brazilian', 'Argentine', 'Colombian', 'Venezuelan'],
    destinations: ['Barbados'],
    status: 'exempt',
  },
  { origins: ['Indian'], destinations: ['Barbados'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African'], destinations: ['Barbados'], status: 'embassy' },

  // ── TRINIDAD AND TOBAGO entries ──
  {
    origins: ['American', 'Canadian', 'British', 'Irish', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Japanese'],
    destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'],
    status: 'exempt',
  },
  {
    origins: ['Jamaican', 'Barbadian', 'Grenadian', 'Saint Lucian', 'St. Lucian', 'Brazilian', 'Argentine', 'Colombian'],
    destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'],
    status: 'exempt',
  },
  { origins: ['Indian'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'], status: 'evisa' },
  { origins: ['Venezuelan'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'], status: 'embassy' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'], status: 'embassy' },

  // ── PANAMA entries ──
  {
    origins: ['American', 'Canadian', 'British', 'Irish', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish'],
    destinations: ['Panama'],
    status: 'exempt',
  },
  {
    origins: ['Trinidadian', 'Jamaican', 'Barbadian', 'Grenadian', 'Brazilian', 'Argentine', 'Colombian', 'Mexican', 'Chilean', 'Peruvian', 'Ecuadorian'],
    destinations: ['Panama'],
    status: 'exempt',
  },
  { origins: ['Chinese', 'Indian', 'Russian'], destinations: ['Panama'], status: 'evisa' },

  // ── COSTA RICA entries ──
  {
    origins: ['American', 'Canadian', 'British', 'Irish', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Japanese'],
    destinations: ['Costa Rica'],
    status: 'exempt',
  },
  {
    origins: ['Trinidadian', 'Jamaican', 'Barbadian', 'Grenadian', 'Brazilian', 'Argentine', 'Colombian', 'Mexican', 'Chilean', 'Peruvian', 'Ecuadorian'],
    destinations: ['Costa Rica'],
    status: 'exempt',
  },
  { origins: ['Chinese', 'Indian', 'Russian'], destinations: ['Costa Rica'], status: 'evisa' },

  // ── MEXICO entries ──
  {
    origins: ['American', 'Canadian', 'British', 'Irish', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Japanese'],
    destinations: ['Mexico'],
    status: 'exempt',
  },
  {
    origins: ['Trinidadian', 'Jamaican', 'Barbadian', 'Grenadian', 'Brazilian', 'Argentine', 'Colombian', 'Chilean', 'Peruvian', 'Ecuadorian'],
    destinations: ['Mexico'],
    status: 'exempt',
  },
  { origins: ['Chinese', 'Indian'], destinations: ['Mexico'], status: 'evisa' },

  // ── BELIZE entries ──
  {
    origins: ['American', 'Canadian', 'British', 'Irish', 'Australian', 'New Zealander', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish'],
    destinations: ['Belize'],
    status: 'exempt',
  },
  {
    origins: ['Trinidadian', 'Jamaican', 'Barbadian', 'Grenadian', 'Saint Lucian', 'St. Lucian', 'Brazilian', 'Argentine', 'Colombian', 'Mexican'],
    destinations: ['Belize'],
    status: 'exempt',
  },
];

// ── Regional defaults (fallback when no explicit route matches) ─────────────
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
  'Venezuela',
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
  'Venezuela': 'https://evisa.mppre.gob.ve',
};

export function getEvisaLink(procedureCountry) {
  for (const [key, url] of Object.entries(EVISA_LINKS)) {
    if (procedureCountry?.toLowerCase().includes(key.toLowerCase())) return url;
  }
  return 'https://www.iatatravelcentre.com/';
}