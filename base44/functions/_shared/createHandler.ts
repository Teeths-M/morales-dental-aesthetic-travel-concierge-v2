/**
 * createHandler — Shared edge function middleware factory
 *
 * Eliminates the auth/error/logging boilerplate repeated across 188 edge functions.
 * Each function only needs to contain its business logic.
 *
 * Usage:
 *   import { createHandler } from '../_shared/createHandler.ts';
 *
 *   Deno.serve(createHandler(async ({ base44, user, body }) => {
 *     const { thing } = await body();
 *     return Response.json({ ok: true });
 *   }, { name: 'myFunction', allowedRoles: ['admin'] }));
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { reportIncident, generateIncidentCode } from './incidentReporting.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Base44Client = ReturnType<typeof createClientFromRequest>;

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
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
        if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
          return respond({ error: 'Forbidden' }, 403, requestId);
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
