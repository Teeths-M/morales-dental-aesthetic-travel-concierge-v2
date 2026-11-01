import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { BACKDROPS, backdropFor, countryCodeFrom, countryLabel, flagEmoji, deviceShowsFlagEmoji } from '@/lib/destinationBackdrops';
import { NIGHT } from '@/components/mcare/panelPalette';

const repoFile = (p) => new URL(`../${p}`, import.meta.url);

describe('country backdrop photos', () => {
  it('has a photo file for every country it lists, and no unlisted photos', () => {
    for (const code of Object.keys(BACKDROPS)) {
      expect(existsSync(repoFile(`public/destinations/${code.toLowerCase()}.webp`)), `${code} photo`).toBe(true);
    }
    const files = readdirSync(repoFile('public/destinations')).filter((f) => f.endsWith('.webp'));
    for (const f of files) expect(BACKDROPS[f.replace('.webp', '').toUpperCase()], `${f} is listed`).toBeTruthy();
  });

  it('keeps every photo source on record', () => {
    for (const [code, entry] of Object.entries(BACKDROPS)) {
      expect(entry.source, code).toMatch(/^https:\/\/pixabay\.com\/photos\//);
      expect(entry.place, code).toBeTruthy();
    }
  });

  it('never uses a landmark whose image rights are claimed', () => {
    const places = Object.values(BACKDROPS).map((e) => e.place).join(' ');
    for (const landmark of ['Christ', 'Redeemer', 'Petronas', 'Marina Bay Sands', 'Eiffel']) {
      expect(places).not.toContain(landmark);
    }
  });

  it('finds the photo for a code, in any case, and nothing for an unknown one', () => {
    expect(backdropFor('br')).toMatchObject({ code: 'BR', src: '/destinations/br.webp' });
    expect(backdropFor('TT').src).toBe('/destinations/tt.webp');
    expect(backdropFor('ZZ')).toBeNull();
    expect(backdropFor(null)).toBeNull();
  });
});

describe('countryCodeFrom', () => {
  it('reads a code, a name, or a location object', () => {
    expect(countryCodeFrom('tt')).toBe('TT');
    expect(countryCodeFrom('Trinidad and Tobago')).toBe('TT');
    expect(countryCodeFrom({ country_code: 'br', country: 'Brazil' })).toBe('BR');
    expect(countryCodeFrom({ country: 'United States' })).toBe('US');
  });

  it('takes the first usable input and gives up honestly', () => {
    expect(countryCodeFrom(null, undefined, { country: 'Mexico' })).toBe('MX');
    expect(countryCodeFrom({ country: 'Unknown' }, 'Atlantis')).toBeNull();
    expect(countryCodeFrom()).toBeNull();
  });
});

describe('flags and names', () => {
  it('turns a code into its flag', () => {
    expect(flagEmoji('BR')).toBe('🇧🇷');
    expect(flagEmoji('tt')).toBe('🇹🇹');
    expect(flagEmoji('B')).toBe('');
    expect(flagEmoji(undefined)).toBe('');
  });

  it('leaves the flag out on Windows, which draws it as two letters', () => {
    expect(deviceShowsFlagEmoji('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/130')).toBe(false);
    expect(deviceShowsFlagEmoji('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true);
    expect(deviceShowsFlagEmoji('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe(true);
  });

  it('names a country, falling back when the code is not a real one', () => {
    expect(countryLabel('BR')).toBe('Brazil');
    expect(countryLabel('TT')).toMatch(/Trinidad/);
    expect(countryLabel('ZZ', 'Somewhere')).toBe('Somewhere');
    expect(countryLabel(null, 'Somewhere')).toBe('Somewhere');
  });
});

describe('NIGHT colours', () => {
  it("match the app's own night theme in index.css", () => {
    const css = readFileSync(repoFile('src/index.css'), 'utf8');
    const block = css.slice(css.indexOf('[data-msafe-theme="night"]'), css.indexOf('}', css.indexOf('[data-msafe-theme="night"]')));
    const value = (name) => (block.match(new RegExp(`--msafe-${name}:\\s*(#[0-9A-Fa-f]{6})`)) || [])[1];
    const pairs = {
      canvas: NIGHT.canvas, surface: NIGHT.surface, raised: NIGHT.raised, border: NIGHT.border, ink: NIGHT.ink,
      muted: NIGHT.muted, 'gold-ink': NIGHT.goldInk, positive: NIGHT.positive, warn: NIGHT.warn, critical: NIGHT.critical,
    };
    for (const [name, mine] of Object.entries(pairs)) expect(value(name)?.toUpperCase(), name).toBe(mine.toUpperCase());
  });
});
