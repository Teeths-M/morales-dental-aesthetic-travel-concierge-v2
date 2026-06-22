# Morales Platform — Production Deployment Guide
**Role:** Senior DevOps Engineer  
**Date:** 2026-06-17  
**Stack:** Base44 BaaS (Deno backend functions) + Vite/React SPA  

> **Important context:** This app runs on the Base44 platform. You do NOT manage servers, Kubernetes nodes, or Docker runtimes directly — Base44 handles that layer. This guide covers what YOU own: CI/CD pipelines, environment configuration, monitoring, reliability patterns, and deployment workflow for your codebase.

---

## 1. INFRASTRUCTURE ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  Browser / iOS PWA / Android PWA                                 │
│  CDN-served static assets (Base44 managed)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│                    BASE44 PLATFORM LAYER                         │
│                                                                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐ │
│  │  Vite/React SPA │   │  Deno Functions  │   │   Entity DB   │ │
│  │  (static CDN)   │   │  (auto-scaled)   │   │  (managed)    │ │
│  └────────┬────────┘   └────────┬─────────┘   └───────┬───────┘ │
│           │                     │                       │         │
│  ┌────────▼─────────────────────▼───────────────────────▼──────┐ │
│  │              Base44 Auth / RLS / SDK                         │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│  Stripe (payments) │ Twilio (SMS) │ SendEmail (Base44 Core)      │
│  VAPID (push)      │ IPInfo (geo) │ ExchangeRate API             │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   YOUR CI/CD LAYER (GitHub)                      │
│  GitHub Actions → Lint → Test → Build → Deploy via Base44 CLI   │
└─────────────────────────────────────────────────────────────────┘
```

### What Base44 manages for you (zero ops overhead):
- TLS/HTTPS certificates (auto-renewed)
- Horizontal scaling of Deno function runtimes
- Database replication and backups
- CDN distribution of static assets
- DDoS protection

### What YOU manage:
- Source code quality and deployments
- Secrets rotation
- Third-party API reliability (Stripe, Twilio)
- Application-level monitoring and alerting
- Feature flags and rollout strategy

---

## 2. ENVIRONMENT STRATEGY

### Three environments:

| Environment | Purpose | Base44 App |
|-------------|---------|-----------|
| `development` | Local dev, feature branches | Local Vite dev server |
| `staging` | Pre-release validation, QA | Separate Base44 app (staging) |
| `production` | Live users | Current Base44 app |

### Required secrets per environment:

```bash
# PRODUCTION — set in Base44 App Secrets dashboard
ADMIN_EMAIL              # ops alert recipient
STRIPE_SECRET_KEY        # live key (sk_live_...)
STRIPE_WEBHOOK_SECRET    # live webhook signing secret
VAPID_PUBLIC_KEY         # push notifications
VAPID_PRIVATE_KEY
PORTAL_TOKEN_SECRET      # HMAC secret for portal tokens — rotate every 90 days
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
EXCHANGERATE_API_KEY
IPINFO_API_KEY
APP_URL                  # https://your-domain.com

# STAGING — separate Base44 app with test keys
STRIPE_SECRET_KEY        # test key (sk_test_...)
STRIPE_WEBHOOK_SECRET    # staging webhook secret
APP_URL                  # https://staging.your-domain.com
```

### Secret rotation schedule:
- `PORTAL_TOKEN_SECRET` → every 90 days (invalidates portal links — schedule with notice)
- `STRIPE_WEBHOOK_SECRET` → rotate when team members leave
- `TWILIO_AUTH_TOKEN` → rotate every 180 days
- All others → annual review minimum

---

## 3. CI/CD PIPELINE

### Repository structure:
```
main        → auto-deploys to PRODUCTION
staging     → auto-deploys to STAGING
feature/*   → PR required to merge → staging
```

### GitHub Actions — `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  # ── QUALITY GATE ────────────────────────────────────────────────
  quality:
    name: Lint & Build Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run build -- --mode check
        # Catches broken imports, missing icons, JSX errors before deploy

      - name: Build production bundle
        run: npm run build
        env:
          NODE_ENV: production

      - name: Check bundle size
        run: |
          SIZE=$(du -sh dist | cut -f1)
          echo "Bundle size: $SIZE"
          # Fail if > 10MB (adjust threshold as needed)
          find dist -name "*.js" -size +5M -exec echo "WARNING: Large chunk detected: {}" \;

  # ── SECURITY SCAN ───────────────────────────────────────────────
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: npm audit
        run: npm audit --audit-level=high
        # Fail on HIGH or CRITICAL CVEs in dependencies

  # ── DEPLOY TO STAGING ───────────────────────────────────────────
  deploy-staging:
    name: Deploy → Staging
    needs: [quality, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Base44 (Staging)
        run: npx @base44/cli deploy --app-id ${{ secrets.BASE44_STAGING_APP_ID }}
        env:
          BASE44_API_KEY: ${{ secrets.BASE44_STAGING_API_KEY }}

      - name: Smoke test staging
        run: |
          sleep 10  # Wait for deployment propagation
          curl -f https://staging.your-domain.com/health || exit 1
        continue-on-error: true

      - name: Notify Slack — Staging deployed
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text":"✅ Staging deployed: ${{ github.sha }}"}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  # ── DEPLOY TO PRODUCTION ────────────────────────────────────────
  deploy-production:
    name: Deploy → Production
    needs: [quality, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production   # Requires manual approval in GitHub Environments settings
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Base44 (Production)
        run: npx @base44/cli deploy --app-id ${{ secrets.BASE44_PROD_APP_ID }}
        env:
          BASE44_API_KEY: ${{ secrets.BASE44_PROD_API_KEY }}

      - name: Production smoke test
        run: |
          sleep 15
          curl -f https://your-domain.com/ || exit 1
          curl -f https://your-domain.com/consultation || exit 1

      - name: Notify Slack — Production deployed
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text":"🚀 Production deployed: ${{ github.sha }} by ${{ github.actor }}"}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Rollback procedure:
```bash
# Via GitHub: re-run the previous successful deployment workflow
# OR manually revert and push:
git revert HEAD --no-edit
git push origin main

# For database schema issues (entity changes):
# Base44 entity schema changes are additive — never remove fields in production.
# Add new fields; deprecate old ones with a comment before eventual removal.
```

---

## 4. RELIABILITY PATTERNS

### 4.1 Backend function resilience

Every production backend function should follow this pattern:

```javascript
// Pattern: Validate → Guard → Execute → Audit → Respond
Deno.serve(async (req) => {
  try {
    // 1. Auth guard — always first
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Input validation — before any DB calls
    const body = await req.json();
    if (!body.required_field) {
      return Response.json({ error: 'required_field is required' }, { status: 400 });
    }

    // 3. Business logic

    // 4. Never leak internals
    return Response.json({ success: true });
  } catch (error) {
    console.error('[functionName]', error.message);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
```

### 4.2 Critical automation health checks

These automations are safety-critical and must be monitored:

| Automation | Interval | Alert if silent for |
|------------|----------|---------------------|
| `scheduleSoloCheckIns` | 30 min | 1 hour |
| `escalateSoloCheckIn` | 30 min | 1 hour |
| `expireDoctorVerifications` | Daily | 26 hours |
| `alertStagnantCases` | Daily | 26 hours |
| `expireConfigChanges` | Hourly | 2 hours |
| `verifyAuditChain` | 6 hours | 8 hours |

### 4.3 Feature flags (manual, via entity)

Add a `FeatureFlag` entity for zero-downtime rollouts:
```json
{ "name": "FeatureFlag", "properties": {
  "flag_name": { "type": "string" },
  "is_enabled": { "type": "boolean", "default": false },
  "rollout_percentage": { "type": "number", "default": 0 }
}}
```
Usage in components:
```js
const flags = await base44.entities.FeatureFlag.filter({ flag_name: 'new_booking_flow' });
if (flags[0]?.is_enabled) { /* show new UI */ }
```

---

## 5. MONITORING STRATEGY

### 5.1 Application-level monitoring (implement in app)

**Error tracking — add to `App.jsx`:**
```jsx
// Install: npm install @sentry/react
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,   // 10% of transactions
  replaysOnErrorSampleRate: 1.0,
});
```

**Key events to track (already wired via `base44.analytics.track()`):**
- `consultation_submitted`
- `payment_initiated` / `payment_completed`
- `sos_triggered`
- `vault_document_uploaded`
- `solo_checkin_acknowledged`
- `doctor_verification_submitted`

### 5.2 Uptime monitoring

Use one of these free/low-cost services to ping production endpoints every minute:

| Service | Free tier | Setup |
|---------|-----------|-------|
| **UptimeRobot** | 50 monitors, 5-min intervals | Monitor `https://your-domain.com/` |
| **Better Uptime** | 10 monitors, 3-min intervals | Monitor + incident management |
| **Freshping** | 50 monitors, 1-min intervals | Best free option |

**Critical endpoints to monitor:**
```
https://your-domain.com/                    # Homepage
https://your-domain.com/consultation        # Core conversion page
https://your-domain.com/emergency           # Safety-critical
```

### 5.3 Stripe webhook health

In Stripe Dashboard → Developers → Webhooks:
- Set up email alerts for failed webhook deliveries
- Monitor `stripePaymentWebhook` for >2% error rate
- Stripe retries failed webhooks for 72 hours — check logs daily

### 5.4 Twilio SMS health

```javascript
// Add to scheduleSoloCheckIns.js — alert if Twilio fails
// Twilio provides delivery receipts via status callbacks
// Monitor for high "failed" or "undelivered" rates in Twilio Console
```

### 5.5 AuditLog chain integrity

Already automated via `verifyAuditChain` (6-hour schedule). Verify it's active:
- Check `admin/audit-chain` page weekly
- Alert fires if chain integrity check fails

---

## 6. PERFORMANCE OPTIMIZATION

### 6.1 Frontend bundle optimization

Add to `vite.config.js`:
```javascript
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'recharts'],
          'map-vendor': ['react-leaflet', 'leaflet'],
          'three-vendor': ['three'],
        }
      }
    },
    chunkSizeWarningLimit: 800,
  }
}
```

### 6.2 Entity query optimization

Current risk areas — queries without limits on large tables:

```javascript
// ❌ Dangerous at scale — fetches entire table
await base44.entities.AuditLog.list();

// ✅ Always paginate
await base44.entities.AuditLog.list('-timestamp', 50);

// ✅ Always filter + limit in backend functions
await base44.asServiceRole.entities.SoloCheckIn.filter(
  { status: 'pending' }, '-scheduled_time', 100
);
```

### 6.3 React Query caching (already installed)

Ensure TanStack Query is used for all entity reads in dashboards — it provides:
- Automatic deduplication of concurrent requests
- Background refetch on window focus
- Stale-while-revalidate pattern

---

## 7. PRODUCTION DEPLOYMENT CHECKLIST

### Pre-deployment (48 hours before)
- [ ] All secrets set in production Base44 app
- [ ] Staging deployment verified and smoke-tested
- [ ] Stripe webhook URL updated to production endpoint
- [ ] VAPID keys confirmed (push notifications)
- [ ] `APP_URL` secret set to production domain
- [ ] All entity schemas are backwards-compatible (no removed fields)
- [ ] Security audit findings resolved (see SECURITY_AUDIT.md)
- [ ] npm audit clean (`npm audit --audit-level=high`)
- [ ] Bundle size checked (< 5MB per chunk)

### Pre-deployment (1 hour before)
- [ ] Notify users of maintenance window (if schema migrations involved)
- [ ] Enable staging environment for final QA pass
- [ ] Confirm all automations are active and healthy in Base44 dashboard
- [ ] Stripe test mode disabled on production app
- [ ] Verify `STRIPE_SECRET_KEY` starts with `sk_live_` not `sk_test_`
- [ ] Confirm Twilio production phone number is active

### Deployment
- [ ] Merge PR to `main` via GitHub (triggers CI/CD)
- [ ] Approve production deployment in GitHub Environments
- [ ] Monitor GitHub Actions for green status
- [ ] Watch Base44 function logs for first 5 minutes post-deploy

### Post-deployment (30 minutes after)
- [ ] Verify homepage loads correctly
- [ ] Place a test consultation submission
- [ ] Verify SoloCheckIn automation fired within 30 min window
- [ ] Confirm Stripe webhook receives events (check Stripe Dashboard)
- [ ] Check UptimeRobot / monitoring shows green
- [ ] Audit log chain integrity check passes

### Rollback triggers (immediate rollback if any occur)
- [ ] >5% error rate on any backend function
- [ ] Stripe webhook delivery failures
- [ ] AuditLog chain integrity broken
- [ ] SOS endpoint returning errors
- [ ] Emergency PIN verification failing
- [ ] Homepage not loading

---

## 8. DISASTER RECOVERY

### Scenario 1: Stripe webhook stops processing
1. Check `stripePaymentWebhook` function logs in Base44 dashboard
2. Stripe retries for 72 hours — no payments lost yet
3. Fix bug → redeploy → Stripe replays failed events
4. Verify PaymentTransaction records reconcile with Stripe Dashboard

### Scenario 2: Solo traveler check-in automation fails
1. Immediately check the `scheduleSoloCheckIns` automation in Base44 → Automations
2. Manually trigger `escalateSoloCheckIn` for any overdue cases via admin panel
3. Contact affected users via `ADMIN_EMAIL` fallback
4. Fix root cause → re-enable automation

### Scenario 3: Data breach / key compromise
1. Immediately rotate `PORTAL_TOKEN_SECRET` (invalidates all portal links)
2. Rotate Stripe keys via Stripe Dashboard
3. Rotate Twilio auth token
4. Rotate VAPID keys (users must re-subscribe to push)
5. All PassportVault data is zero-knowledge encrypted — client keys not compromised
6. Review AuditLog chain for signs of unauthorized access
7. Notify affected users per your privacy policy obligations

### Scenario 4: Emergency access during outage
- `/emergency-manifest` page works offline (cached)
- `/emergency-access` PIN page has no external dependencies
- Emergency contacts can be notified via Twilio SMS independently of the app

---

## 9. ONGOING OPERATIONS

### Daily (automated)
- Uptime monitoring alerts (UptimeRobot)
- Stripe failed webhook alerts
- `alertStagnantCases` automation report

### Weekly (manual, 15 min)
- Review Base44 function error logs
- Check audit chain at `/admin/audit-chain`
- Review `npm audit` in CI results

### Monthly
- Review and rotate any secrets approaching 90-day mark
- Review AuditLog for unusual access patterns
- Check Stripe payout reconciliation
- Review `PartnerVerification` queue for stale items

### Quarterly
- Full security audit review (update SECURITY_AUDIT.md)
- Dependency updates (`npm outdated`)
- Review and archive stale `CaseRecord` entries
- Load test staging with representative data volume