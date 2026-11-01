import { describe, it, expect } from 'vitest';
import { greetingFor, timeAgo, pickLatestAlert, savedPlacesFrom, welcomeCopy } from '@/lib/msafeWelcome';

const at = (h) => new Date(2026, 10, 1, h, 0, 0);
const NOW = new Date('2026-11-01T20:00:00Z');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600 * 1000).toISOString();

describe('greetingFor', () => {
  it('follows the visitor\'s own clock', () => {
    expect(greetingFor(at(8))).toBe('Good morning');
    expect(greetingFor(at(13))).toBe('Good afternoon');
    expect(greetingFor(at(21))).toBe('Good evening');
  });
});

describe('timeAgo', () => {
  it('says how long ago, plainly', () => {
    expect(timeAgo(NOW.toISOString(), NOW)).toBe('just now');
    expect(timeAgo(new Date(NOW.getTime() - 5 * 60000).toISOString(), NOW)).toBe('5 minutes ago');
    expect(timeAgo(hoursAgo(1), NOW)).toBe('1 hour ago');
    expect(timeAgo(hoursAgo(50), NOW)).toBe('2 days ago');
    expect(timeAgo('not a date', NOW)).toBe('');
  });
});

describe('pickLatestAlert', () => {
  const events = [
    { id: 'a', priority: 'high', message_text: 'Your driver is running late.', created_date: hoursAgo(5) },
    { id: 'b', priority: 'critical', message_text: 'Storm warning for your area.', created_date: hoursAgo(2) },
    { id: 'c', priority: 'medium', message_text: 'Your trip is in 3 days.', created_date: hoursAgo(1) },
    { id: 'd', priority: 'critical', message_text: 'Old alert.', created_date: hoursAgo(24 * 10) },
    { id: 'e', priority: 'high', message_text: '   ', created_date: hoursAgo(1) },
  ];

  it('picks the newest real high or critical update from the last week', () => {
    expect(pickLatestAlert(events, NOW)?.id).toBe('b');
  });

  it('shows nothing when M-Care sent nothing serious', () => {
    expect(pickLatestAlert(events.filter((e) => e.id === 'c' || e.id === 'd'), NOW)).toBeNull();
    expect(pickLatestAlert(null, NOW)).toBeNull();
  });
});

describe('savedPlacesFrom', () => {
  it('lists only the places really saved on the case', () => {
    expect(savedPlacesFrom({ hotel_address: '1 Main St', clinic_address: 'Clinic Rd' })).toEqual(['Hotel', 'Clinic']);
    expect(savedPlacesFrom({ hotel_address: '  ', clinic_address: 'Clinic Rd' })).toEqual(['Clinic']);
    expect(savedPlacesFrom(null)).toEqual([]);
  });
});

describe('welcomeCopy', () => {
  it('welcomes a traveler to the country they are in', () => {
    expect(welcomeCopy({ atDestination: true, hasTrip: true, countryName: 'Brazil', flag: '🇧🇷', now: at(21) }).title)
      .toBe('Welcome to Brazil! 🇧🇷');
  });

  it('greets everyone else without claiming they arrived anywhere', () => {
    const copy = welcomeCopy({ atDestination: false, hasTrip: true, tripLabel: 'Brazil', firstName: 'Theon', flag: '🇹🇹', now: at(21) });
    expect(copy.title).toBe('Good evening, Theon 🇹🇹');
    expect(copy.body).toContain('your trip to Brazil');
  });

  it('invites a visitor with no trip to start one', () => {
    const copy = welcomeCopy({ now: at(9) });
    expect(copy.title).toBe('Good morning');
    expect(copy.body).toMatch(/procedure you're considering/);
  });

  it('never invents an incident', () => {
    for (const opts of [{}, { hasTrip: true }, { atDestination: true, hasTrip: true, countryName: 'Brazil' }]) {
      const { title, body } = welcomeCopy(opts);
      expect(`${title} ${body}`).not.toMatch(/police|avoid|incident|crime/i);
    }
  });
});
