/**
 * _shared/http.js
 * HTTP response helpers and the safeHandler wrapper for backend functions.
 *
 * NOTE: Backend functions deploy independently — no local imports between them.
 * Copy-paste or inline these helpers into each function that needs them.
 *
 * Usage (inline in each function):
 *
 *   function jsonOk(data, status = 200) { return Response.json(data, { status }); }
 *   function jsonError(msg, status = 500, code) {
 *     const b = { error: msg }; if (code) b.code = code; return Response.json(b, { status });
 *   }
 *   function safeHandler(fn) {
 *     return async (req) => {
 *       try { return await fn(req); }
 *       catch (err) {
 *         if (err instanceof Response) return err;
 *         console.error('[safeHandler]', err?.message ?? err);
 *         return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
 *       }
 *     };
 *   }
 *
 * This file is a reference / documentation artifact only.
 * The actual helpers are inlined into each function file.
 */

// ── Inline snippets for copy-paste into function files ────────────────────────

export const INLINE_HELPERS = `
// ── HTTP helpers (inline — functions deploy independently) ──────────────────
const jsonOk    = (data, status = 200)              => Response.json(data, { status });
const jsonError = (msg, status = 500, code)         => {
  const b = { error: msg }; if (code) b.code = code; return Response.json(b, { status });
};
const safeHandler = (fn) => async (req) => {
  try { return await fn(req); }
  catch (err) {
    if (err instanceof Response) return err;
    console.error('[handler]', err?.message ?? err);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
};
// ── Auth helpers ─────────────────────────────────────────────────────────────
const ADMIN_ROLES  = ['admin', 'platform_admin'];
async function requireUser(base44) {
  const user = await base44.auth.me();
  if (!user) throw jsonError('Unauthorized', 401, 'UNAUTHENTICATED');
  return user;
}
async function requireAdmin(base44) {
  const user = await requireUser(base44);
  if (!ADMIN_ROLES.includes(user.role)) throw jsonError('Admin access required', 403, 'FORBIDDEN');
  return user;
}
// ── Entity helpers ───────────────────────────────────────────────────────────
async function getById(entityClient, id, name = 'record') {
  if (!id) throw jsonError(\`\${name} id is required\`, 400, 'MISSING_ID');
  const rec = await entityClient.get(id);
  if (!rec) throw jsonError(\`\${name} not found\`, 404, 'NOT_FOUND');
  return rec;
}
function appendTimeline(existing, event) {
  return [...(Array.isArray(existing) ? existing : []), { timestamp: new Date().toISOString(), ...event }];
}
`;