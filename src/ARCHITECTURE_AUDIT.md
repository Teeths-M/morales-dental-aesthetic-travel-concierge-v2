# Morales Platform — Architecture Audit
**Date:** 2026-06-17 | **Engineer:** Senior Review

---

## 1. ARCHITECTURE OVERVIEW

```
Browser
  └─ React (Vite)
       ├─ lib/AuthContext.jsx          → Auth state (singleton, SSR-safe)
       ├─ context/PlatformModeContext  → Medical/Travel toggle (localStorage)
       ├─ context/CartContext          → Shopping cart
       ├─ App.jsx                      → Router (140+ routes, flat)
       ├─ components/layout/AppLayout  → Shell: Header, Footer, FABs, BiometricGate
       ├─ pages/                       → ~80 route-level pages
       ├─ components/                  → ~120 feature components
       └─ lib/                         → Utilities, pricing engine, AI governance

  └─ Base44 BaaS
       ├─ entities/  (~65 entities)   → Database layer via SDK
       ├─ functions/ (~130 functions) → Deno serverless handlers
       └─ automations/                → Scheduled + entity-triggered jobs
```

### Data Flow
1. `lib/app-params.js` reads URL params / localStorage → seeds `base44Client.js`
2. `AuthContext` initialises on mount: fetches public settings → checks token → hydrates `user`
3. `ProtectedRoute` gates role-based access using `lib/rolePermissions.js`
4. Pages fetch data via `base44.entities.*` (SDK) or `base44.functions.invoke()` (backend functions)
5. `@tanstack/react-query` wraps SDK calls for caching (staleTime: 30s, smart retry)
6. Mutations go direct (no optimistic updates) → refetch on settle

---

## 2. CRITICAL PROBLEM AREAS

### 2a. DUPLICATE PROVIDER WRAPPING (App.jsx)
`PlatformModeProvider` is imported TWICE — once at the top-level import and again wrapping `<AuthenticatedApp>`.
The context file also imports `useEffect` but never uses it.
**Risk:** Every child re-renders on mode change including the entire auth tree.

### 2b. FLAT ROUTE TREE (App.jsx — ~140 routes)
All routes are declared inline in one 250-line JSX file with no code-splitting.
Every route import is eagerly loaded at startup — even admin-only pages load their JS for every anonymous visitor.
**Risk:** Initial JS bundle includes code for DoctorDashboard, AdminConfigApprovals, etc. for every page load.

### 2c. ALERT() FOR USER ERRORS (pages/Home.jsx line 41)
`alert('Error creating estimate. Please try again.')` is a browser-native blocking call.
It breaks the UI thread, cannot be styled, and is inaccessible.
**Risk:** UX regression; impossible to test; blocks the event loop.

### 2d. PREVIEWADMIN CHECK DUPLICATED THREE TIMES (lib/AuthContext.jsx)
The `isPreviewAdmin` guard (`role: 'admin', email: 'preview-admin@base44.app'`) is copy-pasted verbatim at lines 44, 61, and 108.
**Risk:** If preview behaviour changes, all three must be updated in sync.

### 2e. UNUSED IMPORT IN PlatformModeContext
`useEffect` is imported but never used — dead code shipped to every page that imports this context.

### 2f. PRICINGENGINE LOADED CLIENT-SIDE WITH 6 PARALLEL ENTITY FETCHES
`initializePricingEngine()` fires 6 simultaneous `base44.entities.*.list()` calls with no limit parameter.
On a large dataset (e.g., 5000 procedures × 50 countries = 250K CountryPricing rows) this will:
- Exhaust browser memory
- Time out on slow connections
- Block the main thread during JSON parse

### 2g. serviceLayer.js — CIRCUIT BREAKER NEVER WIRED UP
`CircuitBreaker`, `retryWithBackoff`, and `RequestDeduplicator` are exported but **zero pages import them**.
The codebase has a production-grade resilience library that is completely unused.

### 2h. HARDCODED GOLD COLOUR IN EVERY COMPONENT
`const GOLD = '#D4AF37'` is copy-pasted across:
- LuxuryHero.jsx
- ModeToggle.jsx
- TravelConcierge.jsx
- AdminLayout (indirectly via `bg-gradient-to-br from-blue-500`)
**Risk:** A brand refresh requires finding/replacing across 10+ files.

### 2i. usePlatformMode() RETURNS NULL WITHOUT GUARD
`usePlatformMode()` returns `useContext(PlatformModeContext)` which is `null` if called outside the provider.
`LuxuryHero` destructures `{ mode }` from the result — this throws if the provider is ever missing.

### 2j. INLINE STYLE OBJECTS RECREATED ON EVERY RENDER
`LuxuryHero` and `SafeTDiagram` have dozens of `style={{ ... }}` objects computed inline.
React creates a new object reference on every render, dirtying every styled element even when nothing changed.

---

## 3. REFACTORING STRATEGIES

| Priority | Issue | Fix |
|----------|-------|-----|
| 🔴 P0 | Duplicate PlatformModeProvider | Remove second wrapper from App.jsx |
| 🔴 P0 | alert() in Home.jsx | Replace with useToast() |
| 🔴 P0 | Dead useEffect import in context | Remove |
| 🟠 P1 | isPreviewAdmin duplication | Extract PREVIEW_USER constant |
| 🟠 P1 | GOLD constant scattered | Centralise in lib/brandTokens.js |
| 🟠 P1 | usePlatformMode null guard | Add safety check |
| 🟡 P2 | initializePricingEngine unbounded lists | Add list(sort, limit) |
| 🟡 P2 | serviceLayer unused | Wire retryWithBackoff into base44Client or a useFetch hook |
| 🟢 P3 | Route code-splitting | React.lazy + Suspense for admin routes |
| 🟢 P3 | Inline style objects | Extract to module-level constants |