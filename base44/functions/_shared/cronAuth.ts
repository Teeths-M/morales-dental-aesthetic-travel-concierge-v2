// ── Cron / agent authorization ────────────────────────────────────────────────
// Lets the scheduled freshness jobs be driven by an external scheduler (GitHub
// Actions) OR run manually by an admin, without opening the endpoints to the
// world. A request is authorized when EITHER:
//   • it carries X-Cron-Secret matching the CRON_SECRET env var, OR
//   • it is an authenticated admin / platform_admin session.
//
// Secure default: if CRON_SECRET is unset, only an admin session is accepted —
// the endpoints are never open just because the secret wasn't configured.

export async function cronAuthorized(req: Request, base44: any): Promise<boolean> {
  const secret = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret') || req.headers.get('X-Cron-Secret');
  if (secret && provided && provided.length === secret.length && provided === secret) {
    return true;
  }
  try {
    const u = await base44.auth.me();
    if (u && (u.role === 'admin' || u.role === 'platform_admin')) return true;
  } catch (_) { /* no session — fall through */ }
  return false;
}
