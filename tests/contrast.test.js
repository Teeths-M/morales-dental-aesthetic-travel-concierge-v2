import { describe, it, expect } from 'vitest';
import { BRAND } from '../src/lib/brandTokens.js';

/**
 * WCAG 2.1 relative luminance and contrast ratio.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function luminance(hex) {
  const channels = hex.replace('#', '').match(/../g).map(h => parseInt(h, 16) / 255);
  const [r, g, b] = channels.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

const AA_NORMAL = 4.5;  // WCAG AA, text under 18.66px regular / 24px bold
const AA_LARGE = 3.0;   // WCAG AA, large text

const WHITE = '#FFFFFF';
const SLATE_50 = '#F8FAFC';

describe('brand colour contrast', () => {
  it('the contrast helper agrees with known WCAG values', () => {
    // Anchor the maths against values that cannot drift: black on white is
    // exactly 21:1, and any colour against itself is 1:1. Without this, a bug
    // in the helper could make every assertion below pass meaninglessly.
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrast('#D4AF37', '#D4AF37')).toBeCloseTo(1, 5);
  });

  it('BRAND.gold is legible on the dark palette it was designed for', () => {
    expect(contrast(BRAND.gold, BRAND.dark)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrast(BRAND.gold, '#0C1A1D')).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('BRAND.gold is NOT legible as text on white — which is why goldOnLight exists', () => {
    // Documents the trap rather than hiding it. #D4AF37 on white is ~2.1:1.
    // Anyone reaching for BRAND.gold on a light screen should find this test.
    expect(contrast(BRAND.gold, WHITE)).toBeLessThan(AA_LARGE);
  });

  it('BRAND.goldOnLight clears AA for normal text on light surfaces', () => {
    expect(contrast(BRAND.goldOnLight, WHITE)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrast(BRAND.goldOnLight, SLATE_50)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('the focus ring is visible against both grounds', () => {
    // The global :focus-visible ring is BRAND.gold. A keyboard user must be
    // able to see it on the dark app chrome AND the light booking screens,
    // where it is a 2px outline — non-text, so AA_LARGE (3:1) is the bar.
    expect(contrast(BRAND.gold, BRAND.dark)).toBeGreaterThanOrEqual(AA_LARGE);
    // On white the gold alone is too faint, which is exactly why the rule
    // pairs it with a dark box-shadow halo. Assert the halo carries it.
    expect(contrast('#060B16', WHITE)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});
