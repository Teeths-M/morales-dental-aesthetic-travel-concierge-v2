// ── Malicious Action Blocker — enforcement middleware ───────────────────────
//
// The engine (violationEngine.ts) decides WHAT was detected. This decides what
// happens next: block, flag, log to the audit chain, notify admins.
//
// Read the safety carve-out below before changing anything in this file.

import { computePrevHash } from './auditHashChain.ts';
import { linkOnlyEmail } from './notify.ts';
import {
  detectViolations,
  BLOCK_MESSAGE,
  type ViolationScope,
  type ViolationResult,
} from './violationEngine.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
const BRAND = 'Morales Medical Travel Safety';

// ── The safety carve-out ────────────────────────────────────────────────────
// Decision (Portia, 2026-07-18), in her words: "I don't want to kill anyone."
//
// A flag restricts COMMERCIAL features only. It never restricts a safety path.
// Handshakes are the 9-point safety spine and checkStaleLiveLocations escalates
// on silence — locking a flagged patient out of check-ins would manufacture the
// exact signal meaning "this patient is in trouble" from someone who is fine,
// while leaving someone who IS in trouble unable to confirm anything.
//
// A person who tried to cheat us still gets rescued. This list is the
// mechanism; do not add a safety feature to RESTRICTABLE.

export const ALWAYS_OPEN_FEATURES = [
  'checkin',
  'handshake',
  'sos',
  'covert_sos',
  'emergency_contacts',
  'location_sharing',
  'emergency_vault',
  'guardian',
] as const;

export const RESTRICTABLE_FEATURES = [
  'booking',
  'quoting',
  'payment',
  'partner_messaging',
] as const;

export type Feature =
  | typeof ALWAYS_OPEN_FEATURES[number]
  | typeof RESTRICTABLE_FEATURES[number];

const ALWAYS_OPEN = new Set<string>(ALWAYS_OPEN_FEATURES);

/**
 * May this account use this feature right now?
 *
 * Safety features short-circuit to `true` BEFORE the flag is even read — the
 * answer cannot depend on flag state, a lookup succeeding, or the network.
 */
export async function featureAllowed(
  base44: any,
  userEmail: string,
  feature: Feature,
): Promise<{ allowed: boolean; tier?: string }> {
  // Checked first, deliberately. A failing flag lookup must never be able to
  // close a safety path.
  if (ALWAYS_OPEN.has(feature)) return { allowed: true };

  const flag = await getFlag(base44, userEmail);
  if (!flag) return { allowed: true };
  if (flag.cleared_at) return { allowed: true };
  if (flag.tier === 'warned') return { allowed: true };

  return { allowed: false, tier: flag.tier };
}

async function getFlag(base44: any, userEmail: string): Promise<any | null> {
  if (!userEmail) return null;
  const rows = await base44.asServiceRole.entities.AccountFlag
    .filter({ user_email: userEmail }, '-last_flagged_at', 1)
    .catch(() => []);
  return rows[0] ?? null;
}

/** Third strike moves an account from restricted to locked. */
const LOCK_THRESHOLD = 3;

export interface GuardOptions {
  scope: ViolationScope;
  userEmail: string;
  phone?: string;
  caseId?: string;
  /** Sender/function name, for a traceable audit row. */
  source: string;
}

export interface GuardOutcome {
  blocked: boolean;
  covertSos: boolean;
  /** Text safe to persist — contact details removed. */
  cleanText: string;
  message?: string;
  result: ViolationResult;
}

/**
 * Run text through the blocker and apply the consequences.
 *
 * Returns `blocked: true` when the caller must refuse the action. The caller
 * is responsible for not performing it — this function does not throw, because
 * a throw on a safety-adjacent path is how you lose a check-in.
 */
export async function guardText(
  base44: any,
  text: unknown,
  opts: GuardOptions,
): Promise<GuardOutcome> {
  const result = detectViolations(text, opts.scope);

  // ── Covert SOS: dispatch silently, block nothing, record nothing here ─────
  // The audit row is written by triggerCovertSOS itself. Writing a second,
  // differently-shaped record here risks it surfacing somewhere the attacker
  // can see. The message passes through untouched.
  if (result.covertSos) {
    base44.functions.invoke('triggerCovertSOS', {
      case_id: opts.caseId || null,
      trigger_method: 'text_scan',
    }).catch(() => {});
    return { blocked: false, covertSos: true, cleanText: result.cleanText, result };
  }

  if (result.severity === 'allow') {
    return { blocked: false, covertSos: false, cleanText: result.cleanText, result };
  }

  const now = new Date().toISOString();
  const incidents = result.detections.map((d) => ({
    code: d.code, label: d.label, scope: opts.scope, sample: d.sample, at: now,
  }));

  // A 'scrub' outcome is recorded but not escalated: a patient naming their own
  // cardiologist's office in their medical history is giving us clinical
  // context, not disintermediating. Only a 'block' raises the tier.
  const isBlock = result.severity === 'block';

  await Promise.allSettled([
    recordFlag(base44, opts, incidents, isBlock),
    writeAudit(base44, opts, result, isBlock, now),
    isBlock ? notifyAdmins(base44, opts, result) : Promise.resolve(),
  ]);

  return {
    blocked: isBlock,
    covertSos: false,
    cleanText: result.cleanText,
    message: isBlock ? BLOCK_MESSAGE : undefined,
    result,
  };
}

async function recordFlag(base44: any, opts: GuardOptions, incidents: any[], isBlock: boolean) {
  const now = new Date().toISOString();
  const existing = await getFlag(base44, opts.userEmail);

  if (!existing) {
    return base44.asServiceRole.entities.AccountFlag.create({
      user_email: opts.userEmail,
      phone: opts.phone || '',
      tier: isBlock ? 'restricted' : 'warned',
      safety_paths_open: true,      // always, at every tier
      incidents,
      incident_count: incidents.length,
      first_flagged_at: now,
      last_flagged_at: now,
    });
  }

  const count = (existing.incident_count || 0) + incidents.length;
  // Escalation only ever goes up, and only a human clears it.
  const tier = !isBlock ? existing.tier
    : count >= LOCK_THRESHOLD ? 'locked'
      : existing.tier === 'locked' ? 'locked' : 'restricted';

  return base44.asServiceRole.entities.AccountFlag.update(existing.id, {
    tier,
    phone: existing.phone || opts.phone || '',
    safety_paths_open: true,
    incidents: [...(existing.incidents || []), ...incidents],
    incident_count: count,
    last_flagged_at: now,
    cleared_at: null,             // a new incident reopens a cleared flag
    cleared_by: '',
  });
}

async function writeAudit(base44: any, opts: GuardOptions, result: ViolationResult, isBlock: boolean, now: string) {
  const prevHash = await computePrevHash(base44).catch(() => '');
  return base44.asServiceRole.entities.AuditLog.create({
    event_type: isBlock ? 'malicious_action_blocked' : 'violation_scrubbed',
    actor_id: 'system', actor_role: 'system', actor_name: 'Morales Blocker',
    resource_type: 'AccountFlag', resource_id: opts.userEmail,
    case_id: opts.caseId || '',
    details: {
      source: opts.source,
      scope: opts.scope,
      // Digit-masked by the engine. The audit chain is queryable, and a leak we
      // recorded is still a leak.
      detections: result.detections.map((d) => ({ code: d.code, sample: d.sample })),
    },
    sensitive: true,
    timestamp: now,
    prev_hash: prevHash,
  }).catch(() => {});
}

async function notifyAdmins(base44: any, opts: GuardOptions, result: ViolationResult) {
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (!adminEmail) return;
  const codes = [...new Set(result.detections.map((d) => d.code))].join(', ');
  return base44.asServiceRole.integrations.Core.SendEmail({
    from_name: BRAND, to: adminEmail,
    subject: `Blocked action needs review | ${BRAND}`,
    body: linkOnlyEmail({
      from: 'blocker/adminNotify',
      title: 'An action was blocked and an account flagged.',
      // Codes only — no user identity, no matched text. Admin alerts are
      // subject to the same comms policy as everything else.
      line: `Detection type: ${codes}. Open the admin console to review the account and decide whether to clear it.`,
      ctaLabel: 'Review In Console',
      ctaUrl: `${APP_URL}/admin/flags`,
    }),
  }).catch(() => {});
}
