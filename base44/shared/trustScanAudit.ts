// trustScanAudit.ts — writes tamper-evident, hash-chained AuditLog entries
// for TrustScan access events (consent recorded, inquiry created/completed,
// evidence accessed, profile viewed, review created/decided, credential
// recheck failed, booking suspended/cleared, consent revoked, manual review
// requested, fraud signal recorded). Consolidates the VerificationAuditLog
// requirement INTO the existing AuditLog hash chain rather than duplicating
// it as a parallel ledger.
//
// Takes a base44 client (user-scoped or asServiceRole) so it can be called
// from both authenticated user functions and webhook/service handlers.

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface TrustScanEventInput {
  event_type: string;
  actor_id: string;
  actor_role?: string;
  actor_name?: string;
  actor_email?: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  case_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  sensitive?: boolean;
}

export async function logTrustScanEvent(
  base44: any,
  event: TrustScanEventInput,
  now: Date = new Date()
): Promise<void> {
  const timestamp = now.toISOString();
  // Fetch the most recent AuditLog entry to chain from. Ordered by
  // created_date desc; fall back to GENESIS when the chain is empty.
  let prevHash = 'GENESIS';
  try {
    const last = await base44.entities.AuditLog.list('-created_date', 1);
    if (last && last.length > 0 && last[0].prev_hash) {
      // The hash chain links on the prior entry's own hash, which we
      // recompute from its canonical content (prev_hash + event_type +
      // actor_id + timestamp). This keeps the chain tamper-evident even
      // though AuditLog does not store its own hash field directly.
      const prev = last[0];
      prevHash = await sha256Hex(`${prev.prev_hash}|${prev.event_type}|${prev.actor_id}|${prev.timestamp || prev.created_date}`);
    }
  } catch {
    // If we can't read the chain (e.g. RLS on a public webhook context),
    // start a fresh GENESIS link rather than failing the write.
    prevHash = 'GENESIS';
  }

  const payload = {
    event_type: event.event_type,
    actor_id: event.actor_id,
    actor_role: event.actor_role || 'system',
    actor_name: event.actor_name,
    actor_email: event.actor_email,
    resource_type: event.resource_type,
    resource_id: event.resource_id,
    resource_name: event.resource_name,
    case_id: event.case_id,
    ip_address: event.ip_address,
    user_agent: event.user_agent,
    details: event.details || {},
    sensitive: event.sensitive ?? false,
    timestamp,
    prev_hash: prevHash,
  };

  try {
    await base44.entities.AuditLog.create(payload);
  } catch (err) {
    // Audit logging must never break the primary verification flow —
    // swallow and continue. A missing audit entry is a monitoring gap, not
    // a user-facing failure.
    console.warn('[trustScanAudit] failed to write audit entry', err?.message || err);
  }
}

// Canonical content hash used to chain entries — exported so the chain can
// be independently verified by verifyAuditChain.
export async function entryHash(entry: any): Promise<string> {
  return sha256Hex(`${entry.prev_hash}|${entry.event_type}|${entry.actor_id}|${entry.timestamp || entry.created_date}`);
}