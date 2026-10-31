import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  SCENARIOS,
  CLOSING,
  KIND_LABEL,
  MCARE,
  YOU,
  OUTCOME,
} from '../src/lib/landingTranscript.js';
import { PILOT_SOURCES } from '../src/lib/pilotSources.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

/**
 * The landing page makes claims, so the claims are tested.
 *
 * Two things could go badly wrong here and both are silent: a transcript that
 * drifts into claiming real-world actions it never took, and a pilot form whose
 * source values no longer match the entity, which makes signups appear to save
 * when the write is rejected.
 */

describe('landing transcript — structure', () => {
  it('has scenarios', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(5);
  });

  it('gives every scenario a label, day, kind and footnote', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.id, 'id').toBeTruthy();
      expect(scenario.label, scenario.id).toBeTruthy();
      expect(scenario.day, scenario.id).toBeTruthy();
      expect(['illustrative', 'live']).toContain(scenario.kind);
      expect(scenario.footnote, scenario.id).toBeTruthy();
      expect(Array.isArray(scenario.messages)).toBe(true);
      expect(scenario.messages.length).toBeGreaterThan(0);
    }
  });

  it('uses unique ids', () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('writes a real explanation in every footnote, not a badge', () => {
    for (const scenario of SCENARIOS) {
      const words = scenario.footnote.trim().split(/\s+/).length;
      expect(words, scenario.id).toBeGreaterThanOrEqual(12);
      expect(scenario.footnote, scenario.id).toMatch(/demonstration|real/i);
    }
  });

  it('only uses known message roles and tones', () => {
    const roles = [MCARE, YOU, OUTCOME];
    for (const scenario of SCENARIOS) {
      for (const message of scenario.messages) {
        expect(roles, scenario.id).toContain(message.from);
        expect(message.text).toBeTruthy();
        if (message.from === OUTCOME) {
          expect(['critical', 'caution', 'neutral']).toContain(message.tone);
          expect(message.title).toBeTruthy();
        }
      }
    }
  });

  it('labels each kind in plain words', () => {
    expect(KIND_LABEL.live).toBeTruthy();
    expect(KIND_LABEL.illustrative).toBeTruthy();
    expect(KIND_LABEL.illustrative.toLowerCase()).not.toContain('live');
  });

  it('closes on one agent, not a feature list', () => {
    expect(CLOSING).toMatch(/one agent/i);
  });
});

describe('landing transcript — truthfulness', () => {
  const textOf = (scenario) => scenario.messages.map((m) => `${m.title || ''} ${m.text}`).join(' ');

  it('never claims a provider was verified in the verification scenario', () => {
    const scenario = SCENARIOS.find((s) => s.id === 'verification');
    const text = textOf(scenario);

    expect(text).toMatch(/not verified|will not call them verified/i);
    // An affirmative claim would read "is verified" / "has been verified".
    expect(text).not.toMatch(/\b(is|has been)\s+verified\b/i);
  });

  it('never claims a real outbound action in any scenario', () => {
    const claim = /\b(I|we)\s+(called|contacted|texted|paged|booked|rescheduled|verified|dispatched)\b/i;
    for (const scenario of SCENARIOS) {
      expect(textOf(scenario), scenario.id).not.toMatch(claim);
      expect(textOf(scenario), scenario.id).not.toMatch(/\bhas been\s+(contacted|called|texted|verified|booked)\b/i);
    }
  });

  it('keeps queued and delivered strictly apart in the offline scenario', () => {
    const scenario = SCENARIOS.find((s) => s.id === 'offline');
    const text = textOf(scenario);

    expect(text).toMatch(/queued/i);
    expect(text).toMatch(/not sent|not delivered|not.*delivered/i);
    expect(text).not.toMatch(/\bhas been delivered\b/i);
  });

  it('has M-Care refusing to diagnose in the recovery scenario', () => {
    const scenario = SCENARIOS.find((s) => s.id === 'recovery');
    const text = textOf(scenario);
    expect(text).toMatch(/do not diagnose/i);
    expect(text).toMatch(/clinician|clinical team/i);
  });

  it('marks the offline scenario as the only live one', () => {
    const live = SCENARIOS.filter((s) => s.kind === 'live');
    expect(live.map((s) => s.id)).toEqual(['offline']);
    expect(live[0].footnote).not.toMatch(/demonstration/i);
  });

  it('marks every other scenario explicitly as staged', () => {
    for (const scenario of SCENARIOS.filter((s) => s.kind !== 'live')) {
      expect(scenario.footnote, scenario.id).toMatch(/demonstration/i);
      expect(scenario.footnote, scenario.id).toMatch(/no (registry|booking|driver|clinician)/i);
    }
  });
});

describe('pilot signup — client and schema agree', () => {
  const entity = JSON.parse(read('base44/entities/PilotSignup.jsonc'));

  it('uses exactly the sources the schema accepts', () => {
    expect(entity.properties.source.enum).toEqual(PILOT_SOURCES);
  });

  it('requires an email and collects nothing clinical', () => {
    expect(entity.required).toContain('email');
    // campaign is the ad/card tag from the QR link (e.g. "ad29"): marketing, not personal or clinical.
    expect(Object.keys(entity.properties).sort()).toEqual(['campaign', 'email', 'invited_at', 'note', 'source', 'status']);
  });

  it('closes direct client writes so validation cannot be bypassed', () => {
    expect(entity.rls.create).toBe(false);
  });

  it('keeps the list admin-only', () => {
    const rule = JSON.stringify(entity.rls.read);
    expect(rule).toContain('admin');
    expect(rule).toContain('platform_admin');
    // Nothing in the read rule may be an unconditional allow.
    expect(rule).not.toContain('true');
    // And it must not be readable by the address that signed up — a waiting
    // list is not the signers-up' data to browse.
    expect(rule).not.toContain('{{user.email}}');
  });

  it('has a function that de-duplicates before writing', () => {
    const fn = read('base44/functions/joinPilot/entry.ts');
    expect(fn).toContain('PilotSignup');
    expect(fn).toContain('already_joined');
    expect(fn).toContain('asServiceRole');
    // A 400 for a bad address, never a silent success.
    expect(fn).toContain('status: 400');
  });
});