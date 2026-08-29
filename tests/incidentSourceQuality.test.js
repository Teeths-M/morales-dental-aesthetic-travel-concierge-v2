import { describe, it, expect } from 'vitest';
import { classifySourceReliability, computeCorroborationEligibility } from '../base44/shared/incidentSourceQuality.ts';

describe('classifySourceReliability', () => {
  it('classifies .gov domains as authoritative_primary', () => {
    expect(classifySourceReliability('health.gov')).toBe('authoritative_primary');
    expect(classifySourceReliability('www.fda.gov')).toBe('authoritative_primary');
  });

  it('classifies who.int as authoritative_primary', () => {
    expect(classifySourceReliability('who.int')).toBe('authoritative_primary');
  });

  it('classifies a curated major outlet as established_reporting', () => {
    expect(classifySourceReliability('reuters.com')).toBe('established_reporting');
    expect(classifySourceReliability('www.bbc.com')).toBe('established_reporting');
  });

  it('classifies .edu and journal domains as professional_publication', () => {
    expect(classifySourceReliability('stanford.edu')).toBe('professional_publication');
    expect(classifySourceReliability('thelancet.com')).toBe('professional_publication');
  });

  it('classifies a .gov research domain (e.g. NIH/NCBI) as authoritative_primary, not professional_publication — .gov takes precedence', () => {
    expect(classifySourceReliability('ncbi.nlm.nih.gov')).toBe('authoritative_primary');
  });

  it('classifies known social/forum domains as user_generated', () => {
    expect(classifySourceReliability('reddit.com')).toBe('user_generated');
    expect(classifySourceReliability('x.com')).toBe('user_generated');
    expect(classifySourceReliability('facebook.com')).toBe('user_generated');
  });

  it('classifies an unrecognized domain as unknown, never assumed reliable', () => {
    expect(classifySourceReliability('some-random-blog.example')).toBe('unknown');
  });

  it('returns unknown for empty/missing input', () => {
    expect(classifySourceReliability('')).toBe('unknown');
    expect(classifySourceReliability(undefined)).toBe('unknown');
  });

  it('normalizes a www. prefix and path suffix before matching', () => {
    expect(classifySourceReliability('www.reuters.com/some/path')).toBe('established_reporting');
  });
});

describe('computeCorroborationEligibility', () => {
  it('returns false for an empty source list', () => {
    expect(computeCorroborationEligibility([])).toBe(false);
  });

  it('returns false for a single non-authoritative source — never corroborated alone', () => {
    expect(computeCorroborationEligibility([{ domain: 'reuters.com', tier: 'established_reporting' }])).toBe(false);
  });

  it('one authoritative_primary source alone is sufficient', () => {
    expect(computeCorroborationEligibility([{ domain: 'health.gov', tier: 'authoritative_primary' }])).toBe(true);
  });

  it('two distinct domains, at least one non-social, qualifies', () => {
    expect(computeCorroborationEligibility([
      { domain: 'reddit.com', tier: 'user_generated' },
      { domain: 'reuters.com', tier: 'established_reporting' },
    ])).toBe(true);
  });

  it('two distinct social/user-generated domains alone do NOT qualify', () => {
    expect(computeCorroborationEligibility([
      { domain: 'reddit.com', tier: 'user_generated' },
      { domain: 'x.com', tier: 'user_generated' },
    ])).toBe(false);
  });

  it('the same domain repeated does not count as two distinct sources', () => {
    expect(computeCorroborationEligibility([
      { domain: 'reuters.com', tier: 'established_reporting' },
      { domain: 'reuters.com', tier: 'established_reporting' },
    ])).toBe(false);
  });

  it('a single unknown-tier source is never enough on its own', () => {
    expect(computeCorroborationEligibility([{ domain: 'some-blog.example', tier: 'unknown' }])).toBe(false);
  });
});
