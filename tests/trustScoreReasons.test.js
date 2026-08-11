import { describe, it, expect } from 'vitest';
import {
  doctorTrustReasons,
  companionTrustReasons,
  driverTrustReasons,
} from '../base44/shared/trustScoreReasons.ts';

describe('doctorTrustReasons', () => {
  it('gives one honest baseline reason for zero cases — never a fabricated positive claim', () => {
    expect(doctorTrustReasons({}, 0)).toEqual(['No completed cases yet — baseline score']);
  });

  it('explains a fast, clean, well-rated doctor', () => {
    const reasons = doctorTrustReasons({
      avg_confirm_hours: 2, sos_events: 0, hs5_rate_pct: 95, feedback_avg: 4.8, feedback_count: 12,
    }, 12);
    expect(reasons).toContain('Confirms new cases quickly (avg 2h)');
    expect(reasons).toContain('No safety incidents on record');
    expect(reasons).toContain('95% on-time clinic check-in rate');
    expect(reasons).toContain('4.8/5 average patient rating (12 rated trips)');
  });

  it('phrases a slow confirmer and a real safety incident honestly', () => {
    const reasons = doctorTrustReasons({
      avg_confirm_hours: 18, sos_events: 2, hs5_rate_pct: 60, feedback_avg: 3.1, feedback_count: 3,
    }, 10);
    expect(reasons).toContain('Averages 18h to confirm a new case');
    expect(reasons).toContain('2 safety incident(s) on record');
  });

  it('never invents a rating when none exist', () => {
    const reasons = doctorTrustReasons({ avg_confirm_hours: 3, sos_events: 0, hs5_rate_pct: 100, feedback_count: 0 }, 5);
    expect(reasons).toContain('No patient ratings yet');
    expect(reasons.join(' ')).not.toMatch(/undefined|NaN/);
  });
});

describe('companionTrustReasons', () => {
  it('gives one honest baseline reason for zero assignments', () => {
    expect(companionTrustReasons({}, 0)).toEqual(['No assignments yet — baseline score']);
  });

  it('explains a responsive, reliable companion', () => {
    const reasons = companionTrustReasons({
      avg_response_hrs: 1, completion_pct: 100, declined_count: 0, rating_avg: 4.9, completed_count: 8,
    }, 8);
    expect(reasons).toContain('Responds to job offers quickly (avg 1h)');
    expect(reasons).toContain('100% of offered assignments completed');
    expect(reasons).toContain('4.9/5 average patient rating (8 completed trips)');
    expect(reasons.join(' ')).not.toContain('declined');
  });

  it('surfaces declined assignments only when real', () => {
    const reasons = companionTrustReasons({
      avg_response_hrs: 5, completion_pct: 60, declined_count: 3, rating_avg: 0, completed_count: 0,
    }, 5);
    expect(reasons).toContain('3 assignment(s) declined');
    expect(reasons).toContain('No patient ratings yet');
  });
});

describe('driverTrustReasons', () => {
  it('gives one honest baseline reason for zero trips', () => {
    expect(driverTrustReasons({}, 0)).toEqual(['No completed trips yet — baseline score']);
  });

  it('explains a perfect on-time, safe, well-rated driver', () => {
    const reasons = driverTrustReasons({
      on_time_pct: 100, sos_events: 0, feedback_avg: 4.7, feedback_count: 6,
    }, 6);
    expect(reasons).toContain('No missed pickups on record');
    expect(reasons).toContain('No safety incidents on record');
    expect(reasons).toContain('4.7/5 average patient rating (6 rated trips)');
  });

  it('phrases a driver with missed pickups honestly, not as a pass/fail label', () => {
    const reasons = driverTrustReasons({ on_time_pct: 70, sos_events: 1, feedback_count: 0 }, 10);
    expect(reasons).toContain('70% of pickups on time, no backup driver needed');
    expect(reasons).toContain('1 safety incident(s) on record');
    expect(reasons).toContain('No patient ratings yet');
  });
});
