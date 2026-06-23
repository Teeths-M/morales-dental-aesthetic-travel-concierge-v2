/**
 * geoAutoAlign — country-code → language / currency mappings
 *
 * Used by useGeoAutoAlign to automatically apply locale settings
 * based on the visitor's detected country on first page load.
 *
 * Language choices are constrained to what the Header supports: en / es / fr.
 * Currency codes match the CURRENCY_MAP in the backend geo function.
 */

// Languages the Header/Navbar actually support
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr'];

// Map country ISO-3166-1 alpha-2 → preferred site language
// Caribbean English-speaking nations default to 'en'.
// Spanish LATAM defaults to 'es'. French-speaking defaults to 'fr'.
// Everything else → 'en' (safe global default).
export const COUNTRY_TO_LANGUAGE = {
  // Caribbean — English
  TT: 'en', BB: 'en', JM: 'en', GY: 'en', BZ: 'en',
  AG: 'en', LC: 'en', VC: 'en', GD: 'en', KN: 'en',
  DM: 'en', BS: 'en', TC: 'en', KY: 'en', MS: 'en', AI: 'en',
  // Caribbean — Spanish
  VE: 'es', DO: 'es', CU: 'es',
  // Caribbean — French
  HT: 'fr',
  // Latin America — Spanish
  CO: 'es', MX: 'es', PE: 'es', CL: 'es', AR: 'es', EC: 'es',
  BO: 'es', PY: 'es', UY: 'es', PA: 'es', CR: 'es', GT: 'es',
  HN: 'es', NI: 'es', SV: 'es',
  // North America
  US: 'en', CA: 'en',
  // Europe — French
  FR: 'fr', BE: 'fr', CH: 'fr', LU: 'fr', MC: 'fr',
  // Europe — English / default
  GB: 'en', IE: 'en', AU: 'en', NZ: 'en', ZA: 'en',
  IN: 'en', SG: 'en', MY: 'en', PH: 'en', NG: 'en', GH: 'en', KE: 'en',
  // Everything else inherits 'en'
};

// Currency map — mirrors the backend CURRENCY_MAP for client-side use
// (only consulted if the backend response doesn't include a currency)
export const COUNTRY_TO_CURRENCY = {
  TT: 'TTD', BB: 'BBD', JM: 'JMD', GY: 'GYD', VE: 'USD',
  DO: 'DOP', CU: 'CUP', HT: 'HTG', BZ: 'BZD', BS: 'BSD',
  AG: 'XCD', LC: 'XCD', VC: 'XCD', GD: 'XCD', KN: 'XCD', DM: 'XCD',
  TC: 'USD', KY: 'KYD',
  US: 'USD', CA: 'CAD', MX: 'MXN',
  PA: 'PAB', CR: 'CRC', GT: 'GTQ', HN: 'HNL', NI: 'NIO', SV: 'USD',
  CO: 'COP', PE: 'PEN', CL: 'CLP', AR: 'ARS', BR: 'BRL', EC: 'USD',
  BO: 'BOB', PY: 'PYG', UY: 'UYU',
  GB: 'GBP', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK',
  AU: 'AUD', NZ: 'NZD', JP: 'JPY', CN: 'CNY', IN: 'INR', SG: 'SGD',
  KR: 'KRW', TH: 'THB', AE: 'AED', SA: 'SAR',
  ZA: 'ZAR', NG: 'NGN', GH: 'GHS', KE: 'KES',
};

/**
 * Given a country code, return the best language + currency pair.
 * Language is constrained to SUPPORTED_LANGUAGES.
 */
export function resolveLocaleFromCountry(countryCode, apiCurrency = null) {
  if (!countryCode) return { language: 'en', currency: 'USD' };
  const cc = countryCode.toUpperCase();
  const language = COUNTRY_TO_LANGUAGE[cc] || 'en';
  const currency = apiCurrency || COUNTRY_TO_CURRENCY[cc] || 'USD';
  return { language, currency };
}
