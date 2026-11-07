import { describe, it, expect } from 'vitest';
import {
  FIRST_OPEN_GREETINGS,
  GREETING_LAST_KEY,
  HAS_CHATTED_KEY,
  buildFirstOpenGreeting,
  countryPhrase,
  hasChattedOnThisDevice,
  pickGreetingIndex,
  readLastGreetingIndex,
  rememberGreetingIndex,
  rememberHasChatted,
} from '@/lib/firstOpenGreeting';

// Portia's approved copy (Jarvis vision, piece 34), word for word.
const APPROVED = [
  "Hey there — I can tell this is your first time here. I'm M-Care, and I'm really glad you found me. What's on your mind?",
  "Hi — welcome. Starting something new can feel like a lot. I'm here, and I'm not going anywhere. Tell me what's going on.",
  "Hello, and welcome. I have a feeling this conversation is going somewhere good. I'm M-Care — what brings you here today?",
  "Hey, you found me. I like that. This isn't going to feel like every other app you've tried. What's going on?",
  "Hi there. First time, right? Good — I like fresh starts. I'm M-Care. Let's figure this out together, at your pace.",
  "Welcome. Whatever brought you here, I'm glad it did. I'm M-Care, and I'm about to make this a lot easier than you think. What do you need?",
];

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

const brokenStorage = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
};

describe('buildFirstOpenGreeting', () => {
  it('reproduces all six approved lines exactly when no country is known', () => {
    expect(FIRST_OPEN_GREETINGS).toHaveLength(6);
    APPROVED.forEach((text, index) => {
      expect(buildFirstOpenGreeting({ index, name: 'M-Care' })).toBe(text);
    });
  });

  it("uses the panel's own name everywhere and never leaves a placeholder", () => {
    for (let index = 0; index < FIRST_OPEN_GREETINGS.length; index++) {
      const text = buildFirstOpenGreeting({ index, name: 'M-Safe', country: 'Mexico' });
      expect(text).not.toContain('{name}');
      expect(text).not.toContain('M-Care');
    }
    expect(buildFirstOpenGreeting({ index: 0, name: 'M-Safe' })).toContain("I'm M-Safe,");
  });

  it('puts the country sentence just before the question', () => {
    expect(buildFirstOpenGreeting({ index: 0, name: 'M-Safe', country: 'Trinidad and Tobago' })).toBe(
      "Hey there — I can tell this is your first time here. I'm M-Safe, and I'm really glad you found me. It looks like you're in Trinidad and Tobago. What's on your mind?",
    );
    expect(buildFirstOpenGreeting({ index: 2, name: 'M-Safe', country: 'United States' })).toBe(
      "Hello, and welcome. I have a feeling this conversation is going somewhere good. It looks like you're in the United States. I'm M-Safe — what brings you here today?",
    );
  });

  it('leaves the country out rather than guess when it is unusable', () => {
    for (const country of [null, undefined, '', 'Unknown', 'TT', 'Korea, Republic of', 42]) {
      expect(buildFirstOpenGreeting({ index: 3, name: 'M-Care', country })).toBe(APPROVED[3]);
    }
  });

  it('falls back to the first line for an index out of range', () => {
    expect(buildFirstOpenGreeting({ index: 99, name: 'M-Care' })).toBe(APPROVED[0]);
    expect(buildFirstOpenGreeting()).toBe(APPROVED[0]);
  });
});

describe('countryPhrase', () => {
  it('reads naturally after "you\'re in"', () => {
    expect(countryPhrase('Trinidad and Tobago')).toBe('Trinidad and Tobago');
    expect(countryPhrase('Mexico')).toBe('Mexico');
    expect(countryPhrase('Czechia')).toBe('Czechia');
    expect(countryPhrase("Côte d'Ivoire")).toBe("Côte d'Ivoire");
    expect(countryPhrase('Guinea-Bissau')).toBe('Guinea-Bissau');
    expect(countryPhrase('  Saint   Lucia ')).toBe('Saint Lucia');
  });

  it('adds "the" where English needs it', () => {
    expect(countryPhrase('United States')).toBe('the United States');
    expect(countryPhrase('United Kingdom')).toBe('the United Kingdom');
    expect(countryPhrase('United Arab Emirates')).toBe('the United Arab Emirates');
    expect(countryPhrase('Dominican Republic')).toBe('the Dominican Republic');
    expect(countryPhrase('Cayman Islands')).toBe('the Cayman Islands');
    expect(countryPhrase('U.S. Virgin Islands')).toBe('the U.S. Virgin Islands');
    expect(countryPhrase('Bahamas')).toBe('the Bahamas');
    expect(countryPhrase('Netherlands')).toBe('the Netherlands');
    expect(countryPhrase('Philippines')).toBe('the Philippines');
    expect(countryPhrase('Isle of Man')).toBe('the Isle of Man');
  });

  it('handles names that already carry "The", leading or trailing', () => {
    expect(countryPhrase('The Gambia')).toBe('the Gambia');
    expect(countryPhrase('Bahamas, The')).toBe('the Bahamas');
  });

  it('returns null for codes, placeholders, and inverted official forms', () => {
    for (const raw of [null, undefined, 7, '', 'TT', 'USA', 'Unknown', 'unknown', 'Korea, Republic of', 'Area 51', 'x'.repeat(61)]) {
      expect(countryPhrase(raw)).toBeNull();
    }
  });
});

describe('pickGreetingIndex', () => {
  it('never repeats the last line, and can reach every other line', () => {
    for (let last = 0; last < 6; last++) {
      const seen = new Set();
      for (let step = 0; step < 100; step++) {
        const i = pickGreetingIndex(last, () => step / 100);
        expect(i).not.toBe(last);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(6);
        seen.add(i);
      }
      expect(seen.size).toBe(5);
    }
  });

  it('can pick any line when nothing was shown before', () => {
    const seen = new Set();
    for (let step = 0; step < 100; step++) seen.add(pickGreetingIndex(null, () => step / 100));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('treats a bad saved index as nothing saved', () => {
    expect(pickGreetingIndex(9, () => 0.99)).toBe(5);
    expect(pickGreetingIndex(-1, () => 0)).toBe(0);
    expect(pickGreetingIndex('2', () => 0.4)).toBe(2);
  });

  it('stays in range for odd random values', () => {
    for (const r of [1, 1.5, -0.2, NaN, Infinity]) {
      const i = pickGreetingIndex(0, () => r);
      expect(i).toBeGreaterThan(0);
      expect(i).toBeLessThan(6);
    }
    expect(pickGreetingIndex(0, () => 0.5, 1)).toBe(0);
  });
});

describe('device memory', () => {
  it('remembers the last line shown and ignores anything out of range', () => {
    const storage = fakeStorage();
    expect(readLastGreetingIndex({ storage })).toBeNull();
    rememberGreetingIndex(4, { storage });
    expect(storage.data[GREETING_LAST_KEY]).toBe('4');
    expect(readLastGreetingIndex({ storage })).toBe(4);
    expect(readLastGreetingIndex({ storage: fakeStorage({ [GREETING_LAST_KEY]: '12' }) })).toBeNull();
    expect(readLastGreetingIndex({ storage: fakeStorage({ [GREETING_LAST_KEY]: 'abc' }) })).toBeNull();
  });

  it('remembers that this device has chatted', () => {
    const storage = fakeStorage();
    expect(hasChattedOnThisDevice({ storage })).toBe(false);
    rememberHasChatted({ storage });
    expect(storage.data[HAS_CHATTED_KEY]).toBe('1');
    expect(hasChattedOnThisDevice({ storage })).toBe(true);
  });

  it('never throws when storage is blocked or missing', () => {
    expect(readLastGreetingIndex({ storage: brokenStorage })).toBeNull();
    expect(hasChattedOnThisDevice({ storage: brokenStorage })).toBe(false);
    expect(() => rememberGreetingIndex(1, { storage: brokenStorage })).not.toThrow();
    expect(() => rememberHasChatted({ storage: brokenStorage })).not.toThrow();
    expect(readLastGreetingIndex({ storage: null })).toBeNull();
    expect(hasChattedOnThisDevice({ storage: null })).toBe(false);
  });
});
