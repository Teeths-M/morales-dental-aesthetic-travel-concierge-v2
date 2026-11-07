import { describe, it, expect } from 'vitest';
import { flattenMarkdownTables } from '@/lib/markdownTables';
import { extractSpeakableText } from '@/lib/talkMode';

const SEASONS = [
  '| Season | Months | Weather |',
  '|--------|--------|---------|',
  '| Dry | Dec-Apr | Sunny |',
  '| Wet | May-Nov | Showers |',
].join('\n');

describe('flattenMarkdownTables', () => {
  it('turns each row into one line, labelled by the header row', () => {
    expect(flattenMarkdownTables(SEASONS)).toBe(
      'Dry — Months: Dec-Apr, Weather: Sunny\nWet — Months: May-Nov, Weather: Showers',
    );
  });

  it('keeps the text before and after a table', () => {
    const text = `Best times to visit:\n${SEASONS}\nBook early for the dry season.`;
    expect(flattenMarkdownTables(text)).toBe(
      'Best times to visit:\nDry — Months: Dec-Apr, Weather: Sunny\nWet — Months: May-Nov, Weather: Showers\nBook early for the dry season.',
    );
  });

  it('handles alignment colons and tables without outer pipes', () => {
    const text = 'Item | Cost\n:---|---:\nFlight | $300\nHotel | $120';
    expect(flattenMarkdownTables(text)).toBe('Flight — Cost: $300\nHotel — Cost: $120');
  });

  it('leaves pipes that are not part of a table alone', () => {
    const text = 'Pick one: window | aisle\nEither is fine.';
    expect(flattenMarkdownTables(text)).toBe(text);
  });

  it('leaves a plain horizontal rule alone', () => {
    const text = 'Above\n---\nBelow';
    expect(flattenMarkdownTables(text)).toBe(text);
  });

  it('flattens two tables in one reply', () => {
    const text = `${SEASONS}\n\n| City | Flight |\n|---|---|\n| Bogota | 5h |`;
    expect(flattenMarkdownTables(text)).toBe(
      'Dry — Months: Dec-Apr, Weather: Sunny\nWet — Months: May-Nov, Weather: Showers\n\nBogota — Flight: 5h',
    );
  });

  it('handles a single-column table', () => {
    expect(flattenMarkdownTables('| Clinic |\n|---|\n| Smile Center |\n| Bright Dental |')).toBe('Smile Center\nBright Dental');
  });

  it('skips empty cells instead of printing empty labels', () => {
    expect(flattenMarkdownTables('| Doctor | City | Note |\n|---|---|---|\n| Dr. Ruiz |  | Speaks English |')).toBe(
      'Dr. Ruiz — Note: Speaks English',
    );
  });

  it('keeps the header of a table with no data rows', () => {
    expect(flattenMarkdownTables('| Doctor | City |\n|---|---|')).toBe('Doctor, City');
  });

  it('returns empty and missing input unchanged', () => {
    expect(flattenMarkdownTables('')).toBe('');
    expect(flattenMarkdownTables(undefined)).toBe(undefined);
  });
});

describe('extractSpeakableText with a table', () => {
  it('reads a table as labelled lines, never as raw pipes', () => {
    const spoken = extractSpeakableText(`Here you go:\n${SEASONS}`);
    expect(spoken.includes('|')).toBe(false);
    expect(spoken.includes('Dry — Months: Dec-Apr, Weather: Sunny')).toBe(true);
  });
});
