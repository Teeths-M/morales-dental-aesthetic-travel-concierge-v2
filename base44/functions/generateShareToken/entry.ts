import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * generateShareToken
 *
 * Creates a public, read-only share token for the Recovery Status Widget.
 * The token encodes case_id + expiry + a random nonce (prevents enumeration).
 * No personal medical data is exposed — only: name, HS progress, journey phase, wellbeing status.
 *
 * The resulting URL: /track/[token] can be shared by patients with friends and family.
 * No login required for viewers. This is the viral acquisition channel.
 */

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, expires_days = 30 } = await body();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  // Only the patient or admin can generate their own share token
  if (user?.role !== 'admin' && user?.role !== 'platform_admin' && caseRecord.client_email !== user?.email) {
    return err('Unauthorized', 403);
  }

  // Generate a cryptographically random nonce (prevents enumeration)
  const nonce  = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
  const expiry = Date.now() + expires_days * 86_400_000;

  const payload = {
    case_id,
    nonce,
    expires_at: expiry,
    type: 'recovery_tracker',
  };

  const token = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))));
  const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
  const shareUrl = `${APP_URL}/track/${token}`;

  // Store the token on CaseRecord for reference
  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    share_token:      token,
    share_token_exp:  new Date(expiry).toISOString(),
  }).catch(() => {});

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'share_token_generated', actor_id: user?.id || 'system',
    actor_role: user?.role || 'system', resource_type: 'CaseRecord', resource_id: case_id,
    case_id, sensitive: false, timestamp: new Date().toISOString(),
    details: { expires_days, share_url: shareUrl },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ token, share_url: shareUrl, expires_at: new Date(expiry).toISOString() });
}, { name: 'generateShareToken', requireAuth: true }));
