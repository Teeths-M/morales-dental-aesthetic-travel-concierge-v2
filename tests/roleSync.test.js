import { describe, it, expect } from 'vitest';
import {
  SELF_SERVICE,
  keepsExistingRole,
  linkedEntityAllowed,
  resolveRequestedRole,
  sameEmail,
} from '../base44/shared/roleSync.ts';

describe('resolveRequestedRole', () => {
  it('gives a non-admin exactly the role of the flow they finished', () => {
    for (const [tenantType, { role }] of Object.entries(SELF_SERVICE)) {
      expect(resolveRequestedRole({ isAdmin: false, tenantType, requestedRole: role })).toEqual({ role });
      expect(resolveRequestedRole({ isAdmin: false, tenantType })).toEqual({ role });
    }
  });

  it('refuses any other role a non-admin asks for', () => {
    for (const requestedRole of ['clinical_reviewer', 'admin', 'platform_admin', 'local_doctor', 'doctor']) {
      const decision = resolveRequestedRole({ isAdmin: false, tenantType: 'client', requestedRole });
      expect(decision).toEqual({ error: 'Forbidden: that role can only be granted by an admin', status: 403 });
    }
  });

  it('refuses an unknown flow for a non-admin', () => {
    expect(resolveRequestedRole({ isAdmin: false, tenantType: 'clinical_reviewer' }))
      .toEqual({ error: 'Invalid tenant type', status: 400 });
    expect(resolveRequestedRole({ isAdmin: false, tenantType: undefined }))
      .toEqual({ error: 'Invalid tenant type', status: 400 });
  });

  it('lets an admin grant any role, as before', () => {
    expect(resolveRequestedRole({ isAdmin: true, tenantType: 'client', requestedRole: 'clinical_reviewer' }))
      .toEqual({ role: 'clinical_reviewer' });
    expect(resolveRequestedRole({ isAdmin: true, tenantType: 'doctor' })).toEqual({ role: 'doctor' });
    expect(resolveRequestedRole({ isAdmin: true, tenantType: 'unknown' }))
      .toEqual({ error: 'Invalid tenant type', status: 400 });
  });

  it('never lists an admin-only role as self-service', () => {
    const selfServiceRoles = Object.values(SELF_SERVICE).map((s) => s.role);
    for (const role of ['admin', 'platform_admin', 'clinical_reviewer', 'local_doctor', 'user']) {
      expect(selfServiceRoles).not.toContain(role);
    }
  });
});

describe('linkedEntityAllowed', () => {
  it("allows the flow's own record type or the onboarding profile", () => {
    expect(linkedEntityAllowed({ isAdmin: false, tenantType: 'doctor', linkedEntityName: 'Doctor' })).toBe(true);
    expect(linkedEntityAllowed({ isAdmin: false, tenantType: 'client', linkedEntityName: 'Consultation' })).toBe(true);
    expect(linkedEntityAllowed({ isAdmin: false, tenantType: 'doctor', linkedEntityName: 'UserOnboardingProfile' })).toBe(true);
    expect(linkedEntityAllowed({ isAdmin: false, tenantType: 'doctor' })).toBe(true);
  });

  it('refuses any other record type for a non-admin', () => {
    expect(linkedEntityAllowed({ isAdmin: false, tenantType: 'client', linkedEntityName: 'CaseRecord' })).toBe(false);
    expect(linkedEntityAllowed({ isAdmin: false, tenantType: 'doctor', linkedEntityName: 'TravelAgency' })).toBe(false);
    expect(linkedEntityAllowed({ isAdmin: true, tenantType: 'client', linkedEntityName: 'CaseRecord' })).toBe(true);
  });
});

describe('keepsExistingRole', () => {
  it('never changes an admin role, whoever calls', () => {
    expect(keepsExistingRole('admin', false)).toBe(true);
    expect(keepsExistingRole('platform_admin', true)).toBe(true);
  });

  it('keeps an admin-granted role on a self-service call, but lets an admin change it', () => {
    expect(keepsExistingRole('clinical_reviewer', false)).toBe(true);
    expect(keepsExistingRole('local_doctor', false)).toBe(true);
    expect(keepsExistingRole('clinical_reviewer', true)).toBe(false);
  });

  it('lets self-service roles move as before', () => {
    for (const role of ['user', 'client', 'doctor', 'travel_agency', 'taxi_service', 'companion', 'security_agency']) {
      expect(keepsExistingRole(role, false)).toBe(false);
    }
    expect(keepsExistingRole(null, false)).toBe(false);
    expect(keepsExistingRole('', false)).toBe(false);
  });
});

describe('sameEmail', () => {
  it('ignores case and surrounding spaces', () => {
    expect(sameEmail('Maria@Example.com ', 'maria@example.com')).toBe(true);
    expect(sameEmail('maria@example.com', 'mario@example.com')).toBe(false);
    expect(sameEmail(undefined, 'maria@example.com')).toBe(false);
    expect(sameEmail(null, null)).toBe(false);
  });
});
