import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLinkOnly } from '../base44/functions/_shared/notify.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'base44/functions');

/**
 * assertLinkOnly FAILS CLOSED — it throws rather than sending a leaking body.
 * That is the right call for privacy and the wrong one to discover in
 * production: a sender whose copy happens to trip a pattern stops notifying
 * anyone, silently, and a partner never learns a patient is waiting on them.
 *
 * So every body we actually ship has to be proven safe against the guard, not
 * assumed safe because it "looks generic". This walks every link-only call site
 * and runs the real guard over the real copy.
 *
 * It catches the obvious trap too: writing a date, a price or a case reference
 * into a `line:` — which reads harmlessly in review and throws at 3am.
 */
function collectLiterals() {
  const found = [];
  for (const name of readdirSync(DIR)) {
    if (name.startsWith('_')) continue;
    const p = join(DIR, name, 'entry.ts');
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    if (!/linkOnly(Email|Sms)\(/.test(src)) continue;

    // Pull the string literals assigned to the guarded fields.
    const re = /\b(title|line)\s*:\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      found.push({ fn: name, field: m[1], value: m[3] });
    }
  }
  return found;
}

describe('every shipped link-only body survives the guard', () => {
  const literals = collectLiterals();

  it('found call sites to check', () => {
    expect(literals.length).toBeGreaterThan(10);
  });

  for (const { fn, field, value } of literals) {
    it(`${fn} · ${field}: "${value.slice(0, 46)}${value.length > 46 ? '…' : ''}"`, () => {
      // Template placeholders stand in for their runtime values. `${role}` and
      // `${roleMsg}` resolve to role labels ("Doctor", "Chauffeur"), and
      // `${when}` to a relative phrase ("tomorrow", "in 3 days") — all short,
      // non-numeric strings. Substituting a worst-case-but-legitimate value
      // keeps the check honest instead of testing the raw placeholder.
      const resolved = value
        .replace(/\$\{when\}/g, 'in 14 days')
        .replace(/\$\{role[A-Za-z]*\}/g, 'Travel Agency')
        .replace(/\$\{[^}]*\}/g, 'x');
      expect(() => assertLinkOnly(resolved, fn)).not.toThrow();
    });
  }
});
