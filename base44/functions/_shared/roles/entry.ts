/**
 * _shared/roles.js  — REFERENCE ONLY
 *
 * Backend functions deploy independently and cannot import local files.
 * Use the inline snippet below inside each function file.
 *
 * Inline snippet:
 *
 *   const ADMIN_ROLES = ['admin', 'platform_admin'];
 *   const CLIENT_ROLES = ['client', 'user'];
 *   const PARTNER_ROLES = ['doctor','travel_agency','taxi_service','companion','security_agency'];
 *   const isAdmin   = (role) => ADMIN_ROLES.includes(role);
 *   const isPartner = (role) => PARTNER_ROLES.includes(role);
 */
export const ROLES = {
  CLIENT: 'client', USER: 'user', DOCTOR: 'doctor',
  TRAVEL_AGENCY: 'travel_agency', TAXI_SERVICE: 'taxi_service',
  COMPANION: 'companion', SECURITY_AGENCY: 'security_agency',
  ADMIN: 'admin', PLATFORM_ADMIN: 'platform_admin',
};
export const ADMIN_ROLES   = ['admin', 'platform_admin'];
export const CLIENT_ROLES  = ['client', 'user'];
export const PARTNER_ROLES = ['doctor','travel_agency','taxi_service','companion','security_agency'];