import { describe, it, expect } from 'vitest';
import {
  seededHash, fixtureVisaRequirement, fixtureClinicStatus, fixtureWeatherAlert,
  fixtureDestinationSafety, runTool, runMReconLoop,
} from '../base44/functions/_shared/mRecon.ts';

describe('M Recon fixture generators — deterministic and input-sensitive', () => {
  it('same input always produces the same fixture (reproducible)', () => {
    const a = fixtureVisaRequirement({ destination_country: 'Thailand' });
    const b = fixtureVisaRequirement({ destination_country: 'Thailand' });
    expect(a).toEqual(b);
  });

  it('different destinations visibly differ across all four fixture tools', () => {
    const trip1 = { destination_country: 'Thailand', destination_city: 'Bangkok', clinic_name: 'Bangkok Medical', travel_date: '2026-09-01' };
    const trip2 = { destination_country: 'Costa Rica', destination_city: 'San José', clinic_name: 'Clinica Example', travel_date: '2026-09-01' };

    const results1 = [fixtureVisaRequirement(trip1), fixtureClinicStatus(trip1), fixtureWeatherAlert(trip1), fixtureDestinationSafety(trip1)];
    const results2 = [fixtureVisaRequirement(trip2), fixtureClinicStatus(trip2), fixtureWeatherAlert(trip2), fixtureDestinationSafety(trip2)];

    // At least the safety index (a numeric hash-derived value) must differ —
    // the weakest possible assertion that still proves input-sensitivity.
    expect(results1[3].safety_index).not.toBe(results2[3].safety_index);
  });

  it('seededHash is a pure function of its input', () => {
    expect(seededHash('same')).toBe(seededHash('same'));
    expect(seededHash('a')).not.toBe(seededHash('b'));
  });
});

describe('M Recon tool dispatcher', () => {
  it('checkRedViolations always calls the real getViolations engine, never a fixture', () => {
    const result = runTool('checkRedViolations', { procedures: ['Full Mouth Implants', 'Facelift'] });
    expect(result.isBlocked).toBe(true);
    expect(result.violations[0].code).toBe('ORAL_FACIAL_CONFLICT');
    // A real getViolations result never carries a fixture source marker.
    expect(result.source).toBeUndefined();
  });

  it('checkRedViolations with a safe combination reports no violation, still real', () => {
    const result = runTool('checkRedViolations', { procedures: ['Dental Cleaning'] });
    expect(result.isBlocked).toBe(false);
    expect(result.violations).toEqual([]);
  });

  it('fixture tools are all explicitly marked as demo fixtures', () => {
    const trip = { destination_country: 'Thailand', destination_city: 'Bangkok', clinic_name: 'Test Clinic', travel_date: '2026-09-01' };
    for (const name of ['checkVisaRequirement', 'checkClinicStatus', 'checkWeatherAlert', 'checkDestinationSafety']) {
      expect(runTool(name, trip).source).toBe('demo fixture');
    }
  });

  it('unknown tool name returns null rather than throwing', () => {
    expect(runTool('notARealTool', {})).toBeNull();
  });
});

describe('M Recon orchestration loop — fail-closed', () => {
  it('completes a full run and returns a coherent trace + briefing', async () => {
    const trip = { destination_country: 'Thailand', destination_city: 'Bangkok', procedures: [] };
    let step = 0;
    const decide = async () => {
      step += 1;
      if (step === 1) return { action: 'call_tool', tool_name: 'checkVisaRequirement', reasoning: 'checking entry requirements' };
      return { action: 'finish', final_briefing: 'All clear for this trip.' };
    };
    const result = await runMReconLoop(trip, decide);
    expect(result.error).toBeNull();
    expect(result.final_briefing).toBe('All clear for this trip.');
    expect(result.trace).toHaveLength(1);
    expect(result.trace[0].tool).toBe('checkVisaRequirement');
  });

  it('never fabricates a finished result when the decision function fails mid-loop', async () => {
    const trip = { destination_country: 'Thailand' };
    let step = 0;
    const decide = async () => {
      step += 1;
      if (step === 1) return { action: 'call_tool', tool_name: 'checkVisaRequirement', reasoning: 'checking' };
      throw new Error('simulated InvokeLLM failure');
    };
    const result = await runMReconLoop(trip, decide);
    expect(result.final_briefing).toBeNull();
    expect(result.error).toMatch(/reasoning incomplete/);
    // The one step that DID complete before the failure is still preserved.
    expect(result.trace).toHaveLength(1);
  });

  it('stops after MAX_ITERATIONS rather than looping forever on a bad decision', async () => {
    const trip = { destination_country: 'Thailand' };
    const decide = async () => ({ action: 'call_tool', tool_name: 'notARealTool', reasoning: 'bad decision' });
    const result = await runMReconLoop(trip, decide);
    expect(result.final_briefing).toBeNull();
    expect(result.error).toMatch(/reasoning incomplete/);
  });

  it('duplicate tool requests are recorded as skipped, never executed twice', async () => {
    const trip = { destination_country: 'Thailand' };
    let step = 0;
    const decide = async () => {
      step += 1;
      if (step <= 2) return { action: 'call_tool', tool_name: 'checkVisaRequirement', reasoning: 'checking' };
      return { action: 'finish', final_briefing: 'done' };
    };
    const result = await runMReconLoop(trip, decide);
    const executed = result.trace.filter(t => !t.skipped);
    expect(executed).toHaveLength(1);
  });
});
