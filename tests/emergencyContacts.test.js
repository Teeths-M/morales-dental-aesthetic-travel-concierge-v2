import { describe, it, expect } from 'vitest';
import { parsePrimaryContactLabel, getOrderedCaseContacts } from '../base44/shared/emergencyContacts.ts';

describe('parsePrimaryContactLabel', () => {
  it('splits a "Name (Relationship)" label', () => {
    expect(parsePrimaryContactLabel('Jane Doe (Spouse)')).toEqual({ name: 'Jane Doe', relationship: 'Spouse' });
  });

  it('falls back to the whole string as the name when there is no relationship parens', () => {
    expect(parsePrimaryContactLabel('Jane Doe')).toEqual({ name: 'Jane Doe' });
  });

  it('never throws on an empty/missing label', () => {
    expect(parsePrimaryContactLabel(null)).toEqual({ name: '' });
    expect(parsePrimaryContactLabel(undefined)).toEqual({ name: '' });
    expect(parsePrimaryContactLabel('')).toEqual({ name: '' });
  });
});

// Minimal mock of the base44 client surface getOrderedCaseContacts actually
// touches — asServiceRole.entities.EmergencyContact.filter only.
function mockBase44(rankedRows) {
  return {
    asServiceRole: {
      entities: {
        EmergencyContact: {
          filter: async () => rankedRows,
        },
      },
    },
  };
}

describe('getOrderedCaseContacts', () => {
  it('returns the primary at priority 1, then ranked rows re-numbered contiguously from a gapped/out-of-order input', async () => {
    const base44 = mockBase44([
      { id: 'c3', name: 'Third', phone: '+1000000003', priority: 9 },
      { id: 'c2', name: 'Second', phone: '+1000000002', priority: 2 },
    ]);
    const caseRecord = {
      id: 'case1',
      emergency_contact: 'Jane Doe (Spouse)',
      emergency_contact_number: '+1000000001',
      emergency_contact_email: 'jane@example.com',
    };
    const result = await getOrderedCaseContacts(base44, caseRecord);
    expect(result.map(c => c.priority)).toEqual([1, 2, 3]);
    expect(result[0]).toMatchObject({ priority: 1, name: 'Jane Doe', relationship: 'Spouse', source: 'case_primary' });
    expect(result[1]).toMatchObject({ priority: 2, name: 'Second', source: 'ranked_contact' });
    expect(result[2]).toMatchObject({ priority: 3, name: 'Third', source: 'ranked_contact' });
  });

  it('omits the primary when the case has no real phone or email on file — never fabricates a contact', async () => {
    const base44 = mockBase44([]);
    const caseRecord = { id: 'case2', emergency_contact: 'No One (Unknown)' };
    const result = await getOrderedCaseContacts(base44, caseRecord);
    expect(result).toEqual([]);
  });

  it('still returns ranked contacts even when the primary is missing — does not silently drop the rest of the network', async () => {
    const base44 = mockBase44([{ id: 'c2', name: 'Backup', email: 'backup@example.com', priority: 2 }]);
    const caseRecord = { id: 'case3' };
    const result = await getOrderedCaseContacts(base44, caseRecord);
    expect(result).toEqual([
      { priority: 2, name: 'Backup', relationship: undefined, phone: undefined, email: 'backup@example.com', source: 'ranked_contact', id: 'c2' },
    ]);
  });

  it('skips a ranked row with neither phone nor email, and still renumbers the rest contiguously', async () => {
    const base44 = mockBase44([
      { id: 'c2', name: 'No Contact Info', priority: 2 },
      { id: 'c3', name: 'Has Phone', phone: '+1000000003', priority: 3 },
    ]);
    const caseRecord = { id: 'case4', emergency_contact_number: '+1000000001' };
    const result = await getOrderedCaseContacts(base44, caseRecord);
    expect(result.map(c => c.priority)).toEqual([1, 2]);
    expect(result[1].name).toBe('Has Phone');
  });

  it('fails open — a thrown lookup still returns the primary rather than throwing', async () => {
    const base44 = { asServiceRole: { entities: { EmergencyContact: { filter: async () => { throw new Error('boom'); } } } } };
    const caseRecord = { id: 'case5', emergency_contact_number: '+1000000001' };
    const result = await getOrderedCaseContacts(base44, caseRecord);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(1);
  });
});
