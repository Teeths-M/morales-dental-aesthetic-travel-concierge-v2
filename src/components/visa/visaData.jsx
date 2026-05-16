export const PASSPORT_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'TT', name: 'Trinidad & Tobago', flag: '🇹🇹' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'PR', name: 'Puerto Rico (US)', flag: '🇵🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'OTHER', name: 'Other Country', flag: '🌍' },
];

export const DESTINATIONS = [
  {
    code: 'VE', name: 'Venezuela', flag: '🇻🇪', island: 'Margarita Island',
    highlight: 'Premier dental & cosmetic hub in the Caribbean',
    color: 'from-blue-500 to-cyan-500',
    timezone: 'UTC-4',
  },
  {
    code: 'CO', name: 'Colombia', flag: '🇨🇴',
    highlight: 'World-class cosmetic surgery at affordable prices',
    color: 'from-yellow-500 to-orange-500',
    timezone: 'UTC-5',
  },
  {
    code: 'DO', name: 'Dominican Republic', flag: '🇩🇴',
    highlight: 'Tropical medical tourism with luxury recovery',
    color: 'from-blue-600 to-indigo-600',
    timezone: 'UTC-4',
  },
  {
    code: 'CU', name: 'Cuba', flag: '🇨🇺',
    highlight: 'Renowned medical expertise at exceptional value',
    color: 'from-red-500 to-rose-500',
    timezone: 'UTC-5',
  },
  {
    code: 'TH', name: 'Thailand', flag: '🇹🇭',
    highlight: 'Asia\'s top medical tourism destination',
    color: 'from-violet-500 to-purple-500',
    timezone: 'UTC+7',
  },
  {
    code: 'TR', name: 'Turkey', flag: '🇹🇷',
    highlight: 'Global leader in dental & hair procedures',
    color: 'from-red-600 to-orange-500',
    timezone: 'UTC+3',
  },
  {
    code: 'MX', name: 'Mexico', flag: '🇲🇽',
    highlight: 'Convenient, high-quality cross-border care',
    color: 'from-green-500 to-emerald-500',
    timezone: 'UTC-6',
  },
  {
    code: 'CR', name: 'Costa Rica', flag: '🇨🇷',
    highlight: 'Eco-luxury medical tourism with JCI-accredited hospitals',
    color: 'from-teal-500 to-green-500',
    timezone: 'UTC-6',
  },
  {
    code: 'BR', name: 'Brazil', flag: '🇧🇷',
    highlight: 'Cosmetic surgery capital of the world',
    color: 'from-green-600 to-yellow-500',
    timezone: 'UTC-3',
  },
  {
    code: 'PA', name: 'Panama', flag: '🇵🇦',
    highlight: 'Growing hub with US-trained specialists',
    color: 'from-sky-500 to-blue-500',
    timezone: 'UTC-5',
  },
];

// Visa rules matrix: [passportCode][destinationCode] = rule
// status: 'visa_free' | 'evisa' | 'visa_required' | 'arrival_card'
export const VISA_RULES = {
  US: {
    VE: { status: 'visa_free', days: 90, notes: 'Tourist card issued on arrival', requirements: ['Valid passport (6+ months)', 'Return ticket', 'Proof of funds', 'Hotel booking'] },
    CO: { status: 'visa_free', days: 90, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket', 'Proof of accommodation'] },
    DO: { status: 'arrival_card', days: 30, notes: 'Tourist card required — can be purchased on arrival ($10 USD)', requirements: ['Valid passport (6+ months)', 'Tourist card fee', 'Return ticket'] },
    CU: { status: 'visa_required', days: 30, notes: 'Tourist visa (Pink card) required', requirements: ['Valid passport', 'Tourist visa (Pink card)', 'Travel insurance', 'Return ticket', 'Hotel booking'] },
    TH: { status: 'visa_free', days: 30, notes: 'Visa exemption for US passport holders', requirements: ['Valid passport (6+ months)', 'Return ticket', 'Proof of funds'] },
    TR: { status: 'evisa', days: 90, notes: 'e-Visa available online (evisa.gov.tr)', requirements: ['Valid passport (6+ months)', 'e-Visa approval', 'Travel insurance recommended'] },
    MX: { status: 'visa_free', days: 180, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'FMM tourist form on arrival'] },
    CR: { status: 'visa_free', days: 90, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket', 'Proof of funds ($100/day)'] },
    BR: { status: 'visa_free', days: 90, notes: 'No visa required since 2024', requirements: ['Valid passport (6+ months)', 'Return ticket', 'Proof of accommodation'] },
    PA: { status: 'visa_free', days: 180, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket', 'Proof of funds'] },
  },
  CA: {
    VE: { status: 'visa_free', days: 90, notes: 'Tourist card on arrival', requirements: ['Valid passport (6+ months)', 'Return ticket', 'Proof of funds'] },
    CO: { status: 'visa_free', days: 90, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket'] },
    DO: { status: 'arrival_card', days: 30, notes: 'Tourist card required on arrival', requirements: ['Valid passport (6+ months)', 'Tourist card fee'] },
    CU: { status: 'visa_required', days: 30, notes: 'Tourist visa (Pink card) required', requirements: ['Valid passport', 'Tourist visa', 'Travel insurance required by Cuba'] },
    TH: { status: 'visa_free', days: 30, notes: 'Visa exemption', requirements: ['Valid passport (6+ months)', 'Return ticket'] },
    TR: { status: 'evisa', days: 90, notes: 'e-Visa required', requirements: ['Valid passport (6+ months)', 'e-Visa approval'] },
    MX: { status: 'visa_free', days: 180, notes: 'No visa required', requirements: ['Valid passport (6+ months)'] },
    CR: { status: 'visa_free', days: 90, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket'] },
    BR: { status: 'visa_free', days: 90, notes: 'No visa required since 2024', requirements: ['Valid passport (6+ months)'] },
    PA: { status: 'visa_free', days: 180, notes: 'No visa required', requirements: ['Valid passport (6+ months)'] },
  },
  TT: {
    VE: { status: 'visa_free', days: 90, notes: 'CARICOM/Venezuela agreement — visa free', requirements: ['Valid passport (6+ months)', 'Return ticket', 'Proof of funds'] },
    CO: { status: 'visa_required', days: 90, notes: 'Visa required for Trinidad passport holders', requirements: ['Valid passport', 'Colombian visa', 'Bank statements', 'Hotel booking', 'Medical invitation letter'] },
    DO: { status: 'visa_free', days: 90, notes: 'No visa required for CARICOM members', requirements: ['Valid passport (6+ months)', 'Return ticket'] },
    CU: { status: 'visa_required', days: 30, notes: 'Tourist visa required', requirements: ['Valid passport', 'Tourist visa (Pink card)', 'Travel insurance'] },
    TH: { status: 'evisa', days: 60, notes: 'e-Visa or visa on arrival available', requirements: ['Valid passport (6+ months)', 'e-Visa or arrival fee', 'Return ticket'] },
    TR: { status: 'evisa', days: 30, notes: 'e-Visa available online', requirements: ['Valid passport (6+ months)', 'e-Visa approval'] },
    MX: { status: 'visa_free', days: 180, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'FMM tourist form'] },
    CR: { status: 'visa_free', days: 30, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket'] },
    BR: { status: 'visa_required', days: null, notes: 'Visa required for T&T passport holders', requirements: ['Valid passport', 'Brazilian visa application', 'Bank statements', 'Medical documents'] },
    PA: { status: 'visa_free', days: 90, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket'] },
  },
  GB: {
    VE: { status: 'visa_free', days: 90, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket', 'Proof of funds'] },
    CO: { status: 'visa_free', days: 90, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket'] },
    DO: { status: 'arrival_card', days: 30, notes: 'Tourist card required on arrival', requirements: ['Valid passport (6+ months)', 'Tourist card fee'] },
    CU: { status: 'visa_required', days: 30, notes: 'Tourist visa (Pink card) required', requirements: ['Valid passport', 'Tourist card/visa', 'Travel insurance required by Cuba'] },
    TH: { status: 'visa_free', days: 30, notes: 'Visa exemption', requirements: ['Valid passport (6+ months)', 'Return ticket'] },
    TR: { status: 'evisa', days: 90, notes: 'e-Visa required', requirements: ['Valid passport (6+ months)', 'e-Visa from evisa.gov.tr'] },
    MX: { status: 'visa_free', days: 180, notes: 'No visa required', requirements: ['Valid passport (6+ months)'] },
    CR: { status: 'visa_free', days: 90, notes: 'No visa required', requirements: ['Valid passport (6+ months)', 'Return ticket'] },
    BR: { status: 'visa_free', days: 90, notes: 'No visa required', requirements: ['Valid passport (6+ months)'] },
    PA: { status: 'visa_free', days: 180, notes: 'No visa required', requirements: ['Valid passport (6+ months)'] },
  },
};

// Default fallback for unknown passport/destination combos
export function getVisaRule(passportCode, destinationCode) {
  const countryRules = VISA_RULES[passportCode];
  if (countryRules && countryRules[destinationCode]) {
    return countryRules[destinationCode];
  }
  // Generic fallback
  return {
    status: 'visa_required',
    days: null,
    notes: 'Visa requirements may apply — please verify with the official embassy.',
    requirements: ['Valid passport (6+ months)', 'Visa application', 'Bank statements', 'Return ticket', 'Travel insurance', 'Hotel booking'],
  };
}

export const TRAVEL_PURPOSES = [
  { id: 'dental', label: 'Dental Treatment', emoji: '🦷', desc: 'Implants, veneers, full-mouth restoration' },
  { id: 'cosmetic', label: 'Cosmetic Surgery', emoji: '✨', desc: 'Rhinoplasty, facelift, body contouring' },
  { id: 'medical', label: 'Medical Procedure', emoji: '🏥', desc: 'Specialized medical care or surgery' },
  { id: 'recovery', label: 'Recovery Stay', emoji: '🌿', desc: 'Post-procedure rest and recovery' },
  { id: 'wellness', label: 'Wellness Treatment', emoji: '💆', desc: 'IV therapy, regenerative, wellness programs' },
  { id: 'companion', label: 'Companion Travel', emoji: '👫', desc: 'Accompanying a patient as support' },
];

export const EMBASSY_DATA = {
  VE: {
    name: 'Venezuela',
    flag: '🇻🇪',
    embassies: [
      { country: 'United States', city: 'Washington DC', address: '1099 30th St NW, Washington DC 20007', phone: '+1 202-342-2214', website: 'https://eeuu.embajada.gob.ve', processing: '5–10 business days' },
      { country: 'United Kingdom', city: 'London', address: '1 Cromwell Rd, London SW7 2HW', phone: '+44 20 7581 2776', website: 'https://reinounido.embajada.gob.ve', processing: '5–10 business days' },
      { country: 'Canada', city: 'Ottawa', address: '32 Range Rd, Ottawa ON K1N 8J4', phone: '+1 613-235-5151', website: 'https://canada.embajada.gob.ve', processing: '5–15 business days' },
      { country: 'Trinidad & Tobago', city: 'Port of Spain', address: '16 Victoria Ave, Port of Spain', phone: '+1 868-627-9821', website: 'https://trinidadytobago.embajada.gob.ve', processing: '3–7 business days' },
    ],
  },
  CO: {
    name: 'Colombia',
    flag: '🇨🇴',
    embassies: [
      { country: 'United States', city: 'Washington DC', address: '2118 Leroy Pl NW, Washington DC 20008', phone: '+1 202-387-8338', website: 'https://www.colombiaemb.org', processing: '3–10 business days' },
      { country: 'United Kingdom', city: 'London', address: '3 Hans Crescent, London SW1X 0LN', phone: '+44 20 7589 9177', website: 'https://reinounido.embajada.gov.co', processing: '3–10 business days' },
      { country: 'Trinidad & Tobago', city: 'Port of Spain', address: '27 Queen\'s Park East, Port of Spain', phone: '+1 868-628-6750', website: 'https://trinidadytobago.embajada.gov.co', processing: '5–10 business days' },
    ],
  },
  DO: {
    name: 'Dominican Republic',
    flag: '🇩🇴',
    embassies: [
      { country: 'United States', city: 'Washington DC', address: '1715 22nd St NW, Washington DC 20008', phone: '+1 202-332-6280', website: 'https://domrep.org', processing: '2–5 business days' },
      { country: 'United Kingdom', city: 'London', address: '139 Inverness Terrace, London W2 6JF', phone: '+44 20 7727 6285', website: 'https://embajadadominicana.co.uk', processing: '3–7 business days' },
    ],
  },
  TR: {
    name: 'Turkey',
    flag: '🇹🇷',
    embassies: [
      { country: 'e-Visa (Online)', city: 'Online', address: 'evisa.gov.tr — Official Turkish e-Visa Portal', phone: 'N/A', website: 'https://www.evisa.gov.tr', processing: '24–72 hours online' },
      { country: 'United States', city: 'Washington DC', address: '2525 Massachusetts Ave NW, Washington DC 20008', phone: '+1 202-612-6700', website: 'https://washington.emb.mfa.gov.tr', processing: '5–10 business days' },
    ],
  },
  TH: {
    name: 'Thailand',
    flag: '🇹🇭',
    embassies: [
      { country: 'United States', city: 'Washington DC', address: '1024 Wisconsin Ave NW, Washington DC 20007', phone: '+1 202-944-3600', website: 'https://thaiembdc.org', processing: '3–5 business days' },
      { country: 'United Kingdom', city: 'London', address: '29–30 Queen\'s Gate, London SW7 5JB', phone: '+44 20 7589 2944', website: 'https://thaiembassyuk.org.uk', processing: '3–5 business days' },
    ],
  },
};