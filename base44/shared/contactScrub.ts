// ── Contact scrubbing (anti-disintermediation) ──────────────────────────────
// Quote-stage messages between a patient and a not-yet-chosen doctor must stay ON
// PLATFORM so the booking keeps its escrow + safety guarantees (and so identity isn't
// leaked before selection). This strips direct contact channels — emails, URLs, phone
// numbers, and "reach me on <app>" handles — while leaving clinical text and prices
// intact. Pure + deterministic so it can be unit-tested.

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
// A phone-like run: starts with an optional +, then digits/separators, ending in a
// digit. Only redacted when it actually contains ≥7 digits (so "$5000" or "3 implants"
// are left alone).
const PHONE_RE = /\+?\d[\d\s().-]{4,}\d/g;
// "whatsapp: name", "telegram @handle", "reach me on signal 12345", etc.
const HANDLE_RE = /\b(?:whats\s?app|telegram|signal|instagram|\big\b|snap(?:chat)?|wechat|viber|skype)\b\s*[:@]?\s*\+?[\w.]+/gi;

const REDACTED = '[removed]';

export interface ScrubResult { clean: string; redactedCount: number }

export function scrubContact(input: unknown): ScrubResult {
  let redacted = 0;
  const bump = () => { redacted++; return REDACTED; };
  let s = String(input ?? '');

  s = s.replace(HANDLE_RE, bump);
  s = s.replace(EMAIL_RE, bump);
  s = s.replace(URL_RE, bump);
  s = s.replace(PHONE_RE, (m) => {
    const digits = (m.match(/\d/g) || []).length;
    return digits >= 7 ? bump() : m;
  });

  return { clean: s, redactedCount: redacted };
}
