# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The M Principle — Non-Negotiable

> "We built this to save lives, not to make profit."

**RED is a hard block. Always.** No bypass button, no workaround, no exception for any business reason.
If a procedure combination is clinically dangerous, M will not facilitate it — full stop.
The client can book elsewhere. M will not be the platform that put their life at risk.
This principle must never be softened, worked around, or compromised in any feature, edge case, or demo.

## Commands

```bash
npm run dev          # Vite dev server (hot reload)
npm run build        # Production build
npm run lint         # ESLint — quiet mode (errors only)
npm run lint:fix     # Auto-fix lint errors
npm run typecheck    # tsc check on src/components + src/pages
npm run preview      # Serve production build locally
```

No test runner is configured. Verify changes by running the dev server and exercising the affected flows.

## Architecture Overview

**What this is:** Medical tourism concierge platform. Clients book dental/aesthetic procedures with verified doctors abroad; the platform coordinates travel logistics, companions, security escorts, and post-operative recovery monitoring.

**Stack:** React 18 + Vite, React Router v6, TanStack React Query v5, Tailwind CSS, Radix UI/shadcn. Backend is Base44 BaaS — the frontend talks to it via `@base44/sdk`; 188 Deno edge functions extend it.

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

### Data Fetching — Two Patterns

**Preferred: React Query** (`@tanstack/react-query`). Specific entity hooks are in `src/hooks/queries/` (useCases, usePayments, useVault, useWorkflow). Use `useQuery`/`useMutation` directly for anything not already in those hooks. The `CACHE` constants in `src/lib/constants.js` provide standard `staleTime` values.

**Legacy: `useEntity` / `useEntitySingle`** (`src/hooks/useEntity.js`). These are `useState + useEffect` wrappers with no React Query caching. They exist in older portal pages. **Do not use for new features.** When touching an existing page that uses `useEntity`, leave it unless the migration is in scope.

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

**Never** write `Deno.serve(async (req) => {...})` directly — always use `createHandler`.

VS Code LSP shows `Cannot find name 'Deno'` and `Cannot find module 'npm:...'` in all edge function files. These are pre-existing config gaps (no Deno type definitions) and are not real errors.

### Roles & RBAC

Role strings live in `src/lib/constants.js` (`ROLES` object). Role arrays live in `src/lib/roles.js` (`ADMIN_ROLES`, `CLIENT_PORTAL_ROLES`, `PARTNER_ROLES`, `DOCTOR_PORTAL_ROLES`, etc.). Never hardcode role strings — always import from one of these locations.

`ProtectedRoute` at `src/components/ProtectedRoute.jsx` handles route-level role enforcement in the frontend. Edge functions enforce roles via `allowedRoles` in `createHandler`.

## Security-Critical Systems

These areas require extra care. Changes here have audit and safety implications:

**PIN Vault** — `src/pages/EmergencyPINSetup.jsx` and related emergency pages. Client-side: PBKDF2-SHA256, 600k iterations, `morales_vault_` localStorage prefix, base64 output. Server-side: 200k iterations, `morales-pin-salt:` prefix, hex output. The two systems are intentionally different — do not conflate them.

**Audit Log Hash Chain** — `base44/functions/logAuditEvent/entry.ts`. Each audit entry stores a SHA-256 hash of the previous entry (`prev_hash`). Any deletion or modification of a log entry breaks the chain — detectable on audit. The `ALLOWED_EVENT_TYPES` Set is the authoritative allowlist.

**Passport Vault tokens** — one-time-use enforcement via `RateLimitBucket`. Token-gated routes in `tokenRoutes.jsx` are accessible without login but require a valid token from the URL.

**Edge function error exposure** — `createHandler` catches all unhandled errors and returns `{ error: 'An internal error occurred.' }`. Never add a catch block that re-throws `error.message` to the client.

## Constants & Design System

All platform-wide magic strings are in `src/lib/constants.js`: `ROLES`, `CASE_STATUS`, `PAYMENT_STATUS`, `ROUTES`, `CACHE`, `TIME`, `AUDIT_EVENTS`, and more. Import from there — do not define strings inline.

**Date formatting:** Uses `date-fns`, not `moment`. Token differences from moment: `d` (not `D`), `yyyy` (not `YYYY`), `EEE` (not `ddd`). The `moment` package is still in `package.json` but has no remaining usages — it can be removed with `npm uninstall moment`.

**Design tokens:** Background `#060B16`, card `#0C1A1D`, border `#2A3F4A`, gold accent `#D4AF37`. Font weight baseline is `font-semibold` (not `font-bold`). SF Pro system font stack via CSS `font-family`.

**Component library:** `src/components/ui/` contains shadcn/ui primitives (auto-generated — do not edit). Custom design system extensions are in `src/components/ui-system/`. Layout components are in `src/components/layout/`.

## Path Alias

`@/` maps to `src/`. Configured in `jsconfig.json` and Vite. Use `@/lib/constants`, `@/api/base44Client`, etc. throughout.
