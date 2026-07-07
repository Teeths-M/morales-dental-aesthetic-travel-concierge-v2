/**
 * fuzzyMatch — shared fuzzy scorer, extracted from three near-identical
 * private copies (src/pages/Discover.jsx, src/pages/Providers.jsx,
 * src/pages/PartnerDirectory.jsx). Based on Providers.jsx's version, the
 * most complete of the three (exact/substring → word-boundary →
 * character-overlap → subsequence scoring). Those three pages are left on
 * their own private copies for now — only new call sites use this module.
 *
 * Exists so a typo or misspelling still surfaces the right option instead
 * of forcing the user to type it exactly right (per this app's own rule:
 * "Can't spell my name but I can book on M").
 */

/** Returns a 0-100 match score between a user's query and a candidate string. */
export function fuzzyScore(query, target) {
  if (!query || !target) return 0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (!q || !t) return 0;

  // Exact / substring
  if (t === q) return 100;
  if (t.includes(q)) return 95;
  if (q.includes(t)) return 90;

  // Word-boundary: check individual words in the target (e.g. "Venezuela"
  // inside "Clinic Venezuela City" gets checked directly against the query)
  const words = t.split(/[\s,._-]+/);
  for (const w of words) {
    if (!w) continue;
    if (w === q) return 88;
    if (w.startsWith(q) || q.startsWith(w)) return 80;
  }

  // Character-set overlap (anagram-aware, handles missing/extra letters)
  const tChars = [...t];
  let charMatches = 0;
  for (const c of q) {
    const idx = tChars.indexOf(c);
    if (idx !== -1) { charMatches++; tChars.splice(idx, 1); }
  }
  const charScore = Math.round((charMatches / Math.max(q.length, t.length)) * 80);

  // Subsequence: all query chars found in order inside target
  let matched = 0, ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    while (ti < t.length && t[ti] !== q[qi]) ti++;
    if (ti < t.length) { matched++; ti++; }
  }
  const seqScore = Math.round((matched / q.length) * 80);

  return Math.max(charScore, seqScore);
}

/** True if `target` is a plausible match for `query` at the given threshold. */
export function fuzzyMatches(query, target, threshold = 45) {
  return fuzzyScore(query, target) >= threshold;
}

/**
 * Filters + ranks a list of {value, label} options by fuzzy match against
 * `query`, best matches first. Returns the full list (unsorted) if `query`
 * is empty — callers decide whether to cap/paginate an empty-query result.
 */
export function fuzzyFilterOptions(options, query, threshold = 45) {
  if (!query || !query.trim()) return options;
  return options
    .map((opt) => ({ opt, score: fuzzyScore(query, opt.label) }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(({ opt }) => opt);
}
