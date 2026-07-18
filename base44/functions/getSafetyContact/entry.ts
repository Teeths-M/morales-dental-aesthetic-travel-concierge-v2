import { createHandler, ok } from '../_shared/createHandler.ts';

/**
 * getSafetyContact — the number a patient texts when they have no data.
 *
 * Why this exists: the offline SOS packet built its `sms:` deep link from
 * `import.meta.env.VITE_TWILIO_PHONE_NUMBER`, a BUILD-TIME variable inlined
 * into the browser bundle. Setting TWILIO_PHONE_NUMBER in the Base44 function
 * environment does nothing for it — different variable, different process.
 * With it unset the link fell back to `sms:?body=...`, which opens the
 * composer with the emergency text pre-filled and NO RECIPIENT. A person in a
 * wilderness emergency was expected to already know the number.
 *
 * A safety channel must not depend on someone remembering a build flag. The
 * frontend now fetches this while online and caches it, so the number is on the
 * device before it is needed — which is the only time it can be fetched.
 *
 * Not authenticated, and not secret: this is the number we publish to patients
 * and tell them to text. Withholding it behind a login would defeat its purpose
 * — the whole point is that it works when nothing else does.
 */

Deno.serve(createHandler(async () => {
  const sms = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

  return ok({
    // Empty string when unconfigured. The client treats absent as "no SMS
    // channel" and says so honestly rather than offering a dead button.
    sms_number: sms,
    // Cache lifetime hint. Long, because a number that changes is rarer than a
    // patient who goes offline for a week.
    ttl_days: 30,
  });
}, { name: 'getSafetyContact', requireAuth: false }));
