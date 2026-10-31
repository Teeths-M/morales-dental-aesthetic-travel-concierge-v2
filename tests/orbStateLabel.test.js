import { describe, it, expect } from 'vitest';
import { orbStateLabel } from '../src/lib/orbStateLabel.js';

describe('orbStateLabel', () => {
  it('returns null when idle or offline, so the agent name shows instead', () => {
    expect(orbStateLabel('idle')).toBeNull();
    expect(orbStateLabel(undefined)).toBeNull();
    // The OFFLINE pill and the amber warning already say it.
    expect(orbStateLabel('offline')).toBeNull();
  });

  it('names each live state', () => {
    expect(orbStateLabel('listening').text).toBe('Listening…');
    expect(orbStateLabel('thinking').text).toBe('Thinking…');
    expect(orbStateLabel('speaking').text).toBe('Speaking…');
    expect(orbStateLabel('acting').text).toBe('New update for you');
  });

  it('marks a safety alert as caution, never as plain activity', () => {
    expect(orbStateLabel('alert')).toEqual({ text: 'Safety note: please read', tone: 'caution' });
  });

  it("uses the running tool's own label, with one ellipsis", () => {
    expect(orbStateLabel('tool_executing', 'Finding doctors').text).toBe('Finding doctors…');
    expect(orbStateLabel('tool_executing', 'Finding doctors...').text).toBe('Finding doctors…');
    expect(orbStateLabel('tool_executing', 'Finding doctors…').text).toBe('Finding doctors…');
  });

  it('falls back to a plain line when the tool has no label', () => {
    expect(orbStateLabel('tool_executing').text).toBe('Working on it…');
    expect(orbStateLabel('tool_executing', '   ').text).toBe('Working on it…');
  });
});
