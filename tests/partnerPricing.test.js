import { describe, it, expect } from 'vitest';
import {
  parseAmountMinor,
  minorToDecimalString,
  packageTotalMinor,
  normalizeCurrency,
} from '../base44/shared/partnerMoney.ts';
import {
  derivePricingStatus,
  isFirmCurrent,
  isMaterialChange,
  isValidUnitForCategory,
  missingFieldsFor,
  isQuietHours,
} from '../base44/shared/partnerCatalogue.ts';

const NOW = new Date('2026-11-02T12:00:00Z');

describe('money: integer minor units, never floats', () => {
  it('parses a two-decimal amount exactly', () => {
    expect(parseAmountMinor('19.99', 'USD')).toBe(1999);
    // The classic float trap: 19.99 * 100 === 1998.9999999999998
    expect(parseAmountMinor('0.29', 'USD')).toBe(29);
    expect(parseAmountMinor('1.10', 'USD')).toBe(110);
  });

  it('refuses more precision than the currency has', () => {
    expect(parseAmountMinor('10.005', 'USD')).toBeNull();
  });

  it('handles zero-decimal currencies as whole units', () => {
    expect(parseAmountMinor('1500', 'JPY')).toBe(1500);
    expect(minorToDecimalString(1500, 'JPY')).toBe('1500');
  });

  it('returns null rather than zero for a missing or invalid amount', () => {
    expect(parseAmountMinor('', 'USD')).toBeNull();
    expect(parseAmountMinor('free', 'USD')).toBeNull();
    expect(parseAmountMinor('-5', 'USD')).toBeNull();
  });

  it('rejects a non-ISO currency code', () => {
    expect(normalizeCurrency('usd')).toBe('USD');
    expect(normalizeCurrency('ZZZ')).toBeNull();
    expect(normalizeCurrency('dollars')).toBeNull();
  });

  it('sums only included AND priced package components', () => {
    const result = packageTotalMinor([
      { component_state: 'included', amount_minor: 40000 },
      { component_state: 'included', amount_minor: 20000 },
      { component_state: 'excluded', amount_minor: 99999 },
      { component_state: 'unpriced' },
    ]);
    expect(result.totalMinor).toBe(60000);
    expect(result.pricedCount).toBe(2);
    expect(result.unpricedLabels).toBe(0);
  });

  it('reports an included component with no price instead of treating it as free', () => {
    const result = packageTotalMinor([
      { component_state: 'included', amount_minor: 60000 },
      { component_state: 'included' },
    ]);
    expect(result.totalMinor).toBe(60000);
    expect(result.unpricedLabels).toBe(1);
  });
});

describe('freshness: a label never outlives its own deadline', () => {
  const base = {
    pricing_status: 'CURRENT_PARTNER_CONFIRMED',
    status: 'active',
    next_review_at: '2026-12-01T00:00:00Z',
    valid_until: '2026-12-31',
  };

  it('keeps a confirmed price current inside its window', () => {
    expect(derivePricingStatus(base, NOW)).toBe('CURRENT_PARTNER_CONFIRMED');
    expect(isFirmCurrent(base, NOW)).toBe(true);
  });

  it('demotes a confirmed price once its review deadline passes', () => {
    const card = { ...base, next_review_at: '2026-10-01T00:00:00Z' };
    expect(derivePricingStatus(card, NOW)).toBe('STALE');
    expect(isFirmCurrent(card, NOW)).toBe(false);
  });

  it('expires a price whose validity date has ended, even if confirmed', () => {
    const card = { ...base, valid_until: '2026-10-30' };
    expect(derivePricingStatus(card, NOW)).toBe('EXPIRED');
    expect(isFirmCurrent(card, NOW)).toBe(false);
  });

  it('never promotes a submitted price to current by itself', () => {
    const card = { ...base, pricing_status: 'PARTNER_SUBMITTED' };
    expect(derivePricingStatus(card, NOW)).toBe('PARTNER_SUBMITTED');
    expect(isFirmCurrent(card, NOW)).toBe(false);
  });

  it('treats a withdrawn offer as withdrawn regardless of dates', () => {
    expect(derivePricingStatus({ ...base, status: 'withdrawn' }, NOW)).toBe('WITHDRAWN');
  });
});

describe('versions: only material changes create one', () => {
  it('detects a price change', () => {
    expect(isMaterialChange({ amount_minor: 100 }, { amount_minor: 200 })).toBe(true);
  });

  it('ignores an availability-only edit', () => {
    expect(isMaterialChange(
      { amount_minor: 100, availability_status: 'available' },
      { amount_minor: 100, availability_status: 'limited' },
    )).toBe(false);
  });

  it('detects a changed inclusion', () => {
    expect(isMaterialChange({ inclusions: ['flight'] }, { inclusions: ['flight', 'hotel'] })).toBe(true);
  });
});

describe('category rules', () => {
  it('rejects a unit that does not belong to the category', () => {
    expect(isValidUnitForCategory('flight', 'per_night')).toBe(false);
    expect(isValidUnitForCategory('lodging', 'per_night')).toBe(true);
    expect(isValidUnitForCategory('transfer', 'per_vehicle')).toBe(true);
  });

  it('names what is still missing rather than assuming it is fine', () => {
    const missing = missingFieldsFor({ availability_status: 'unknown' }, { country: '' });
    expect(missing).toContain('price');
    expect(missing).toContain('valid_until');
    expect(missing).toContain('country');
    expect(missing).toContain('availability');
  });
});

describe('quiet hours stay in the partner timezone', () => {
  it('defers inside the window', () => {
    // 22:00 UTC is 18:00 in Port of Spain (UTC-4)
    const at = new Date('2026-11-02T22:00:00Z');
    expect(isQuietHours('America/Port_of_Spain', '18:00', '07:00', at)).toBe(true);
  });

  it('does not defer outside the window', () => {
    const at = new Date('2026-11-02T15:00:00Z'); // 11:00 local
    expect(isQuietHours('America/Port_of_Spain', '18:00', '07:00', at)).toBe(false);
  });

  it('never mutes everything because a timezone is unusable', () => {
    expect(isQuietHours('Not/AZone', '18:00', '07:00', NOW)).toBe(false);
  });
});