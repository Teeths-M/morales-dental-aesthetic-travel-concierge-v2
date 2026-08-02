/**
 * travelReadiness — can this patient actually make the trip they're booking?
 *
 * The point is to catch a passport or visa problem BEFORE someone commits to
 * surgery abroad, rather than at an airport desk. It needs four plain values —
 * passport expiry, travel date, nationality, destination — and no document
 * upload: the image was only ever a way to save typing, and reading it cost
 * more privacy than the check is worth. See the note in PassportVaultSection.
 *
 * Pure and deterministic, so both /booking and /intake can share one answer
 * and neither can drift from the other.
 */

/** Most destinations require a passport valid for 6 months beyond entry. */
export const SENTINEL_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Days of passport validity remaining at the travel date, but only when that
 * falls short of the 6-month rule. Returns null when the passport is fine, or
 * when we don't have enough information to judge.
 *
 * Kept returning a bare number for the existing /booking caller.
 */
export function passportSentinel(expiryDate, travelDate) {
  const expiry = parseDate(expiryDate);
  if (!expiry) return null;
  const reference = parseDate(travelDate) || new Date();
  const diffDays = Math.ceil((expiry.getTime() - reference.getTime()) / DAY_MS);
  return diffDays < SENTINEL_DAYS ? diffDays : null;
}

/**
 * The full readiness verdict.
 *
 * @param {object} args
 * @param {string} [args.passportExpiry]
 * @param {string} [args.travelDate]
 * @param {string} [args.visaStatus] from getVisaRequirement: exempt|evisa|embassy|...
 * @returns {{ status: 'ok'|'unknown'|'attention', issues: Array<{code,severity,title,detail}> }}
 *   `severity` is 'blocking' for something that will stop them travelling and
 *   'warning' for something that needs action but has time. Nothing here ever
 *   prevents a booking — a passport problem is fixable, and refusing the
 *   booking would just send them somewhere with no warning at all. This tells
 *   them early; it does not decide for them.
 */
export function travelReadiness({ passportExpiry, travelDate, visaStatus } = {}) {
  const issues = [];

  const expiry = parseDate(passportExpiry);
  const travel = parseDate(travelDate);

  if (expiry) {
    const reference = travel || new Date();
    const daysAtTravel = Math.ceil((expiry.getTime() - reference.getTime()) / DAY_MS);

    if (daysAtTravel < 0) {
      // The original /booking copy said "expires in {n} days" using the raw
      // difference, so an already-expired passport rendered as "expires in
      // -34 days". Separated out: this is a different problem with a
      // different answer, and it is the one that actually stops the trip.
      issues.push({
        code: 'passport_expired',
        severity: 'blocking',
        title: 'Your passport will have expired',
        detail: travel
          ? 'It expires before your travel date. You will need to renew it before you can fly.'
          : 'It has already expired. You will need to renew it before you can travel.',
      });
    } else if (daysAtTravel < SENTINEL_DAYS) {
      issues.push({
        code: 'passport_expiring',
        severity: 'warning',
        title: `Your passport has ${daysAtTravel} days left at your travel date`,
        detail: 'Most countries require at least 6 months of validity remaining on arrival, so this may not be accepted. Renewing first is the safe route.',
      });
    }
  }

  if (visaStatus === 'evisa') {
    issues.push({
      code: 'visa_evisa',
      severity: 'warning',
      title: 'You will need an e-Visa',
      detail: 'It is applied for online and is usually quick, but it must be in place before you fly.',
    });
  } else if (visaStatus === 'embassy') {
    issues.push({
      code: 'visa_embassy',
      severity: 'warning',
      title: 'You will need a visa from the embassy',
      detail: 'This one is applied for in person and can take several weeks, so it is worth starting well before your travel date.',
    });
  }

  // 'unknown' is deliberately distinct from 'ok'. We have not checked
  // anything until a passport expiry exists, and showing a reassuring green
  // tick for an unanswered question is the same dishonesty as a checklist
  // that ticks itself for zero results.
  if (!expiry) return { status: 'unknown', issues };
  return { status: issues.length ? 'attention' : 'ok', issues };
}

// ── "How do I actually renew this" links ────────────────────────────────────
// Passport renewal is keyed by NATIONALITY (whoever issued the passport),
// unlike visaMatrix.js's links which are keyed by destination (who you're
// entering) — a different lookup, not a copy of that table.
//
// Every entry below was looked up live (WebSearch) against each country's own
// government domain, not typed from memory — the deep-link paths can still
// drift over time the way any government site does, but these aren't guesses.
// Nationalities with no entry get a constructed search URL instead of a
// fabricated link — same "never invent a URL" rule as the video-help link.
const PASSPORT_RENEWAL_LINKS = {
  American: 'https://travel.state.gov/content/travel/en/passports/have-passport/renew.html',
  British: 'https://www.gov.uk/renew-adult-passport',
  Canadian: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/renew.html',
  Irish: 'https://www.dfa.ie/passportonline/',
  Australian: 'https://www.passports.gov.au/passports-explained/renew-passport',
  'New Zealander': 'https://www.passports.govt.nz/renew-your-passport',

  // ── Caribbean (CARICOM) — same nationality strings used in visaMatrix.js's
  // own CARICOM list, so a lookup here always lines up with one made there. ──
  'Trinidad and Tobago': 'https://ttconnect.gov.tt/passport/',
  Trinidadian: 'https://ttconnect.gov.tt/passport/',
  'Republic of Trinidad and Tobago': 'https://ttconnect.gov.tt/passport/',
  Jamaican: 'https://www.pica.gov.jm',
  Barbadian: 'https://immigration.gov.bb',
  Grenadian: 'https://www.rgpf.gd/index.php/departments/immigration-department',
  Antiguans: 'https://immigration.gov.ag/general-services/passports/',
  Antiguan: 'https://immigration.gov.ag/general-services/passports/',
  Belizean: 'https://immigration.gov.bz',
  // Dominican here means Dominica (the island) — same disambiguation note as
  // visaMatrix.js's CARICOM list: not the Dominican Republic.
  Dominican: 'https://nationalsecurity.gov.dm/divisions/immigration-division',
  'Saint Vincentian': 'https://www.gov.vc/index.php/passport-application',
  Vincentian: 'https://www.gov.vc/index.php/passport-application',
  'Saint Lucian': 'https://www.govt.lc/services/apply-for-a-saint-lucia-passport',
  'St. Lucian': 'https://www.govt.lc/services/apply-for-a-saint-lucia-passport',
  Kittitian: 'https://www.mofa.gov.kn/service/passport-and-visa-services/',
  Guyanese: 'https://pp.gpf.gov.gy',
  Bahamian: 'https://mofa.gov.bs/passportrenewal/',
  Surinamese: 'https://cbb.gov.sr',
};

export function getPassportRenewalLink(nationality) {
  if (!nationality) return null;
  for (const [key, url] of Object.entries(PASSPORT_RENEWAL_LINKS)) {
    if (nationality.toLowerCase().includes(key.toLowerCase())) return url;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${nationality} passport renewal official government website`)}`;
}

export function getPassportHelpLinks(nationality) {
  return {
    renewalUrl: getPassportRenewalLink(nationality),
    videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to renew ${nationality} passport`)}`,
  };
}
