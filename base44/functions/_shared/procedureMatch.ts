// ── Procedure-match verification engine ─────────────────────────────────────────
// The ONLY thing allowed to decide whether a doctor's confirmed-complete
// procedure(s) match what was actually booked. Pure, deterministic set
// comparison — no LLM, no network, no randomness. Same inputs always produce
// the same status, and it can be replayed/audited.
//
// An LLM may only ever narrate a status this engine has already reached
// (see logProcedureComplete/entry.ts) — never decide or change it.

export type ProcedureMatchStatus = 'not_checked' | 'matched' | 'partial_match' | 'mismatch_flagged';

export interface ProcedureMatchResult {
  status: ProcedureMatchStatus;
  /** Confirmed by the doctor but not on the original booking. */
  extra: string[];
  /** Booked but not confirmed by the doctor. */
  missing: string[];
  /** Deterministic, always-present plain-English sentence. */
  explanation: string;
}

function normalize(name: string): string {
  return (name || '').trim().toLowerCase();
}

export function computeProcedureMatch(
  booked?: string[] | null,
  confirmed?: string[] | null,
): ProcedureMatchResult {
  const bookedList = Array.isArray(booked) ? booked.filter(Boolean) : [];
  const confirmedList = Array.isArray(confirmed) ? confirmed.filter(Boolean) : [];

  if (confirmedList.length === 0) {
    return {
      status: 'not_checked',
      extra: [],
      missing: [],
      explanation: 'The doctor has not yet confirmed which procedures were performed.',
    };
  }

  const bookedSet = new Set(bookedList.map(normalize));
  const confirmedSet = new Set(confirmedList.map(normalize));

  const extra = confirmedList.filter((p) => !bookedSet.has(normalize(p)));
  const missing = bookedList.filter((p) => !confirmedSet.has(normalize(p)));

  if (extra.length === 0 && missing.length === 0) {
    return {
      status: 'matched',
      extra: [],
      missing: [],
      explanation: `The doctor confirmed exactly what was booked: ${bookedList.join(', ')}.`,
    };
  }

  if (extra.length === 0 && missing.length > 0) {
    return {
      status: 'partial_match',
      extra: [],
      missing,
      explanation: `The doctor confirmed fewer procedures than booked (not confirmed: ${missing.join(', ')}) — this is common for staged treatment plans and is not itself a problem.`,
    };
  }

  return {
    status: 'mismatch_flagged',
    extra,
    missing,
    explanation: `The doctor confirmed procedure(s) not on the original booking (${extra.join(', ')}). Flagged for human review. This does not block the case from moving to recovery.`,
  };
}
