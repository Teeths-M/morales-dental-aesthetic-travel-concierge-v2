import { describe, it, expect } from 'vitest';
import { escapeHtml, renderEmail } from '../base44/functions/_shared/emailTemplate.ts';

describe('escapeHtml — entity-encodes HTML special characters', () => {
  it('encodes <, >, &, ", \' individually', () => {
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('neutralizes a <script> payload — no raw tag survives', () => {
    const payload = '<script>alert(1)</script>';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('handles null/undefined without throwing', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('passes plain text through unchanged', () => {
    expect(escapeHtml('Dr. Ana Morales — Bogotá clinic')).toBe('Dr. Ana Morales — Bogotá clinic');
  });
});

describe('renderEmail — user-controlled fields are escaped, bodyHtml stays a raw hatch', () => {
  const base = { appUrl: 'https://example.com', title: 'Safe title' };

  it('escapes title', () => {
    const html = renderEmail({ ...base, title: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes intro', () => {
    const html = renderEmail({ ...base, intro: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('escapes note', () => {
    const html = renderEmail({ ...base, note: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('escapes row labels and values', () => {
    const html = renderEmail({ ...base, rows: [['<b>Label</b>', '<script>alert(1)</script>']] });
    expect(html).not.toContain('<b>Label</b>');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('bodyHtml is NOT escaped — it is the documented raw-HTML hatch, caller must pre-escape', () => {
    const html = renderEmail({ ...base, bodyHtml: '<p class="intentional">trusted layout</p>' });
    expect(html).toContain('<p class="intentional">trusted layout</p>');
  });
});
