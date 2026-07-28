/**
 * createHandler — Shared edge function middleware factory
 *
 * Local copy for this function (CFW runtime does not support importing
 * from a sibling `_shared/` directory — only `base44/shared/` or files
 * within this function's own directory resolve).
 *
 * Usage:
 *   import { createHandler } from './createHandler.ts';
 *
 *   Deno.serve(createHandler(async ({ base44, user, body }) => {
 *     const { thing } = await body();
 *     return Response.json({ ok: true });
 *   }, { name: 'myFunction', allowedRoles: ['admin'] }));
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { reportIncident, generateIncidentCode } from './incidentReporting.ts';
import { enforceRateLimit } from './rateLimit.ts';
import { validate, type z } from './validate.ts';

// Sensible default for any public (requireAuth:false) function that doesn't
// specify its own policy: generous enough not to break legitimate use of a
// read-only/token-gated endpoint, strict enough to stop scripted abuse.
const DEFAULT_PUBLIC_RATE_LIMIT = { max: 60, windowSeconds: 60 };

// ── Types ─────────────────────────────────────────────────────────────────────

export type Base44Client = ReturnType<typeof createClientFromRequest>;

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  /** Set by _shared/anonymizePatientRecords.ts the moment a self-service or
   *  admin GDPR erasure actually runs (despite the name, it's a completion
   *  marker, not a pending-request one). Any account carrying it is rejected
   *  below — otherwise "deletion" was only ever a client-side AuthContext
   *  redirect, and a stale session or raw API client kept working forever. */
  account_deletion_requested_at?: string;
}

export interface HandlerContext {
  req: Request;
  base44: Base44Client;
  /** Authenticated user. Always non-null when requireAuth is true (default). */
  user: AuthUser | null;
  /** Lazily parses the JSON body once — safe to call multiple times. */
  body: <T = Record<string, unknown>>() => Promise<T>;
  /** Short unique ID for this request — included in logs and response headers. */
  requestId: string;
}

export interface HandlerOptions {
  /** Require a valid session. Default: true. */
  requireAuth?: boolean;
  /** If set, user.role must be in this list or the request is rejected 403. */
  allowedRoles?: string[];
  /** Function name used in structured logs. */
  name?: string;
  /**
   * Rate-limit policy. Omit to get DEFAULT_PUBLIC_RATE_LIMIT automatically
   * whenever requireAuth is false (no action needed for most public
   * functions). Pass `false` to explicitly opt out — reserve this for cron
   * jobs (cronAuthorized/CRON_SECRET is the real gate), internal
   * service-to-service calls (internalOrAdminAuthorized), signature-verified
   * webhooks (a low IP ceiling would throttle legitimate provider bursts), or
   * a function that already rate-limits itself inline via RateLimitBucket
   * (avoids silently double-limiting through two independent mechanisms).
   * Pass an explicit `{ max, windowSeconds }` for a custom policy.
   */
  rateLimit?: { max: number; windowSeconds: number } | false;
  /**
   * Zod schema (from _shared/validate.ts) the request body must satisfy.
   * When set, createHandler parses the body once, validates it right after
   * auth/rate-limit and BEFORE the handler runs, and short-circuits with a
   * clean 400 on failure (message built only from the schema's own issue
   * text — never raw validator/stack internals). On success, ctx.body()
   * returns the validated, coerced, defaulted object, so adding a schema to
   * an existing function often requires no change to its handler body.
   *
   * Omit for a function whose shape depends on the payload itself (e.g. an
   * `action`-discriminated body) — express those with z.discriminatedUnion
   * and call validate() manually inside the handler instead.
   */
  bodySchema?: z.ZodType<any>;
}

type HandlerFn = (ctx: HandlerContext) => Promise<Response>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createHandler(fn: HandlerFn, opts: HandlerOptions = {}) {
  const { requireAuth = true, allowedRoles, name = 'fn' } = opts;

  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID().slice(0, 8);
    const start = performance.now();

    try {
      const base44 = createClientFromRequest(req);

      // ── Auth ───────────────────────────────────────────────────────────────
      let user: AuthUser | null = null;
      if (requireAuth) {
        try {
          user = await base44.auth.me();
        } catch (_) {
          return respond({ error: 'Unauthorized' }, 401, requestId);
        }
        if (!user) return respond({ error: 'Unauthorized' }, 401, requestId);
        if (user.account_deletion_requested_at) {
          return respond({ error: 'This account has been deleted.' }, 403, requestId);
        }
        if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
          return respond({ error: 'Forbidden' }, 403, requestId);
        }
      }

      // ── Rate limit ─────────────────────────────────────────────────────────
      // Explicit opts.rateLimit wins; otherwise a public function gets the
      // sensible default automatically, and an authenticated one gets none
      // (a separate future concern — this covers public endpoints).
      const effectivePolicy = opts.rateLimit === false
        ? null
        : opts.rateLimit ?? (requireAuth === false ? DEFAULT_PUBLIC_RATE_LIMIT : null);

      if (effectivePolicy) {
        const limited = await enforceRateLimit(base44, req, {
          functionName: name,
          max: effectivePolicy.max,
          windowSeconds: effectivePolicy.windowSeconds,
          userId: user?.id ?? null,
        });
        if (limited) {
          const headers = new Headers(limited.headers);
          headers.set('X-Request-Id', requestId);
          return new Response(limited.body, { status: limited.status, headers });
        }
      }

      // ── Body (lazy, single-parse) ──────────────────────────────────────────
      let cached: unknown;
      const body = async <T>(): Promise<T> => {
        if (cached === undefined) {
          cached = await req.json().catch(() => ({}));
        }
        return cached as T;
      };

      // ── Schema validation ───────────────────────────────────────────────────
      // Runs before the handler so a malformed/oversized/unexpected-field body
      // never reaches business logic. Replaces the cached body with the
      // validated (coerced, defaulted) object so handlers keep working
      // unchanged once a schema is added.
      if (opts.bodySchema) {
        const raw = await body();
        const result = validate(opts.bodySchema, raw);
        if (!result.ok) return respond({ error: result.message }, 400, requestId);
        cached = result.data;
      }

      // ── Delegate to handler ────────────────────────────────────────────────
      const response = await fn({ req, base44, user, body, requestId });

      // Stamp all responses with timing and correlation ID
      const ms = Math.round(performance.now() - start);
      const headers = new Headers(response.headers);
      headers.set('X-Request-Id', requestId);
      headers.set('X-Response-Time', `${ms}ms`);

      return new Response(response.body, { status: response.status, headers });

    } catch (err) {
      const ms = Math.round(performance.now() - start);
      console.error(`[${name}][${requestId}] unhandled error after ${ms}ms:`, err);

      // Reliability & Incident Response (Phase 1/Core) — awaited (not fire-and-forget)
      // since the isolate may tear down right after this response returns. Bounded
      // by a timeout race so a hung email send can never delay the error response.
      // Every step here is independently defensive — must never affect the response.
      const incidentCode = generateIncidentCode();
      try {
        const incidentBase44 = createClientFromRequest(req);
        await Promise.race([
          reportIncident({
            base44: incidentBase44,
            incidentCode,
            severity: 'high',
            source: 'api',
            feature: name,
            errorMessage: err instanceof Error ? err.message : String(err),
            stackTrace: err instanceof Error ? err.stack : undefined,
          }),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (_) { /* incident reporting must never affect the error response */ }

      return respond({ error: 'An internal error occurred.', incident_code: incidentCode }, 500, requestId);
    }
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convenience: build a JSON response with the correlation header. */
function respond(data: unknown, status: number, requestId: string): Response {
  return Response.json(data, {
    status,
    headers: {
      'X-Request-Id': requestId,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  });
}

/**
 * ok — shorthand for a 200 success response.
 * Import and use in handlers to keep them terse.
 */
export const ok = (data: unknown): Response => Response.json(data, {
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  },
});

/**
 * err — shorthand for an error response with a user-safe message.
 * Never pass `error.message` directly — it may contain internal details.
 */
export const err = (message: string, status = 400): Response =>
  Response.json({ error: message }, { status });