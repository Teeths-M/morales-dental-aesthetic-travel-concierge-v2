// ── Malicious Action Blocker — detection engine ─────────────────────────────
//
// Pure, deterministic, replayable. No LLM, no network. Same discipline as
// safeTEngine: the decision is computed here and only here, so it can be
// unit-tested and cannot be talked out of a block by a model.
//
// It answers one question: does this text, in this context, attempt to move a
// person or their data OFF the platform, or to get around a safety gate?
//
// ── Two rules that outrank everything else in this file ─────────────────────
//
// 1. COVERT SOS WINS, ALWAYS. MORALESHELP is checked first and short-circuits
//    every other rule. A person typing it may be under duress with someone
//    watching the screen. It must never be blocked, never echoed, never
//    explained, and it must not matter that the same message also contains a
//    phone number — a phone number in a duress message is probably the number
//    of the person they need help getting away from.
//
// 2. SCOPE DECIDES SEVERITY. The platform's entire purpose is to collect
//    medical detail so the SAFE-T engine can protect someone. Blocking medical
//    text on the way IN would break the safety gate this policy exists to
//    defend. So: sharing contact details in a partner-facing message is a
//    block; the same digits in a medical-history field are clinical context
//    and are scrubbed from outbound copies, not refused.

export type ViolationScope =
  | 'message'          // patient ↔ partner threads: strictest, this is where disintermediation happens
  | 'profile_field'    // structured profile input the patient owns
  | 'intake_medical'   // free-text clinical history — must stay permissive
  | 'search'           // search boxes and command inputs
  | 'safety';          // check-ins, handshake notes, SOS context — never blocked

export type Severity = 'block' | 'scrub' | 'allow';

export interface Detection {
  code: string;
  label: string;
  severity: Severity;
  /** Redacted sample, for the audit record. Never store the raw match. */
  sample: string;
}

export interface ViolationResult {
  /** True when MORALESHELP was present. Caller must dispatch a silent SOS. */
  covertSos: boolean;
  /** The strongest severity found. 'allow' when nothing matched. */
  severity: Severity;
  detections: Detection[];
  /** Text safe to persist/forward. Equals input when severity is 'allow'. */
  cleanText: string;
}

// ── Patterns ────────────────────────────────────────────────────────────────

const COVERT_SOS = /\bMORALESHELP\b/i;

// A run with at least 7 digits. The floor keeps dosages ("500mg x 2"), dates
// and prices out of it — those are clinical or commercial, not contact details.
const PHONE = /\+?\d[\d\s().-]{5,}\d/g;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/gi;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;

// "whatsapp me", "text me on signal", "my telegram is @x"
const HANDLE = /\b(?:whats\s?app|telegram|signal|instagram|\big\b|snap(?:chat)?|wechat|viber|skype|messenger)\b\s*[:@]?\s*\+?[\w.]*/gi;

// Explicit attempts to move the conversation off-platform. This is the
// behaviour the policy is actually aimed at — more reliable than digits alone,
// because it states intent rather than merely containing a number.
const OFF_PLATFORM = new RegExp(
  '\\b(' +
  'call me|text me|whats\\s?app me|dm me|message me directly|' +
  'reach me (on|at)|contact me (on|at|directly)|' +
  'here\'?s my (number|cell|phone|email)|my (number|cell|whatsapp|email) is|' +
  'let\'?s (talk|speak|continue) (outside|off)|' +
  'off the (platform|app)|outside (the )?(platform|app|morales)|' +
  'pay me directly|cash (payment|only)|book (with me )?directly' +
  ')\\b',
  'gi',
);

// Attempts to get around the safety gate itself.
const GATE_BYPASS = new RegExp(
  '\\b(' +
  'skip the (safety|safe-?t|screening)|bypass (the )?(safety|safe-?t|gate|check)|' +
  'ignore the (warning|block|safety)|' +
  'without (the )?(screening|safe-?t|safety check)|' +
  'don\'?t tell (morales|the platform|them)|' +
  'hide (it |this )?from (morales|the platform)|' +
  'another account|new account to get around' +
  ')\\b',
  'gi',
);

const REDACTED = '[removed]';

/** Keep a short, non-identifying sample for the audit record. */
function sample(match: string): string {
  const s = match.trim().slice(0, 24);
  // Never persist raw contact details, even in an audit row — the audit chain
  // is queryable, and a leak we recorded is still a leak.
  return s.replace(/\d/g, '#').replace(/[^\s@#.:+-]/g, (c) => c);
}

function countDigits(s: string): number {
  return (s.match(/\d/g) || []).length;
}

/**
 * Evaluate text against the blocker rules.
 *
 * @param input     raw user text
 * @param scope     where it was typed — see ViolationScope
 */
export function detectViolations(input: unknown, scope: ViolationScope): ViolationResult {
  const text = String(input ?? '');

  // ── RULE 1: covert SOS short-circuits everything ──────────────────────────
  // Deliberately before every other check and before any early return. A
  // person under duress does not get their cry for help refused because the
  // same message tripped a contact-sharing rule.
  if (COVERT_SOS.test(text)) {
    return {
      covertSos: true,
      severity: 'allow',
      detections: [],
      // Returned verbatim: the caller must render it as if nothing happened,
      // so an attacker reading the screen sees no reaction.
      cleanText: text,
    };
  }

  // ── RULE 2: safety scopes are never blocked ───────────────────────────────
  // A patient mid-journey must be able to complete a check-in, confirm a
  // handshake, or describe an emergency without the blocker standing in the
  // way. Losing a check-in is a safety event; a leaked phone number is not
  // worth one. Contact details are still scrubbed from anything forwarded.
  if (scope === 'safety') {
    return { covertSos: false, severity: 'allow', detections: [], cleanText: text };
  }

  const detections: Detection[] = [];
  let clean = text;

  const add = (code: string, label: string, severity: Severity, m: string) => {
    detections.push({ code, label, severity, sample: sample(m) });
  };

  // Intent-stating phrases. These are the real signal and are blocked in any
  // scope where a human counterparty could read them.
  const blockable = scope === 'message';

  for (const m of text.match(OFF_PLATFORM) || []) {
    add('off_platform_redirect', 'Attempt to move the conversation off-platform',
      blockable ? 'block' : 'scrub', m);
  }
  for (const m of text.match(GATE_BYPASS) || []) {
    // A stated intent to get around the safety gate is a block everywhere,
    // including intake — this is the M Principle's hard edge.
    add('safety_gate_bypass', 'Attempt to bypass a safety gate', 'block', m);
  }

  // Raw contact details. In a clinical free-text field these are usually the
  // patient's own doctor or pharmacy and are legitimate context, so they are
  // scrubbed from outbound copies rather than refused on entry.
  const contactSeverity: Severity =
    scope === 'message' ? 'block'
      : scope === 'intake_medical' ? 'scrub'
        : 'scrub';

  clean = clean.replace(EMAIL, (m) => { add('contact_email', 'Email address shared', contactSeverity, m); return REDACTED; });
  clean = clean.replace(URL, (m) => { add('contact_url', 'External link shared', contactSeverity, m); return REDACTED; });
  clean = clean.replace(HANDLE, (m) => { add('contact_handle', 'Off-platform messaging handle shared', contactSeverity, m); return REDACTED; });
  clean = clean.replace(PHONE, (m) => {
    if (countDigits(m) < 7) return m;          // dosage, date, price — leave alone
    add('contact_phone', 'Phone number shared', contactSeverity, m);
    return REDACTED;
  });

  const severity: Severity = detections.some((d) => d.severity === 'block')
    ? 'block'
    : detections.length ? 'scrub' : 'allow';

  return { covertSos: false, severity, detections, cleanText: clean };
}

/**
 * The block message. Final and non-negotiable by design: an appeal button is a
 * loophole. The only route back is human admin review.
 *
 * Deliberately does NOT quote what was matched — telling someone exactly which
 * pattern tripped is a instruction manual for evading it next time.
 */
export const BLOCK_MESSAGE =
  'This action has been blocked by Morales to protect your safety and privacy. ' +
  'Sharing contact information or attempting to bypass safety protocols is not ' +
  'allowed on this platform. If you believe this was a mistake, please contact support.';

/**
 * The generic reply sent to anyone who answers a notification by email or SMS.
 * The comms policy makes these channels notification-only, so an inbound reply
 * is never processed as part of a workflow — it is answered once and closed.
 */
export const REPLY_REDIRECT_MESSAGE =
  'Please log in to the Morales app to take action on this request. ' +
  'For your privacy and safety, we do not handle requests by reply.';
