# RBAC / Horizontal Privilege Escalation Audit Plan
**Platform:** IQ200 Medical Travel Concierge  
**Date:** 2026-06-06  
**Scope:** All backend functions using `asServiceRole`, sensitive entity access, token/id inputs  
**Status:** ACTIVE — Pending remediation

---

## Executive Summary

| Risk Level | Count | Status |
|------------|-------|--------|
| 🔴 CRITICAL | 3 | Requires immediate patch |
| 🟠 HIGH | 5 | Patch before production go-live |
| 🟡 MEDIUM | 6 | Patch within 30 days |
| 🟢 LOW | ~14 | Monitor / best-effort |

**Most urgent issues:**
1. `logAuditEvent` — no authentication. Any user (even unauthenticated) can write arbitrary audit log entries, poisoning the compliance trail.
2. `iq200Pipeline (process_payment)` — updates `payment_status` on a CaseRecord from a proposal_token with NO Stripe webhook verification. This is a direct payment bypass.
3. `syncConsultationToCaseRecord` — no auth at all. Automation-called, but also invocable by anyone with SDK access to mutate CaseRecord fields.

---

## Audit Rules Reference

| Rule | Description |
|------|-------------|
| R1 | `asServiceRole` usage requires explicit authz BEFORE sensitive data access |
| R2 | Admin-only functions must verify `admin` or `platform_admin` before service-role |
| R3 | Patient functions must verify ownership by `user.id`, `user.email`, scoped token, or case membership |
| R4 | Partner functions must verify assigned partner/vendor relationship |
| R5 | Doctor functions must verify assigned doctor relationship |
| R6 | Portal-token functions must verify token scope, expiry, case binding, and role binding |
| R7 | Sensitive access must create audit logs |
| R8 | No payment state transition without verified Stripe webhook |

---

## Category 1: Payment Functions

| Field | chargeConsultationFee | generateStripePaymentLink | generateConsultationDepositLink |
|---|---|---|---|
| **entities_accessed** | ConsultationFee, PaymentTransaction | CaseRecord, PaymentTransaction | CaseRecord, PaymentTransaction |
| **uses_asServiceRole** | Yes | Yes | Yes |
| **auth_required** | ✅ Yes | ✅ Yes | ✅ Yes |
| **role_check_present** | ❌ No (any authed user) | Partial (isAdmin OR isOwner) | Partial (isAdmin OR isOwner if case_id) |
| **ownership_check_present** | ✅ Yes (user.id scoped) | ✅ Yes | ✅ Yes (when case_id present) |
| **token_check_present** | ❌ No | ✅ Yes (proposal_token) | ❌ No |
| **audit_log_present** | ❌ No | ❌ No | ❌ No |
| **risk_level** | 🟡 MEDIUM | 🟠 HIGH | 🟡 MEDIUM |
| **privilege_escalation_risk** | Low — scoped to user.id | CaseRecord fetched via asServiceRole BEFORE ownership check → existence leak | No ownership check if case_id omitted |
| **data_exposure_risk** | Low — only creates, not reads sensitive data | Leaks case existence to unauthorized users | Can generate checkout link for any email |
| **required_fix** | Add audit log on session creation | Fetch case AFTER ownership check, or return same 404 for both not-found and forbidden | Require case_id or auth scope for client_email |
| **fix_priority** | P3 | **P1** | P2 |
| **test_case_needed** | Test idempotency path for clean user | Test auth bypass: user A requests link for user B's case | Test: call without case_id, verify no case access |

---

## Category 1B: Payment Webhook

| Field | stripePaymentWebhook |
|---|---|
| **entities_accessed** | CaseRecord, PaymentTransaction, ConsultationFee |
| **uses_asServiceRole** | ✅ Yes (appropriate — webhook context) |
| **auth_required** | ✅ N/A (Stripe signature replaces user auth) |
| **role_check_present** | ✅ N/A |
| **ownership_check_present** | ✅ N/A (webhook source-verified) |
| **token_check_present** | ✅ Yes (STRIPE_WEBHOOK_SECRET + constructEventAsync) |
| **audit_log_present** | ✅ Yes (PaymentTransaction records all events) |
| **risk_level** | 🟢 LOW |
| **privilege_escalation_risk** | None — webhook only |
| **data_exposure_risk** | None — no data returned to user |
| **required_fix** | ⚠️ Add secondary idempotency guard: check `stripe_payment_intent_id` in addition to `event_id` before processing `handlePackagePaymentSuccess`. Both `checkout.session.completed` and `payment_intent.succeeded` can reference the same PI and run the handler twice. |
| **fix_priority** | P2 |
| **test_case_needed** | Send same PI via both event types, verify only one PaymentTransaction created with `status: succeeded` |

---

## Category 2: Passport / Document Vault Functions

| Field | uploadEncryptedPassport | getPassportAccess | decryptPassportFile | requestPassportAccess | approveRevokePassportAccess | expirePassportGrants |
|---|---|---|---|---|---|---|
| **entities_accessed** | PassportVault, PassportAuditLog | PassportVault, PassportAccessGrant, PassportAuditLog | PassportVault, PassportAuditLog | PassportVault, PassportAccessGrant, PassportAuditLog | PassportAccessGrant, PassportAuditLog | PassportAccessGrant, PassportVault, PassportAuditLog |
| **uses_asServiceRole** | Partial (upload via asServiceRole, create via user scope) | Yes | Yes | Yes | Yes | Yes |
| **auth_required** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No (scheduled) |
| **role_check_present** | ❌ No | ✅ Yes (admin bypass) | ✅ Yes (owner/admin) | ✅ Yes (admin auto-approve) | ✅ Yes (owner/admin) | ✅ N/A (scheduled) |
| **ownership_check_present** | ✅ Yes (creates under user.email) | ✅ Yes (grant expiry + status check) | ✅ Yes | ❌ No — any user can request any passport_token | ✅ Yes (patient_email check) | N/A |
| **token_check_present** | N/A | ✅ Yes (grant_token HMAC + expiry) | N/A (email-only) | N/A | ✅ Yes (grant_token) | N/A |
| **audit_log_present** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes (deny + approve) | ✅ Yes |
| **risk_level** | 🟢 LOW | 🟢 LOW | 🟢 LOW | 🟡 MEDIUM | 🟢 LOW | 🟢 LOW |
| **privilege_escalation_risk** | None | None — grant_token scopes access | None — email ownership check | ⚠️ Any authenticated user can generate a grant request for any passport_token. Relies on patient approval email flow. Attacker can enumerate vault existence. | None | None |
| **data_exposure_risk** | None | Gated by grant status and expiry | Minimal — denials are logged | Vault existence leak via 404/200 distinction | None | None |
| **required_fix** | None | None | None | Add case_id binding: requester must be assigned to the case linked to this passport_token | None | None |
| **fix_priority** | — | — | — | P3 | — | — |
| **test_case_needed** | — | Test expired grant returns 403 | Test admin decrypt path | Test: user with no case relationship requests access to another patient's passport | — | — |

---

## Category 3: CaseRecord / Consultation Functions

| Field | iq200Pipeline (get_case) | iq200Pipeline (process_payment) | iq200Pipeline (create/admin actions) | syncConsultationToCaseRecord | safeTProceedWithOverride | processInformedConsentAndEmail |
|---|---|---|---|---|---|---|
| **entities_accessed** | CaseRecord | CaseRecord, TravelAgency, TaxiService, DispatchFailureLog | CaseRecord, Consultation | CaseRecord, Consultation | CaseRecord, Consultation | CaseRecord, Consultation |
| **uses_asServiceRole** | Yes | Yes | Yes/No (mixed) | Yes | Yes | Yes |
| **auth_required** | ❌ **No** (public by design) | ❌ **No** (proposal_token only) | ✅ Admin-only | ❌ **None at all** | ✅ Yes (any authed user) | ✅ Yes (any authed user) |
| **role_check_present** | ❌ No | ❌ No | ✅ Yes (admin only) | ❌ No | ❌ No | ❌ No |
| **ownership_check_present** | ❌ No | ❌ No (token only) | ✅ Admin-scoped | ❌ No | ✅ Partial (consultation.email === user.email, but NOT on case_record_id) | ❌ No (case_record_id not validated) |
| **token_check_present** | ✅ proposal_token filter | ✅ proposal_token filter | ❌ No | ❌ None | ❌ No | ❌ No |
| **audit_log_present** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No (email only) | ❌ No |
| **risk_level** | 🟠 HIGH | 🔴 **CRITICAL** | 🟢 LOW | 🔴 **CRITICAL** | 🟠 HIGH | 🟠 HIGH |
| **privilege_escalation_risk** | Returns **full CaseRecord** (all PHI, financials, medical data, passport tokens) to anyone with proposal_token | **Payment bypass**: any user can call with a proposal_token to mark a case as paid without Stripe webhook | None — admin-only | **No auth**: anyone with function URL can sync/mutate CaseRecord fields | User can force SAFE-T PASSED and update ANY case_record_id not bound to their consultation | Any authenticated user can overwrite signature_data, accepted_arbitration_clause on ANY CaseRecord |
| **data_exposure_risk** | All PHI in CaseRecord exposed via token | Payment state manipulation without actual payment | None | Case mutation without any identity | SAFE-T override for wrong case | Legal consent record manipulation |
| **required_fix** | Field-redact: return only client-safe fields (no medical, no PHI, no internal IDs). Or separate into a safe proposal view endpoint | **Remove `process_payment` action entirely**. Payment state must ONLY change via `stripePaymentWebhook`. | None | Add admin or automation-only auth (shared secret or `asServiceRole`-only token) | Bind `case_record_id` to `consultation.id` from verified consultation — reject if mismatch | Add ownership check: CaseRecord.client_email must match user.email OR require admin role |
| **fix_priority** | **P1** | **P1 — CRITICAL** | — | **P1 — CRITICAL** | **P1** | **P1** |
| **test_case_needed** | Confirm proposal_token returns only safe fields | Attempt to mark case as paid by calling `process_payment` — should fail/be removed | — | Call with arbitrary `data.id` to mutate unrelated case — must 401 | Call with unrelated `case_record_id` — must 403 | Call with another patient's `case_record_id` — must 403 |

---

## Category 4: Admin-Only Functions

| Function | auth_required | role_check | uses_asServiceRole | risk_level | notes |
|----------|--------------|------------|-------------------|------------|-------|
| assignDoctorToCase | ✅ Yes | ✅ admin/platform_admin | Partial (mixed user/asServiceRole) | 🟢 LOW | Correct |
| assignTravelAgency | ✅ Yes | ✅ admin/platform_admin | ❌ No (uses user scope) | 🟢 LOW | Correct — user scope is appropriate here |
| assignChauffeurServices | ✅ Yes | ✅ admin/platform_admin | ❌ No | 🟡 MEDIUM | Token generated with `Date.now() + Math.random()` — weak entropy. Use `crypto.getRandomValues()` |
| getAnalyticsDashboard | ✅ Yes | ✅ admin/platform_admin | ✅ Yes | 🟢 LOW | Correct |
| safeT4LifeScan | ✅ Yes | ✅ admin only | ❌ No | 🟢 LOW | Correct |
| inviteAdmin | ✅ Yes | ✅ admin/platform_admin | ❌ No | 🟢 LOW | Correct |
| seedSampleData | ✅ Yes | ✅ admin/platform_admin | ✅ Yes | 🟢 LOW | Correct |
| detectFallbackCrisis | Allows no-user (scheduled) | ✅ user-present must be admin | ✅ Yes | 🟢 LOW | Correct — dual mode |
| autoCompletePatientJourney | Allows no-user (scheduled) | ✅ user-present must be admin | ✅ Yes | 🟢 LOW | Correct |
| expirePassportGrants | ❌ No auth (scheduled only) | N/A | ✅ Yes | 🟢 LOW | Acceptable — scheduled system function |

---

## Category 5: Doctor Functions

| Function | auth_required | role_check | ownership_check | risk_level | notes |
|----------|--------------|------------|-----------------|------------|-------|
| getDoctorCases | ✅ Yes | ❌ No explicit role check | ✅ Yes — Doctor.email === user.email | 🟢 LOW | Correct scope |
| getMyDoctorProfile | ✅ Yes | ❌ No role check | ✅ Yes — Doctor.email === user.email | 🟢 LOW | Uses user-scoped query (not asServiceRole) |
| getPortalData | ✅ Token (HMAC) | ❌ No user role check | ✅ Partial — partner_id in WorkflowEvent | 🟡 MEDIUM | Token can be called without user session. WorkflowEvent auth is the only gate. Field filtering ✅. |

**Specific finding — `getPortalData`:**
- Token HMAC verification ✅
- WorkflowEvent partner binding ✅
- Returns only safe consultation fields ✅
- **Gap**: If token is valid but `partner_id` is NOT in the workflow, it returns 403 — good. However, the function does NOT check `partner_id` matches the token's embedded partner (token payload not inspected for partner_id). An attacker with one valid token could probe other partner_ids against the same consultation.

**Required fix:** Embed `partner_id` in the HMAC token payload and verify it matches the request body's `partner_id`.

---

## Category 6: Travel Agency / Taxi / Vendor Portal Functions

| Function | auth_required | token_check | ownership_check | risk_level | notes |
|----------|--------------|-------------|-----------------|------------|-------|
| getPortalData | Token-only | ✅ HMAC | ✅ WorkflowEvent | 🟡 MEDIUM | See Category 5 gap above |
| generateTravelAgencyPortalLink | Admin-required | N/A | N/A | 🟢 LOW | Correct |
| generateChauffeurPortalLink | Admin-required | N/A | N/A | 🟢 LOW | Correct |
| assignTravelAgency | Admin-required | N/A | N/A | 🟢 LOW | Correct |
| assignChauffeurServices | Admin-required | N/A | N/A | 🟡 MEDIUM | Weak token entropy (see Category 4) |

---

## Category 7: SAFE-T4LIFE Functions

| Function | auth_required | role_check | ownership_check | risk_level | required_fix |
|----------|--------------|------------|-----------------|------------|--------------|
| safeT4LifeScan | ✅ Yes | ✅ admin only | N/A | 🟢 LOW | None |
| safeTProceedWithOverride | ✅ Yes | ❌ Any authed user | ❌ **case_record_id not validated** | 🟠 HIGH | Bind `case_record_id` to verified `consultation_id`. Verify `consultation.email === user.email` before CaseRecord update |
| generateSafeTProfile | (Not read — requires inspection) | — | — | TBD | Read pending |

---

## Category 8: Notification / Email / SMS Functions

| Function | auth_required | role_check | data_exposure_risk | risk_level | notes |
|----------|--------------|------------|-------------------|------------|-------|
| logAuditEvent | ❌ **None** | ❌ None | 🔴 Can write arbitrary audit entries | 🔴 **CRITICAL** | No auth at all — anyone can write audit logs with `actor_id: "admin"`, `sensitive: true`, arbitrary event_types |
| sendSmsNotification | (Not read) | — | Medium (SMS content) | TBD | — |
| sendPushNotification | (Not read) | — | Low | TBD | — |
| notifyAdminQuoteRevised | (Not read) | — | Low | TBD | — |
| notifyClientConsultationApproved | (Not read) | — | Low | TBD | — |
| sendSupportTicket | (Not read) | — | Low | TBD | — |
| testEmailPreview | (Not read) | — | Low | TBD | — |
| testDoctorEmail | (Not read) | — | Low | TBD | — |

---

## Category 9: Seed / Test / Mock Functions

| Function | auth_required | role_check | risk_level | notes |
|----------|--------------|------------|------------|-------|
| seedSampleData | ✅ Yes | ✅ admin/platform_admin | 🟢 LOW | Correct |
| seedDoctorProcedures | (Not read — admin check expected) | — | 🟢 LOW | — |
| seedMasterProcedures | (Not read — admin check expected) | — | 🟢 LOW | — |
| seedProcedurePricing | (Not read — admin check expected) | — | 🟢 LOW | — |
| seedTestConsultations | (Not read — admin check expected) | — | 🟢 LOW | — |
| mockPaypalPayment | ✅ Yes | ✅ MOCK_PAYMENTS_ENABLED guard | 🟢 LOW | 403 in production is correct |
| mockWipayPayment | ✅ Yes | ✅ MOCK_PAYMENTS_ENABLED guard | 🟢 LOW | 403 in production is correct |
| mockProcessPayment | ✅ Yes | ✅ MOCK_PAYMENTS_ENABLED guard | 🟢 LOW | 403 in production is correct |

---

## Category 10: Analytics / Reporting

| Function | auth_required | role_check | data_exposure_risk | risk_level |
|----------|--------------|------------|-------------------|------------|
| getAnalyticsDashboard | ✅ Yes | ✅ admin/platform_admin | Aggregate only | 🟢 LOW |

---

## Special Issue: generateStripePaymentLink — CaseRecord Info Leak

**Current code (line 34):**
```js
const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

// Authorization check (line 38-44)
const isAdmin = ['admin', 'platform_admin'].includes(user.role);
const isOwner = caseRecord.client_email === user.email;
const tokenMatch = proposal_token && caseRecord.proposal_token && proposal_token === caseRecord.proposal_token;
if (!isAdmin && !isOwner && !tokenMatch) {
  return Response.json({ error: 'Forbidden', status: 403 });
}
```

**Problem:** Case existence is revealed before ownership check. A non-authorized user learns whether a `case_id` exists (200 vs 404) before receiving a 403.

**Fix options (ranked):**
1. **Best:** Return identical response (generic 404) for both not-found AND forbidden.
2. **Good:** Pre-filter the query: `CaseRecord.filter({ id: case_id, client_email: user.email })` for non-admin paths.
3. **Acceptable:** Move ownership check before service-role fetch; use a user-scoped query first.

---

## Special Issue: iq200Pipeline (process_payment) — Payment Bypass

**Current code (line 300):**
```js
await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
  deposit_option: deposit_option,
  payment_status: deposit_option === 'Full' ? 'Paid In Full' : ...
  status: 'Travel-Coordination',
```

**Problem:** This updates `payment_status` to `"Paid In Full"` / `"50% Paid"` / `"25% Paid"` purely from a `proposal_token` passed in the request body, with no Stripe webhook verification. Any user who knows a proposal token can mark a case as fully paid without paying.

**The idempotency check (line 315) is BACKWARDS:**
```js
if (caseRecord.payment_status !== 'Pending') {
  return Response.json({ success: true, already_processed: true ... });
}
```
This guard runs AFTER the case is already updated, not before.

**Fix:** Remove the `process_payment` action entirely from `iq200Pipeline`. Payment status must ONLY change via `stripePaymentWebhook`.

---

## Special Issue: stripePaymentWebhook — Secondary PI Idempotency Guard

**Current gap:** The webhook de-duplicates by `event_id` only. However, Stripe fires both:
- `checkout.session.completed` (references `payment_intent` id)
- `payment_intent.succeeded` (IS the `payment_intent` id)

Both have different `event_id` values but refer to the same PI. `handlePackagePaymentSuccess` is called for both if the case has a `case_id` in metadata, resulting in **two PaymentTransaction records with `status: succeeded`** and a **double CaseRecord update**.

**Fix:** In `handlePackagePaymentSuccess`, before creating a new PaymentTransaction, check:
```js
if (stripe_payment_intent_id) {
  const existingPI = await base44.asServiceRole.entities.PaymentTransaction.filter({
    stripe_payment_intent_id,
    status: 'succeeded'
  });
  if (existingPI.length > 0) {
    console.log(`[webhook] PI ${stripe_payment_intent_id} already succeeded — skipping.`);
    return;
  }
}
```

---

## Prioritized Fix List

| Priority | Function | Issue | Fix |
|----------|----------|-------|-----|
| **P1-A 🔴** | `iq200Pipeline (process_payment)` | Payment bypass via proposal_token | Remove action entirely. Payment state = webhook only |
| **P1-B 🔴** | `logAuditEvent` | No authentication — audit log can be poisoned by anyone | Add `auth.me()` check; return 401 if no user (system calls should use asServiceRole directly) |
| **P1-C 🔴** | `syncConsultationToCaseRecord` | No auth — any caller can mutate CaseRecord fields | Add automation shared-secret check or restrict to service-role-only invocation |
| **P1-D 🟠** | `safeTProceedWithOverride` | `case_record_id` not validated against authenticated user's consultation | Verify `consultation.id === case_record_id's consultation_id` before CaseRecord update |
| **P1-E 🟠** | `processInformedConsentAndEmail` | Any authenticated user can write signature/consent to any `case_record_id` | Add `CaseRecord.client_email === user.email` check before updating |
| **P1-F 🟠** | `iq200Pipeline (get_case)` | Returns full CaseRecord including all PHI via proposal_token | Whitelist safe fields only; strip medical data, passport tokens, financial details |
| **P2-A 🟠** | `generateStripePaymentLink` | CaseRecord fetched before ownership check → existence leak | Return identical 404 for both not-found and forbidden cases |
| **P2-B 🟠** | `stripePaymentWebhook` | Duplicate PI processing via different event_id | Add secondary guard on `stripe_payment_intent_id` in `handlePackagePaymentSuccess` |
| **P3-A 🟡** | `assignChauffeurServices` | Weak token entropy (`Date.now() + Math.random()`) | Replace with `crypto.getRandomValues()` |
| **P3-B 🟡** | `getPortalData` | Token partner_id not embedded/validated in HMAC payload | Embed `partner_id` in token payload; verify on use |
| **P3-C 🟡** | `requestPassportAccess` | No case-binding on passport_token → enumerate vault existence | Require `case_id` and verify requester is assigned to that case |
| **P3-D 🟡** | `chargeConsultationFee` | No audit log on session creation | Add PaymentTransaction event log (already partially exists) |
| **P3-E 🟡** | `generateConsultationDepositLink` | Without case_id, no ownership on client_email | Require case_id for non-admin callers |

---

## Critical/High Risk Functions — Suggested Tests

### P1-A: iq200Pipeline (process_payment) — PAYMENT BYPASS
```
Test 1: Call process_payment with valid proposal_token + deposit_option="Full"
  → Expected: Should return 403/404/removed (action not found)
  → Actual (pre-fix): Updates case to "Paid In Full" with no payment
  
Test 2: After fix — verify payment_status unchanged after direct API call
  → Only stripePaymentWebhook can set Paid status
```

### P1-B: logAuditEvent — AUDIT POISONING
```
Test 1: Call without auth header
  → Expected: 401 Unauthorized
  → Actual (pre-fix): Creates audit log entry with actor_id=undefined

Test 2: Call with actor_role="admin", actor_id="<fake_admin_id>", sensitive=true
  → Expected: 401 (no auth) or bound to user.id (not payload)
  → Actual (pre-fix): Writes arbitrary audit entry
```

### P1-C: syncConsultationToCaseRecord — UNAUTHORIZED MUTATION
```
Test 1: Call with no auth header, { event: {}, data: { id: "REAL_CASE_ID", consultation_id: "VALID_ID" } }
  → Expected: 401 Unauthorized
  → Actual (pre-fix): Mutates CaseRecord fields
```

### P1-D: safeTProceedWithOverride — SAFE-T BYPASS
```
Test 1: Authenticate as Patient A, call with Patient B's case_record_id
  → Expected: 403 Forbidden (case not bound to user's consultation)
  → Actual (pre-fix): Updates Patient B's case with safe_t_result="PASSED"
```

### P1-E: processInformedConsentAndEmail — CONSENT FORGERY
```
Test 1: Authenticate as any registered user, call with another patient's case_record_id
  → Expected: 403 Forbidden
  → Actual (pre-fix): Overwrites signature_data and accepted_arbitration_clause on victim case
```

### P1-F: iq200Pipeline (get_case) — PHI EXPOSURE
```
Test 1: Call with any valid proposal_token
  → Expected: Only { client_name, procedures, status, final_package_price } returned
  → Actual (pre-fix): Full CaseRecord with medications, allergies, mental_health_notes, passport tokens, signature_data, etc.
```

### P2-A: generateStripePaymentLink — CASE EXISTENCE LEAK
```
Test 1: Authenticated as user with no cases, call with sequential case_ids
  → Expected: Identical response (generic 404) for both non-existent and unauthorized cases
  → Actual (pre-fix): 404 for non-existent, 403 for existing-but-unauthorized → confirms existence
```

### P2-B: stripePaymentWebhook — DOUBLE PI PROCESSING
```
Test 1: Send checkout.session.completed event with case_id metadata
Test 2: Immediately send payment_intent.succeeded for same payment_intent_id
  → Expected: Only 1 PaymentTransaction with status="succeeded" created; CaseRecord updated once
  → Actual (pre-fix): 2 PaymentTransaction records created; CaseRecord updated twice (idempotent but wasteful)
```

---

## Quick Wins vs Deeper Architectural Fixes

### ⚡ Quick Wins (1–4 hours each)
These are isolated, targeted changes with minimal blast radius:

| Fix | Change | Effort |
|-----|--------|--------|
| Remove `process_payment` action | Delete lines 282–516 from `iq200Pipeline.js` | 30 min |
| Fix `logAuditEvent` auth | Add `auth.me()` + 401 guard at top | 15 min |
| Fix `processInformedConsentAndEmail` ownership | Add `CaseRecord.client_email === user.email` before update | 20 min |
| Fix `stripePaymentWebhook` PI idempotency | Add PI filter in `handlePackagePaymentSuccess` | 30 min |
| Fix `generateStripePaymentLink` info leak | Return generic 404 for forbidden cases | 20 min |
| Fix `assignChauffeurServices` token entropy | Replace `Date.now()` with `crypto.getRandomValues()` | 15 min |

### 🏗️ Deeper Architectural Fixes (1–2 days each)
These require more careful thought about side effects:

| Fix | Change | Effort |
|-----|--------|--------|
| `iq200Pipeline (get_case)` field whitelist | Define safe proposal view schema; strip PHI from response | 2–4 hours |
| `safeTProceedWithOverride` case binding | Link `case_record_id` to consultation ownership chain | 2 hours |
| `syncConsultationToCaseRecord` automation auth | Design shared-secret or automation-only invocation pattern | 3 hours |
| `getPortalData` partner_id embedding | Regenerate tokens with partner_id payload; update token issuers | 4 hours |
| `requestPassportAccess` case binding | Require `case_id`; verify requester assignment | 2 hours |
| Migration of demo `ConsultationFee` records | Audit and soft-delete or tag `is_demo: true` pre-launch | 1 hour |

---

## Functions Requiring Follow-Up Reads (Not Yet Audited)

The following functions were not read in this audit cycle due to breadth. They should be audited in a second pass, prioritizing any that accept `case_id`, `consultation_id`, or `user_id` from the request body:

- `pipelineOnConsultationFeePaid` — Handles post-payment workflow; verify it only triggers via webhook
- `pipelineOnDoctorConfirmed` — Verify admin-only or webhook-only
- `portalHubWorkflow` / `portalHubWorkflowEngine` — Complex; verify all action paths have auth
- `executeCaseWorkflow` — Verify admin-only
- `handleWaiverRequest` — Verify ownership on waiver target
- `createHandshake` — Verify case ownership before handshake creation
- `sendSmsNotification` / `sendWhatsAppCaseUpdate` — Verify admin-only for case-linked messages
- `verifyDoctorLicense` / `initiateCheckrScreening` — Verify admin-only
- `stripeIdentityWebhook` — Verify signature (same pattern as stripePaymentWebhook)
- `generateClientProposal` / `generateClientProposalPDF` — Verify proposal_token scope matches case

---

*End of RBAC Audit Plan — v1.0*
*Next review: After P1 fixes are applied and tested.*