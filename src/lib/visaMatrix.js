/**
 * Visa Matrix — evaluates origin nationality vs procedure destination country.
 * Returns: 'exempt' | 'evisa' | 'embassy' | 'unknown'
 * 
 * Primary focus: Caribbean / Latin America destinations (our core markets).
 */

// Countries that are commonly visa-exempt for tourist travel to Caribbean/LATAM destinations
const EXEMPT_TO_CARIBBEAN = [
  'American', 'British', 'Canadian', 'French', 'German', 'Dutch', 'Italian',
  'Spanish', 'Portuguese', 'Australian', 'New Zealander', 'Irish', 'Swedish',
  'Norwegian', 'Danish', 'Finnish', 'Swiss', 'Belgian', 'Austrian', 'Japanese',
  'South Korean', 'Singaporean', 'Israeli', 'Emirati',
];

const EVISA_TO_CARIBBEAN = [
  'Indian', 'Chinese', 'Russian', 'Brazilian', 'Argentine', 'Colombian',
  'Mexican', 'Peruvian', 'Chilean', 'Venezuelan', 'Ecuadorian',
  'South African', 'Nigerian', 'Ghanaian', 'Kenyan', 'Egyptian',
  'Moroccan', 'Jordanian', 'Lebanese', 'Turkish', 'Ukrainian', 'Georgian',
];

// Destinations in our primary procedure region
const CARIBBEAN_DESTINATIONS = [
  'Trinidad and Tobago', 'Trinidad', 'Tobago', 'Jamaica', 'Barbados',
  'Saint Lucia', 'Grenada', 'Antigua', 'Dominican Republic', 'Guyana',
  'Suriname', 'Belize', 'Panama', 'Costa Rica', 'Colombia',
];

export function checkVisaRequirement(originNationality, procedureCountry) {
  if (!originNationality || !procedureCountry) return 'unknown';

  const dest = procedureCountry.trim();
  const isCaribbean = CARIBBEAN_DESTINATIONS.some(c =>
    dest.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(dest.toLowerCase())
  );

  // If same country — no visa
  if (originNationality.toLowerCase().includes(dest.toLowerCase())) return 'exempt';

  if (isCaribbean) {
    if (EXEMPT_TO_CARIBBEAN.includes(originNationality)) return 'exempt';
    if (EVISA_TO_CARIBBEAN.includes(originNationality)) return 'evisa';
    return 'embassy';
  }

  // Fallback for non-Caribbean destinations
  if (EXEMPT_TO_CARIBBEAN.includes(originNationality)) return 'evisa';
  return 'embassy';
}

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