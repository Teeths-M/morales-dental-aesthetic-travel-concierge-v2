// Country dial codes for the shared PhoneField (flag + code selector, so a user
// never hand-types "+1 868…"). Covers Morales' source and destination markets
// (Americas, Caribbean, Europe, Middle East, Asia, Africa). The list is
// searchable in the UI, so ordering is by name; detection picks the right one.
//
// Pure helpers (format/parse) live here so they can be unit-tested without React.

export const COUNTRY_DIAL = [
  { iso2: 'US', name: 'United States', dial: '1' },
  { iso2: 'CA', name: 'Canada', dial: '1' },
  { iso2: 'GB', name: 'United Kingdom', dial: '44' },
  { iso2: 'IE', name: 'Ireland', dial: '353' },
  { iso2: 'AU', name: 'Australia', dial: '61' },
  { iso2: 'NZ', name: 'New Zealand', dial: '64' },
  { iso2: 'DE', name: 'Germany', dial: '49' },
  { iso2: 'FR', name: 'France', dial: '33' },
  { iso2: 'ES', name: 'Spain', dial: '34' },
  { iso2: 'IT', name: 'Italy', dial: '39' },
  { iso2: 'PT', name: 'Portugal', dial: '351' },
  { iso2: 'NL', name: 'Netherlands', dial: '31' },
  { iso2: 'BE', name: 'Belgium', dial: '32' },
  { iso2: 'CH', name: 'Switzerland', dial: '41' },
  { iso2: 'AT', name: 'Austria', dial: '43' },
  { iso2: 'SE', name: 'Sweden', dial: '46' },
  { iso2: 'NO', name: 'Norway', dial: '47' },
  { iso2: 'DK', name: 'Denmark', dial: '45' },
  { iso2: 'FI', name: 'Finland', dial: '358' },
  { iso2: 'PL', name: 'Poland', dial: '48' },
  { iso2: 'CZ', name: 'Czechia', dial: '420' },
  { iso2: 'HU', name: 'Hungary', dial: '36' },
  { iso2: 'GR', name: 'Greece', dial: '30' },
  { iso2: 'RO', name: 'Romania', dial: '40' },
  { iso2: 'RU', name: 'Russia', dial: '7' },
  { iso2: 'UA', name: 'Ukraine', dial: '380' },
  { iso2: 'TR', name: 'Turkey', dial: '90' },
  { iso2: 'MX', name: 'Mexico', dial: '52' },
  { iso2: 'BR', name: 'Brazil', dial: '55' },
  { iso2: 'AR', name: 'Argentina', dial: '54' },
  { iso2: 'CO', name: 'Colombia', dial: '57' },
  { iso2: 'VE', name: 'Venezuela', dial: '58' },
  { iso2: 'PE', name: 'Peru', dial: '51' },
  { iso2: 'CL', name: 'Chile', dial: '56' },
  { iso2: 'EC', name: 'Ecuador', dial: '593' },
  { iso2: 'PA', name: 'Panama', dial: '507' },
  { iso2: 'CR', name: 'Costa Rica', dial: '506' },
  { iso2: 'DO', name: 'Dominican Republic', dial: '1' },
  { iso2: 'GT', name: 'Guatemala', dial: '502' },
  { iso2: 'UY', name: 'Uruguay', dial: '598' },
  { iso2: 'BO', name: 'Bolivia', dial: '591' },
  { iso2: 'PY', name: 'Paraguay', dial: '595' },
  { iso2: 'TT', name: 'Trinidad and Tobago', dial: '1' },
  { iso2: 'JM', name: 'Jamaica', dial: '1' },
  { iso2: 'BB', name: 'Barbados', dial: '1' },
  { iso2: 'BS', name: 'Bahamas', dial: '1' },
  { iso2: 'GY', name: 'Guyana', dial: '592' },
  { iso2: 'HT', name: 'Haiti', dial: '509' },
  { iso2: 'BZ', name: 'Belize', dial: '501' },
  { iso2: 'IN', name: 'India', dial: '91' },
  { iso2: 'CN', name: 'China', dial: '86' },
  { iso2: 'JP', name: 'Japan', dial: '81' },
  { iso2: 'KR', name: 'South Korea', dial: '82' },
  { iso2: 'SG', name: 'Singapore', dial: '65' },
  { iso2: 'PH', name: 'Philippines', dial: '63' },
  { iso2: 'TH', name: 'Thailand', dial: '66' },
  { iso2: 'VN', name: 'Vietnam', dial: '84' },
  { iso2: 'ID', name: 'Indonesia', dial: '62' },
  { iso2: 'MY', name: 'Malaysia', dial: '60' },
  { iso2: 'PK', name: 'Pakistan', dial: '92' },
  { iso2: 'BD', name: 'Bangladesh', dial: '880' },
  { iso2: 'LK', name: 'Sri Lanka', dial: '94' },
  { iso2: 'NP', name: 'Nepal', dial: '977' },
  { iso2: 'TW', name: 'Taiwan', dial: '886' },
  { iso2: 'AE', name: 'United Arab Emirates', dial: '971' },
  { iso2: 'SA', name: 'Saudi Arabia', dial: '966' },
  { iso2: 'IL', name: 'Israel', dial: '972' },
  { iso2: 'QA', name: 'Qatar', dial: '974' },
  { iso2: 'KW', name: 'Kuwait', dial: '965' },
  { iso2: 'BH', name: 'Bahrain', dial: '973' },
  { iso2: 'OM', name: 'Oman', dial: '968' },
  { iso2: 'JO', name: 'Jordan', dial: '962' },
  { iso2: 'LB', name: 'Lebanon', dial: '961' },
  { iso2: 'NG', name: 'Nigeria', dial: '234' },
  { iso2: 'GH', name: 'Ghana', dial: '233' },
  { iso2: 'KE', name: 'Kenya', dial: '254' },
  { iso2: 'ZA', name: 'South Africa', dial: '27' },
  { iso2: 'EG', name: 'Egypt', dial: '20' },
  { iso2: 'MA', name: 'Morocco', dial: '212' },
  { iso2: 'TN', name: 'Tunisia', dial: '216' },
  { iso2: 'DZ', name: 'Algeria', dial: '213' },
  { iso2: 'ET', name: 'Ethiopia', dial: '251' },
  { iso2: 'TZ', name: 'Tanzania', dial: '255' },
];

/** Distinct country names (sorted) for free-text country pickers that want
 *  autocomplete suggestions without a full closed enum. */
export const COUNTRY_NAMES = [...new Set(COUNTRY_DIAL.map((c) => c.name))].sort((a, b) => a.localeCompare(b));

/** ISO-3166 alpha-2 → regional-indicator emoji flag. Falls back to a globe. */
export function dialToFlag(iso2) {
  if (!iso2 || iso2.length !== 2) return '🌍';
  try {
    // Regional-indicator 'A' (🇦) is U+1F1E6 = 127462; 127462 − 'A'(65) = 127397.
    return String.fromCodePoint(
      ...iso2.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0))
    );
  } catch (_) {
    return '🌍';
  }
}

/**
 * Build the canonical stored value from a chosen dial code + national number.
 * Returns E.164-style digits ("+15551234567", no spaces) so the backend/OTP
 * gets a clean value — or '' when there is no national number, so existing
 * "is this field empty?" validation still fires correctly.
 */
export function formatPhoneE164(dial, national) {
  const digits = String(national == null ? '' : national).replace(/\D/g, '');
  if (!digits) return '';
  return `+${dial}${digits}`;
}

/**
 * Best-effort parse of an existing stored/typed phone value into a country +
 * national number, for pre-filling the field. Matches the LONGEST dial prefix
 * so "+1868…" resolves before "+1". Shared prefixes (US/CA/Caribbean all "+1")
 * resolve to the first list entry — the user can re-pick; the number is intact.
 */
export function parsePhoneValue(value, list = COUNTRY_DIAL) {
  const raw = String(value == null ? '' : value).replace(/[^\d+]/g, '');
  if (raw.startsWith('+')) {
    const digits = raw.slice(1);
    let best = null;
    for (const c of list) {
      if (digits.startsWith(c.dial) && (!best || c.dial.length > best.dial.length)) best = c;
    }
    if (best) return { iso2: best.iso2, dial: best.dial, national: digits.slice(best.dial.length) };
    return { iso2: null, dial: null, national: digits };
  }
  // No country code present — keep the digits as the national part.
  return { iso2: null, dial: null, national: raw.replace(/^\+/, '') };
}
