import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ACCOUNT_EVENT_TYPES, describeAccountEvent, recentAccountActivity } from '@/lib/accountActivity';
import { assertLinkOnly } from '../base44/shared/notify.ts';

const profileFn = readFileSync(new URL('../base44/functions/updateMyProfile/entry.ts', import.meta.url), 'utf8');

describe('updateMyProfile', () => {
  it('the phone-change email passes the link-only guard', () => {
    const title = (profileFn.match(/title:\s*'([^']+)'/) || [])[1];
    const line = (profileFn.match(/line:\s*"([^"]+)"/) || [])[1];
    expect(title).toBeTruthy();
    expect(line).toBeTruthy();
    expect(() => assertLinkOnly(`${title} ${line}`, 'updateMyProfile')).not.toThrow();
  });

  it('accepts the usual ways of writing a phone number, and nothing else', () => {
    const source = (profileFn.match(/const PHONE_PATTERN = \/(.*)\/;/) || [])[1];
    expect(source).toBeTruthy();
    const pattern = new RegExp(source);
    for (const good of ['+1 868 555 1234', '(868) 555-1234', '868.555.1234', '+44 (0)20 7946 0958']) {
      expect(pattern.test(good), good).toBe(true);
    }
    for (const bad of ['call me', '555-CALL', 'ext 12', '-5551234']) {
      expect(pattern.test(bad), bad).toBe(false);
    }
  });
});

describe('describeAccountEvent', () => {
  it('has a sentence for every account event in every language', () => {
    for (const lang of ['en', 'es', 'fr', 'pt']) {
      for (const event_type of ACCOUNT_EVENT_TYPES) {
        const text = describeAccountEvent({ event_type, resource_name: 'Ana' }, lang);
        expect(typeof text, `${lang}/${event_type}`).toBe('string');
        expect(text.length, `${lang}/${event_type}`).toBeGreaterThan(5);
        expect(text, `${lang}/${event_type}`).not.toMatch(/\{(role|name)\}/);
      }
    }
  });

  it('names the new account type when it is a known one', () => {
    expect(describeAccountEvent({ event_type: 'role_changed', details: { to: 'doctor' } }))
      .toBe('Your account type was set to doctor');
    expect(describeAccountEvent({ event_type: 'role_changed', details: { to: 'client' } }, 'es'))
      .toBe('El tipo de tu cuenta ahora es paciente');
  });

  it('stays generic for an unknown or admin account type', () => {
    for (const to of ['admin', 'platform_admin', 'something_else', undefined, 'constructor']) {
      expect(describeAccountEvent({ event_type: 'role_changed', details: { to } }))
        .toBe('Your account type was changed');
    }
  });

  it('names who the journey was shared with, safely and briefly', () => {
    expect(describeAccountEvent({ event_type: 'guardian_access_granted', resource_name: 'Mum' }))
      .toBe('You shared your journey with Mum');
    expect(describeAccountEvent({ event_type: 'guardian_access_granted', resource_name: '$& $1' }))
      .toBe('You shared your journey with $& $1');
    const long = describeAccountEvent({ event_type: 'guardian_access_granted', resource_name: 'x'.repeat(100) });
    expect(long).toBe(`You shared your journey with ${'x'.repeat(40)}`);
    expect(describeAccountEvent({ event_type: 'guardian_access_granted', resource_name: '   ' }))
      .toBe('You shared your journey with a family member');
  });

  it('ignores anything that is not an account event', () => {
    expect(describeAccountEvent({ event_type: 'case_accessed' })).toBeNull();
    expect(describeAccountEvent(null)).toBeNull();
    expect(describeAccountEvent('profile_updated')).toBeNull();
  });

  it('falls back to English for a language it does not have', () => {
    expect(describeAccountEvent({ event_type: 'profile_updated' }, 'de')).toBe('Your profile details were changed');
  });
});

describe('recentAccountActivity', () => {
  const rows = [
    { id: 'a', event_type: 'profile_updated', timestamp: '2026-10-10T09:00:00.000Z' },
    { id: 'b', event_type: 'case_accessed', timestamp: '2026-10-12T09:00:00.000Z' },
    { id: 'c', event_type: 'contact_phone_changed', timestamp: '2026-10-15T09:00:00.000Z' },
    { id: 'd', event_type: 'safety_monitoring_paused', created_date: '2026-10-14T09:00:00.000Z' },
  ];

  it('lists only account events, newest first', () => {
    expect(recentAccountActivity(rows).map((r) => r.id)).toEqual(['c', 'd', 'a']);
  });

  it('respects the limit and the language', () => {
    const list = recentAccountActivity(rows, { limit: 1, lang: 'pt' });
    expect(list).toEqual([{ id: 'c', at: '2026-10-15T09:00:00.000Z', text: 'Seu telefone de contato foi alterado' }]);
  });

  it('copes with nothing to show', () => {
    expect(recentAccountActivity(null)).toEqual([]);
    expect(recentAccountActivity([{ event_type: 'case_accessed' }])).toEqual([]);
  });
});
