import { describe, it, expect } from 'vitest';
import {
  linkOnlyEmail,
  linkOnlySms,
  assertLinkOnly,
  emergencyDispatch,
  LinkOnlyViolation,
} from '../base44/functions/_shared/notify.ts';

/**
 * Email, SMS and WhatsApp are notification channels. They say that something
 * needs attention and link to it. Everything else stays in the platform.
 *
 * These cases are drawn from real bodies found in the comms audit — each one
 * was actually being sent before the policy was enforced.
 */
describe('link-only notification guard', () => {
  const leaks = [
    ['a balance',            'Your outstanding balance is $4,500 for this stage.'],
    ['a decimal amount',     'We have processed 1,250.00 to your account.'],
    ['a patient email',      'Please contact theon.baratheon@example.com about the case.'],
    ['a phone number',       'Call the patient on +1 868 555 0147 to confirm pickup.'],
    ['a passport number',    'Travelling on document TT1234567, please verify.'],
    ['a scheduled date',     'The procedure is scheduled for 2026-07-22.'],
    ['a reply instruction',  'Reply YES to confirm your appointment.'],
    ['a reply instruction2', 'Please respond to this email with your availability.'],
  ];

  for (const [what, body] of leaks) {
    it(`refuses ${what}`, () => {
      expect(() => assertLinkOnly(body, 'test')).toThrow(LinkOnlyViolation);
    });
  }

  it('names the sender so a violation is diagnosable', () => {
    expect(() => assertLinkOnly('Balance: $99.00', 'sendPaymentReminders'))
      .toThrow(/sendPaymentReminders/);
  });

  it('allows a generic notification with a link', () => {
    expect(() => assertLinkOnly(
      'A doctor has responded to your request. Open your portal to review it.',
      'test',
    )).not.toThrow();
  });

  // The guard has to run on the composed body, not just be available to call.
  it('linkOnlyEmail refuses to render a leaking body', () => {
    expect(() => linkOnlyEmail({
      title: 'Your quote is ready',
      line: 'Dr Dane quoted $4,500 for your tummy tuck.',
      ctaUrl: 'https://app.example.com/quotes',
    })).toThrow(LinkOnlyViolation);
  });

  it('linkOnlySms refuses to render a leaking body', () => {
    expect(() => linkOnlySms({
      line: 'Theon, your surgery is on 2026-07-22.',
      url: 'https://app.example.com/journey',
    })).toThrow(LinkOnlyViolation);
  });

  it('renders a compliant email that tells the reader not to reply', () => {
    const html = linkOnlyEmail({
      title: 'New pricing request',
      line: 'A patient has requested pricing for a procedure. Open your portal to view it.',
      ctaUrl: 'https://app.example.com/portal/doctor',
      ctaLabel: 'Open My Portal',
    });
    expect(html).toContain('Open My Portal');
    expect(html).toContain('nothing private is sent by email');
    expect(html).toMatch(/do not reply/i);
  });

  it('renders a compliant SMS with a link and no name', () => {
    const sms = linkOnlySms({
      line: 'You have a new request to review.',
      url: 'https://app.example.com/portal',
    });
    expect(sms).toContain('https://app.example.com/portal');
    expect(sms).toMatch(/don't reply/i);
  });
});

describe('emergency carve-out', () => {
  // Authorised 2026-07-18: a responder who has to log in to find out who they
  // are looking for arrives late. Life outranks the comms policy.
  it('passes an active-emergency body through untouched', () => {
    const body = 'MISSING PATIENT: Theon B, last seen 10.6598,-61.5019 at 14:20.';
    expect(emergencyDispatch({ reason: 'patient_missing', from: 'test', body })).toBe(body);
  });

  it('refuses to widen into routine safety messaging', () => {
    expect(() => emergencyDispatch({
      reason: 'missed_checkin',
      from: 'test',
      body: 'anything',
    })).toThrow(LinkOnlyViolation);
  });
});
