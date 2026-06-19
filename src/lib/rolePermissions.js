/**
 * rolePermissions.js — Backwards-compatible re-exports.
 * New code should import from '@/lib/roles' instead.
 * This file is kept to avoid breaking existing imports.
 */
export {
  ADMIN_ROLES,
  CLIENT_PORTAL_ROLES,
  DOCTOR_PORTAL_ROLES,
  TRAVEL_AGENCY_PORTAL_ROLES,
  TAXI_SERVICE_PORTAL_ROLES,
  ADMIN_PORTAL_ROLES,
  hasAnyRole,
} from '@/lib/roles';

// Preserve named arrays for existing callers
export const CLIENT_ROLES       = ['client'];
export const DOCTOR_ROLES       = ['doctor'];
export const TRAVEL_AGENCY_ROLES = ['travel_agency'];
export const TAXI_SERVICE_ROLES  = ['taxi_service'];