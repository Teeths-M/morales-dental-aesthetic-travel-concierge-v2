// trustScanAudit.ts — writes tamper-evident, hash-chained AuditLog entries
// for TrustScan access events (consent recorded, inquiry created/completed,
// evidence accessed, profile viewed, review created/decided, credential
// recheck failed, booking suspended/cleared, consent revoked, manual review
// requested, fraud signal recorded). Consolidates the VerificationAuditLog
// requirement INTO the existing AuditLog hash chain rather than duplicating
// it as a parallel ledger.
//
// Takes the service-role client (base44.asServiceRole), so it works from both
// signed-in functions and webhook handlers.

import { computePrevHash } from './auditHashChain.ts';

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
  // Link to the previous entry the same way every other audit write does,
  // and the way verifyAuditChain checks it: a hash of that entry as stored.
  const prevHash = await computePrevHash({ asServiceRole: base44 });

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