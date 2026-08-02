import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject } from '../../shared/validate.ts';

// Generous caps — sanitize() below does the real truncation (200/200/200/
// 4000/254); this schema's job is reject-unexpected-fields + basic typing.
const DoctorCorrectionSchema = strictObject({
  doctor_name: z.string().max(500).optional().default(''),
  clinic: z.string().max(500).optional().default(''),
  location: z.string().max(500).optional().default(''),
  message: z.string().max(8000).optional().default(''),
  contact_email: z.string().max(500).optional().default(''),
});

/**
 * submitDoctorCorrection — a named doctor (or anyone) can submit real credentials
 * when a public "Check Your Doctor" result looks incomplete or wrong.
 *
 * Routes to a HUMAN admin queue (DoctorCorrectionRequest). Never auto-applies an
 * override — a person reviews every submission. Public + rate-limited.
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

export default createHandler(async ({ req, base44, body }) => {
  const raw = await body<Record<string, string>>();
  const doctor_name = sanitize(raw.doctor_name, 200);
  const clinic_name = sanitize(raw.clinic, 200);
  const location = sanitize(raw.location, 200);
  const message = sanitize(raw.message, 4000);
  const contact_email = sanitize(raw.contact_email, 254);

  if (!doctor_name || !message) {
    return err('Please tell us the doctor’s name and what should be corrected.');
  }

  const ip = (req.headers.get('CF-Connecting-IP')
    || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown').trim();
  const allowed = await checkRateLimit(base44, `cyd_correction_ip_${ip}`, 3600, 5);
  if (!allowed) return err('You’ve submitted several corrections recently. Please give us time to review them first.', 429);

  await base44.asServiceRole.entities.DoctorCorrectionRequest.create({
    doctor_name, clinic_name, location, message, contact_email,
    status: 'pending',
    source_ip: ip,
    submitted_at: new Date().toISOString(),
  });

  // Notify admin (non-blocking) — a person reviews; nothing is auto-applied.
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `Doctor record — correction requested: ${doctor_name}`,
      body: `<h2>Check Your Doctor — correction request</h2>
<p><strong>Doctor:</strong> ${doctor_name}${clinic_name ? ` (${clinic_name})` : ''}</p>
<p><strong>Location:</strong> ${location || '—'}</p>
<p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
<p><strong>Contact:</strong> ${contact_email || 'not provided'}</p>
<p>Review in the admin queue. Do not auto-apply — verify the credentials first.</p>`,
    }).catch(() => {});
  }

  return ok({ received: true });
// Already rate-limited inline above via RateLimitBucket — rateLimit:false here
// avoids silently double-limiting through two independent mechanisms.
}, { name: 'submitDoctorCorrection', requireAuth: false, rateLimit: false, bodySchema: DoctorCorrectionSchema });
