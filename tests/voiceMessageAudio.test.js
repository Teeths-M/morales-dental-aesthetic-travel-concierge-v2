import { describe, it, expect } from 'vitest';
import { computeWaveformBars } from '../src/lib/voiceMessageAudio.js';

describe('voiceMessageAudio.computeWaveformBars', () => {
  it('returns a flat neutral array for empty/missing input', () => {
    expect(computeWaveformBars([], 10)).toEqual(Array(10).fill(0.3));
    expect(computeWaveformBars(null, 5)).toEqual(Array(5).fill(0.3));
    expect(computeWaveformBars(undefined, 5)).toEqual(Array(5).fill(0.3));
  });

  it('returns a flat neutral array for an all-silent recording', () => {
    const silence = new Float32Array(1000).fill(0);
    expect(computeWaveformBars(silence, 8)).toEqual(Array(8).fill(0.3));
  });

  it('returns exactly barCount values, each within 0-1', () => {
    const samples = new Float32Array(4000);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.sin(i / 10) * 0.6;
    const bars = computeWaveformBars(samples, 40);
    expect(bars).toHaveLength(40);
    bars.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it('normalizes so the loudest segment is close to 1', () => {
    const samples = new Float32Array(100).fill(0.01);
    // Make the last segment far louder than the rest.
    for (let i = 90; i < 100; i += 1) samples[i] = 0.9;
    const bars = computeWaveformBars(samples, 10);
    expect(Math.max(...bars)).toBeCloseTo(1, 5);
    expect(bars[bars.length - 1]).toBeCloseTo(1, 5);
    expect(bars[0]).toBeLessThan(0.5);
  });

  it('defaults to 40 bars when barCount is omitted', () => {
    const samples = new Float32Array(4000).fill(0.5);
    expect(computeWaveformBars(samples)).toHaveLength(40);
  });

  it('handles a barCount larger than the sample count without crashing', () => {
    const samples = new Float32Array(5).fill(0.4);
    const bars = computeWaveformBars(samples, 40);
    expect(bars).toHaveLength(40);
  });

  it('is a pure function — same input always produces the same output', () => {
    const samples = new Float32Array(200);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.cos(i) * 0.3;
    expect(computeWaveformBars(samples, 20)).toEqual(computeWaveformBars(samples, 20));
  });
});
