import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { aggregateVerification, BYOJ_PLANS, BYOJ_DISCLOSURE_VERSION } from '../../base44/functions/_shared/byoj.ts';

// ── Bring Your Own Journey — guards the locked R1–R5 decisions ────────────────
// Behavioral where the logic is pure; source-invariant where it lives in an edge
// function (needs the deployed backend + credits to run end-to-end).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const check = (status, completed) => ({ key: 'k', label: 'l', status, completed, detail: '' });

// ── R5 — honest degraded state, never a false green ───────────────────────────
test.describe('R5 verification is honest — never a false verified', () => {
  test('BEHAVIORAL: overall is verified ONLY when every check completed clean', () => {
    expect(aggregateVerification([check('verified', true), check('verified', true)]).overall).toBe('verified');
  });

  test('BEHAVIORAL: an incomplete check downgrades the overall to incomplete, not verified', () => {
    const r = aggregateVerification([check('verified', true), check('unconfirmed', false)]);
    expect(r.overall).toBe('incomplete');
    expect(r.overall).not.toBe('verified');
    expect(r.completeness).toBe(50);
  });

  test('BEHAVIORAL: any concern makes the overall concerns', () => {
    expect(aggregateVerification([check('verified', true), check('concern', true)]).overall).toBe('concerns');
  });

  test('SOURCE: failed live checks fall back to unconfirmed/completed:false, never a clean verified', () => {
    const src = read('base44/functions/verifyExternalJourney/entry.ts');
    expect(src).toMatch(/status: 'unconfirmed', completed: false/);
    // The AI/network failure path must NOT emit a verified status.
    expect(src).toMatch(/catch \(_\) \{[\s\S]*?status: 'unconfirmed', completed: false/);
  });
});

// ── R2 — never a silent pass ──────────────────────────────────────────────────
test.describe('R2 a concerning finding never passes silently', () => {
  test('SOURCE: a concern creates a DutyOfCareEscalation record AND notifies a coordinator', () => {
    const src = read('base44/functions/verifyExternalJourney/entry.ts');
    const gate = src.indexOf("summary.overall === 'concerns'");
    const rec = src.indexOf('DutyOfCareEscalation.create');
    const mail = src.indexOf('SendEmail');
    expect(gate).toBeGreaterThan(-1);
    expect(rec).toBeGreaterThan(gate);   // escalation record is inside the concerns branch
    expect(mail).toBeGreaterThan(gate);  // coordinator outreach is inside it too
  });

  test('SOURCE: external reporting is only a placeholder — not acted on (open policy decision)', () => {
    const src = read('base44/functions/verifyExternalJourney/entry.ts');
    expect(src).toMatch(/external_reporting_considered: false/);
    const entity = read('base44/entities/DutyOfCareEscalation.jsonc');
    expect(entity).toMatch(/OPEN POLICY DECISION/i);
  });
});

// ── R1 — unavoidable disclosure; service promise not a guarantee ──────────────
test.describe('R1 disclosure is unavoidable and legal-gated', () => {
  test('SOURCE: enroll is refused without an explicit disclosure acceptance', () => {
    const src = read('base44/functions/enrollExternalJourney/entry.ts');
    expect(src).toMatch(/if \(!disclosure_accepted\)/);
    expect(src).toMatch(/must acknowledge the protection-service disclosure/i);
  });

  test('SOURCE: the service promise is monitoring/alerting/escalation — not prevention/guarantee; copy is legal-gated', () => {
    const src = read('base44/functions/_shared/byoj.ts');
    expect(src).toMatch(/not prevention or a guarantee of outcome/i);
    expect(src).toMatch(/draft_pending_legal/);
    expect(BYOJ_DISCLOSURE_VERSION).toMatch(/draft/);
  });
});

// ── R3 — one-time only ────────────────────────────────────────────────────────
test.describe('R3 one-time payment only at launch', () => {
  test('BEHAVIORAL: only the single_journey one-time plan is enabled', () => {
    expect(BYOJ_PLANS.single_journey.enabled).toBe(true);
    expect(BYOJ_PLANS.single_journey.billing).toBe('one_time');
    expect(BYOJ_PLANS.journey_recovery.enabled).toBe(false);
    expect(BYOJ_PLANS.always_covered.enabled).toBe(false);
  });

  test('SOURCE: enroll rejects any non-enabled / non-one-time plan', () => {
    const src = read('base44/functions/enrollExternalJourney/entry.ts');
    expect(src).toMatch(/!planDef\.enabled \|\| planDef\.billing !== 'one_time'/);
  });
});

// ── R4 — manual entry only, no document parsing this phase ─────────────────────
test.describe('R4 manual entry only', () => {
  test('SOURCE: the intake bar has no file upload / OCR parse path', () => {
    const src = read('src/components/byoj/ItineraryIntakeBar.jsx');
    expect(src).not.toMatch(/type="file"/);
    expect(src).not.toMatch(/\bocr\b|extractText|InvokeLLM/i); // \bocr\b: the OCR feature, not substrings like "procRef"
    expect(src).toMatch(/Canonical procedure names/); // uses a controlled list, not free text
  });

  test('SOURCE: the external CaseRecord is flagged origin external + protection_only', () => {
    const src = read('base44/functions/enrollExternalJourney/entry.ts');
    expect(src).toMatch(/origin: 'external'/);
    expect(src).toMatch(/protection_only: true/);
  });
});
