import { createHandler, ok } from '../../shared/createHandler.ts';
import { Fields, strictObject } from '../../shared/validate.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { checkRateLimit } from '../../shared/rateLimit.ts';

// ── requestGuardianAccess ────────────────────────────────────────────────────
// Lets a guardian who lost or never saved their /guardian/:token link get
// back in without a password or account: they re-enter the email a patient
// already shared their journey with, and — if it matches one or more active
// GuardianSession rows — each gets a fresh link emailed. No login, no new
// role, no change to GuardianSession/GuardianView/getGuardianViewData; this
// is a second way in to the exact same token-gated system, not a new one.
//
// Anti-enumeration: the response is identical whether or not the email
// matched anything, so this endpoint can never be used to test whether a
// given address is a guardian for someone.

const bodySchema = strictObject({ email: Fields.email() });

const genericResponse = () => ok({
  message: "If we found an active journey shared with this email, we've sent a link.",
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { email } = await body();

  // Per-address cap independent of createHandler's default per-IP limit —
  // this endpoint sends email, so it also needs a ceiling on how often a
  // given inbox can be targeted, same reasoning as getGuardianViewData's
  // inline RateLimitBucket for its token.
  const allowed = await checkRateLimit(base44, `guardian_access_email:${email}`, 60 * 60, 5);
  if (!allowed) return genericResponse();

  // Exact match on the lowercased email Fields.email() already normalized
  // to. guardian_email is patient-typed free text at share time, so an
  // unusual casing on the patient's side is the one known gap here.
  const sessions = await base44.asServiceRole.entities.GuardianSession
    .filter({ guardian_email: email, is_active: true })
    .catch(() => []);

  const now = Date.now();
  const active = (sessions || []).filter((s: any) => s.expires_at && new Date(s.expires_at).getTime() > now);

  if (active.length > 0) {
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    await Promise.allSettled(active.map((session: any) =>
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Medical Travel Safety',
        to: email,
        subject: 'Your journey tracking link',
        body: linkOnlyEmail({
          title: "Here's your journey tracking link",
          line: 'Someone shared their travel status with you and this link was requested again. Tap below to view it.',
          ctaUrl: `${appUrl}/guardian/${session.view_token}`,
          ctaLabel: 'View Journey Status',
          from: 'requestGuardianAccess',
        }),
      })
    ));
  }

  return genericResponse();
}, { name: 'requestGuardianAccess', requireAuth: false, bodySchema }));
