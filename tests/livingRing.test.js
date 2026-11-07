import { describe, expect, it } from 'vitest';
import {
  DOUBLE_TAP_MS,
  RING_SLEEP_CONVERSATION_MS,
  RING_SLEEP_EMPTY_MS,
  createDoubleTapDetector,
  ringCenterFor,
  ringShouldSleep,
  ringStateFor,
  sosOutcomeMessage,
  taskForTool,
} from '../src/lib/livingRing.js';

describe('taskForTool', () => {
  it.each([
    ['requestOnDemandRide', 'car'],
    ['callTrustedContact', 'call'],
    ['matchDoctorsForProcedure', 'doctor'],
    ['discoverProviderCandidates', 'doctor'],
    ['checkWeatherAlerts', 'weather'],
    ['searchNearbyPlaces', 'location'],
    ['openMcareScanner', 'document'],
    ['checkCaseRequirements', 'document'],
    ['computeSafeTScreening', 'safety'],
    ['getDestinationSafetyIndex', 'safety'],
    ['sendClientBookingProposal', 'payment'],
    ['searchFlights', 'travel'],
    ['getTravelBriefing', 'travel'],
    ['mcareResearchAndLearn', 'search'],
  ])('%s shows %s', (name, task) => {
    expect(taskForTool(name)).toBe(task);
  });

  it('anything unknown is just "working", never a guess', () => {
    expect(taskForTool('somethingNew')).toBe('working');
    expect(taskForTool(undefined)).toBe('working');
  });
});

describe('ringCenterFor', () => {
  it('the SOS countdown wins over everything', () => {
    expect(ringCenterFor({ orbState: 'alert', sosActive: true })).toBe('sos');
  });

  it('offline and a safety alert come before any task', () => {
    expect(ringCenterFor({ orbState: 'offline', toolName: 'requestOnDemandRide' })).toBe('offline');
    expect(ringCenterFor({ orbState: 'alert' })).toBe('alert');
  });

  it('a running tool shows its own task', () => {
    expect(ringCenterFor({ orbState: 'tool_executing', toolName: 'requestOnDemandRide' })).toBe('car');
  });

  it('a check mark only after a task really finished', () => {
    expect(ringCenterFor({ orbState: 'idle', justCompleted: true })).toBe('done');
    expect(ringCenterFor({ orbState: 'idle' })).toBeNull();
  });

  it('idle, listening and speaking leave the centre empty', () => {
    for (const orbState of ['idle', 'listening', 'speaking', 'acting']) expect(ringCenterFor({ orbState })).toBeNull();
  });
});

describe('ringStateFor', () => {
  it('turns red only while the SOS countdown runs', () => {
    expect(ringStateFor({ orbState: 'idle', sosActive: true })).toBe('sos');
    expect(ringStateFor({ orbState: 'speaking' })).toBe('speaking');
    expect(ringStateFor({})).toBe('idle');
  });
});

describe('createDoubleTapDetector', () => {
  it('two quick taps are a double tap', () => {
    const d = createDoubleTapDetector();
    expect(d.tap(1000)).toBe('single');
    expect(d.tap(1000 + DOUBLE_TAP_MS - 50)).toBe('double');
  });

  it('two slow taps are two singles', () => {
    const d = createDoubleTapDetector();
    expect(d.tap(1000)).toBe('single');
    expect(d.tap(1000 + DOUBLE_TAP_MS + 50)).toBe('single');
  });

  it('a third quick tap starts over instead of firing again', () => {
    const d = createDoubleTapDetector();
    d.tap(0);
    expect(d.tap(100)).toBe('double');
    expect(d.tap(200)).toBe('single');
  });
});

describe('ringShouldSleep', () => {
  it('sleeps after the quiet time, longer once there is a conversation to read', () => {
    expect(ringShouldSleep({ idleMs: RING_SLEEP_EMPTY_MS })).toBe(true);
    expect(ringShouldSleep({ idleMs: RING_SLEEP_EMPTY_MS - 1 })).toBe(false);
    expect(ringShouldSleep({ idleMs: RING_SLEEP_EMPTY_MS, hasConversation: true })).toBe(false);
    expect(ringShouldSleep({ idleMs: RING_SLEEP_CONVERSATION_MS, hasConversation: true })).toBe(true);
  });

  it('never sleeps while busy, however long it has been', () => {
    expect(ringShouldSleep({ idleMs: 10 * 60 * 1000, busy: true })).toBe(false);
  });
});

describe('sosOutcomeMessage', () => {
  it('says the safety team has it only when the alert email really went', () => {
    expect(sosOutcomeMessage({ ok: true, notifications: ['admin_email'] })).toMatch(/^SOS sent\./);
    expect(sosOutcomeMessage({ ok: true, notifications: ['admin_email_failed'] })).toMatch(/couldn't confirm the safety team/);
  });

  it('mentions the emergency contact and the text only when they really happened', () => {
    const msg = sosOutcomeMessage({ ok: true, notifications: ['admin_email', 'emergency_contact', 'patient_sms'] });
    expect(msg).toMatch(/emergency contact has been told/);
    expect(msg).toMatch(/texted you/);
    expect(sosOutcomeMessage({ ok: true, notifications: ['admin_email'] })).not.toMatch(/emergency contact|texted/);
  });

  it('is honest when it could not send', () => {
    expect(sosOutcomeMessage({ signedIn: false })).toMatch(/until you're signed in/);
    expect(sosOutcomeMessage({ offline: true })).toMatch(/saved your SOS/);
    expect(sosOutcomeMessage({ rateLimited: true })).toMatch(/already sent SOS alerts/);
    expect(sosOutcomeMessage({ ok: false })).toMatch(/couldn't send your SOS/);
  });
});
