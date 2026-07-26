import { describe, it, expect } from 'vitest';
import { isTabActive } from '../src/components/layout/BottomTabBar.jsx';

/**
 * A stress-test audit found this predicate leaves 10 real /dashboard/* routes
 * with no tab highlighted (settings, support, documents, etc. all render
 * <Dashboard/> but none of the 5 tab paths match them) — that's accepted,
 * cosmetic behavior, not a bug. What this guards against is a WRONG match:
 * two tabs lighting up at once, or the wrong tab winning.
 */
describe('BottomTabBar.isTabActive', () => {
  const TABS = [
    '/dashboard',
    '/dashboard/journey',
    '/passport-vault',
    '/dashboard/messages',
    '/dashboard/features',
  ];

  it('/dashboard only matches itself exactly, never as a prefix', () => {
    expect(isTabActive('/dashboard', '/dashboard')).toBe(true);
    expect(isTabActive('/dashboard/journey', '/dashboard')).toBe(false);
    expect(isTabActive('/dashboard/settings', '/dashboard')).toBe(false);
  });

  it('other tabs match their own path as a prefix', () => {
    expect(isTabActive('/dashboard/journey', '/dashboard/journey')).toBe(true);
    expect(isTabActive('/dashboard/messages', '/dashboard/messages')).toBe(true);
    expect(isTabActive('/passport-vault', '/passport-vault')).toBe(true);
  });

  it('real /dashboard/* routes not covered by a tab match none of them (no false highlight)', () => {
    const uncoveredRoutes = [
      '/dashboard/consultations', '/dashboard/profile', '/dashboard/documents',
      '/dashboard/bookings', '/dashboard/emergency-card', '/dashboard/case-status',
      '/dashboard/support', '/dashboard/settings', '/dashboard/adventure',
      '/dashboard/solo-checkin',
    ];
    for (const route of uncoveredRoutes) {
      const matches = TABS.filter((tab) => isTabActive(route, tab));
      expect(matches, `${route} unexpectedly matched a tab`).toHaveLength(0);
    }
  });

  it('exactly one tab is active for each of the 5 tab routes themselves', () => {
    for (const route of TABS) {
      const matches = TABS.filter((tab) => isTabActive(route, tab));
      expect(matches, `${route} matched ${matches.length} tabs, expected 1`).toHaveLength(1);
    }
  });
});
