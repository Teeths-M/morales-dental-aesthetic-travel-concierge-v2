// Pure, unit-testable client-side heuristics for the M-Care Scanner's live
// guidance overlay. This is deliberately NOT real computer-vision edge
// detection — no CV library exists in this repo, and building one was
// explicitly deferred in favor of a real camera preview with lightweight
// heuristic hints. The actual pass/fail quality verdict always comes from
// the server-side vision-LLM check in scanVaultDocument, never from anything
// computed here — these functions only ever drive a best-effort on-screen
// hint while the camera is live.
//
// Every function operates on plain RGBA byte arrays (Uint8ClampedArray or a
// plain array works identically) rather than a real ImageData object, so the
// math is testable without a canvas/DOM environment.

const BRIGHTNESS_DARK_THRESHOLD = 60;
const BRIGHTNESS_BRIGHT_THRESHOLD = 235;
const GLARE_RATIO_THRESHOLD = 0.12;
const FRAME_FILL_LOW_THRESHOLD = 0.35;
const FRAME_FILL_GOOD_THRESHOLD = 0.6;
const EDGE_TOUCH_THRESHOLD = 0.5;

/** Standard luma-weighted average brightness (0-255) across RGBA bytes. */
export function computeAverageBrightness(rgbaBytes) {
  if (!rgbaBytes || rgbaBytes.length < 4) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i + 2 < rgbaBytes.length; i += 4) {
    sum += 0.299 * rgbaBytes[i] + 0.587 * rgbaBytes[i + 1] + 0.114 * rgbaBytes[i + 2];
    count++;
  }
  return count ? sum / count : 0;
}

/** Fraction of pixels that are blown-out near-white (a rough glare proxy). */
export function computeGlareRatio(rgbaBytes, whiteThreshold = 248) {
  if (!rgbaBytes || rgbaBytes.length < 4) return 0;
  let blown = 0;
  let count = 0;
  for (let i = 0; i + 2 < rgbaBytes.length; i += 4) {
    if (rgbaBytes[i] >= whiteThreshold && rgbaBytes[i + 1] >= whiteThreshold && rgbaBytes[i + 2] >= whiteThreshold) {
      blown++;
    }
    count++;
  }
  return count ? blown / count : 0;
}

/**
 * estimateFrameFillRatio — a rough "is something document-shaped filling
 * most of the frame" proxy: the brightness contrast between a centered
 * inner sample and an outer border sample. A document on a contrasting
 * background usually shows a visible step between the two; an empty frame
 * usually doesn't. Intentionally cheap and approximate, not contour
 * detection — returns 0-1.
 */
export function estimateFrameFillRatio(innerRegionBytes, outerRegionBytes) {
  const innerBrightness = computeAverageBrightness(innerRegionBytes);
  const outerBrightness = computeAverageBrightness(outerRegionBytes);
  const contrast = Math.abs(innerBrightness - outerBrightness);
  return Math.max(0, Math.min(1, contrast / 90));
}

/**
 * estimateEdgeTouchScore — how much the very edge strip of the frame differs
 * from a background corner sample. High values suggest the document extends
 * past the visible frame. 0-1.
 */
export function estimateEdgeTouchScore(edgeStripBytes, cornerSampleBytes) {
  const edgeBrightness = computeAverageBrightness(edgeStripBytes);
  const cornerBrightness = computeAverageBrightness(cornerSampleBytes);
  const diff = Math.abs(edgeBrightness - cornerBrightness);
  return Math.max(0, Math.min(1, diff / 90));
}

/**
 * getLiveGuidance — turns the raw heuristic numbers into one of the exact
 * on-screen hint strings. Priority order matters: glare/exposure problems
 * are worse than framing, so they're checked first. There is no dedicated
 * "too dark" string in the spec's guidance vocabulary — low brightness maps
 * to "Move closer" (the practical fix a user would take either way).
 */
export function getLiveGuidance({ brightness = 0, glareRatio = 0, frameFillRatio = 0, edgeTouchScore = 0, isStable = false }) {
  if (glareRatio >= GLARE_RATIO_THRESHOLD || brightness >= BRIGHTNESS_BRIGHT_THRESHOLD) {
    return 'Too much glare';
  }
  if (brightness <= BRIGHTNESS_DARK_THRESHOLD) {
    return 'Move closer';
  }
  if (edgeTouchScore >= EDGE_TOUCH_THRESHOLD) {
    return 'Document is partially outside the frame';
  }
  if (frameFillRatio < FRAME_FILL_LOW_THRESHOLD) {
    return 'Move closer';
  }
  if (frameFillRatio < FRAME_FILL_GOOD_THRESHOLD) {
    return 'Document detected';
  }
  if (!isStable) {
    return 'Hold steady';
  }
  return 'Looks good';
}

export const SCANNER_HEURISTIC_THRESHOLDS = {
  BRIGHTNESS_DARK_THRESHOLD,
  BRIGHTNESS_BRIGHT_THRESHOLD,
  GLARE_RATIO_THRESHOLD,
  FRAME_FILL_LOW_THRESHOLD,
  FRAME_FILL_GOOD_THRESHOLD,
  EDGE_TOUCH_THRESHOLD,
};
