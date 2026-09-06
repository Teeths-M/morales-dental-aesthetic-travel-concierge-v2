/**
 * getCovertSosEvidence
 *
 * Public, token-gated resolver for a CovertSosEvidence row (a rear-camera
 * photo captured as a covert-SOS follow-up — see attachCovertSosEvidence).
 * No login required: whoever received the alert (guardian, admin, security
 * agency) must be able to open the link directly. Mirrors accessShareLink's
 * resolve -> atomic-increment -> sign -> audit shape, minus the vault/
 * decryption-specific fields (this is a plain JPEG, not an encrypted
 * document).
 *
 * The signed URL is generated fresh, right here, at the moment the link is
 * actually opened — file_uri (the long-lived Base44 storage reference) is
 * never itself exposed to the client, and a signed URL is never persisted,
 * since Core.CreateFileSignedUrl URLs are deliberately short-lived (this
 * codebase's own convention, 60-300s) and would already be dead by the time
 * an SMS/email recipient opened them if minted any earlier.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

Deno.serve(createHandler(async ({ base44, req, body }) => {
  const { token } = await body();
  if (!token) return err('token is required');

  const now = new Date();

  const rows = await base44.asServiceRole.entities.CovertSosEvidence.filter({ token, is_active: true });
  if (!rows?.length) return err('This link is invalid or has expired.', 404);

  const evidence = rows[0];

  if (new Date(evidence.expires_at) < now) {
    return err('This link has expired.', 410);
  }

  // Atomic conditional increment BEFORE minting the signed URL — same race
  // fix accessShareLink/entry.ts already applies: two simultaneous opens
  // against the same document must never both slip through a stale
  // access_count read.
  const incrementResult = await base44.asServiceRole.entities.CovertSosEvidence.updateMany(
    { token, is_active: true, access_count: { $lt: evidence.max_access_count } },
    { $set: { last_accessed_at: now.toISOString(), last_accessed_ip: clientIp(req) }, $inc: { access_count: 1 } },
  );
  if (!incrementResult?.updated) {
    return err('This link has reached its maximum number of views.', 410);
  }

  let signed_url: string | null = null;
  try {
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: evidence.file_uri,
      expires_in: 300,
    });
    signed_url = signed?.signed_url || null;
  } catch (_) {
    return err('Could not load the photo right now. Please try again shortly.', 502);
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'covert_sos_evidence_accessed',
    actor_id: 'sos_evidence_' + token,
    actor_role: 'external_recipient',
    resource_id: evidence.id,
    case_id: evidence.case_id || '',
    details: { token, ip_address: clientIp(req) },
    sensitive: true,
    timestamp: now.toISOString(),
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    signed_url,
    patient_name: evidence.patient_name || '',
    captured_at: evidence.captured_at || '',
    accesses_remaining: Math.max(0, evidence.max_access_count - (evidence.access_count + 1)),
  });
}, { name: 'getCovertSosEvidence', requireAuth: false }));

function clientIp(req: Request): string {
  const f = req.headers.get('x-forwarded-for');
  return f ? f.split(',').pop()?.trim() || 'unknown' : req.headers.get('cf-connecting-ip') || 'unknown';
}
