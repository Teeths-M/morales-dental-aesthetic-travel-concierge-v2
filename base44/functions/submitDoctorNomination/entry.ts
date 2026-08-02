import { createHandler, ok, err, type Base44Client } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';

const CONSENT_VERSION = '1.0';
const MAX_PER_DAY = 5;

const DoctorNominationSchema = strictObject({
  doctor_name: Fields.shortText(200),
  doctor_email: z.string().trim().max(254),
  clinic_name: z.string().trim().max(200).optional().default(''),
  country: Fields.shortText(100),
  city: z.string().trim().max(100).optional().default(''),
  specialty: z.string().trim().max(200).optional().default(''),
  review_text: Fields.shortText(2000),
  photo_refs: z.array(z.string().max(2000)).max(20).optional().default([]),
  photo_review_consent: z.boolean().optional().default(false),
});

// Same inline rate-limit shape as publicDoctorCheck/submitDoctorCorrection —
// no shared _shared/rateLimit.ts exists yet in this codebase.
async function checkRateLimit(base44: Base44Client, key: string, windowSeconds: number, maxRequests: number): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ bucket_key: key }, '-created_date', 1).catch(() => []);
  const bucket = (buckets as any[])?.[0];
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

/**
 * submitDoctorNomination — a patient tells M about a doctor who isn't on the
 * platform yet. Fully deterministic, no LLM call anywhere in this function.
 * Creates a pending_review DoctorNomination only — never touches the Doctor
 * entity, never sends anything to the nominated doctor. Only
 * reviewDoctorNomination's approve branch can ever do that.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    doctor_name, doctor_email, clinic_name, country, city, specialty,
    review_text, photo_refs, photo_review_consent,
  } = await body<{
    doctor_name?: string; doctor_email?: string; clinic_name?: string; country?: string; city?: string;
    specialty?: string; review_text?: string; photo_refs?: string[]; photo_review_consent?: boolean;
  }>();

  if (!doctor_name?.trim()) return err('The doctor’s name is required');
  if (!doctor_email?.trim() || !doctor_email.includes('@')) return err('A valid email for the doctor is required');
  if (!country?.trim()) return err('Country is required');
  if (!review_text?.trim()) return err('Please share a bit about your experience');
  if (photo_review_consent !== true) return err('Consent is required to submit a nomination.');

  const email = doctor_email.trim().toLowerCase();

  // Eligibility: nominations are for real M patients only, not any signup.
  const cases = await base44.entities.CaseRecord.filter({ client_email: user!.email }, '-created_date', 10).catch(() => []);
  const hasRealCase = (cases as any[]).some((c) => !c.cancelled_at);
  if (!hasRealCase) {
    return err('Doctor nominations are available to clients with an active or completed M case.', 403);
  }

  const withinLimit = await checkRateLimit(base44, `doctor_nom_day_${user!.id}`, 86400, MAX_PER_DAY);
  if (!withinLimit) return err('You’ve submitted a lot of nominations today — please try again tomorrow.', 429);

  // Already on M? Server-side backstop — the UI should catch this first via searchDoctorNames.
  const existingDoctor = await base44.asServiceRole.entities.Doctor.filter({ email }, '-created_date', 1).catch(() => []);
  if ((existingDoctor as any[])?.length) {
    return err('Looks like this doctor is already on M — no need to nominate them again.', 409);
  }

  // Already nominated by someone else (any non-rejected)? Dedupes outreach too.
  const existingNoms = await base44.asServiceRole.entities.DoctorNomination.filter({ doctor_email: email }, '-created_date', 20).catch(() => []);
  const alreadyActive = (existingNoms as any[]).some((n) => n.status !== 'rejected');
  if (alreadyActive) {
    return ok({ status: 'already_nominated', message: 'Someone already recommended this doctor — thank you for confirming!' });
  }

  const nowISO = new Date().toISOString();
  const photos = Array.isArray(photo_refs) ? photo_refs.slice(0, 6).map((u) => String(u)) : [];

  const nomination = await base44.asServiceRole.entities.DoctorNomination.create({
    nominator_user_id: user!.id,
    nominator_email: user!.email,
    doctor_name: String(doctor_name).trim().slice(0, 200),
    doctor_email: email,
    clinic_name: String(clinic_name || '').trim().slice(0, 200),
    country: String(country).trim().slice(0, 100),
    city: String(city || '').trim().slice(0, 100),
    specialty: String(specialty || '').trim().slice(0, 200),
    review_text: String(review_text).trim().slice(0, 2000),
    photo_refs: photos,
    photo_review_consent: true,
    photo_review_consent_at: nowISO,
    photo_review_consent_version: CONSENT_VERSION,
    status: 'pending_review',
    submitted_at: nowISO,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'doctor_nomination_submitted',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'DoctorNomination', resource_id: nomination?.id || '',
    details: { doctor_name: String(doctor_name).slice(0, 200), country: String(country).slice(0, 100) },
    sensitive: false, timestamp: nowISO,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Medical Travel Safety',
      to: adminEmail,
      subject: 'A doctor nomination needs your review',
      body: linkOnlyEmail({
        title: 'A doctor nomination needs your review',
        line: 'A client has recommended a doctor who is not yet on M.',
        ctaUrl: `${appUrl}/admin/doctor-nominations`,
        ctaLabel: 'Review Nomination',
        from: 'submitDoctorNomination',
      }),
    }).catch(() => {});
  }

  return ok({ status: 'submitted', nomination_id: nomination?.id || '' });
}, { name: 'submitDoctorNomination', requireAuth: true, allowedRoles: ['client', 'user', 'admin', 'platform_admin'], bodySchema: DoctorNominationSchema }));
