import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, z } from '../../shared/validate.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { requireFreshPasskey } from '../../shared/passkeys.ts';

/**
 * updateMyProfile — how a signed-in user changes their own name or contact
 * phone from Settings.
 *
 * It makes the same base44.auth.updateMe() call the Settings page used to make
 * in the browser, as the signed-in user, so the change itself works exactly
 * as before. Doing it here means the change is always recorded:
 *   - an entry in the hash-chained audit log, so "I didn't change that" can
 *     be answered;
 *   - when the contact phone changes, a link-only email to the account owner,
 *     a standard defence against someone else taking over an account.
 * Neither carries the number itself. The audit entry keeps only the last two
 * digits, and the email says nothing but that it changed.
 */

// Same rule as PHONE_PATTERN in SettingsModule.jsx, so the page can explain a
// mistake before sending. A number may start with "(" ("(868) 555-1234").
const PHONE_PATTERN = /^[+\d(][\d\s().-]{0,30}$/;

const BodySchema = strictObject({
  full_name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32)
    .refine((v) => v === '' || PHONE_PATTERN.test(v), 'phone: use digits, spaces, and + ( ) - only')
    .optional(),
  step_up: z.object({ challenge_id: z.string().max(100), response: z.object({}).passthrough() }).optional(),
});

function lastTwoDigits(phone: unknown): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits ? `ends in ${digits.slice(-2)}` : 'none';
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { full_name, phone, step_up } = await body();
  const me = user!;

  const patch: Record<string, string> = {};
  if (typeof full_name === 'string' && full_name !== (me.full_name || '')) patch.full_name = full_name;
  if (typeof phone === 'string' && phone !== (me.phone || '')) patch.phone = phone;
  const changed = Object.keys(patch);
  if (!changed.length) return ok({ success: true, changed });

  // A new contact phone is how an account gets taken over, so with the Face ID lock on it needs a fresh check.
  // (Base44 also lets a signed-in browser change the phone directly, which this can't stop; the email below still
  // goes out for changes made here.)
  if (changed.includes('phone')) {
    const gate = await requireFreshPasskey(base44, me, 'change_phone', step_up);
    if (!gate.ok) return gate.response;
  }

  await base44.auth.updateMe(patch);

  const phoneChanged = changed.includes('phone');
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: phoneChanged ? 'contact_phone_changed' : 'profile_updated',
      actor_id: me.id,
      actor_role: me.role || 'user',
      actor_name: me.full_name || '',
      actor_email: me.email || '',
      resource_type: 'User',
      resource_id: me.id,
      resource_name: me.email || '',
      case_id: null,
      details: {
        fields: changed,
        ...(phoneChanged ? { phone_before: lastTwoDigits(me.phone), phone_after: lastTwoDigits(patch.phone) } : {}),
      },
      sensitive: false,
      timestamp: new Date().toISOString(),
      prev_hash: await computePrevHash(base44),
    });
  } catch (auditError) {
    console.error('updateMyProfile: audit entry failed (the change itself was saved):', auditError);
  }

  const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
  if (phoneChanged && me.email && appUrl) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: me.email,
        subject: 'Your contact phone number was changed',
        body: linkOnlyEmail({
          title: 'Your contact phone number was changed',
          line: "The phone number on your M-Care account was just changed. If you did this, there's nothing to do. If you didn't, open your settings now and ask M-Care to connect you with our care team.",
          ctaUrl: `${appUrl}/dashboard/settings`,
          ctaLabel: 'Open my settings',
          from: 'updateMyProfile',
        }),
      });
    } catch (mailError) {
      console.error('updateMyProfile: security email failed (the change itself was saved):', mailError);
    }
  } else if (phoneChanged && !appUrl) {
    console.error('updateMyProfile: APP_URL is not set, so the phone-change email was not sent.');
  }

  return ok({ success: true, changed });
}, {
  name: 'updateMyProfile',
  requireAuth: true,
  bodySchema: BodySchema,
  rateLimit: { max: 10, windowSeconds: 600 },
}));
