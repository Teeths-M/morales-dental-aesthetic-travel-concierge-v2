// ── Auto-learning price statistics ───────────────────────────────────────────
// Pure aggregation for the learned procedure estimates. Every firm DoctorQuote feeds
// a per-procedure × country sample set; the patient-facing estimate is the median and
// interquartile range — an AGGREGATE, never any single doctor's quote. Deterministic
// (AI may narrate a trend but never sets these numbers).

export const MAX_SAMPLES = 200;          // cap stored samples per procedure×country
export const MIN_SAMPLES_TO_SHOW = 3;    // below this, callers fall back to the catalog price

export interface PriceStats {
  sample_count: number;
  median_usd: number;
  p25_usd: number;
  p75_usd: number;
  min_usd: number;
  max_usd: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Append a new price sample (capped, FIFO) — pure. */
export function appendSample(existing: number[] | undefined, price: number): number[] {
  const clean = (existing || []).filter((n) => Number.isFinite(n) && n > 0);
  if (Number.isFinite(price) && price > 0) clean.push(price);
  return clean.slice(-MAX_SAMPLES);
}

/** Recompute stats from a sample set — pure. Outliers are trimmed via the IQR range. */
export function computeStats(samples: number[]): PriceStats {
  const clean = (samples || []).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  const round = (n: number) => Math.round(n);
  return {
    sample_count: clean.length,
    median_usd: round(percentile(clean, 0.5)),
    p25_usd: round(percentile(clean, 0.25)),
    p75_usd: round(percentile(clean, 0.75)),
    min_usd: clean.length ? round(clean[0]) : 0,
    max_usd: clean.length ? round(clean[clean.length - 1]) : 0,
  };
}

/** True once there are enough samples to trust the learned estimate over the catalog. */
export function hasEnoughSamples(count: number): boolean {
  return count >= MIN_SAMPLES_TO_SHOW;
}
