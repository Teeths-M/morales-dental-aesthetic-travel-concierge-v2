import { describe, it, expect, vi } from 'vitest';

const setEnabled = vi.fn();
vi.mock('@/hooks/useSurroundingAwareness', () => ({ setEnabled }));

const { armSurroundingAwareness, disarmSurroundingAwareness } = await import('@/lib/surroundingAwareness');

describe('surroundingAwareness (thin wrapper over useSurroundingAwareness.setEnabled)', () => {
  it('armSurroundingAwareness calls setEnabled(true)', () => {
    setEnabled.mockClear();
    armSurroundingAwareness();
    expect(setEnabled).toHaveBeenCalledWith(true);
  });

  it('disarmSurroundingAwareness calls setEnabled(false)', () => {
    setEnabled.mockClear();
    disarmSurroundingAwareness();
    expect(setEnabled).toHaveBeenCalledWith(false);
  });
});
