import { describe, it, expect } from 'vitest';
import {
  detectViolations,
  BLOCK_MESSAGE,
  REPLY_REDIRECT_MESSAGE,
} from '../base44/functions/_shared/violationEngine.ts';

/**
 * The blocker exists to stop disintermediation and safety-gate evasion.
 * These tests are mostly about the cases where blocking would itself be the
 * dangerous act — those are the ones that can hurt a patient.
 */

describe('covert SOS outranks every other rule', () => {
  // A person typing MORALESHELP may be under duress with someone watching.
  it('is detected and never blocked', () => {
    const r = detectViolations('MORALESHELP', 'message');
    expect(r.covertSos).toBe(true);
    expect(r.severity).toBe('allow');
  });

  it('still fires when the same message would otherwise be blocked', () => {
    // The number in a duress message is plausibly the number of the person
    // they need help getting away from. Refusing the message to enforce a
    // contact-sharing rule would be the worst possible outcome.
    const r = detectViolations('call me at +1 868 555 0147 MORALESHELP', 'message');
    expect(r.covertSos).toBe(true);
    expect(r.severity).toBe('allow');
    expect(r.detections).toEqual([]);
  });

  it('returns the text verbatim so the UI can show no reaction', () => {
    const text = 'moraleshelp';
    expect(detectViolations(text, 'search').cleanText).toBe(text);
  });

  it('is case-insensitive and works inside a longer sentence', () => {
    expect(detectViolations('please help moralesHELP now', 'search').covertSos).toBe(true);
  });
});

describe('safety scopes are never blocked', () => {
  // Losing a check-in is a safety event. A leaked phone number is not worth one.
  const safetyTexts = [
    'I am safe, staying at the hotel, my sister can be reached on 868 555 0147',
    'call me — something is wrong',
    'skip the safety check I need help now',
  ];
  for (const t of safetyTexts) {
    it(`allows: "${t.slice(0, 40)}..."`, () => {
      expect(detectViolations(t, 'safety').severity).toBe('allow');
    });
  }
});

describe('medical intake stays permissive', () => {
  // The platform's whole purpose is collecting this so SAFE-T can protect
  // someone. Blocking it would break the gate the policy defends.
  it('does not block clinical history', () => {
    const r = detectViolations(
      'I have type 2 diabetes and high blood pressure, on metformin 500mg twice daily.',
      'intake_medical',
    );
    expect(r.severity).toBe('allow');
  });

  it('does not mistake a dosage or a date for a phone number', () => {
    const r = detectViolations('Taking 500mg x 2 daily since 2024, BP 140/90.', 'intake_medical');
    expect(r.severity).toBe('allow');
  });

  it("scrubs a referring doctor's number rather than refusing the history", () => {
    const r = detectViolations(
      'My cardiologist Dr Ali can confirm this, his office is 868-555-0147.',
      'intake_medical',
    );
    expect(r.severity).toBe('scrub');       // not 'block'
    expect(r.cleanText).not.toContain('555');
    expect(r.cleanText).toContain('cardiologist');
  });
});

describe('disintermediation in partner messages is blocked', () => {
  const blocked = [
    'WhatsApp me at +1 868 555 0147',
    'call me at 868-555-0147',
    "here's my number, let's talk outside the platform",
    'Email me at doctor@clinic.com and we can book directly',
    'pay me directly, cash only',
    'my telegram is @drdane',
  ];
  for (const t of blocked) {
    it(`blocks: "${t.slice(0, 42)}"`, () => {
      expect(detectViolations(t, 'message').severity).toBe('block');
    });
  }

  it('blocks a bare phone number in a partner thread', () => {
    expect(detectViolations('868 555 0147', 'message').severity).toBe('block');
  });

  it('leaves ordinary clinical discussion alone', () => {
    const r = detectViolations(
      'I would recommend two implants and a three night recovery stay.',
      'message',
    );
    expect(r.severity).toBe('allow');
  });

  it('does not block a price discussion — that is legitimate quoting', () => {
    expect(detectViolations('The facility fee is $4,500 all in.', 'message').severity).toBe('allow');
  });
});

describe('safety-gate bypass is blocked in every scope', () => {
  // The M Principle's hard edge: RED is a hard block, and so is trying to
  // talk your way around it.
  for (const scope of ['message', 'intake_medical', 'profile_field', 'search']) {
    it(`blocks a stated bypass attempt in ${scope}`, () => {
      const r = detectViolations('can we bypass the safe-t screening', scope);
      expect(r.severity).toBe('block');
    });
  }

  it('blocks an attempt to evade with a second account', () => {
    expect(detectViolations('I will just use another account', 'message').severity).toBe('block');
  });

  it('is still overridden by covert SOS', () => {
    expect(detectViolations('bypass the safety gate MORALESHELP', 'message').covertSos).toBe(true);
  });
});

describe('audit samples never carry raw contact details', () => {
  it('masks digits in the stored sample', () => {
    const r = detectViolations('WhatsApp me at +1 868 555 0147', 'message');
    for (const d of r.detections) {
      expect(d.sample, 'a recorded sample must not contain raw digits').not.toMatch(/\d/);
    }
  });
});

describe('user-facing copy', () => {
  it('does not tell the user which pattern tripped', () => {
    // Naming the matched pattern is an evasion manual.
    expect(BLOCK_MESSAGE).not.toMatch(/phone|regex|pattern|digit/i);
    expect(BLOCK_MESSAGE).toMatch(/contact support/i);
  });

  it('redirects repliers into the app', () => {
    expect(REPLY_REDIRECT_MESSAGE).toMatch(/log in to the Morales app/i);
  });
});

describe('post-selection messaging: operational contact allowed, evasion still blocked', () => {
  // Once the patient has chosen this doctor, escrow and the safety guarantees
  // are attached to the booking. A patient landing in an unfamiliar city needs
  // to be able to call the clinic; refusing them the number to enforce a
  // privacy rule would be the policy hurting the person it protects.
  it('allows a clinic phone number once the doctor is selected', () => {
    const r = detectViolations(
      'Our clinic reception is 868-555-0147 if you need us on the day.',
      'message_selected',
    );
    expect(r.severity).toBe('allow');
    expect(r.cleanText).toContain('868-555-0147');
  });

  it('still blocks escrow evasion from a CHOSEN doctor', () => {
    // The more dangerous version, not the less: it evades the escrow and the
    // safety guarantees the selection was supposed to buy the patient.
    for (const t of ['pay me directly, cash only', "let's continue outside the platform", 'book with me directly next time']) {
      expect(detectViolations(t, 'message_selected').severity, t).toBe('block');
    }
  });

  it('still blocks a safety-gate bypass from a chosen doctor', () => {
    expect(detectViolations('we can skip the safe-t screening', 'message_selected').severity)
      .toBe('block');
  });

  it('blocks the same phone number BEFORE selection', () => {
    expect(detectViolations('reception is 868-555-0147', 'message').severity).toBe('block');
  });

  it('covert SOS still outranks everything post-selection', () => {
    expect(detectViolations('call me 868-555-0147 MORALESHELP', 'message_selected').covertSos).toBe(true);
  });
});
