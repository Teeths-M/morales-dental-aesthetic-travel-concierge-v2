/**
 * incidentTextAnalysis — small, deterministic helpers for the Evidence
 * Monitoring pipeline: a content hash for near-duplicate detection, a hard
 * word-count truncator for evidence quotes (never trusted to the LLM's own
 * self-restraint), and a conservative regex/keyword fallback analyzer used
 * only when the real Core.InvokeLLM extraction call fails.
 *
 * The fallback is deliberately small and explicit — this repo's one prior
 * "LLM failed" precedent (aiProcedureFallback/entry.ts) is a static default
 * object, not a keyword parser, so there was no existing pattern to match.
 * It NEVER infers a fact beyond a literal keyword hit, always returns
 * analysis_method: 'fallback' with a capped low confidence, and leaves
 * provider_or_clinic_mentioned as 'unknown' — extracting a clinic/person
 * name safely from raw text without an LLM is not attempted here.
 */

const MAX_ANALYSIS_CONFIDENCE_FALLBACK = 30;

// ── Content hash (near-duplicate detection, not a security hash) ───────────

export async function computeContentHash(title: string, snippet: string): Promise<string> {
  const normalized = `${(title || '').toLowerCase().trim()}|${(snippet || '').toLowerCase().trim()}`
    .replace(/\s+/g, ' ');
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Word truncation (enforced in code, never trusted to the LLM alone) ─────

export function truncateToWords(text: string, maxWords: number): string {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

// ── Deterministic incident-type keyword match ───────────────────────────────

const DEATH_TERMS = /\b(died|death|fatal|fatality|dead|passed away)\b/i;
const COMPLICATION_TERMS = /\b(complication|infection|botched|hospitalized|hospitalised|sepsis|disfigured|disfigurement)\b/i;
const LEGAL_TERMS = /\b(lawsuit|sued|suing|legal action|malpractice claim|filed suit)\b/i;

export type IncidentType = 'death' | 'complication' | 'legal_action' | 'other' | 'unknown';

export function deriveIncidentType(text: string): IncidentType {
  const t = text || '';
  if (DEATH_TERMS.test(t)) return 'death';
  if (COMPLICATION_TERMS.test(t)) return 'complication';
  if (LEGAL_TERMS.test(t)) return 'legal_action';
  return 'unknown';
}

// A small, explicit vocabulary — deliberately short and disclosed as
// non-exhaustive, matching this app's other curated seed lists. A country
// or procedure not on this list simply stays 'unknown', never guessed.
const COUNTRY_KEYWORDS: Array<[string, string]> = [
  ['mexico', 'Mexico'], ['colombia', 'Colombia'], ['turkey', 'Turkey'],
  ['thailand', 'Thailand'], ['brazil', 'Brazil'], ['india', 'India'],
  ['south korea', 'South Korea'], ['costa rica', 'Costa Rica'],
  ['dominican republic', 'Dominican Republic'], ['poland', 'Poland'],
  ['hungary', 'Hungary'], ['tunisia', 'Tunisia'], ['malaysia', 'Malaysia'],
  ['trinidad', 'Trinidad and Tobago'], ['venezuela', 'Venezuela'],
];

const PROCEDURE_KEYWORDS: Array<[string, string]> = [
  ['dental implant', 'Dental Implants'], ['veneer', 'Veneers'],
  ['liposuction', 'Liposuction'], ['tummy tuck', 'Tummy Tuck'],
  ['breast augmentation', 'Breast Augmentation'], ['rhinoplasty', 'Rhinoplasty'],
  ['gastric bypass', 'Gastric Bypass'], ['gastric sleeve', 'Gastric Sleeve'],
  ['brazilian butt lift', 'Brazilian Butt Lift'], ['bbl', 'Brazilian Butt Lift'],
  ['facelift', 'Facelift'], ['hair transplant', 'Hair Transplant'],
  ['lasik', 'LASIK'],
];

function firstMatch(text: string, keywords: Array<[string, string]>): string {
  const low = (text || '').toLowerCase();
  for (const [needle, label] of keywords) {
    if (low.includes(needle)) return label;
  }
  return 'unknown';
}

export type FallbackAnalysis = {
  incident_type: IncidentType;
  procedure_type: string;
  destination_country: string;
  provider_or_clinic_mentioned: string;
  reported_outcome: string;
  risk_factors_mentioned: string[];
  evidence_quotes: string[];
  is_allegation: boolean;
  missing_information: string[];
  analysis_confidence: number;
  analysis_method: 'fallback';
};

/**
 * Deterministic, keyword-only extraction used ONLY when the real LLM
 * extraction call fails. Never infers age, clinic responsibility, cause of
 * death, or any medical fact — only reports a literal keyword hit or
 * 'unknown'. provider_or_clinic_mentioned always stays 'unknown' here.
 */
export function fallbackAnalyze(title: string, snippet: string): FallbackAnalysis {
  const combined = `${title || ''} ${snippet || ''}`;
  const incident_type = deriveIncidentType(combined);
  const procedure_type = firstMatch(combined, PROCEDURE_KEYWORDS);
  const destination_country = firstMatch(combined, COUNTRY_KEYWORDS);

  const missing_information: string[] = ['provider_or_clinic_mentioned'];
  if (procedure_type === 'unknown') missing_information.push('procedure_type');
  if (destination_country === 'unknown') missing_information.push('destination_country');

  return {
    incident_type,
    procedure_type,
    destination_country,
    provider_or_clinic_mentioned: 'unknown',
    reported_outcome: 'unknown',
    risk_factors_mentioned: [],
    evidence_quotes: title ? [truncateToWords(title, 25)] : [],
    is_allegation: true,
    missing_information,
    analysis_confidence: incident_type === 'unknown' ? 10 : MAX_ANALYSIS_CONFIDENCE_FALLBACK,
    analysis_method: 'fallback',
  };
}
