// ── Internal service-to-service authorization ──────────────────────────────
// For functions that must stay reachable with no forwardable user session
// (called via base44.asServiceRole.functions.invoke from another edge
// function — e.g. a webhook-verified caller with no browser session to
// forward), but must NOT be reachable by a truly anonymous request.
//
// Unlike cronAuthorized() (_shared/cronAuth.ts), which reads a request
// header, there is no precedent in this codebase for passing custom headers
// through .functions.invoke() — so the secret is checked as a body field
// instead. Reuses CRON_SECRET rather than introducing a new Base44 secret,
// since it already exists for exactly this "trusted automation, no user"
// purpose.
//
// Secure default: if CRON_SECRET is unset, only an admin/platform_admin
// session is accepted — never open just because the secret wasn't configured.

export async function internalOrAdminAuthorized(
  internalSecret: string | undefined,
  base44: any,
): Promise<boolean> {
  const secret = Deno.env.get('CRON_SECRET');
  if (secret && internalSecret && internalSecret.length === secret.length && internalSecret === secret) {
    return true;
  }
  try {
    const u = await base44.auth.me();
    if (u && (u.role === 'admin' || u.role === 'platform_admin')) return true;
  } catch (_) { /* no session — fall through */ }
  return false;
}
