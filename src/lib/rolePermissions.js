export const ADMIN_ROLES = ['platform_admin', 'admin'];
export const CLIENT_ROLES = ['client'];
export const DOCTOR_ROLES = ['doctor'];
export const TRAVEL_AGENCY_ROLES = ['travel_agency'];
export const TAXI_SERVICE_ROLES = ['taxi_service'];

export const CLIENT_PORTAL_ROLES = [...CLIENT_ROLES, ...ADMIN_ROLES];
export const DOCTOR_PORTAL_ROLES = [...DOCTOR_ROLES, ...ADMIN_ROLES];
export const TRAVEL_AGENCY_PORTAL_ROLES = [...TRAVEL_AGENCY_ROLES, ...ADMIN_ROLES];
export const TAXI_SERVICE_PORTAL_ROLES = [...TAXI_SERVICE_ROLES, ...ADMIN_ROLES];
export const ADMIN_PORTAL_ROLES = ADMIN_ROLES;

export const hasAnyRole = (role, allowedRoles) => allowedRoles.includes(role);