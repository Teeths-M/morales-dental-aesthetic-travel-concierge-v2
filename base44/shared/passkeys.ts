/**
 * passkeys — M-Care's Face ID / fingerprint lock, checked on the server.
 *
 * A passkey is a key pair the phone makes in its secure chip. The private half never leaves the phone; M-Care only
 * stores the public half (PasskeyCredential) and checks signatures with it. Every check works the same way:
 *   1. the server issues a one-time random challenge (PasskeyChallenge), bound to one traveler, one purpose and,
 *      for a step-up, one action;
 *   2. the phone asks for Face ID or a fingerprint and signs the challenge;
 *   3. the server checks the signature once, within 3 minutes, and burns the challenge whether it passed or not.
 *
 * requireFreshPasskey() is what a function calls before an action that switches help off or shares a private file.
 * A traveler with no lock is never asked; a traveler with a lock must pass a fresh check made for that exact action.
 * If the lock can't be checked (the database is down), the action is refused: switching help off can wait, help
 * can't.
 *
 * What this can and can't stop, honestly: these checks guard the actions that only M-Care's own server functions
 * can do. Base44 can't cancel a copied sign-in key, so someone holding one can still read what the account can read
 * through Base44 directly. The lock screen stops a person holding the phone; these checks stop that person, or anyone
 * with the key, from turning help off, changing who is told in an emergency, or sharing passport files.
 */
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from 'npm:@simplewebauthn/server@13.3.3';
import {
  allowedOrigins, CHALLENGE_TTL_MS, challengeProblem, cleanDeviceLabel, counterAcceptable, fromBase64Url, rpFor,
  toBase64Url, type StepUpAction,
} from './passkeyRules.ts';
import { computePrevHash } from './auditHashChain.ts';
import { linkOnlyEmail } from './notify.ts';

const RP_NAME = 'M-Care';

export const emailOf = (user: any): string => String(user?.email || '').trim().toLowerCase();

function origins(): string[] {
  return allowedOrigins({ PASSKEY_ORIGINS: Deno.env.get('PASSKEY_ORIGINS'), APP_URL: Deno.env.get('APP_URL') });
}

/** The traveler's active passkeys. Throws if the lookup fails, so callers can refuse rather than skip the lock. */
export async function activePasskeys(base44: any, email: string): Promise<any[]> {
  if (!email) return [];
  const rows = await base44.asServiceRole.entities.PasskeyCredential
    .filter({ user_email: email, status: 'active' }, '-created_date', 20);
  return Array.isArray(rows) ? rows : [];
}

export const publicDevice = (c: any) => ({
  id: c.id,
  device_label: c.device_label || 'This phone',
  created_at: c.created_at || c.created_date || null,
  last_used_at: c.last_used_at || null,
  backed_up: !!c.backed_up,
});

async function issueChallenge(base44: any, email: string, purpose: 'register' | 'unlock' | 'step_up',
  rp: { origin: string; rpID: string }, challenge: string, action: string | null) {
  return base44.asServiceRole.entities.PasskeyChallenge.create({
    user_email: email,
    challenge,
    purpose,
    action,
    rp_id: rp.rpID,
    origin: rp.origin,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  });
}

/** Reads a challenge and burns it on the first attempt by its own traveler, pass or fail. */
async function takeChallenge(base44: any, challengeId: unknown, want: {
  user_email: string; purpose: 'register' | 'unlock' | 'step_up'; action?: string | null;
}) {
  const row = typeof challengeId === 'string' && challengeId
    ? await base44.asServiceRole.entities.PasskeyChallenge.get(challengeId).catch(() => null)
    : null;
  const problem = challengeProblem(row, want);
  if (row && !row.used_at && problem !== 'wrong_user') {
    await base44.asServiceRole.entities.PasskeyChallenge.update(row.id, { used_at: new Date().toISOString() });
  }
  return { row, problem };
}

// ── Setting up a passkey ──────────────────────────────────────────────────────

export async function beginRegistration(base44: any, user: any, origin: unknown) {
  const email = emailOf(user);
  const rp = rpFor(origin, origins());
  if (!rp) return { ok: false as const, code: 'not_available_here' };
  const existing = await activePasskeys(base44, email);
  const userKey = new TextEncoder().encode(String(user?.id || email)).slice(0, 64);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rp.rpID,
    userName: email,
    userID: userKey,
    userDisplayName: user?.full_name || email,
    attestationType: 'none',
    excludeCredentials: existing
      .filter((c) => c.rp_id === rp.rpID)
      .map((c) => ({ id: c.credential_id, transports: c.transports || undefined })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
    supportedAlgorithmIDs: [-7, -257],
  });
  const row = await issueChallenge(base44, email, 'register', rp, options.challenge, null);
  return { ok: true as const, challenge_id: row.id, options };
}

export async function finishRegistration(base44: any, user: any, input: {
  challenge_id: unknown; response: any; device_label?: unknown;
}) {
  const email = emailOf(user);
  const { row, problem } = await takeChallenge(base44, input.challenge_id, { user_email: email, purpose: 'register' });
  if (problem) return { ok: false as const, code: `challenge_${problem}` };

  let verification: any;
  try {
    verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: row.challenge,
      expectedOrigin: row.origin,
      expectedRPID: row.rp_id,
      requireUserVerification: true,
    });
  } catch (e) {
    console.warn('[passkeys] registration not verified:', (e as Error)?.message);
    return { ok: false as const, code: 'not_verified' };
  }
  if (!verification?.verified || !verification.registrationInfo) return { ok: false as const, code: 'not_verified' };

  const info = verification.registrationInfo;
  const existing = await activePasskeys(base44, email);
  const now = new Date().toISOString();
  const record = {
    user_email: email,
    user_id: user?.id || '',
    credential_id: info.credential.id,
    public_key: toBase64Url(info.credential.publicKey),
    counter: info.credential.counter || 0,
    transports: info.credential.transports || [],
    rp_id: row.rp_id,
    device_label: cleanDeviceLabel(input.device_label),
    backed_up: !!info.credentialBackedUp,
    status: 'active',
    created_at: now,
    last_used_at: now,
  };
  const same = existing.find((c) => c.credential_id === record.credential_id);
  const saved = same
    ? await base44.asServiceRole.entities.PasskeyCredential.update(same.id, record)
    : await base44.asServiceRole.entities.PasskeyCredential.create(record);
  return { ok: true as const, device: publicDevice({ ...record, ...(saved || {}), id: saved?.id || same?.id }), first: existing.length === 0 };
}

// ── Checking a passkey (unlocking, or a step-up before a big action) ─────────

export async function beginAuthentication(base44: any, user: any, origin: unknown,
  purpose: 'unlock' | 'step_up', action: StepUpAction | null) {
  const email = emailOf(user);
  const rp = rpFor(origin, origins());
  if (!rp) return { ok: false as const, code: 'not_available_here' };
  const creds = await activePasskeys(base44, email);
  if (!creds.length) return { ok: true as const, enrolled: false };
  const here = creds.filter((c) => c.rp_id === rp.rpID);
  if (!here.length) return { ok: false as const, code: 'made_on_another_address' };
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    allowCredentials: here.map((c) => ({ id: c.credential_id, transports: c.transports || undefined })),
    userVerification: 'required',
  });
  const row = await issueChallenge(base44, email, purpose, rp, options.challenge, purpose === 'step_up' ? action : null);
  return { ok: true as const, enrolled: true, challenge_id: row.id, options };
}

export async function verifyPasskeyAssertion(base44: any, user: any, input: { challenge_id: unknown; response: any },
  want: { purpose: 'unlock' | 'step_up'; action?: StepUpAction | null }, knownCreds?: any[]) {
  const email = emailOf(user);
  const { row, problem } = await takeChallenge(base44, input.challenge_id, { user_email: email, ...want });
  if (problem) return { ok: false as const, code: `challenge_${problem}` };

  const creds = knownCreds || await activePasskeys(base44, email);
  const responseId = typeof input.response?.id === 'string' ? input.response.id : '';
  const cred = creds.find((c) => c.credential_id === responseId && c.rp_id === row.rp_id);
  if (!cred) return { ok: false as const, code: 'unknown_passkey' };

  let verification: any;
  try {
    verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: row.challenge,
      expectedOrigin: row.origin,
      expectedRPID: row.rp_id,
      credential: {
        id: cred.credential_id,
        publicKey: fromBase64Url(cred.public_key),
        counter: Number(cred.counter) || 0,
        transports: cred.transports || undefined,
      },
      requireUserVerification: true,
    });
  } catch (e) {
    console.warn('[passkeys] check not verified:', (e as Error)?.message);
    return { ok: false as const, code: 'not_verified' };
  }
  if (!verification?.verified) return { ok: false as const, code: 'not_verified' };
  const newCounter = verification.authenticationInfo?.newCounter ?? 0;
  if (!counterAcceptable(cred.counter, newCounter)) return { ok: false as const, code: 'counter_went_back' };

  await base44.asServiceRole.entities.PasskeyCredential.update(cred.id, {
    counter: newCounter,
    last_used_at: new Date().toISOString(),
  }).catch(() => {});
  return { ok: true as const, credential: cred };
}

const faceCheckRequired = (action: StepUpAction) => Response.json({
  error: 'Confirm with Face ID or your fingerprint to do this.',
  code: 'face_check_required',
  action,
}, { status: 428 });

/**
 * The gate for an action that switches help off or shares a private file. A traveler with no lock passes straight
 * through. A traveler with a lock needs `stepUp` ({ challenge_id, response }) from a fresh check for this action.
 */
export async function requireFreshPasskey(base44: any, user: any, action: StepUpAction, stepUp: unknown):
  Promise<{ ok: true; enrolled: boolean } | { ok: false; response: Response }> {
  const email = emailOf(user);
  let creds: any[];
  try {
    creds = await activePasskeys(base44, email);
  } catch (e) {
    console.error('[passkeys] lock lookup failed; refusing the action:', (e as Error)?.message);
    return {
      ok: false,
      response: Response.json({
        error: "We couldn't check your Face ID lock just now, so nothing was changed. Try again in a moment.",
        code: 'face_check_unavailable',
      }, { status: 503 }),
    };
  }
  if (!creds.length) return { ok: true, enrolled: false };

  const s = stepUp as any;
  if (!s || typeof s !== 'object' || typeof s.challenge_id !== 'string' || !s.response) {
    return { ok: false, response: faceCheckRequired(action) };
  }
  const result = await verifyPasskeyAssertion(base44, user, s, { purpose: 'step_up', action }, creds);
  if (!result.ok) {
    return {
      ok: false,
      response: Response.json({
        error: "That Face ID or fingerprint check didn't go through, so nothing was changed.",
        code: 'face_check_failed',
        action,
      }, { status: 403 }),
    };
  }
  return { ok: true, enrolled: true };
}

// ── Records and the owner's security email ────────────────────────────────────

export type LockEvent =
  | 'phone_lock_enabled' | 'phone_lock_device_added' | 'phone_lock_device_removed'
  | 'phone_lock_disabled' | 'phone_lock_reset';

const EMAIL_COPY: Record<LockEvent, { title: string; line: string }> = {
  phone_lock_enabled: {
    title: 'The Face ID lock was turned on',
    line: "Your M-Care account now locks with Face ID or a fingerprint. If you did this, there's nothing to do. If you didn't, open your settings now and ask M-Care to connect you with our care team.",
  },
  phone_lock_device_added: {
    title: 'A phone was added to your Face ID lock',
    line: "Another phone or passkey can now unlock your M-Care account. If you did this, there's nothing to do. If you didn't, open your settings now and ask M-Care to connect you with our care team.",
  },
  phone_lock_device_removed: {
    title: 'A phone was removed from your Face ID lock',
    line: "A phone or passkey can no longer unlock your M-Care account. If you did this, there's nothing to do. If you didn't, open your settings now and ask M-Care to connect you with our care team.",
  },
  phone_lock_disabled: {
    title: 'The Face ID lock was turned off',
    line: "Your M-Care account no longer locks with Face ID or a fingerprint. If you did this, there's nothing to do. If you didn't, open your settings now and ask M-Care to connect you with our care team.",
  },
  phone_lock_reset: {
    title: 'Our care team reset your Face ID lock',
    line: 'At your request, our care team removed the Face ID lock from your M-Care account. You can turn it on again in your settings. If you did not ask for this, ask M-Care to connect you with our care team now.',
  },
};

export async function recordLockEvent(base44: any, actor: any, subjectEmail: string, event: LockEvent,
  details: Record<string, unknown> = {}) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: event,
      actor_id: actor?.id || actor?.email || 'system',
      actor_role: actor?.role || 'client',
      actor_name: actor?.full_name || '',
      actor_email: actor?.email || '',
      resource_type: 'PasskeyCredential',
      resource_id: subjectEmail,
      resource_name: subjectEmail,
      case_id: null,
      details,
      sensitive: true,
      timestamp: new Date().toISOString(),
      prev_hash: await computePrevHash(base44),
    });
  } catch (e) {
    console.error('[passkeys] audit entry failed:', (e as Error)?.message);
  }

  const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
  if (!subjectEmail || !appUrl) {
    if (!appUrl) console.error('[passkeys] APP_URL is not set, so the security email was not sent.');
    return;
  }
  try {
    const copy = EMAIL_COPY[event];
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: subjectEmail,
      subject: copy.title,
      body: linkOnlyEmail({
        title: copy.title,
        line: copy.line,
        ctaUrl: `${appUrl}/dashboard/settings`,
        ctaLabel: 'Open my settings',
        from: 'passkeys',
      }),
    });
  } catch (e) {
    console.error('[passkeys] security email failed:', (e as Error)?.message);
  }
}

/** Removes passkeys (soft: status removed, kept for the record). */
export async function removePasskeys(base44: any, creds: any[], reason: string) {
  const now = new Date().toISOString();
  for (const c of creds) {
    await base44.asServiceRole.entities.PasskeyCredential.update(c.id, {
      status: 'removed', removed_at: now, removed_reason: reason,
    });
  }
}
