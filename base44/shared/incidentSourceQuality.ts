/**
 * incidentSourceQuality — deterministic, no-LLM source-reliability tiering
 * and corroboration-eligibility logic for the Evidence Monitoring pipeline
 * (scanIncidentEvidence -> analyzeIncidentEvidence -> evaluateIncidentEvidence
 * -> proposeSafetyLearning).
 *
 * This is deliberately NOT asked of the LLM in analyzeIncidentEvidence — a
 * domain-based classification is a more trustworthy signal than an LLM
 * self-grading how reliable its own source looks, matching this app's
 * established "AI may narrate, never decide" discipline (Rule 1's Safety
 * Gate; registry-lookup confidence over LLM self-assessment elsewhere).
 *
 * The domain lists below are small, curated, and deliberately NOT
 * exhaustive — same disclosed-starting-point precedent as this app's other
 * curated seed lists (e.g. EmergencyContacts' 26-country seed). A domain
 * that matches nothing here is 'unknown', never silently assumed reliable —
 * an 'unknown' source can still be evaluated as single_source_unverified,
 * nothing is lost by starting small.
 */

export type SourceReliabilityTier =
  | 'authoritative_primary'
  | 'established_reporting'
  | 'professional_publication'
  | 'user_generated'
  | 'unknown';

// Regulator / court / official health-authority domains — the highest tier.
// Matches the domain itself or any subdomain of it.
const AUTHORITATIVE_PATTERNS: RegExp[] = [
  /\.gov$/i,
  /\.gov\.[a-z]{2}$/i, // .gov.uk, .gov.au, etc.
  /(^|\.)who\.int$/i,
  /(^|\.)cdc\.gov$/i,
  /(^|\.)fda\.gov$/i,
  /(^|\.)courts?\.[a-z.]+$/i,
  /(^|\.)judiciary\.[a-z.]+$/i,
];

// A short, curated list of established, editorially-reviewed news outlets.
const ESTABLISHED_REPORTING_DOMAINS = new Set([
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com',
  'washingtonpost.com', 'theguardian.com', 'cnn.com', 'npr.org',
  'aljazeera.com', 'bloomberg.com', 'wsj.com', 'usatoday.com',
  'abcnews.go.com', 'nbcnews.com', 'cbsnews.com', 'independent.co.uk',
  'telegraph.co.uk', 'globalnews.ca', 'cbc.ca',
]);

// Note: any .gov-shaped medical-research domain (NIH, NCBI, PubMed) is
// already caught by AUTHORITATIVE_PATTERNS above (checked first) and would
// never reach these patterns — deliberately not duplicated here.
const PROFESSIONAL_PUBLICATION_PATTERNS: RegExp[] = [
  /\.edu$/i,
  /(^|\.)thelancet\.com$/i,
  /(^|\.)nejm\.org$/i,
  /(^|\.)bmj\.com$/i,
  /(^|\.)jamanetwork\.com$/i,
];

const USER_GENERATED_DOMAINS = new Set([
  'reddit.com', 'x.com', 'twitter.com', 'facebook.com', 'instagram.com',
  'tiktok.com', 'youtube.com', 'quora.com', 'medium.com', 'tumblr.com',
  'forum.com', 'threads.net',
]);

function normalizeDomain(domain: string): string {
  return (domain || '')
    .toLowerCase()
    .trim()
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

/** Pure, deterministic. Never throws, never calls the network or an LLM. */
export function classifySourceReliability(domain: string): SourceReliabilityTier {
  const d = normalizeDomain(domain);
  if (!d) return 'unknown';

  if (AUTHORITATIVE_PATTERNS.some((re) => re.test(d))) return 'authoritative_primary';
  if (ESTABLISHED_REPORTING_DOMAINS.has(d)) return 'established_reporting';
  if (PROFESSIONAL_PUBLICATION_PATTERNS.some((re) => re.test(d))) return 'professional_publication';
  if (USER_GENERATED_DOMAINS.has(d)) return 'user_generated';
  return 'unknown';
}

export type CorroborationSource = {
  domain: string;
  tier: SourceReliabilityTier;
};

/**
 * Pure. Given the set of sources believed to describe the SAME real-world
 * incident (an earlier, deterministic same-story match already happened —
 * this function only asks "given these sources, does that group count as
 * corroborated?"), decides eligibility. Never called with a single item.
 *
 * Rules (matches the spec literally):
 *   - One authoritative_primary source alone is sufficient.
 *   - Otherwise, >=2 sources from genuinely DISTINCT domains, where at
 *     least one is not user_generated, qualify.
 *   - A lone social/user-generated post, or a single non-authoritative
 *     article, is never enough — 'a social post or one article is an
 *     unverified candidate, never a clinic strike.'
 */
export function computeCorroborationEligibility(sources: CorroborationSource[]): boolean {
  if (!Array.isArray(sources) || sources.length === 0) return false;

  if (sources.some((s) => s.tier === 'authoritative_primary')) return true;

  const distinctDomains = new Set(sources.map((s) => normalizeDomain(s.domain)).filter(Boolean));
  if (distinctDomains.size < 2) return false;

  const hasNonSocial = sources.some((s) => s.tier !== 'user_generated');
  return hasNonSocial;
}
