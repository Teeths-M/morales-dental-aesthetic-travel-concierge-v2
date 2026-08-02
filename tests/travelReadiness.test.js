import { describe, it, expect } from 'vitest';
import { passportSentinel, travelReadiness, SENTINEL_DAYS, getPassportRenewalLink, getPassportHelpLinks } from '@/lib/travelReadiness';

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

describe('the 6-month sentinel', () => {
  it('is quiet when the passport comfortably outlives the trip', () => {
    expect(passportSentinel(iso(400), iso(30))).toBeNull();
  });

  it('fires when validity at the travel date is under 6 months', () => {
    // Travels in 30 days, passport dies 90 days out → 60 days left on arrival.
    const days = passportSentinel(iso(90), iso(30));
    expect(days).toBeLessThan(SENTINEL_DAYS);
    expect(days).toBeGreaterThan(0);
  });

  it('measures against the TRAVEL date, not today', () => {
    // Fine today (200 days left), not fine on arrival (only 20 days left).
    expect(passportSentinel(iso(200), null)).toBeNull();
    expect(passportSentinel(iso(200), iso(180))).not.toBeNull();
  });

  it('says nothing when it has nothing to go on', () => {
    expect(passportSentinel(null, iso(30))).toBeNull();
    expect(passportSentinel('', iso(30))).toBeNull();
    expect(passportSentinel('not-a-date', iso(30))).toBeNull();
  });
});

describe('travelReadiness tells someone before they commit', () => {
  it('an expired passport is BLOCKING and worded as expired, not as "-34 days"', () => {
    const { status, issues } = travelReadiness({ passportExpiry: iso(-34), travelDate: iso(30) });
    expect(status).toBe('attention');
    const issue = issues.find((i) => i.code === 'passport_expired');
    expect(issue.severity).toBe('blocking');
    // The bug this replaces: the old copy interpolated the raw difference and
    // rendered "expires in -34 days" to the patient.
    expect(`${issue.title} ${issue.detail}`).not.toMatch(/-\d+ days/);
  });

  it('a passport expiring DURING the 6-month window is a warning, not a block', () => {
    const { issues } = travelReadiness({ passportExpiry: iso(90), travelDate: iso(30) });
    const issue = issues.find((i) => i.code === 'passport_expiring');
    expect(issue.severity).toBe('warning');
  });

  it('flags an embassy visa as the slow one', () => {
    const { issues } = travelReadiness({
      passportExpiry: iso(900), travelDate: iso(30), visaStatus: 'embassy',
    });
    const visa = issues.find((i) => i.code === 'visa_embassy');
    expect(visa).toBeTruthy();
    expect(visa.detail).toMatch(/weeks/i);
  });

  it('says nothing about visas when none is required', () => {
    const { status, issues } = travelReadiness({
      passportExpiry: iso(900), travelDate: iso(30), visaStatus: 'exempt',
    });
    expect(issues).toEqual([]);
    expect(status).toBe('ok');
  });

  it('reports BOTH problems at once rather than one at a time', () => {
    // Being told to renew a passport, fixing it, then being told about a visa
    // is two disappointments instead of one honest conversation.
    const { issues } = travelReadiness({
      passportExpiry: iso(60), travelDate: iso(30), visaStatus: 'embassy',
    });
    expect(issues.map((i) => i.code).sort()).toEqual(['passport_expiring', 'visa_embassy']);
  });

  it('is "unknown", never "ok", before the expiry date is known', () => {
    // The same dishonesty as a checklist ticking itself for zero results:
    // a green light for a question nobody answered.
    const { status } = travelReadiness({ travelDate: iso(30), visaStatus: 'exempt' });
    expect(status).toBe('unknown');
  });

  it('survives being called with nothing', () => {
    expect(travelReadiness()).toEqual({ status: 'unknown', issues: [] });
  });
});

describe('passport renewal help links — the "how do I actually do this" answer', () => {
  it('a curated nationality gets its real official renewal link', () => {
    expect(getPassportRenewalLink('American')).toBe('https://travel.state.gov/content/travel/en/passports/have-passport/renew.html');
    expect(getPassportRenewalLink('British')).toBe('https://www.gov.uk/renew-adult-passport');
  });

  it('every CARICOM nationality in visaMatrix.js\'s own CARICOM list resolves to a real curated link, not the search fallback', () => {
    const caricomNationalities = [
      'Trinidad and Tobago', 'Trinidadian', 'Jamaican', 'Barbadian', 'Grenadian',
      'Antiguans', 'Antiguan', 'Belizean', 'Dominican', 'Saint Vincentian', 'Vincentian',
      'Saint Lucian', 'St. Lucian', 'Kittitian', 'Guyanese', 'Bahamian', 'Surinamese',
    ];
    for (const nationality of caricomNationalities) {
      const url = getPassportRenewalLink(nationality);
      expect(url, `${nationality} should resolve to a curated link`).not.toMatch(/google\.com\/search/);
      expect(url).toMatch(/^https:\/\//);
    }
  });

  it('an uncurated nationality falls back to a constructed search, never a fabricated URL', () => {
    const url = getPassportRenewalLink('Kenyan');
    expect(url).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
    expect(decodeURIComponent(url)).toContain('Kenyan');
  });

  it('says nothing when there is no nationality to go on', () => {
    expect(getPassportRenewalLink('')).toBeNull();
    expect(getPassportRenewalLink(null)).toBeNull();
  });

  it('getPassportHelpLinks always returns both a renewal link and a video search, never empty', () => {
    const { renewalUrl, videoSearchUrl } = getPassportHelpLinks('Jamaican');
    expect(renewalUrl).toBeTruthy();
    expect(videoSearchUrl).toMatch(/^https:\/\/www\.youtube\.com\/results\?search_query=/);
    expect(decodeURIComponent(videoSearchUrl)).toContain('Jamaican');
  });
});
