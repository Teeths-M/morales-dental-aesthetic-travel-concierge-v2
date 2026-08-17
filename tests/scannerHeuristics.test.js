import { describe, it, expect } from 'vitest';
import {
  computeAverageBrightness,
  computeGlareRatio,
  estimateFrameFillRatio,
  estimateEdgeTouchScore,
  getLiveGuidance,
} from '../src/lib/scannerHeuristics.js';

function solidColorBytes(r, g, b, count = 100) {
  const bytes = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < bytes.length; i += 4) {
    bytes[i] = r; bytes[i + 1] = g; bytes[i + 2] = b; bytes[i + 3] = 255;
  }
  return bytes;
}

describe('scannerHeuristics.computeAverageBrightness', () => {
  it('returns 0 for empty/missing input', () => {
    expect(computeAverageBrightness([])).toBe(0);
    expect(computeAverageBrightness(null)).toBe(0);
  });

  it('returns ~255 for pure white, ~0 for pure black', () => {
    expect(computeAverageBrightness(solidColorBytes(255, 255, 255))).toBeCloseTo(255, 0);
    expect(computeAverageBrightness(solidColorBytes(0, 0, 0))).toBe(0);
  });
});

describe('scannerHeuristics.computeGlareRatio', () => {
  it('is 0 when nothing is blown out', () => {
    expect(computeGlareRatio(solidColorBytes(128, 128, 128))).toBe(0);
  });

  it('is 1 when everything is near-white', () => {
    expect(computeGlareRatio(solidColorBytes(255, 255, 255))).toBe(1);
  });

  it('counts only pixels at or above the threshold', () => {
    const bytes = new Uint8ClampedArray([
      255, 255, 255, 255, // blown
      10, 10, 10, 255,    // not blown
      255, 255, 255, 255, // blown
      10, 10, 10, 255,    // not blown
    ]);
    expect(computeGlareRatio(bytes)).toBe(0.5);
  });
});

describe('scannerHeuristics.estimateFrameFillRatio', () => {
  it('is near 0 when inner and outer regions match (nothing framed)', () => {
    const region = solidColorBytes(120, 120, 120);
    expect(estimateFrameFillRatio(region, region)).toBe(0);
  });

  it('is higher when inner and outer regions strongly contrast', () => {
    const inner = solidColorBytes(20, 20, 20);
    const outer = solidColorBytes(220, 220, 220);
    expect(estimateFrameFillRatio(inner, outer)).toBeGreaterThan(0.5);
  });

  it('is clamped to [0, 1]', () => {
    const inner = solidColorBytes(0, 0, 0);
    const outer = solidColorBytes(255, 255, 255);
    const ratio = estimateFrameFillRatio(inner, outer);
    expect(ratio).toBeLessThanOrEqual(1);
    expect(ratio).toBeGreaterThanOrEqual(0);
  });
});

describe('scannerHeuristics.estimateEdgeTouchScore', () => {
  it('is near 0 when the edge strip matches the background corner', () => {
    const region = solidColorBytes(200, 200, 200);
    expect(estimateEdgeTouchScore(region, region)).toBe(0);
  });

  it('is higher when the edge strip differs from the background corner', () => {
    const edge = solidColorBytes(30, 30, 30);
    const corner = solidColorBytes(230, 230, 230);
    expect(estimateEdgeTouchScore(edge, corner)).toBeGreaterThan(0.5);
  });
});

describe('scannerHeuristics.getLiveGuidance', () => {
  it('flags glare above the ratio threshold before anything else', () => {
    expect(getLiveGuidance({ brightness: 150, glareRatio: 0.5, frameFillRatio: 0.8, isStable: true })).toBe('Too much glare');
  });

  it('flags an overexposed frame as glare even with a low glare-pixel ratio', () => {
    expect(getLiveGuidance({ brightness: 250, glareRatio: 0, frameFillRatio: 0.8 })).toBe('Too much glare');
  });

  it('asks the user to move closer when the frame is too dark', () => {
    expect(getLiveGuidance({ brightness: 20, glareRatio: 0, frameFillRatio: 0.8 })).toBe('Move closer');
  });

  it('flags partial-frame documents via edge touch', () => {
    expect(getLiveGuidance({ brightness: 150, glareRatio: 0, frameFillRatio: 0.8, edgeTouchScore: 0.9 })).toBe('Document is partially outside the frame');
  });

  it('asks the user to move closer when nothing fills the frame yet', () => {
    expect(getLiveGuidance({ brightness: 150, glareRatio: 0, frameFillRatio: 0.1, edgeTouchScore: 0 })).toBe('Move closer');
  });

  it('reports a partially-framed document as detected, not yet steady', () => {
    expect(getLiveGuidance({ brightness: 150, glareRatio: 0, frameFillRatio: 0.45, edgeTouchScore: 0 })).toBe('Document detected');
  });

  it('asks to hold steady once well-framed but not yet confirmed stable', () => {
    expect(getLiveGuidance({ brightness: 150, glareRatio: 0, frameFillRatio: 0.8, edgeTouchScore: 0, isStable: false })).toBe('Hold steady');
  });

  it('reports looks good only once well-framed, clean, and stable', () => {
    expect(getLiveGuidance({ brightness: 150, glareRatio: 0, frameFillRatio: 0.8, edgeTouchScore: 0, isStable: true })).toBe('Looks good');
  });
});
