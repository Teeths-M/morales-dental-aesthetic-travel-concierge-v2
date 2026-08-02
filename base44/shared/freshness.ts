// ── Data-freshness core ───────────────────────────────────────────────────────
// Single source of truth for TTL rules and the human-review-queue write, shared
// by every freshness function (clinic gate, doctor re-check, visa, regulatory).
//
// CORE PRINCIPLE — FAIL-SAFE, NOT FAIL-SILENT.
// Cached data is only ever served as "confirmed" when it is provably within its
// TTL. When it is not, callers must either re-verify live or label it
// unconfirmed — never silently present stale data as current truth.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** How long a stored value may be treated as "current" before it must be re-verified. */
export const TTL_MS = {
  clinic_status: 24 * HOUR, // live-checked at booking; blocks if older
  doctor_license: 7 * DAY, // scheduled daily (US) / weekly (scrape)
  visa_rule: 7 * DAY, // weekly + on destination×nationality selection
  regulatory_rule: 30 * DAY, // monthly + daily change-detection
} as const;

export type FreshnessKind = keyof typeof TTL_MS;

/** True only if `timestamp` exists and is within `ttlMs` of now. Absent/invalid = not fresh. */
export function isFresh(timestamp: string | null | undefined, ttlMs: number): boolean {
  if (!timestamp) return false;
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ttlMs;
}

/** Milliseconds since `timestamp` (Infinity if absent/invalid). */
export function ageMs(timestamp: string | null | undefined): number {
  if (!timestamp) return Infinity;
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return Infinity;
  return Date.now() - t;
}

/** Compact status object callers can pass straight back to the client for display. */
export function freshnessState(kind: FreshnessKind, timestamp: string | null | undefined) {
  const ttl = TTL_MS[kind];
  const fresh = isFresh(timestamp, ttl);
  return {
    fresh,
    last_verified_at: timestamp || null,
    ttl_ms: ttl,
    // The UI shows "Last verified <date>" when fresh, and "Re-verifying…" when not.
    status: fresh ? 'confirmed' : (timestamp ? 'stale' : 'unverified'),
  };
}

// ── Human review queue ────────────────────────────────────────────────────────
// Every flagged change to safety-critical data lands in DataFreshnessReview and
// pings the admin/legal queue. Nothing here ever auto-publishes a change to what
// a user sees — a person confirms first (consistent with our safety-review pattern).

export type ReviewFlag = {
  subject_type: 'doctor_license' | 'clinic_status' | 'visa_rule' | 'regulatory_rule';
  subject_id?: string;
  subject_label: string;
  change_type:
    | 'suspected_revocation'
    | 'status_changed'
    | 'closed'
    | 'source_unavailable'
    | 'source_changed'
    | 'stale_no_reverification'
    | 'agent_proposed_operating';
  detail: string;
  detected_via: 'scheduled' | 'change_detection' | 'live_check';
  previous_value?: string;
  new_value?: string;
  severity?: 'info' | 'warning' | 'critical';
};

/**
 * Records a review flag (idempotent per open subject+change_type) and emails the
 * admin queue. Fully defensive: a failure here must never break the caller's
 * fail-safe decision — the block/suppress already happened before we log it.
 */
export async function flagForReview(base44: any, flag: ReviewFlag): Promise<void> {
  const nowISO = new Date().toISOString();
  try {
    // De-dupe: don't stack identical still-open flags for the same subject.
    const open = await base44.asServiceRole.entities.DataFreshnessReview.filter({
      subject_type: flag.subject_type,
      subject_id: flag.subject_id || '',
      change_type: flag.change_type,
      status: 'pending',
    }, '-detected_at', 1).catch(() => []);
    if (open && open.length > 0) {
      await base44.asServiceRole.entities.DataFreshnessReview.update(open[0].id, {
        detail: flag.detail,
        new_value: flag.new_value || open[0].new_value || '',
        last_seen_at: nowISO,
      }).catch(() => {});
      return;
    }

    await base44.asServiceRole.entities.DataFreshnessReview.create({
      subject_type: flag.subject_type,
      subject_id: flag.subject_id || '',
      subject_label: flag.subject_label,
      change_type: flag.change_type,
      detail: flag.detail,
      detected_via: flag.detected_via,
      previous_value: flag.previous_value || '',
      new_value: flag.new_value || '',
      severity: flag.severity || 'warning',
      status: 'pending',
      detected_at: nowISO,
      last_seen_at: nowISO,
    });

    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@moralesmedical.com';
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const sev = (flag.severity || 'warning').toUpperCase();
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `[${sev}] Data review needed — ${flag.subject_type.replace(/_/g, ' ')}: ${flag.subject_label}`,
      body: `<h2>Data-freshness review flag</h2>
<p><strong>What:</strong> ${flag.subject_label}</p>
<p><strong>Change:</strong> ${flag.change_type.replace(/_/g, ' ')} (${flag.detected_via.replace(/_/g, ' ')})</p>
<p><strong>Detail:</strong> ${flag.detail}</p>
${flag.previous_value ? `<p><strong>Was:</strong> ${flag.previous_value}<br/><strong>Now:</strong> ${flag.new_value || '—'}</p>` : ''}
<p>A person must confirm before anything changes for users. Review: ${appUrl}/admin/data-freshness</p>`,
    }).catch(() => {});
  } catch (_) {
    // Review logging must never affect the caller's fail-safe path.
  }
}
