# Deploy checklist

The repo syncs into the Base44 Builder on push, but **nothing is live until you
press Publish**, and new entities/fields/functions do not exist for the running
app until then. Anything below that is missed fails *quietly* — a write to an
unpublished field is dropped, not rejected.

This file is the single place that survives; commit messages are not somewhere
anyone looks at 6am on launch day.

---

## 0. Do this before anything else

**Set `PORTAL_TOKEN_SECRET`** in the Base44 environment to a long random value.

Until it is set, every partner portal link returns 500. That is deliberate: the
old code fell back to `change-me-in-production` — published in this repository —
so the signature on a portal token proved nothing. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Changing it later invalidates existing partner links, which is fine before
launch and disruptive after. Set it once, now.

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
| `CaseRecord` | `procedures_confirmed_by_doctor`, `procedure_match_status`, `procedure_match_explanation`, `procedure_match_ai_summary`, `procedure_match_checked_at`, `doctor_recommended_medications`, `doctor_recommended_medications_entered_at`, `medication_source`, `is_demo_seed` | Doctor-verified completion (Stage 11) silently drops the procedure-match check and any doctor-entered medications — the patient still gets the old hardcoded default med schedule instead. |
| `OutcomeRecord` | `condition_bucket_tags`, `medication_categories`, `procedure_match_status`, `is_demo_seed` | The anonymized memory-bank write drops its match tags — `writeOutcomeMemory`/`recallSimilarOutcomes` still "succeed" but never actually match anything, so the memory bank looks permanently empty. |
| `AuditLog` | `outcome_memory_written`, `memory_bank_recall_viewed` (enum values) | Those two audit events are silently dropped rather than logged. |

### New functions

| Function | Purpose | If you skip it |
| --- | --- | --- |
| `reviewAccountFlag` | The only route back from a block | A restricted account has **no way to be cleared**. The blocker's notification email links to `/admin/flags`, and the buttons there will fail. |
| `getSafetyContact` | Serves the offline-SOS SMS number | The `sms:` deep link opens a composer with **no recipient**. A patient with no data is expected to already know the number. |
| `writeOutcomeMemory` | Anonymizes a completed case into `OutcomeRecord` | The memory bank never gets a new entry — `recallSimilarOutcomes` always reports `insufficient_data`. |
| `recallSimilarOutcomes` | Doctor-only anonymized recall for a similar case | The "Check Memory Bank" panel in the doctor portal 404s or errors instead of returning an aggregate. |
| `seedMemoryBankDemo` | Seeds `/demo/memory-bank`'s demo case + sample outcomes | "Seed / Reset Demo Data" fails on that page — this is the exact symptom reported 2026-07-26 (a 404-shaped response with neither `success` nor `error`, which is indistinguishable in the UI from a real bug without reading `err.response`). |
| `getMemoryBankDemoPreview` | Read-only patient-portal preview for the same demo | Step 3 of `/demo/memory-bank` never shows anything. |

Also **republish** `logProcedureComplete`, `logPhysicalIntakeHandshake`,
`schedulePostOpMedReminders`, and `sendPostOpInstructions` — all four were
edited (not just newly created) to support the above, so a stale published
version keeps the old behavior even though the repo has moved on.

`_shared/blocker.ts` and `_shared/violationEngine.ts` are shared modules, not
endpoints — they deploy with the functions that import them. Same for
`_shared/procedureMatch.ts`, `_shared/conditionBuckets.ts`,
`_shared/medicationCategories.ts`, `_shared/procedureCategory.ts`, and
`_shared/resolveCaseIdentity.ts`.

---

## 2. Environment variables

Set in the Base44 dashboard. Several **fail closed by design** — the feature
switches off rather than running insecurely.

| Variable | Used by | Unset behaviour |
| --- | --- | --- |
| `ADMIN_EMAIL` | blocker admin alerts, SOS escalation, SLA alerts | Admin notifications silently do not send. **Set this** — a blocked action nobody is told about defeats the point. |
| `APP_URL` | every portal link in every notification | Falls back to `moralesdentalandaesthetics.com`. Wrong value = every CTA in every email points at the wrong place. |
| `PORTAL_TOKEN_SECRET` | partner portal tokens (18 functions) | **BLOCKING — set this first.** It no longer has a default. Unset, every partner portal link fails loudly (500) and no token can be signed or verified. It previously fell back to `change-me-in-production`, a value published in this repo: anyone who could read the repo could mint a token for any case and open a partner portal onto a patient's record. Refusing to sign is a support ticket; a forgeable token is a breach. |
| `CRON_SECRET` | `_shared/cronAuth.ts` | Guarded functions accept an admin session only. Scheduled jobs driven from the Base44 dashboard must send `X-Cron-Secret` or they will 403. |
| `SATELLITE_WEBHOOK_SECRET` | `receiveSatelliteWebhook` | Nothing is treated as verified. SOS still escalates; stand-down and position writes are ignored. Safe, but satellite is effectively read-only until set. |
| `PIN_RESET_SECRET` | `requestPINReset` | Reset returns 503. Fails closed on purpose — the previous hardcoded fallback was a forgeable HMAC key. |
| `OTP_ALLOW_MOCK` | `sendOtp` | **Must stay unset in production.** Setting it returns the OTP in the API response. |
| ~~`VITE_TWILIO_PHONE_NUMBER`~~ | offline SOS SMS deeplink | **No longer needed.** This was a BUILD-time variable — setting `TWILIO_PHONE_NUMBER` in the Base44 function environment never reached it, so the channel was silently dead even with Twilio fully configured. The number is now served by `getSafetyContact` from `TWILIO_PHONE_NUMBER` and cached on the device while online. Publish `getSafetyContact` (below) and it works. |

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
- **~130 functions that exist in the repo but may not be published.** This number
  is an estimate, not a measurement — there's no way to enumerate them without
  probing each one. Confirmed live on 2026-07-26 via `seedMemoryBankDemo`: an
  unpublished function in this Base44 project does **not** 404 — the call
  resolves with **HTTP 200 and an empty JSON body** (no `success`, no `error`,
  no keys at all). `MemoryBankDemo.jsx`'s `describeInvokeError()` handles the
  404 case, but the real tell to watch for on this platform is a *resolved*
  call with an empty/keyless response body.
- **Comms migration is incomplete**: 65 senders still flagged by
  `node scripts/comms-audit.mjs`. Some are expected false positives (emergency
  paths that legitimately carry identity, dead templates). The count is a
  worklist, not a defect count.
