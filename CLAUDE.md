# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Keeping This File Current

Before ending substantive work in a session, check whether anything here needs updating: new commands, architecture changes, new or changed invariants, deprecated systems, newly discovered gotchas. Edit the relevant existing section directly — no changelog, no dated entries, this file stays current-state-only. Remove or correct anything no longer true rather than leaving it to go stale. Skip this if the session made no durable/structural changes (pure Q&A, one-off debugging, trivial fixes).

## The M Principle — Non-Negotiable

> "We built this to save lives, not to make profit."

**RED is a hard block. Always.** No bypass button, no workaround, no exception for any business reason.
If a procedure combination is clinically dangerous, M will not facilitate it — full stop.
The client can book elsewhere. M will not be the platform that put their life at risk.
This principle must never be softened, worked around, or compromised in any feature, edge case, or demo.

## Safety-Decision Architecture — Invariants (do not regress)

The AI/narration layer has **no technical capability to approve, reject, or modify a safety decision.** Only deterministic engines write safety outcomes. Established 2026-07 (commit `45647208`); a CI red-team guards it.

- **Deterministic decides, AI narrates.** The patient SAFE-T risk level is computed only by `base44/functions/_shared/safeTEngine.ts` (`computeSafeT` — pure, replayable). `computeSafeTScreening` writes the decision to the append-only, hash-chained `SafeTScreening` entity **first**, then invokes the LLM only to narrate it — the LLM receives just the finalized `risk_level` + flags (never raw patient text) and any risk level it returns is discarded. Never move SAFE-T scoring back into an LLM or into the client.
- **Fail closed.** Ambiguity, incomplete profile, pregnancy, or detected prompt-injection → `review` (needs human review), **never** `low`. `SafeTScan.jsx`'s error fallback is `review`.
- **The RED block stays deterministic** (`validateProcedureSafety` → `_shared/procedureCompatibility.ts` `getViolations`, re-checked server-side). `checkMedicalRisk` (admin-review routing) and `runMedGuardAnalysis` (in-travel score) are deterministic too. AI cannot suppress or override any of them.
- **AI may raise caution, never clear it.** In any hybrid scorer the LLM may only *add* risk. `runInternetIntelligence`'s AI can flag but not lower a score. The clinic agent (`verifyClinicStatus`) may auto-*block* (`closed`) but never auto-writes the permissive `operating` — it routes that to a human (`agent_proposed_operating`).
- **Doctor-verified completion + memory bank** (`logProcedureComplete`, `_shared/procedureMatch.ts`, `writeOutcomeMemory`, `recallSimilarOutcomes`): `computeProcedureMatch` deterministically compares booked vs. doctor-confirmed procedures — a mismatch is flagged (`mismatch_flagged`) for human review, never silently resolved, and an LLM may only narrate the already-decided status. Doctor-entered `doctor_recommended_medications` (never AI-generated) feed an anonymized `OutcomeRecord` (category/condition tags only — no patient identity, no raw med text). `recallSimilarOutcomes` surfaces that history back only as **doctor-only** aggregate advisory context (never patient-facing), always carrying a fixed caveat in the payload itself — it informs a doctor's own judgment and writes nothing back automatically.
- **Sanitize all user text reaching a prompt** via `base44/functions/_shared/sanitizePromptInput.ts`; an injection hit on the safety path forces `review`.
- **Log decision + narration** to the `SafeTScreening` `prev_hash` chain. Append-only — never update/delete.
- **Red-team gate.** `tests/redteam/safety-redteam.spec.js` (Playwright `redteam` project) runs deterministically, no network/credits; `.github/workflows/redteam.yml` re-runs it on every change to `base44/functions/**/entry.ts` (catches model-version changes) and weekly. Changing a model ID or the engine must keep it green.

## Data Freshness — fail-safe, not fail-silent

Time-sensitive status (clinic operating, doctor licence, visa, regulatory) is governed by `base44/functions/_shared/freshness.ts` (per-type TTLs + `flagForReview` → the `DataFreshnessReview` human queue). Cached status is never served as confirmed past its TTL — it is re-verified or clearly labelled unconfirmed. Clinic bookings gate on `checkClinicStatus` (blocks unless operating **and** fresh; soft-labels until `CLINIC_GATE_ENFORCE=true`). Scheduled by `.github/workflows/freshness-cron.yml`, guarded by `_shared/cronAuth.ts` (cron secret **or** admin session). Admin surfaces: `/admin/clinics`, `/admin/data-freshness`.

## Commands

```bash
npm run dev          # Vite dev server (hot reload)
npm run build        # Production build
npm run lint         # ESLint — quiet mode (errors only)
npm run lint:fix     # Auto-fix lint errors
npm run typecheck    # tsc check on src/components + src/pages
npm run preview      # Serve production build locally
npm test             # Vitest unit tests (single run)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright — public/deployed-app suite
```

### Testing

- **Vitest** (`tests/*.test.js`) covers pure app logic. `tests/safety.test.js` is load-bearing — it asserts the RED hard block (`getViolations`) never regresses. Run one file/test: `npx vitest run tests/safety.test.js` or `npx vitest run -t "does NOT block a single procedure"`.
- **Playwright** (`playwright.config.js`): the `public` / `authenticated` E2E projects run against the **deployed** app (`E2E_BASE_URL`, default the live Base44 URL — local dev can't complete a Base44 session), and `redteam` is the deterministic safety red-team: `npx playwright test --project=redteam` (no browser/network/credits, must stay green). Single test: append `-g "pattern"`.
- Both safety suites are M-Principle guardrails — if either goes red, a dangerous combination or an AI-cleared risk can slip through. Keep them green.

## Deploying & Environment

- **Local env:** `.env.local` needs `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL` (see `README.md`). This checkout has no Base44 session credentials, so sign-in can't complete on `localhost` — verify authenticated flows against the deployed app.
- **Deploy model:** pushing to the repo syncs code into the Base44 Builder; changes go live only after **Publish** in Base44. New edge functions and scheduled jobs are configured in the Base44 dashboard, not deployed from this repo — Claude cannot self-deploy.
- **Integration credits gate the backend.** When the account's monthly integration quota is exhausted, edge-function calls return **HTTP 402** at the platform layer — before the function body runs — so even credit-free functions fail. Deterministic app logic, Vitest, and the Playwright `redteam` suite all run without credits.
- **Scheduled work runs via GitHub Actions, not Base44 cron:** `.github/workflows/freshness-cron.yml` (data-freshness jobs) and `redteam.yml`. The freshness jobs share one `CRON_SECRET` set in both GitHub repo secrets and Base44 env; the guarded functions accept it via `_shared/cronAuth.ts` (cron secret **or** admin session).

## Architecture Overview

**What this is:** Medical tourism concierge platform. Clients book dental/aesthetic procedures with verified doctors abroad; the platform coordinates travel logistics, companions, security escorts, and post-operative recovery monitoring.

**Stack:** React 18 + Vite, React Router v6, TanStack React Query v5, Tailwind CSS, Radix UI/shadcn. Backend is Base44 BaaS — the frontend talks to it via `@base44/sdk`; ~270 Deno edge functions extend it.

### Base44 SDK

The SDK singleton is at `src/api/base44Client.js`:

```js
import { base44 } from '@/api/base44Client';
base44.entities.CaseRecord.filter({ client_email: user.email }, '-created_date', 20);
base44.entities.Doctor.get(id);
base44.functions.invoke('functionName', payload);
base44.auth.me();
```

In edge functions, use `base44.asServiceRole.entities.*` for admin-level access (bypasses user-scoped permissions).

### Auth Flow

`AuthContext` (`src/lib/AuthContext.jsx`) is the single auth provider wrapping the entire app. It:
- Calls `base44.auth.me()` on mount
- Falls back to `localStorage['morales_last_known_user']` when offline
- Restores the last known user as `isOfflineUser: true` so offline features remain accessible

`PUBLIC_BYPASS_PATHS` in `src/lib/constants.js` lists paths that skip auth loading entirely (offline emergency routes). If you add a new public emergency path, add it there.

### Routing

5 route modules assembled in `src/App.jsx`:

| File | Who can access |
|------|---------------|
| `src/routes/publicRoutes.jsx` | Anyone (unauthenticated) |
| `src/routes/clientRoutes.jsx` | `CLIENT_PORTAL_ROLES` + specific checkout roles |
| `src/routes/adminRoutes.jsx` | `ADMIN_ROLES` only |
| `src/routes/partnerRoutes.jsx` | Doctor, travel agency, taxi, companion, security portals |
| `src/routes/tokenRoutes.jsx` | Token-gated pages (proposal, guardian, survey, feedback) |

All pages are `React.lazy()` — add new pages with `lazy(() => import(...))` inside the relevant route module.

### Data Fetching

Use React Query (`@tanstack/react-query`) — `useQuery`/`useMutation` directly in pages and components. The `CACHE` constants in `src/lib/constants.js` provide standard `staleTime` values.

The service layer is `src/lib/services/` (vaultService, auditService, vaultSyncService) — the single canonical data-access layer. Audit log writes go through `auditService.log(...)`, never `invoke('logAuditEvent')` directly; actor fields are derived server-side from the session and cannot be passed from the client.

(Historical note: the `hooks/queries/` wrapper hooks, the `useEntity` legacy pattern, and a parallel `src/services/` layer were all removed in the 2026-07 dead-code cleanup — none had remaining consumers.)

### Edge Functions

Location: `base44/functions/<functionName>/entry.ts`

All new functions must use the shared middleware:

```ts
import { createHandler, ok, err } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { field } = await body();  // lazy, single-parse, safe to call multiple times
  if (!field) return err('field is required');
  // business logic only — auth, error sanitization, request tracing are handled
  return ok({ result: 'value' });
}, { name: 'myFunction', requireAuth: true, allowedRoles: ['admin'] }));
```

`createHandler` provides: auth gate (`requireAuth` defaults to true), role guard (`allowedRoles`), lazy body parser, structured logging with function name + request ID, `X-Request-Id` / `X-Response-Time` response headers, and generic 500 error body (never leaks `error.message`).

**Never** write `Deno.serve(async (req) => {...})` directly — always use `createHandler`. (Two exceptions exist for functions needing the raw, unparsed request body before `createHandler`'s JSON parsing — `stripePaymentWebhook` and `handleSanctionsWebhook` — both verify a cryptographic signature over the raw body themselves; don't add a third without the same justification.)

**`allowedRoles` is a no-op when `requireAuth: false`** — `createHandler` only reads `allowedRoles` inside its `if (requireAuth)` branch, so passing both together silently protects nothing. A `requireAuth: false` function must gate itself in its own handler body: an internal `base44.auth.me()` check, a token/HMAC/session lookup, or `cronAuthorized()` (`_shared/cronAuth.ts` — admin session or `X-Cron-Secret` header, fails closed if unset). For a function called by *another edge function* with no forwardable user session (`base44.asServiceRole.functions.invoke`, common for webhook-triggered chains), use `_shared/internalAuth.ts`'s `internalOrAdminAuthorized()` instead — same fail-closed contract, but checks a body field (`internal_secret`, reusing `CRON_SECRET`) since custom headers aren't passable through `.functions.invoke()`. Never treat "no user session" alone as proof of a legitimate internal caller — that was a real vulnerability in `sendPushNotification` (fixed 2026-07-25, commit `23862dc9`).

VS Code LSP shows `Cannot find name 'Deno'` and `Cannot find module 'npm:...'` in all edge function files. These are pre-existing config gaps (no Deno type definitions) and are not real errors.

**Request body validation** (`_shared/validate.ts`, zod-based, added 2026-07-26): define a `strictObject({...})` schema (rejects unexpected fields via `.strict()` — a bare `z.object()` only strips them silently) and either pass it as `bodySchema` in `createHandler`'s options (validates before the handler runs, and `body()` then returns the validated/coerced/defaulted object — no handler changes needed) or call `validate(schema, raw)` manually when the shape depends on the payload itself (an `action`-discriminated body — use `z.discriminatedUnion`). `Fields` exports common primitives (`email()`, `shortText(max)`, `boundedInt(min,max)` — coerces `"3"`→`3`, rejects non-numeric). Only ~30 of the ~300 functions have a schema so far (the highest-risk public ones — payments, doctor/partner submissions, travel bookings, medical intake, emergency/SOS); the rest still rely on manual `if (!field)` checks and can adopt this pattern incrementally. Two deliberate exceptions with schema-free comments explaining why: `triggerCovertSOS` (a rejecting 400 would break its "always return a benign 200" security property) and signature-verified webhooks (`stripePaymentWebhook`, `handleSanctionsWebhook`, etc. — body is provider-controlled, not user input).

### Roles & RBAC

Role strings live in `src/lib/constants.js` (`ROLES` object). Role arrays live in `src/lib/roles.js` (`ADMIN_ROLES`, `CLIENT_PORTAL_ROLES`, `PARTNER_ROLES`, `DOCTOR_PORTAL_ROLES`, etc.). Never hardcode role strings — always import from one of these locations.

`ProtectedRoute` at `src/components/ProtectedRoute.jsx` handles route-level role enforcement in the frontend. Edge functions enforce roles via `allowedRoles` in `createHandler`.

## Security-Critical Systems

These areas require extra care. Changes here have audit and safety implications:

**PIN Vault** — `src/pages/EmergencyPINSetup.jsx` and related emergency pages. Client-side: PBKDF2-SHA256, 600k iterations, `morales_vault_` localStorage prefix, base64 output. Server-side: 200k iterations, `morales-pin-salt:` prefix, hex output. The two systems are intentionally different — do not conflate them.

**Audit Log Hash Chain** — `base44/functions/logAuditEvent/entry.ts`. Each audit entry stores a SHA-256 hash of the previous entry (`prev_hash`). Any deletion or modification of a log entry breaks the chain — detectable on audit. The `ALLOWED_EVENT_TYPES` Set is the authoritative allowlist.

**Passport Vault tokens** — one-time-use enforcement via `RateLimitBucket`. Token-gated routes in `tokenRoutes.jsx` are accessible without login but require a valid token from the URL.

**Edge function error exposure** — `createHandler` catches all unhandled errors and returns `{ error: 'An internal error occurred.' }`. Never add a catch block that re-throws `error.message` to the client.

**Entity access control (RLS)** — every `base44/entities/*.jsonc` file controls its own record-level permissions via an `"rls"` field with `read`/`create`/`update`/`delete` rules (`user_condition.role`, `user_condition.id`, `data.<field>`). **An entity with no `"rls"` block at all is fully open — any unauthenticated request can read and write every record.** When adding a new entity, always give it an explicit `rls` block matching one of the existing ownership patterns (patient-owned via `data.<owner_email_field>`, partner-owned, admin-only, or — only if a real unauthenticated page needs it, confirm via frontend grep first — deliberately public with no `rls` block at all, as `Doctor`/`DoctorPricing`/pricing-calculator entities are). Base44's deploy-time validator rejects malformed `rls` JSON for *any* function, not just the offending entity, so keep edits to the four confirmed-valid condition keys. The `User` entity (Base44's own built-in identity table) is intentionally left untouched — locking it down risks breaking login platform-wide and needs its own staged change with a rollback plan, not a batch edit.

## Constants & Design System

All platform-wide magic strings are in `src/lib/constants.js`: `ROLES`, `CASE_STATUS`, `PAYMENT_STATUS`, `ROUTES`, `CACHE`, `TIME`, `AUDIT_EVENTS`, and more. Import from there — do not define strings inline.

**Date formatting:** Uses `date-fns`, not `moment` (which is no longer installed). Token differences from moment: `d` (not `D`), `yyyy` (not `YYYY`), `EEE` (not `ddd`).

**Design tokens:** Background `#060B16`, card `#0C1A1D`, border `#2A3F4A`, gold accent `#D4AF37`. Font weight baseline is `font-semibold` (not `font-bold`). SF Pro system font stack via CSS `font-family`.

**Component library:** `src/components/ui/` contains shadcn/ui primitives (auto-generated — do not edit). Custom design system extensions are in `src/components/ui-system/`. Layout components are in `src/components/layout/`.

**Fuzzy matching:** All fuzzy search goes through `src/lib/fuzzyMatch.js` (`fuzzyScore`, `fuzzyMatches`, `fuzzyFilterOptions`). Never roll a local scorer — typo tolerance must behave identically everywhere ("Can't spell my name but I can book on M").

## Language / i18n

Two coexisting layers, bridged by design:

- **Engine** (`src/i18n.js`, homegrown — the npm i18next is NOT installed): 10 languages, drives global chrome via `useTranslation()`. `changeLanguage(code)` is the **single mutation point** — it persists `morales_lang` + `appLanguage` and dispatches the `languageChange` window event. Never write those keys or dispatch that event manually.
- **Wizard dictionary** (`src/lib/translations.js`): 6 languages + English fallback for the rest, consumed by the signup wizards and Booking via the `appLanguage`/`languageChange` bridge. Legacy — fold into the engine's locale files when those flows are next reworked; don't add new consumers.

## Path Alias

`@/` maps to `src/`. Configured in `jsconfig.json` and Vite. Use `@/lib/constants`, `@/api/base44Client`, etc. throughout.
