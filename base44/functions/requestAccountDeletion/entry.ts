import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';

/**
 * requestAccountDeletion — the web-accessible deletion request path (Google
 * Play requires this alongside in-app deletion for apps that allow in-app
 * account creation, reachable without opening the app).
 *
 * Public by design, so it does NOT execute deletion itself — it files a
 * request into an admin-only queue for staff to action via the (now-fixed)
 * deletePatientData. Deliberately sends no confirmation email to the
 * submitted address: it's unverified and self-reported, so emailing it
 * "your account will be deleted" would itself be an abuse/harassment vector
 * against a third party's real address.
 */

function sanitize(v: unknown, max = 2000): string {
  if (typeof v !== 'string') return '';
  return v.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim().slice(0, max);
}

async function checkRateLimit(base44: any, key: string, windowSeconds: number, maxRequests: number) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ bucket_key: key }, '-created_date', 1).catch(() => []);
  const bucket = buckets?.[0];
  if (!bucket) {
    await base44.asServiceRole.entities.RateLimitBucket.create({ bucket_key: key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString() }).catch(() => {});
    return true;
  }
  if (new Date(bucket.window_start) < windowStart) {
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { window_start: now.toISOString(), count: 1, updated_at: now.toISOString() }).catch(() => {});
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: bucket.count + 1, updated_at: now.toISOString() }).catch(() => {});
  return true;
}

Deno.serve(createHandler(async ({ req, base44, body }) => {
  const raw = await body<Record<string, string>>();
  const email = sanitize(raw.email, 254).toLowerCase();
  const reason = sanitize(raw.reason, 2000);

  if (!email || !email.includes('@')) {
    return err('A valid email is required.');
  }

  const ip = (req.headers.get('CF-Connecting-IP')
    || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown').trim();

  const ipOk = await checkRateLimit(base44, `acct_del_req_ip_${ip}`, 3600, 5);
  const emailOk = await checkRateLimit(base44, `acct_del_req_email_${email}`, 3600, 3);
  if (!ipOk || !emailOk) {
    return err('Too many requests. Please try again later.', 429);
  }

  const submittedAt = new Date().toISOString();

  await base44.asServiceRole.entities.AccountDeletionRequest.create({
    email, reason, status: 'pending', source_ip: ip, submitted_at: submittedAt,
  });

  // No authenticated session exists for a public request — use the direct
  // hash-chain helper (same pattern reviewAccountFlag uses) rather than
  // logAuditEvent, which requires auth.
  const prevHash = await computePrevHash(base44).catch(() => '');
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'account_deletion_requested',
    actor_id: '', actor_role: 'public', actor_email: email,
    resource_type: 'AccountDeletionRequest',
    details: { source_ip: ip },
    sensitive: true,
    timestamp: submittedAt,
    prev_hash: prevHash,
  }).catch(() => {});

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `Account deletion requested: ${email}`,
      body: `<h2>Web-form account deletion request</h2>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Reason:</strong><br/>${reason ? reason.replace(/\n/g, '<br/>') : '(none provided)'}</p>
<p>Review in the admin data table (AccountDeletionRequest), verify identity, then run deletePatientData for this email.</p>`,
    }).catch(() => {});
  }

  return ok({ received: true });
// Already rate-limited inline above via RateLimitBucket — rateLimit:false here
// avoids silently double-limiting through two independent mechanisms.
}, { name: 'requestAccountDeletion', requireAuth: false, rateLimit: false }));
