// DUPLICATED from base44/functions/_shared/validate.ts — see createHandler.ts in this
// same directory for why. Keep in sync by hand.

// ── Shared request-body validation (OWASP input-validation hardening) ───────
// Schema-based type checks, length limits, and reject-unexpected-fields for
// edge function request bodies. Zod is pinned to one exact version here —
// this is the only file that names it, so a future bump is a one-line change
// (same pattern as npm:stripe@17.0.0 and npm:@base44/sdk@0.8.31 elsewhere in
// this repo; Deno resolves npm: specifiers natively, no import map needed).
//
// This module never builds a Response and never imports createHandler.ts —
// callers (a handler body, or createHandler's own bodySchema hook) turn the
// returned outcome into a Response with whatever err()/respond() helper they
// already have in scope. Keeps the dependency one-directional so
// createHandler.ts can import this without a circular import.

import { z } from 'npm:zod@3.23.8';
export { z };

export type ValidationOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

/**
 * strictObject — the only way a function in this codebase should declare a
 * request-body shape. A bare z.object(...) silently drops unknown keys,
 * which looks safe but is NOT the same as rejecting them — .strict() makes
 * an unexpected field fail validation instead.
 */
export function strictObject<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}

/**
 * validate — parse `raw` against `schema`. Never throws.
 *
 * On failure the message is built only from the schema's own issue path +
 * message (author-controlled strings, e.g. "travelers_count: Number must be
 * less than or equal to 20") — never any exception trace or the raw ZodError
 * object — so it's always safe to return directly to an untrusted client.
 * Capped at 10 issues so a pathological payload can't blow up the string.
 */
export function validate<T>(schema: z.ZodType<T>, raw: unknown): ValidationOutcome<T> {
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };

  const messages = result.error.issues.slice(0, 10).map((issue) => {
    const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  return { ok: false, message: messages.join('; ') || 'Invalid request.' };
}

// ── Common field builders ────────────────────────────────────────────────────
// Small, reusable primitives so length caps / trimming / coercion stay
// consistent across functions instead of being re-invented per file.
export const Fields = {
  email: () => z.string().trim().toLowerCase().max(254).email(),
  shortText: (max = 200) => z.string().trim().min(1, 'Required').max(max),
  optionalText: (max = 2000) => z.string().trim().max(max).optional().default(''),
  isoDate: () => z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be a date (YYYY-MM-DD)'),
  // Coerce-then-validate: accepts "3" or 3, rejects "abc" or out-of-range —
  // protects any caller that sends a loosely-typed number without changing
  // behavior for callers that already send a real number.
  boundedInt: (min: number, max: number) => z.coerce.number().int().min(min).max(max),
};
