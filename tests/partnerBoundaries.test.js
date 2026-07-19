import { describe, it, expect } from 'vitest';
import {
  ROLES,
  ADMIN_ROLES,
  CLIENT_ROLES,
  PARTNER_ROLES,
  CLIENT_PORTAL_ROLES,
  DOCTOR_PORTAL_ROLES,
  LOCAL_DOCTOR_PORTAL_ROLES,
  TRAVEL_AGENCY_PORTAL_ROLES,
  TAXI_SERVICE_PORTAL_ROLES,
  COMPANION_PORTAL_ROLES,
  SECURITY_AGENCY_PORTAL_ROLES,
  ADMIN_PORTAL_ROLES,
} from '@/lib/roles';

/**
 * Signing in "as a code partner": every portal gate is a plain array, so who
 * can open which door is fully decidable without a browser or a session.
 *
 * The failure being guarded is cross-tenant leakage — a taxi partner opening
 * the doctor portal and reading clinical notes, a companion reaching admin.
 * These arrays are edited by hand and a single paste in the wrong place is
 * silent: nothing crashes, a door just opens for the wrong role.
 */

const PORTALS = [
  ['doctor',          DOCTOR_PORTAL_ROLES,          ROLES.DOCTOR],
  ['local doctor',    LOCAL_DOCTOR_PORTAL_ROLES,    ROLES.LOCAL_DOCTOR],
  ['travel agency',   TRAVEL_AGENCY_PORTAL_ROLES,   ROLES.TRAVEL_AGENCY],
  ['taxi service',    TAXI_SERVICE_PORTAL_ROLES,    ROLES.TAXI_SERVICE],
  ['companion',       COMPANION_PORTAL_ROLES,       ROLES.COMPANION],
  ['security agency', SECURITY_AGENCY_PORTAL_ROLES, ROLES.SECURITY_AGENCY],
];

describe('one partner cannot open another partner\'s portal', () => {
  it.each(PORTALS)('the %s portal admits only its own role plus admins', (_name, gate, ownRole) => {
    const allowed = new Set(gate);
    expect(allowed.has(ownRole)).toBe(true);
    for (const admin of ADMIN_ROLES) expect(allowed.has(admin)).toBe(true);
    // Nobody else. This is the actual cross-tenant check.
    expect(allowed.size).toBe(1 + ADMIN_ROLES.length);
  });

  it.each(PORTALS)('no OTHER partner role can reach the %s portal', (_name, gate, ownRole) => {
    const foreign = [...PARTNER_ROLES, ROLES.LOCAL_DOCTOR].filter((r) => r !== ownRole);
    for (const role of foreign) {
      expect(gate, `${role} must not reach this portal`).not.toContain(role);
    }
  });

  it.each(PORTALS)('a plain client cannot reach the %s portal', (_name, gate) => {
    for (const role of CLIENT_ROLES) {
      expect(gate).not.toContain(role);
    }
  });
});

describe('the admin door stays shut', () => {
  it('admits nobody but admins', () => {
    expect([...ADMIN_PORTAL_ROLES].sort()).toEqual([...ADMIN_ROLES].sort());
  });

  it('no partner or client role is an admin role', () => {
    for (const role of [...PARTNER_ROLES, ...CLIENT_ROLES, ROLES.LOCAL_DOCTOR]) {
      expect(ADMIN_ROLES, `${role} must never be admin`).not.toContain(role);
    }
  });
});

describe('the patient portal is not a partner portal', () => {
  it('admits clients and admins only', () => {
    expect([...CLIENT_PORTAL_ROLES].sort()).toEqual([...CLIENT_ROLES, ...ADMIN_ROLES].sort());
  });

  it('no partner role can open a patient\'s portal', () => {
    // A companion or driver reaching the patient portal would see the medical
    // side of a journey they are only meant to see the logistics of.
    for (const role of [...PARTNER_ROLES, ROLES.LOCAL_DOCTOR]) {
      expect(CLIENT_PORTAL_ROLES, `${role} must not open the patient portal`).not.toContain(role);
    }
  });
});

describe('role definitions are internally consistent', () => {
  it('every role string is unique — no two roles collide', () => {
    const values = Object.values(ROLES);
    expect(new Set(values).size).toBe(values.length);
  });

  it('no role is both a client and a partner', () => {
    for (const role of CLIENT_ROLES) expect(PARTNER_ROLES).not.toContain(role);
  });
});
