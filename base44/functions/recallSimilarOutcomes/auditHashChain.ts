// DUPLICATED from base44/functions/_shared/auditHashChain.ts — see createHandler.ts in this
// same directory for why. Keep in sync by hand.

// Shared hash-chain helper for AuditLog writes that don't go through logAuditEvent
// (automation/system-triggered writes with no authenticated user session, which
// logAuditEvent's requireAuth:true would reject). Computes the same real
// SHA-256(prev entry) link that logAuditEvent uses, instead of a hardcoded
// placeholder or an omitted field — keeps the tamper-detection chain unbroken.
export async function computePrevHash(base44: {
  asServiceRole: { entities: { AuditLog: { list: (sort: string, limit: number) => Promise<unknown[]> } } };
}): Promise<string> {
  try {
    const lastEntries = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    if (lastEntries?.length > 0) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(lastEntries[0])));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'GENESIS';
  } catch (_) {
    return 'GENESIS_FALLBACK';
  }
}
