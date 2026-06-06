/**
 * Visa Matrix — evaluates origin nationality vs procedure destination country.
 * Returns: 'exempt' | 'evisa' | 'embassy' | 'unknown'
 *
 * Updated: May 2026 — sources: Wikipedia Visa Policy pages, doyouneedvisa.com
 * Destinations covered: Venezuela, Colombia, Dominican Republic, Jamaica, Barbados,
 * Trinidad and Tobago, Panama, Costa Rica, Mexico, Belize, Turkey, Thailand, India,
 * Brazil, Argentina, Hungary, Malaysia, South Korea.
 */

// ── Nationality helper groups ───────────────────────────────────────────────
const EU_WESTERN = [
  'American', 'British', 'Canadian', 'Irish', 'Australian', 'New Zealander',
  'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian',
  'Austrian', 'Swiss', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Japanese',
];

const CARICOM = [
  // T&T stored as country name since nationality list update
  'Trinidad and Tobago', 'Trinidadian', 'Republic of Trinidad and Tobago',
  'Jamaican', 'Barbadian', 'Grenadian',
  // Both forms for Antigua
  'Antiguans', 'Antiguan',
  'Belizean',
  // Dominican = from Dominica (island), not Dominican Republic
  'Dominican',
  // Both forms for St. Vincent
  'Saint Vincentian', 'Vincentian',
  // Both forms for St. Lucia
  'Saint Lucian', 'St. Lucian',
  'Kittitian', 'Guyanese', 'Bahamian', 'Surinamese',
];

const LATAM = [
  'Brazilian', 'Argentine', 'Colombian', 'Ecuadorian', 'Mexican', 'Bolivian',
  'Peruvian', 'Chilean', 'Costa Rican', 'Uruguayan', 'Paraguayan', 'Panamanian',
];

const MENA = [
  'Saudi', 'Emirati', 'Qatari', 'Kuwaiti', 'Bahraini', 'Omani',
  'Lebanese', 'Jordanian', 'Moroccan', 'Egyptian', 'Turkish',
];

// ── Explicit route overrides ────────────────────────────────────────────────
const EXPLICIT_ROUTES = [

  // ══════════════════════════════════════════════════════
  // VENEZUELA (source: en.wikipedia.org/wiki/Visa_policy_of_Venezuela)
  // CARICOM members (incl. T&T) are visa-exempt. Saint Lucia requires embassy visa.
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Singaporean', 'Israeli', 'Emirati', 'Saudi', 'Russian'], destinations: ['Venezuela'], status: 'exempt' },
  { origins: CARICOM.filter(n => !['Saint Lucian', 'St. Lucian'].includes(n)), destinations: ['Venezuela'], status: 'exempt' },
  { origins: LATAM, destinations: ['Venezuela'], status: 'exempt' },
  { origins: ['Saint Lucian', 'St. Lucian'], destinations: ['Venezuela'], status: 'embassy' },
  { origins: ['Indian', 'Chinese', 'Pakistani', 'Bangladeshi'], destinations: ['Venezuela'], status: 'embassy' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Filipino', 'Indonesian', 'Thai', 'Vietnamese'], destinations: ['Venezuela'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // TURKEY (source: en.wikipedia.org/wiki/Visa_policy_of_Turkey)
  // EU/Western + key MENA/LATAM → exempt
  // ══════════════════════════════════════════════════════
  { origins: EU_WESTERN, destinations: ['Turkey'], status: 'exempt' },
  { origins: ['Russian', 'Ukrainian', 'Georgian', 'Azerbaijani', 'Indonesian', 'Malaysian', 'Emirati', 'Saudi', 'Qatari', 'Kuwaiti', 'Bahraini', 'Omani', 'Lebanese', 'Jordanian', 'Moroccan', 'Chinese', 'Iranian', 'Bolivian', 'Ecuadorian', 'Belizean'], destinations: ['Turkey'], status: 'exempt' },
  // Caribbean/Caribbean nationalities + Mexico → Turkey eVisa
  { origins: [...CARICOM, 'Mexican', 'Indian', 'Pakistani', 'Bangladeshi', 'Filipino'], destinations: ['Turkey'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Egyptian', 'Tunisian'], destinations: ['Turkey'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // THAILAND (source: en.wikipedia.org/wiki/Visa_policy_of_Thailand)
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Singaporean', 'Emirati', 'Saudi', 'Qatari'], destinations: ['Thailand'], status: 'exempt' },
  { origins: ['Russian', 'Ukrainian', 'Chinese', 'Indian', 'Malaysian', 'Indonesian', 'Brazilian', 'Argentine', 'Colombian', 'Mexican', 'Chilean', 'Peruvian', 'Moroccan', 'Egyptian', 'Georgian'], destinations: ['Thailand'], status: 'evisa' },
  { origins: CARICOM, destinations: ['Thailand'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi'], destinations: ['Thailand'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // INDIA (Medical tourism hub — visa on arrival/e-Visa for most)
  // source: en.wikipedia.org/wiki/Visa_policy_of_India
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'Russian', 'Ukrainian', 'South Korean', 'Singaporean', 'Malaysian', 'Indonesian', 'Thai', 'Filipino', 'Vietnamese', 'Brazilian', 'Argentine', 'Colombian', 'Mexican', 'Chilean', 'Peruvian', 'Ecuadorian', 'Moroccan', 'Egyptian', 'Jordanian', 'Lebanese', 'Emirati', 'Saudi', 'Qatari', 'Kuwaiti', 'Georgian', 'Chinese'], destinations: ['India'], status: 'evisa' },
  { origins: CARICOM, destinations: ['India'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi'], destinations: ['India'], status: 'evisa' },

  // ══════════════════════════════════════════════════════
  // MALAYSIA (medical tourism hub — very open e-visa)
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Singaporean', 'Japanese', 'Australian', 'Chinese', 'Indian', 'Emirati', 'Saudi', 'Qatari', 'Kuwaiti', 'Bahraini', 'Omani'], destinations: ['Malaysia'], status: 'exempt' },
  { origins: [...CARICOM, ...LATAM, 'Russian', 'Ukrainian', 'Georgian', 'Indonesian', 'Filipino', 'Thai', 'Vietnamese'], destinations: ['Malaysia'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi'], destinations: ['Malaysia'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // SOUTH KOREA (medical aesthetics hub)
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'Singaporean', 'Emirati', 'Saudi', 'Qatari', 'Japanese', 'Malaysian', 'Thai', 'Indonesian'], destinations: ['South Korea'], status: 'exempt' },
  { origins: [...CARICOM, ...LATAM, 'Chinese', 'Indian', 'Russian', 'Ukrainian', 'Georgian', 'Filipino', 'Vietnamese', 'Moroccan', 'Egyptian'], destinations: ['South Korea'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi'], destinations: ['South Korea'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // HUNGARY (EU dental/medical tourism hub)
  // ══════════════════════════════════════════════════════
  { origins: EU_WESTERN, destinations: ['Hungary'], status: 'exempt' },
  { origins: ['Russian', 'Ukrainian', 'Georgian', 'Azerbaijani', 'Turkish', 'Israeli'], destinations: ['Hungary'], status: 'evisa' },
  { origins: [...CARICOM, 'Indian', 'Chinese', 'Brazilian', 'Argentine', 'Colombian', 'Mexican', 'Emirati', 'Saudi', 'Moroccan', 'Egyptian', 'Nigerian', 'Ghanaian', 'Kenyan', 'South African'], destinations: ['Hungary'], status: 'evisa' },

  // ══════════════════════════════════════════════════════
  // COLOMBIA
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Singaporean', 'Israeli', 'Japanese'], destinations: ['Colombia'], status: 'exempt' },
  { origins: [...CARICOM, ...LATAM], destinations: ['Colombia'], status: 'exempt' },
  { origins: ['Russian', 'Ukrainian', 'Chinese', 'Indian', 'Emirati', 'Saudi', 'Moroccan', 'Egyptian'], destinations: ['Colombia'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi'], destinations: ['Colombia'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // DOMINICAN REPUBLIC
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Singaporean', 'Japanese', 'Israeli'], destinations: ['Dominican Republic'], status: 'exempt' },
  { origins: [...CARICOM, ...LATAM], destinations: ['Dominican Republic'], status: 'exempt' },
  { origins: ['Russian', 'Ukrainian', 'Chinese', 'Indian', 'Emirati', 'Saudi', 'Turkish', 'Moroccan'], destinations: ['Dominican Republic'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi', 'Filipino', 'Vietnamese'], destinations: ['Dominican Republic'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // JAMAICA
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Japanese', 'Israeli', 'Singaporean'], destinations: ['Jamaica'], status: 'exempt' },
  { origins: [...CARICOM.filter(n => n !== 'Jamaican'), ...LATAM], destinations: ['Jamaica'], status: 'exempt' },
  { origins: ['Indian', 'Chinese', 'Russian', 'Ukrainian', 'Emirati', 'Saudi', 'Turkish', 'Moroccan'], destinations: ['Jamaica'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi', 'Filipino'], destinations: ['Jamaica'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // BARBADOS
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Japanese', 'Israeli', 'Singaporean'], destinations: ['Barbados'], status: 'exempt' },
  { origins: [...CARICOM.filter(n => n !== 'Barbadian'), ...LATAM.filter(n => n !== 'Venezuelan')], destinations: ['Barbados'], status: 'exempt' },
  { origins: ['Indian', 'Chinese', 'Russian', 'Emirati', 'Saudi', 'Turkish', 'Moroccan'], destinations: ['Barbados'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi', 'Filipino', 'Indonesian', 'Thai', 'Vietnamese', 'Venezuelan'], destinations: ['Barbados'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // TRINIDAD AND TOBAGO
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Japanese', 'Israeli', 'Singaporean'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'], status: 'exempt' },
  { origins: CARICOM.filter(n => n !== 'Trinidadian'), destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'], status: 'exempt' },
  { origins: ['Brazilian', 'Argentine', 'Colombian', 'Chilean', 'Peruvian', 'Ecuadorian', 'Mexican'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'], status: 'exempt' },
  { origins: ['Indian', 'Chinese', 'Russian', 'Georgian', 'Turkish', 'Moroccan', 'Egyptian', 'Emirati', 'Saudi'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'], status: 'evisa' },
  { origins: ['Venezuelan', 'Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi', 'Filipino', 'Indonesian', 'Thai', 'Vietnamese'], destinations: ['Trinidad and Tobago', 'Trinidad', 'Tobago'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // PANAMA
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Japanese', 'Singaporean', 'Israeli'], destinations: ['Panama'], status: 'exempt' },
  { origins: [...CARICOM, ...LATAM.filter(n => n !== 'Panamanian')], destinations: ['Panama'], status: 'exempt' },
  { origins: ['Russian', 'Ukrainian', 'Chinese', 'Indian', 'Emirati', 'Saudi', 'Turkish', 'Moroccan', 'Egyptian'], destinations: ['Panama'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi'], destinations: ['Panama'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // COSTA RICA
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Japanese', 'Singaporean', 'Israeli'], destinations: ['Costa Rica'], status: 'exempt' },
  { origins: [...CARICOM, ...LATAM.filter(n => n !== 'Costa Rican')], destinations: ['Costa Rica'], status: 'exempt' },
  { origins: ['Russian', 'Ukrainian', 'Chinese', 'Indian', 'Emirati', 'Saudi', 'Turkish', 'Moroccan'], destinations: ['Costa Rica'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi', 'Filipino'], destinations: ['Costa Rica'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // MEXICO
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Japanese', 'Singaporean', 'Israeli', 'Emirati'], destinations: ['Mexico'], status: 'exempt' },
  { origins: [...CARICOM, ...LATAM.filter(n => n !== 'Mexican')], destinations: ['Mexico'], status: 'exempt' },
  { origins: ['Russian', 'Ukrainian', 'Chinese', 'Indian', 'Indonesian', 'Malaysian', 'Thai', 'Filipino', 'Vietnamese', 'Moroccan', 'Egyptian', 'Saudi', 'Qatari', 'Kuwaiti', 'Georgian', 'Turkish'], destinations: ['Mexico'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi'], destinations: ['Mexico'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // BRAZIL
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Japanese', 'Singaporean', 'Israeli', 'Emirati', 'Saudi', 'Russian', 'Ukrainian'], destinations: ['Brazil'], status: 'exempt' },
  { origins: [...CARICOM, ...LATAM.filter(n => n !== 'Brazilian')], destinations: ['Brazil'], status: 'exempt' },
  { origins: ['Chinese', 'Indian', 'Indonesian', 'Malaysian', 'Thai', 'Filipino', 'Vietnamese', 'Moroccan', 'Egyptian', 'Qatari', 'Kuwaiti', 'Turkish', 'Georgian'], destinations: ['Brazil'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi'], destinations: ['Brazil'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // ARGENTINA
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Japanese', 'Singaporean', 'Israeli', 'Emirati', 'Saudi', 'Russian', 'Ukrainian', 'Turkish'], destinations: ['Argentina'], status: 'exempt' },
  { origins: [...CARICOM, ...LATAM.filter(n => n !== 'Argentine')], destinations: ['Argentina'], status: 'exempt' },
  { origins: ['Chinese', 'Indian', 'Indonesian', 'Malaysian', 'Thai', 'Filipino', 'Vietnamese', 'Moroccan', 'Egyptian', 'Georgian'], destinations: ['Argentina'], status: 'evisa' },
  { origins: ['Nigerian', 'Ghanaian', 'Kenyan', 'South African', 'Pakistani', 'Bangladeshi'], destinations: ['Argentina'], status: 'embassy' },

  // ══════════════════════════════════════════════════════
  // BELIZE
  // ══════════════════════════════════════════════════════
  { origins: [...EU_WESTERN, 'South Korean', 'Japanese', 'Singaporean', 'Israeli'], destinations: ['Belize'], status: 'exempt' },
  { origins: CARICOM, destinations: ['Belize'], status: 'exempt' },
  { origins: [...LATAM.filter(n => n !== 'Belizean'), 'Indian', 'Chinese', 'Russian', 'Emirati', 'Saudi', 'Turkish'], destinations: ['Belize'], status: 'evisa' },

];

// ── Helper ──────────────────────────────────────────────────────────────────
function matchesList(value, list) {
  const v = value.toLowerCase();
  return list.some(item => item.toLowerCase() === v);
}

// ── Official name → short name normalizer ────────────────────────────────────
// Passport OCR and form inputs may return full official country names.
// Normalize them to the short names used in the matrix above.
const OFFICIAL_NAME_MAP = {
  'republic of trinidad and tobago': 'Trinidad and Tobago',
  'bolivarian republic of venezuela': 'Venezuela',
  'republic of venezuela': 'Venezuela',
  'republic of colombia': 'Colombia',
  'united states of america': 'American',
  'united kingdom of great britain and northern ireland': 'British',
  'republic of india': 'Indian',
  'people\'s republic of china': 'Chinese',
  'republic of south africa': 'South African',
  'federal republic of nigeria': 'Nigerian',
  'republic of kenya': 'Kenyan',
  'republic of ghana': 'Ghanaian',
  'republic of the philippines': 'Filipino',
  'republic of indonesia': 'Indonesian',
  'kingdom of thailand': 'Thai',
  'socialist republic of viet nam': 'Vietnamese',
  'islamic republic of pakistan': 'Pakistani',
  'people\'s republic of bangladesh': 'Bangladeshi',
};

function normalizeOrigin(value) {
  const lower = value.trim().toLowerCase();
  return OFFICIAL_NAME_MAP[lower] || value.trim();
}

// ── Main export ─────────────────────────────────────────────────────────────
export function checkVisaRequirement(originNationality, procedureCountry) {
  if (!originNationality || !procedureCountry) return 'unknown';
  const origin = normalizeOrigin(originNationality);
  const dest = procedureCountry.trim();

  // Same country → always exempt (e.g. Venezuelan going to Venezuela)
  const originLower = origin.toLowerCase();
  const destLower = dest.toLowerCase();
  if (originLower === destLower || originLower.includes(destLower) || destLower.includes(originLower)) return 'exempt';

  // Check explicit route overrides first (highest priority)
  for (const route of EXPLICIT_ROUTES) {
    const originMatch = route.origins.some(o => o.toLowerCase() === origin.toLowerCase());
    const destMatch = matchesList(dest, route.destinations);
    if (originMatch && destMatch) return route.status;
  }

  // Broad regional fallback for unlisted combos
  const includes = (list, val) => list.some(i => i.toLowerCase() === val.toLowerCase());
  const euWesternNat = includes(EU_WESTERN, origin);
  const caricomNat = includes(CARICOM, origin);
  const latamNat = includes(LATAM, origin);

  // EU/Western to any unlisted destination → evisa (safe conservative guess)
  if (euWesternNat) return 'evisa';
  // CARICOM/LATAM → evisa
  if (caricomNat || latamNat) return 'evisa';

  return 'embassy';
}

// Alias
export const getVisaRequirement = checkVisaRequirement;

// ── e-Visa portal links ─────────────────────────────────────────────────────
export const EVISA_LINKS = {
  'Trinidad and Tobago': 'https://immigration.gov.tt',
  'Trinidad': 'https://immigration.gov.tt',
  'Jamaica': 'https://evisa.gov.jm',
  'Dominican Republic': 'https://migracion.gob.do',
  'Costa Rica': 'https://visas.migracion.go.cr',
  'Colombia': 'https://cancilleria.gov.co/tramites_servicios/visas',
  'Panama': 'https://www.migracion.gob.pa',
  'Venezuela': 'https://evisa.mppre.gob.ve',
  'Turkey': 'https://www.evisa.gov.tr',
  'Thailand': 'https://www.thaievisa.go.th',
  'India': 'https://indianvisaonline.gov.in/evisa',
  'Malaysia': 'https://www.imi.gov.my/index.php/en/visa',
  'South Korea': 'https://www.visa.go.kr',
  'Hungary': 'https://entervHungary.hu',
  'Brazil': 'https://sistemacons.mre.gov.br',
  'Argentina': 'https://www.migraciones.gov.ar',
  'Mexico': 'https://www.gob.mx/tramites/ficha/visa-para-mexico',
};

export function getEvisaLink(procedureCountry) {
  for (const [key, url] of Object.entries(EVISA_LINKS)) {
    if (procedureCountry?.toLowerCase().includes(key.toLowerCase())) return url;
  }
  return 'https://www.iatatravelcentre.com/';
}