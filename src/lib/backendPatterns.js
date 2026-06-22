/**
 * Backend Function Patterns — Copy-paste snippets for new/refactored Deno functions.
 *
 * Backend functions deploy independently; no shared local imports exist.
 * Copy the relevant block into each function file.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BLOCK 1 — HTTP helpers + safeHandler
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * const jsonOk    = (data, status = 200) => Response.json(data, { status });
 * const jsonError = (msg, status = 500, code) => {
 *   const b = { error: msg }; if (code) b.code = code;
 *   return Response.json(b, { status });
 * };
 * // safeHandler: catches thrown Response objects AND unexpected errors.
 * // Never leaks stack traces. Use inside Deno.serve().
 * const safeHandler = (fn) => async (req) => {
 *   try { return await fn(req); }
 *   catch (err) {
 *     if (err instanceof Response) return err;
 *     console.error('[handler]', err?.message ?? err);
 *     return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
 *   }
 * };
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BLOCK 2 — Auth guards (throw-pattern, use with safeHandler)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * const ADMIN_ROLES = ['admin', 'platform_admin'];
 * async function requireUser(base44) {
 *   const user = await base44.auth.me();
 *   if (!user) throw jsonError('Unauthorized', 401, 'UNAUTHENTICATED');
 *   return user;
 * }
 * async function requireAdmin(base44) {
 *   const user = await requireUser(base44);
 *   if (!ADMIN_ROLES.includes(user.role)) throw jsonError('Admin access required', 403, 'FORBIDDEN');
 *   return user;
 * }
 * async function requireAnyRole(base44, roles) {
 *   const user = await requireUser(base44);
 *   if (!roles.includes(user.role)) throw jsonError('Access denied', 403, 'FORBIDDEN');
 *   return user;
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BLOCK 3 — Entity helpers
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * // RULE: NEVER use .filter({ id: someId }) for primary-key lookups.
 * //       filter() does not support the built-in `id` field — returns [].
 * //       Always use entityClient.get(id).
 * async function getById(entityClient, id, name = 'record') {
 *   if (!id) throw jsonError(`${name} id is required`, 400, 'MISSING_ID');
 *   const rec = await entityClient.get(id);
 *   if (!rec) throw jsonError(`${name} not found`, 404, 'NOT_FOUND');
 *   return rec;
 * }
 * function appendTimeline(existing, event) {
 *   return [...(Array.isArray(existing) ? existing : []),
 *     { timestamp: new Date().toISOString(), ...event }];
 * }
 * // Stripe idempotency guard
 * async function isEventAlreadyProcessed(entities, eventId) {
 *   const r = await entities.PaymentTransaction.filter({ event_id: eventId }, '-created_date', 1);
 *   return r.length > 0;
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BLOCK 4 — Token helpers
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * async function generateSecureToken(prefix = '', bytes = 32) {
 *   const raw = new Uint8Array(bytes);
 *   crypto.getRandomValues(raw);
 *   return prefix + Array.from(raw).map(b => b.toString(16).padStart(2, '0')).join('');
 * }
 * async function sha256(text) {
 *   const buf = new TextEncoder().encode(text);
 *   const hash = await crypto.subtle.digest('SHA-256', buf);
 *   return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
 * }
 * async function encodePortalToken({ consultation_id, partner_id, portal_type }) {
 *   const payload = { consultation_id, partner_id, portal_type,
 *     expires_at: Date.now() + 7*24*60*60*1000 };
 *   const secret = Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production';
 *   const data = JSON.stringify(payload);
 *   const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
 *     { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
 *   const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
 *   const sigHex = Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');
 *   return btoa(data) + '.' + sigHex;
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BLOCK 5 — Role constants
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * const ADMIN_ROLES   = ['admin', 'platform_admin'];
 * const CLIENT_ROLES  = ['client', 'user'];
 * const PARTNER_ROLES = ['doctor','travel_agency','taxi_service','companion','security_agency'];
 * const isAdmin   = (role) => ADMIN_ROLES.includes(role);
 * const isPartner = (role) => PARTNER_ROLES.includes(role);
 */

// This file is frontend-only documentation. It is never deployed as a backend function.
export const BACKEND_PATTERNS_VERSION = '1.0.0';