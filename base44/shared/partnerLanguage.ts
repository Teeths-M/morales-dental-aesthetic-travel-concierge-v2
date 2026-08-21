// ── partnerLanguage ──────────────────────────────────────────────────────────
// Deterministic language selection for partner outreach (draftPartnerOutreach).
// Same "deterministic decides, AI narrates" discipline this app applies to
// SAFE-T risk scoring, extended here: the LLM is never asked to guess a
// partner's language -- this pure function resolves one from real on-file
// data, and the drafting prompt is only ever told the final answer.
//
// SUPPORTED_LANGUAGE_CODES is a Deno-side duplicate of src/i18n.js's
// SUPPORTED_LANGUAGES codes (same reason base44/shared/doctorReminderCopy.ts
// already keeps its own copy: this backend can't import a frontend Vite
// module). 'ar' is deliberately never a possible output here, matching
// i18n.js's own exclusion of Arabic pending an unfinished RTL migration.

import { PARTNER_TYPE_CONFIG, type PartnerType } from './partnerTypeConfig.ts';

export const SUPPORTED_LANGUAGE_CODES = ['en', 'es', 'fr', 'pt', 'de', 'it', 'tr', 'th', 'zh'] as const;
export type LanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number];

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  de: 'German',
  it: 'Italian',
  tr: 'Turkish',
  th: 'Thai',
  zh: 'Chinese',
};

// Confirmed against each entity's real .jsonc schema: Doctor/TravelAgency/
// TaxiService use `language_preference`; Companion uses the differently
// named `primary_language`; SecurityAgency has no language field at all, so
// it's intentionally absent here and always falls through to country
// inference (or the English default).
const LANGUAGE_FIELD: Partial<Record<PartnerType, string>> = {
  doctor: 'language_preference',
  travel_agency: 'language_preference',
  taxi_service: 'language_preference',
  companion: 'primary_language',
};

// Curated, not exhaustive -- src/lib/countries.js's COUNTRY_NAMES has 195
// entries; this only maps the ones that resolve to a non-English code this
// app actually supports. Everything absent (ambiguous/bilingual countries
// like Canada, Belgium, Switzerland included -- deliberately not guessed --
// plus every country whose real primary language isn't one of the 9 codes
// above at all, e.g. Japanese/Korean/Arabic/Russian-speaking countries)
// correctly falls through to English, which is this app's honest ceiling
// today, not a bug to paper over. Keys are exact matches against
// COUNTRY_NAMES's strings (including the curly apostrophe in Côte d'Ivoire).
const COUNTRY_LANGUAGE: Record<string, LanguageCode> = {
  // Spanish
  'Argentina': 'es', 'Bolivia': 'es', 'Chile': 'es', 'Colombia': 'es', 'Costa Rica': 'es',
  'Cuba': 'es', 'Dominican Republic': 'es', 'Ecuador': 'es', 'El Salvador': 'es',
  'Equatorial Guinea': 'es', 'Guatemala': 'es', 'Honduras': 'es', 'Mexico': 'es',
  'Nicaragua': 'es', 'Panama': 'es', 'Paraguay': 'es', 'Peru': 'es', 'Spain': 'es',
  'Uruguay': 'es', 'Venezuela': 'es',
  // Portuguese
  'Brazil': 'pt', 'Portugal': 'pt', 'Angola': 'pt', 'Mozambique': 'pt', 'Cabo Verde': 'pt',
  'Guinea-Bissau': 'pt', 'Sao Tome and Principe': 'pt', 'Timor-Leste': 'pt',
  // French
  'France': 'fr', 'Haiti': 'fr', 'Monaco': 'fr', 'Senegal': 'fr', 'Mali': 'fr',
  'Burkina Faso': 'fr', 'Niger': 'fr', 'Guinea': 'fr', 'Togo': 'fr', 'Benin': 'fr',
  'Côte d’Ivoire': 'fr', 'Central African Republic': 'fr', 'Chad': 'fr',
  'Congo (Brazzaville)': 'fr', 'Congo (Kinshasa)': 'fr', 'Gabon': 'fr', 'Djibouti': 'fr',
  'Comoros': 'fr', 'Madagascar': 'fr', 'Burundi': 'fr',
  // German
  'Germany': 'de', 'Austria': 'de', 'Liechtenstein': 'de',
  // Italian
  'Italy': 'it', 'San Marino': 'it', 'Holy See': 'it',
  // Turkish
  'Turkey': 'tr',
  // Thai
  'Thailand': 'th',
  // Chinese
  'China': 'zh',
};

export interface ResolvedLanguage {
  language: LanguageCode;
  source: 'partner_preference' | 'country_inferred' | 'default';
}

function isSupported(code: any): code is LanguageCode {
  return typeof code === 'string' && (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code);
}

/**
 * Priority: (1) the partner's own on-file language field, when set to
 * anything other than the schema's default 'en' -- a non-English value is
 * unambiguous evidence of a deliberate choice, trusted even over what the
 * country would suggest. (2) Otherwise (field is 'en', or the entity has no
 * language field at all), infer from the partner's real on-file country.
 * (3) If the country isn't mapped, default to 'en'. Always clamped to
 * SUPPORTED_LANGUAGE_CODES -- never returns an arbitrary/invalid string.
 */
export function resolvePartnerLanguage(partner_type: PartnerType, partner: Record<string, any>): ResolvedLanguage {
  const cfg = PARTNER_TYPE_CONFIG[partner_type];
  const languageField = LANGUAGE_FIELD[partner_type];
  const onFile = languageField ? partner?.[languageField] : null;

  if (isSupported(onFile) && onFile !== 'en') {
    return { language: onFile, source: 'partner_preference' };
  }

  const country = partner?.[cfg.countryField];
  const inferred = typeof country === 'string' ? COUNTRY_LANGUAGE[country] : undefined;
  if (inferred) {
    return { language: inferred, source: 'country_inferred' };
  }

  return { language: 'en', source: 'default' };
}
