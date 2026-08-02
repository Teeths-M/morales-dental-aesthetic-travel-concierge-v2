// ── Canonical link-only outbound notification ───────────────────────────────
// M is the vault: only a teaser + a secure portal link ever leaves the platform —
// never PHI, pricing, addresses, amounts, or patient identity. All real content is
// read in-portal after login. Every sender uses this one module so the
// "nothing private leaves M" foundation is enforced in one place.
//
// Email, SMS and WhatsApp are NOTIFICATION channels. They may say that something
// needs attention and link to it. They may not carry the thing itself, and they
// may never invite a reply — a reply turns the channel into a conversation, and
// a conversation outside M is a medical record outside M.
//
// NOTE: `title` and `line` MUST be generic (no names, no numbers, no addresses).
// `assertLinkOnly` enforces the mechanical half of that at runtime; the
// red-team suite enforces the structural half (no sender may call SendEmail or
// Twilio directly).

const BRAND = 'Morales Medical Travel Safety';
const GOLD = '#D4AF37';

const esc = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Leak guard ──────────────────────────────────────────────────────────────
// A name is just a word, so no regex can prove a string is PHI-free. What this
// DOES catch is every mechanical identifier — the things that are unambiguous
// and that account for the real leaks found in the audit: money, long digit
// runs, emails, phone numbers, document numbers, dates of birth.
//
// It deliberately fails CLOSED (throws). A notification that does not send is a
// patient who logs in to find their update; a notification that leaks is a
// medical record in an inbox we do not control, permanently.

const LEAK_PATTERNS: Array<[RegExp, string]> = [
  [/[$€£]\s?\d/, 'a currency amount'],
  [/\b\d+[.,]\d{2}\b/, 'a monetary value'],
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, 'an email address'],
  [/(\+\d[\d\s().-]{7,}\d)|(\b\d[\d\s().-]{8,}\d\b)/, 'a phone number'],
  [/\b[A-Z]{1,2}\d{6,9}\b/, 'a passport or ID number'],
  [/\b\d{4}-\d{2}-\d{2}\b/, 'a specific date'],
  [/\b\d{9,}\b/, 'a long identifier'],
  // "Reply YES", "just reply", "respond to this email" — the channel must never
  // accept an inbound leg as part of a workflow.
  [/\b(reply|respond)\b[^.]{0,24}\b(yes|no|stop|confirm|with|to this)\b/i, 'an instruction to reply'],
];

export class LinkOnlyViolation extends Error {}

/**
 * Throws if `text` carries content that must not leave the platform.
 * @param text the composed title/line/SMS body
 * @param where sender name, for a diagnosable error
 */
export function assertLinkOnly(text: string, where: string): void {
  for (const [re, what] of LEAK_PATTERNS) {
    if (re.test(text)) {
      throw new LinkOnlyViolation(
        `[${where}] notification body contains ${what}. Email/SMS/WhatsApp are ` +
        `notification-only: say that something needs attention and link to it. ` +
        `Put the detail in the portal. If this is an emergency escalation, use ` +
        `the emergency helpers, which are exempt by design.`,
      );
    }
  }
}

// ── Email ───────────────────────────────────────────────────────────────────

export interface LinkOnlyEmailOpts {
  title: string;      // generic headline, no PHI
  line: string;       // generic body line, no PHI
  ctaUrl: string;     // secure portal deep-link
  ctaLabel?: string;
  brand?: string;
  /** Sender name, used only to make a violation traceable. */
  from?: string;
}

export function linkOnlyEmail(o: LinkOnlyEmailOpts): string {
  assertLinkOnly(`${o.title} ${o.line}`, o.from || 'linkOnlyEmail');
  const brand = o.brand || BRAND;
  const label = o.ctaLabel || 'Open My Portal';
  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:18px;overflow:hidden;">
<tr><td style="padding:26px 30px;">
  <div style="font-size:24px;font-weight:900;color:${GOLD};margin-bottom:4px;">M</div>
  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:16px;">${esc(brand)}</div>
  <p style="font-size:15px;color:#fff;margin:0 0 10px;font-weight:700;">${esc(o.title)}</p>
  <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 20px;line-height:1.6;">${esc(o.line)}</p>
  <a href="${esc(o.ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,${GOLD},#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:12px 28px;border-radius:99px;text-decoration:none;">${esc(label)} →</a>
  <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:22px 0 0;">For your privacy, the details are in your Morales portal — nothing private is sent by email. Please do not reply to this message.</p>
</td></tr></table></td></tr></table></body></html>`;
}

// ── SMS / WhatsApp ──────────────────────────────────────────────────────────

export interface LinkOnlySmsOpts {
  line: string;   // generic, no PHI — e.g. "You have a new request to review."
  url: string;    // secure portal deep-link
  from?: string;  // sender name, for traceable violations
}

/**
 * The SMS/WhatsApp equivalent. Same rule, tighter budget: one generic line and
 * a link. No greeting by name — "Hi Maria" over SMS already discloses that
 * Maria is a Morales patient to anyone holding the handset.
 */
export function linkOnlySms(o: LinkOnlySmsOpts): string {
  assertLinkOnly(o.line, o.from || 'linkOnlySms');
  return `${o.line}\n\n${o.url}\n\n— ${BRAND}. Details in your portal; please don't reply to this message.`;
}

// ── Emergency carve-out ─────────────────────────────────────────────────────
// NARROW AND DELIBERATE. Authorised by Portia, 2026-07-18.
//
// When a patient is missing, injured, or has triggered SOS, the alert to their
// emergency contact and to local responders DOES carry identity and last known
// location. A responder who must log into a portal to learn who they are looking
// for is a responder who arrives late, and the M Principle puts life above every
// other consideration including this policy.
//
// This exemption covers ONLY active-emergency dispatch. It does not cover
// routine safety nudges, missed check-in reminders, or admin situational
// awareness — those are ordinary notifications and stay link-only.
//
// Every use must pass a reason; it is recorded so the exemption stays auditable
// and cannot quietly widen into "safety-adjacent, therefore exempt".

export const EMERGENCY_REASONS = [
  'sos_triggered',
  'patient_missing',
  'medical_emergency',
  'authority_dispatch',
] as const;

export type EmergencyReason = typeof EMERGENCY_REASONS[number];

export interface EmergencyDispatchOpts {
  reason: EmergencyReason;
  from: string;
  body: string;
}

/**
 * Marks a message as an authorised emergency dispatch, bypassing the link-only
 * guard. Returns the body unchanged — the value is the explicit, greppable,
 * reason-carrying call site.
 */
export function emergencyDispatch(o: EmergencyDispatchOpts): string {
  if (!EMERGENCY_REASONS.includes(o.reason)) {
    throw new LinkOnlyViolation(
      `[${o.from}] '${o.reason}' is not an emergency reason. The exemption covers ` +
      `active emergencies only — routine safety messaging stays link-only.`,
    );
  }
  return o.body;
}
