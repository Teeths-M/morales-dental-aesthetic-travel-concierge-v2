/**
 * firstOpenGreeting — the opening line M-Care shows a brand-new visitor.
 *
 * Six warm first-open greetings (Jarvis vision, piece 34), picked so the same
 * line never shows twice in a row, plus one optional sentence naming the
 * country the visitor's IP address points to (backlog thread 18), so the very
 * first thing on screen already knows a little about them.
 *
 * The lines are Portia's approved copy, word for word. `{name}` is filled in
 * with whatever the panel calls itself ("M-Safe" in the floating panel), so
 * the greeting never introduces a different name from the one on screen.
 *
 * The country sentence is hedged ("It looks like"), because an IP address is
 * only approximate: a VPN, or mobile data while roaming, can point somewhere
 * else. It names the country only, never the city. When the country isn't
 * known, or the name couldn't be turned into a natural sentence, it's left
 * out rather than guessed.
 *
 * Everything here is pure except the four small storage helpers at the end,
 * which take the storage object as an option so tests never touch a real one.
 */

export const FIRST_OPEN_GREETINGS = [
  {
    lead: "Hey there — I can tell this is your first time here. I'm {name}, and I'm really glad you found me.",
    ask: "What's on your mind?",
  },
  {
    lead: "Hi — welcome. Starting something new can feel like a lot. I'm here, and I'm not going anywhere.",
    ask: "Tell me what's going on.",
  },
  {
    lead: 'Hello, and welcome. I have a feeling this conversation is going somewhere good.',
    ask: "I'm {name} — what brings you here today?",
  },
  {
    lead: "Hey, you found me. I like that. This isn't going to feel like every other app you've tried.",
    ask: "What's going on?",
  },
  {
    lead: "Hi there. First time, right? Good — I like fresh starts. I'm {name}.",
    ask: "Let's figure this out together, at your pace.",
  },
  {
    lead: "Welcome. Whatever brought you here, I'm glad it did. I'm {name}, and I'm about to make this a lot easier than you think.",
    ask: 'What do you need?',
  },
];

export const GREETING_LAST_KEY = 'morales_mcare_greeting_last';
export const HAS_CHATTED_KEY = 'morales_mcare_has_chatted';

// Country names that take "the" in an English sentence ("in the Bahamas"),
// beyond the patterns countryPhrase already catches (United ..., ... Republic,
// ... Islands).
const NEEDS_THE = new Set([
  'bahamas', 'netherlands', 'philippines', 'gambia', 'maldives', 'seychelles',
  'comoros', 'isle of man', 'holy see', 'congo',
]);
const COUNTRY_SHAPE = /^\p{L}[\p{L} .'’&()-]*$/u;

/**
 * The country as it would read after "you're in": "Trinidad and Tobago",
 * "the United States", "the Bahamas". Null when there's nothing usable: no
 * name, a bare code like "TT", the providers' "Unknown", or an inverted
 * official form like "Korea, Republic of" that would read badly.
 */
export function countryPhrase(raw) {
  if (typeof raw !== 'string') return null;
  const original = raw.trim().replace(/\s+/g, ' ');
  let name = original;
  const trailingThe = /^(.*), the$/i.exec(name);
  if (trailingThe) name = trailingThe[1].trim();
  const leadingThe = /^the /i.test(name);
  if (leadingThe) name = name.slice(4).trim();
  if (name.length < 4 || name.length > 60) return null;
  if (name.toLowerCase() === 'unknown') return null;
  if (!COUNTRY_SHAPE.test(name)) return null;

  const lower = name.toLowerCase();
  const needsThe = !!trailingThe || leadingThe
    || lower.startsWith('united ')
    || /\brepublic\b/.test(lower)
    || /\bislands\b/.test(lower)
    || NEEDS_THE.has(lower);
  return needsThe ? `the ${name}` : name;
}

/**
 * Index of the greeting to show. Never the same as `lastIndex` (the one this
 * device showed last time), so a returning new visitor always sees a fresh
 * line. `random` is injectable for tests.
 */
export function pickGreetingIndex(lastIndex, random = Math.random, count = FIRST_OPEN_GREETINGS.length) {
  if (!Number.isInteger(count) || count <= 1) return 0;
  const last = Number.isInteger(lastIndex) && lastIndex >= 0 && lastIndex < count ? lastIndex : -1;
  const pool = last === -1 ? count : count - 1;
  const r = Number(random());
  const safe = Number.isFinite(r) ? r : 0;
  let i = Math.min(pool - 1, Math.max(0, Math.floor(safe * pool)));
  if (last !== -1 && i >= last) i += 1;
  return i;
}

/** The full greeting text for greeting `index`, with the country sentence when there is one. */
export function buildFirstOpenGreeting({ index = 0, name = 'M-Care', country = null } = {}) {
  const line = FIRST_OPEN_GREETINGS[index] || FIRST_OPEN_GREETINGS[0];
  const fill = (s) => s.split('{name}').join(name);
  const place = countryPhrase(country);
  const middle = place ? ` It looks like you're in ${place}.` : '';
  return `${fill(line.lead)}${middle} ${fill(line.ask)}`;
}

// ---- This device's memory --------------------------------------------------

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** The greeting index this device showed last, or null. */
export function readLastGreetingIndex({ storage = safeStorage() } = {}) {
  try {
    const raw = storage?.getItem(GREETING_LAST_KEY);
    if (raw == null) return null;
    const i = Number.parseInt(raw, 10);
    return Number.isInteger(i) && i >= 0 && i < FIRST_OPEN_GREETINGS.length ? i : null;
  } catch {
    return null;
  }
}

export function rememberGreetingIndex(index, { storage = safeStorage() } = {}) {
  try {
    storage?.setItem(GREETING_LAST_KEY, String(index));
  } catch {
    // Private browsing or a full disk: the next open may repeat a line, nothing worse.
  }
}

/** True once a message has been sent from this device: the visitor isn't new anymore. */
export function hasChattedOnThisDevice({ storage = safeStorage() } = {}) {
  try {
    return storage?.getItem(HAS_CHATTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberHasChatted({ storage = safeStorage() } = {}) {
  try {
    storage?.setItem(HAS_CHATTED_KEY, '1');
  } catch {
    // Same as above: worst case, a first-open greeting shows once more.
  }
}
