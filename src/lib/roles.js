/**
 * Canonical Role Module — Single Source of Truth
 *
 * All role strings used across the platform live here.
 * Import ROLES and role arrays from this file — never use raw strings.
 * Backwards-compatible: re-exports ROLES from constants.js so existing
 * imports of ROLES from either location keep working.
 */
import { ROLES as ROLES_FROM_CONSTANTS } from './constants';

// Re-export the canonical ROLES object so both import paths work:
//   import { ROLES } from '@/lib/roles'
//   import { ROLES } from '@/lib/constants'  ← still works (unchanged file)
export const ROLES = ROLES_FROM_CONSTANTS;

// ── Individual role strings ───────────────────────────────────────────────────
export const ROLE_ADMIN          = ROLES.ADMIN;
export const ROLE_PLATFORM_ADMIN = ROLES.PLATFORM_ADMIN;
export const ROLE_CLIENT         = ROLES.CLIENT;
export const ROLE_USER           = ROLES.USER;
export const ROLE_DOCTOR         = ROLES.DOCTOR;
export const ROLE_TRAVEL_AGENCY  = ROLES.TRAVEL_AGENCY;
export const ROLE_TAXI_SERVICE   = ROLES.TAXI_SERVICE;
export const ROLE_COMPANION      = ROLES.COMPANION;
export const ROLE_SECURITY_AGENCY = ROLES.SECURITY_AGENCY;

// ── Role groups (arrays) ─────────────────────────────────────────────────────

/** Any admin-level role */
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.PLATFORM_ADMIN];

/** Regular authenticated client/user */
export const CLIENT_ROLES = [ROLES.CLIENT, ROLES.USER];

/** All partner-type roles */
export const PARTNER_ROLES = [
  ROLES.DOCTOR,
  ROLES.TRAVEL_AGENCY,
  ROLES.TAXI_SERVICE,
  ROLES.COMPANION,
  ROLES.SECURITY_AGENCY,
];

/** Roles that can access the client/patient portal */
export const CLIENT_PORTAL_ROLES = [...CLIENT_ROLES, ...ADMIN_ROLES];

/** Roles that can access the doctor portal */
export const DOCTOR_PORTAL_ROLES = [ROLES.DOCTOR, ...ADMIN_ROLES];

/** Roles that can access the travel agency portal */
export const TRAVEL_AGENCY_PORTAL_ROLES = [ROLES.TRAVEL_AGENCY, ...ADMIN_ROLES];

/** Roles that can access the taxi/chauffeur portal */
export const TAXI_SERVICE_PORTAL_ROLES = [ROLES.TAXI_SERVICE, ...ADMIN_ROLES];

/** Roles that can access the companion portal */
export const COMPANION_PORTAL_ROLES = [ROLES.COMPANION, ...ADMIN_ROLES];

/** Roles that can access the security agency portal */
export const SECURITY_AGENCY_PORTAL_ROLES = [ROLES.SECURITY_AGENCY, ...ADMIN_ROLES];

/** Admin-only */
export const ADMIN_PORTAL_ROLES = ADMIN_ROLES;

/** All authenticated users (any role) */
export const ALL_AUTHENTICATED_ROLES = [
  ROLES.CLIENT,
  ROLES.USER,
  ROLES.DOCTOR,
  ROLES.TRAVEL_AGENCY,
  ROLES.TAXI_SERVICE,
  ROLES.COMPANION,
  ROLES.SECURITY_AGENCY,
  ROLES.ADMIN,
  ROLES.PLATFORM_ADMIN,
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if `role` is in the given `allowedRoles` array */
export const hasAnyRole = (role, allowedRoles) =>
  Array.isArray(allowedRoles) && allowedRoles.includes(role);

/** Returns true if the user holds any admin role */
export const isAdmin = (role) => ADMIN_ROLES.includes(role);

/** Returns true if the role is a partner role */
export const isPartner = (role) => PARTNER_ROLES.includes(role);