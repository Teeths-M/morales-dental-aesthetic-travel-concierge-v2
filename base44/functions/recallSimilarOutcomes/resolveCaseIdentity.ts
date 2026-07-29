// DUPLICATED from base44/functions/_shared/resolveCaseIdentity.ts — see createHandler.ts in this
// same directory for why. Keep in sync by hand.

// ── Doctor-portal case identity resolver ────────────────────────────────────────
// Extracted from the identical token-or-admin-session resolution block that used
// to be duplicated in logProcedureComplete/entry.ts and
// logPhysicalIntakeHandshake/entry.ts. Behavior-preserving extraction — same
// precedence (token first, then admin session), same error messages/statuses.
//
// A doctor reaches these functions via an unauthenticated, signed portal token
// (no Base44 login) OR an admin/platform_admin session acting on their behalf.

export interface ResolvedCaseIdentity {
  ok: true;
  caseRecord: Record<string, any>;
  resolvedEmail: string;
}

export interface UnresolvedCaseIdentity {
  ok: false;
  error: string;
  status: number;
}

export type CaseIdentityResult = ResolvedCaseIdentity | UnresolvedCaseIdentity;

export async function resolveCaseIdentity(
  base44: any,
  user: { email?: string; role?: string } | null,
  params: { case_id?: string; token?: string },
): Promise<CaseIdentityResult> {
  const { case_id, token } = params;
  let resolvedEmail = user?.email || null;

  if (token) {
    const records = await base44.asServiceRole.entities.CaseRecord.filter({ doctor_portal_token: token });
    const caseRecord = records?.[0] || null;
    if (!caseRecord) {
      return { ok: false, error: 'Invalid or expired portal token', status: 403 };
    }
    if (!resolvedEmail) resolvedEmail = caseRecord.doctor_email || 'doctor-via-token';
    return { ok: true, caseRecord, resolvedEmail: resolvedEmail as string };
  }

  if (user && (user.role === 'admin' || user.role === 'platform_admin')) {
    if (!case_id) return { ok: false, error: 'case_id is required', status: 400 };
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
    if (!caseRecord) return { ok: false, error: 'CaseRecord not found', status: 404 };
    return { ok: true, caseRecord, resolvedEmail: resolvedEmail as string };
  }

  return { ok: false, error: 'Unauthorized — provide a valid portal token or admin session', status: 401 };
}
