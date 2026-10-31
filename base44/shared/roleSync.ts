// The rules syncTenantRole uses to decide which role an account gets. Pure
// functions with no Base44 calls, so tests/roleSync.test.js can check them
// directly.

// The roles a signed-in user may give their OWN account, by finishing one of
// the app's own onboarding flows, and the kind of record each is linked to.
// The role always comes from this table, never from the request: some data
// rules grant access by role alone (a clinical_reviewer can read every case),
// so a role a user could pick for themselves would be a way around them.
// Every other role (admin, platform_admin, clinical_reviewer, local_doctor)
// is granted only by an admin.
export const SELF_SERVICE: Record<string, { role: string; entity: string }> = {
  client: { role: 'client', entity: 'Consultation' },
  doctor: { role: 'doctor', entity: 'Doctor' },
  travel_agency: { role: 'travel_agency', entity: 'TravelAgency' },
  taxi_service: { role: 'taxi_service', entity: 'TaxiService' },
  companion: { role: 'companion', entity: 'Companion' },
  security_agency: { role: 'security_agency', entity: 'SecurityAgency' },
};

export const SELF_SERVICE_ROLES = new Set(Object.values(SELF_SERVICE).map((s) => s.role));
export const ADMIN_ROLES = new Set(['admin', 'platform_admin']);

export function sameEmail(a: unknown, b: unknown): boolean {
  return typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();
}

export type RoleDecision = { role: string } | { error: string; status: number };

/**
 * The role to grant. A non-admin gets exactly the role that matches the
 * onboarding flow they finished; asking for any other role is refused.
 * An admin may grant any role, as before.
 */
export function resolveRequestedRole({ isAdmin, tenantType, requestedRole }: {
  isAdmin: boolean;
  tenantType: unknown;
  requestedRole?: unknown;
}): RoleDecision {
  const selfService = typeof tenantType === 'string' ? SELF_SERVICE[tenantType] : undefined;
  if (isAdmin) {
    const role = (typeof requestedRole === 'string' && requestedRole) || selfService?.role;
    return role ? { role } : { error: 'Invalid tenant type', status: 400 };
  }
  if (!selfService) return { error: 'Invalid tenant type', status: 400 };
  if (requestedRole && requestedRole !== selfService.role) {
    return { error: 'Forbidden: that role can only be granted by an admin', status: 403 };
  }
  return { role: selfService.role };
}

/**
 * Whether a non-admin may link this kind of record to this onboarding flow:
 * only the flow's own record type, or their onboarding profile.
 */
export function linkedEntityAllowed({ isAdmin, tenantType, linkedEntityName }: {
  isAdmin: boolean;
  tenantType: unknown;
  linkedEntityName?: unknown;
}): boolean {
  if (isAdmin || !linkedEntityName) return true;
  const selfService = typeof tenantType === 'string' ? SELF_SERVICE[tenantType] : undefined;
  return linkedEntityName === 'UserOnboardingProfile' || linkedEntityName === selfService?.entity;
}

/**
 * Whether the account's current role must be left as it is:
 *   - an admin role, whoever is calling. Admins can already use every
 *     portal, and an admin testing a signup or booking flow used to be
 *     silently demoted to that flow's role;
 *   - on a self-service call, any role an admin granted (such as
 *     clinical_reviewer), so finishing a booking can't strip it.
 */
export function keepsExistingRole(previousRole: unknown, isAdmin: boolean): boolean {
  if (typeof previousRole !== 'string' || !previousRole) return false;
  if (ADMIN_ROLES.has(previousRole)) return true;
  return !isAdmin && previousRole !== 'user' && !SELF_SERVICE_ROLES.has(previousRole);
}
