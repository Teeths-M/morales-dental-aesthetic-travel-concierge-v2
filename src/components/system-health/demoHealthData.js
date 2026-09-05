/**
 * demoHealthData — the fully client-side, offline-capable data source for
 * /system-status?demo=1. Never calls the real backend, never touches real
 * ReliabilityIncident data, never sends a real notification, never creates
 * or alters any real patient/journey/verification record.
 *
 * DEMO_AUTOMATION_CATEGORIES is intentionally a second, hand-kept copy of
 * the exact same 8 category name/description/cadence values that live in
 * base44/functions/getSystemHealthSummary/entry.ts's AUTOMATION_CATEGORIES —
 * demo mode must show the same real, honest facts about what this platform
 * actually runs, never invented category names of its own. A redteam
 * invariant (tests/redteam/invariants.spec.js, "SYSTEM HEALTH: demo mode
 * category names match the real ones") checks these two lists stay in sync
 * whenever either one is edited.
 */
export const DEMO_AUTOMATION_CATEGORIES = [
  {
    category: 'Data Freshness',
    description: 'Re-verifies clinic, regulatory, and visa status once a cached answer goes stale.',
    cadence: 'Daily / Weekly',
  },
  {
    category: 'Doctor Verification',
    description: 'Re-checks doctor license and credential status against real registry sources.',
    cadence: 'Daily',
  },
  {
    category: 'Partner Trust',
    description: 'Recomputes doctor, driver, and companion trust scores from real case history.',
    cadence: 'Daily',
  },
  {
    category: 'Destination Safety',
    description: 'Computes a real safety index for a destination the moment one is requested — not a standing scan.',
    cadence: 'On demand',
  },
  {
    category: 'Medical-Travel Incidents',
    description: 'Scans public medical/regulatory sources and incident reports for human review.',
    cadence: 'Weekly / Monthly',
  },
  {
    category: 'Travel Timeline Monitoring',
    description: 'Tracks real departure/arrival milestones and sends countdown reminders — not live flight-status telemetry.',
    cadence: 'Daily',
  },
  {
    category: 'Journey Monitoring',
    description: 'Detects real journey completion and delivers proactive updates the moment they are written.',
    cadence: 'Daily / real-time',
  },
  {
    category: 'Recovery Signals',
    description: 'Flags recovery check-in anomalies and sends reminders for check-ins that are due.',
    cadence: 'Hourly / on check-in',
  },
];

/**
 * getDemoSnapshot(tickIndex) — a deterministic, seeded-by-tick simulation so
 * a live pitch gets reliable pacing: every 6th tick lands on a "signal
 * logged" beat, every other tick is an honest "no new signals" quiet beat.
 * Never random — a demo should be reproducible, not a coin flip in front of
 * judges.
 */
export function getDemoSnapshot(tickIndex) {
  const isSignalTick = tickIndex > 0 && tickIndex % 6 === 0;
  return {
    incidents: {
      total: 3 + Math.floor(tickIndex / 6),
      unresolved_critical_or_high: 0,
    },
    signalStatus: tickIndex === 0 ? 'baseline' : (isSignalTick ? 'signal' : 'quiet'),
  };
}

/**
 * getDemoActivityLog(tickIndex) — the "recent activity" strip visible in
 * demo mode, illustrating that individual category checks are completing
 * one after another. Deliberately NOT a copy of the fabricated "#600/#599
 * scheduler run" numbering from the original reference mockup — this app
 * has no real sequential run counter anywhere (see useSignalDelta.js's own
 * doc comment), and demo mode reuses only real category names, never
 * invents a fake numbered identity for an event. Each line reads as
 * "<real category name> check completed — <relative time>", built
 * deterministically from tickIndex so a live pitch gets identical,
 * reproducible pacing every time — never Math.random().
 */
export function getDemoActivityLog(tickIndex, maxEntries = 3) {
  const entries = [];
  for (let back = 1; back <= maxEntries; back++) {
    const tick = tickIndex - back;
    if (tick < 0) break;
    const category = DEMO_AUTOMATION_CATEGORIES[tick % DEMO_AUTOMATION_CATEGORIES.length];
    const secondsAgo = back * 4; // matches SystemHealthHero's TICK_MS (4000ms) cadence
    entries.push({
      label: `${category.category} check completed`,
      when: secondsAgo <= 4 ? 'just now' : `${secondsAgo}s ago`,
    });
  }
  return entries;
}
