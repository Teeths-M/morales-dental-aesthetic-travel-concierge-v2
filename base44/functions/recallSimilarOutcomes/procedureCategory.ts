// DUPLICATED from base44/functions/_shared/procedureCategory.ts — see createHandler.ts in this
// same directory for why. Keep in sync by hand.

// ── Procedure category classifier ──────────────────────────────────────────────
// Extracted from the two near-identical copies that used to live inline in
// schedulePostOpMedReminders/entry.ts and sendPostOpInstructions/entry.ts.
// Pure keyword classifier — no LLM, no network. Deliberately coarse (3 buckets):
// good enough to pick a default care template and to tag memory-bank entries,
// not a clinical taxonomy.

export type ProcedureCategory = 'dental' | 'aesthetic' | 'general';

export function classifyProcedureCategory(procedureName?: string | null): ProcedureCategory {
  const lower = (procedureName || '').toLowerCase();
  if (
    lower.includes('dental') || lower.includes('implant') || lower.includes('crown') ||
    lower.includes('veneer') || lower.includes('teeth') || lower.includes('tooth') ||
    lower.includes('oral') || lower.includes('jaw')
  ) return 'dental';
  if (
    lower.includes('lipo') || lower.includes('rhinoplasty') || lower.includes('facelift') ||
    lower.includes('bbl') || lower.includes('augment') || lower.includes('tummy') ||
    lower.includes('aesthetic') || lower.includes('cosmetic') || lower.includes('breast')
  ) return 'aesthetic';
  return 'general';
}
