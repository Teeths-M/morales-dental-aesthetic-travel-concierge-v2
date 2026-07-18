# Deploy checklist

The repo syncs into the Base44 Builder on push, but **nothing is live until you
press Publish**, and new entities/fields/functions do not exist for the running
app until then. Anything below that is missed fails *quietly* — a write to an
unpublished field is dropped, not rejected.

This file is the single place that survives; commit messages are not somewhere
anyone looks at 6am on launch day.

---

## 1. Publish — required, in this order

Entities first: a function that writes a field the entity does not have will
silently drop it.

### Entities with new fields

| Entity | New fields | If you skip it |
| --- | --- | --- |
| `User` | `protection_type`, `protection_type_set_at` | First-sign-in answer ("Medical Traveler / Non-Traveler") never persists server-side. The localStorage mirror keeps the UI working on that one device, so **this failure is invisible** — it looks fine until the user changes device. |
| `CaseRecord` | `location_tracking_consent`, `_at`, `_version`, `_revoked_at` | Location-sharing consent never reaches the server. Tracking still works locally, but a **revocation made on another device will not be honoured**. This one is a privacy failure, not a cosmetic one. |
| `AccountFlag` | *(entire entity is new)* | The Malicious Action Blocker cannot record a flag. Blocks still refuse the action, but nothing is remembered, `/admin/flags` shows an empty queue that is not actually empty, and repeat offenders never escalate. |

### New functions

| Function | Purpose | If you skip it |
| --- | --- | --- |
| `reviewAccountFlag` | The only route back from a block | A restricted account has **no way to be cleared**. The blocker's notification email links to `/admin/flags`, and the buttons there will fail. |

`_shared/blocker.ts` and `_shared/violationEngine.ts` are shared modules, not
endpoints — they deploy with the functions that import them.

---

## 2. Environment variables

Set in the Base44 dashboard. Several **fail closed by design** — the feature
switches off rather than running insecurely.

| Variable | Used by | Unset behaviour |
| --- | --- | --- |
| `ADMIN_EMAIL` | blocker admin alerts, SOS escalation, SLA alerts | Admin notifications silently do not send. **Set this** — a blocked action nobody is told about defeats the point. |
| `APP_URL` | every portal link in every notification | Falls back to `moralesdentalandaesthetics.com`. Wrong value = every CTA in every email points at the wrong place. |
| `PORTAL_TOKEN_SECRET` | partner portal tokens | Falls back to `change-me-in-production` — **a published default is a forgeable token**. Set it before any partner email goes out. |
| `CRON_SECRET` | `_shared/cronAuth.ts` | Guarded functions accept an admin session only. Scheduled jobs driven from the Base44 dashboard must send `X-Cron-Secret` or they will 403. |
| `SATELLITE_WEBHOOK_SECRET` | `receiveSatelliteWebhook` | Nothing is treated as verified. SOS still escalates; stand-down and position writes are ignored. Safe, but satellite is effectively read-only until set. |
| `PIN_RESET_SECRET` | `requestPINReset` | Reset returns 503. Fails closed on purpose — the previous hardcoded fallback was a forgeable HMAC key. |
| `OTP_ALLOW_MOCK` | `sendOtp` | **Must stay unset in production.** Setting it returns the OTP in the API response. |
| `VITE_TWILIO_PHONE_NUMBER` | offline SOS SMS deeplink | The SMS SOS channel opens a composer with no recipient. Set it or the channel stays honestly labelled as unavailable. |

---

## 3. Verify after publishing

Cheap checks that catch the silent failures above.

1. **Sign in as a new user** → the shield question appears → pick either option
   → reload → the choice persisted. If it resets, `User.protection_type` did not
   publish.
2. **Turn location sharing on, then off** → `CaseRecord.location_tracking_revoked_at`
   is set. If not, the consent fields did not publish.
3. **Open `/admin/flags`** → the page loads (empty queue is fine). If it errors,
   `AccountFlag` did not publish.
4. **Post a partner message containing "call me at 868-555-0147"** → refused with
   the block message, and a row appears in `/admin/flags`. This exercises the
   engine, the middleware, the entity and the console in one action.
5. **Type `MORALESHELP` into any text field** with covert SOS armed → no visible
   reaction, and a covert SOS event is recorded. Check the record, not the
   screen: showing nothing is the feature.
6. **Run one real Stripe payment end to end.** Still unverified — there are no
   live keys in this checkout, so nothing in the payment path has been tested
   against real Stripe.

---

## 4. Known-unverified at launch

Stated plainly rather than assumed working.

- **Payments / escrow payout / markup** — no live Stripe keys available here.
- **All 9 handshakes end to end, airplane mode, real SOS delivery** — needs a
  device, a live backend and integration credits.
- **RLS on the entities with no in-repo `rls` block** — dashboard-only setting.
- **~130 functions that exist in the repo but may not be published.** A 404 from
  a deployed function is indistinguishable from an unpublished one without a
  calibration probe, so this number is an estimate, not a measurement.
- **Comms migration is incomplete**: 65 senders still flagged by
  `node scripts/comms-audit.mjs`. Some are expected false positives (emergency
  paths that legitimately carry identity, dead templates). The count is a
  worklist, not a defect count.
