import { describe, it, expect } from 'vitest';
import { createRageClickDetector } from '@/lib/rageClick';

// Clicks on element `key` at (x, y), one every `gap` ms starting at `start`.
function burst(record, { key = 1, x = 100, y = 100, start = 0, gap = 150, count = 4 } = {}) {
  const fired = [];
  for (let i = 0; i < count; i++) fired.push(record({ key, x, y, t: start + i * gap }));
  return fired;
}

describe('createRageClickDetector', () => {
  it('fires on the fourth quick click on the same spot, not before', () => {
    const record = createRageClickDetector();
    expect(burst(record)).toEqual([false, false, false, true]);
  });

  it('ignores a double-click and a triple-click', () => {
    expect(burst(createRageClickDetector(), { count: 2 })).toEqual([false, false]);
    expect(burst(createRageClickDetector(), { count: 3 })).toEqual([false, false, false]);
  });

  it('ignores steady, unhurried clicking', () => {
    expect(burst(createRageClickDetector(), { gap: 500, count: 6 })).not.toContain(true);
  });

  it('fires once per burst, however long it lasts', () => {
    const fired = burst(createRageClickDetector(), { count: 12 });
    expect(fired.filter(Boolean)).toHaveLength(1);
  });

  it('fires again for a new burst after a pause', () => {
    const record = createRageClickDetector();
    expect(burst(record)).toContain(true);
    expect(burst(record, { start: 5000 })).toEqual([false, false, false, true]);
  });

  it('does not combine clicks on different elements', () => {
    const record = createRageClickDetector();
    const fired = [1, 2, 1, 2, 1, 2].map((key, i) => record({ key, x: 100, y: 100, t: i * 100 }));
    expect(fired).not.toContain(true);
  });

  it('does not combine clicks far apart on the same large element', () => {
    const record = createRageClickDetector();
    const fired = [0, 200, 400, 600].map((x, i) => record({ key: 1, x, y: 100, t: i * 100 }));
    expect(fired).not.toContain(true);
  });

  it('respects custom thresholds', () => {
    const record = createRageClickDetector({ threshold: 3, windowMs: 500, radiusPx: 10 });
    expect(burst(record, { count: 3, gap: 100 })).toEqual([false, false, true]);
  });

  it('ignores unusable input', () => {
    const record = createRageClickDetector();
    expect(record({ x: 1, y: 1, t: 0 })).toBe(false);
    expect(record({ key: 1, x: 1, y: 1, t: Number.NaN })).toBe(false);
  });
});
