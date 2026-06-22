/**
 * _shared/auth.js  — REFERENCE ONLY
 *
 * Backend functions deploy independently and cannot import local files.
 * Inline the snippet below into each function that needs auth guards.
 *
 * Inline snippet:
 *
 *   const ADMIN_ROLES = ['admin', 'platform_admin'];
 *   async function requireUser(base44) {
 *     const user = await base44.auth.me();
 *     if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
 *     return user;
 *   }
 *   async function requireAdmin(base44) {
 *     const user = await base44.auth.me();
 *     if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
 *     if (!ADMIN_ROLES.includes(user.role)) return Response.json({ error: 'Admin access required' }, { status: 403 });
 *     return user;
 *   }
 *
 * NOTE: For the throw-pattern (with safeHandler), throw a Response object:
 *   async function requireUser(base44) {
 *     const user = await base44.auth.me();
 *     if (!user) throw Response.json({ error: 'Unauthorized' }, { status: 401 });
 *     return user;
 *   }
 */

export const ADMIN_ROLES = ['admin', 'platform_admin'];