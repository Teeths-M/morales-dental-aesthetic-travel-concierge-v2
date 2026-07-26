import { describe, it, expect } from 'vitest';
import { isExitConfirmPress } from '../src/hooks/useAndroidBackButton.js';

describe('useAndroidBackButton.isExitConfirmPress', () => {
  it('the very first press (lastPress=0) is never mistaken for a confirm, even long after boot', () => {
    expect(isExitConfirmPress(50_000, 0)).toBe(false);
  });

  it('a second press within the window confirms exit', () => {
    expect(isExitConfirmPress(1_500, 1_000, 2_000)).toBe(true);
  });

  it('a second press right at the window boundary does not confirm (strict less-than)', () => {
    expect(isExitConfirmPress(3_000, 1_000, 2_000)).toBe(false);
  });

  it('two genuinely separate presses more than the window apart never merge', () => {
    expect(isExitConfirmPress(5_000, 1_000, 2_000)).toBe(false);
  });
});
