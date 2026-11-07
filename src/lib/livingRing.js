/**
 * livingRing — the rules behind M-Care's ring screen (/m-care), kept pure so tests/livingRing.test.js checks them.
 *
 * The ring only ever shows what M-Care is really doing: its centre icon comes from the tool that is actually
 * running (the agent's own tool name), and the SOS reply is built from what triggerSOS actually reported back.
 */

/** Seconds the ring counts down after a double tap on Talk before the SOS is sent. Any tap cancels. */
export const SOS_COUNTDOWN_SECONDS = 5;
/** Two taps on Talk within this many milliseconds are a double tap. */
export const DOUBLE_TAP_MS = 400;
/** Quiet time before the ring screen falls asleep with no conversation yet, and once there is one to read. */
export const RING_SLEEP_EMPTY_MS = 12000;
export const RING_SLEEP_CONVERSATION_MS = 45000;
/** How long the check mark stays in the ring after a task finishes. */
export const RING_DONE_MS = 1800;

// Tool name keywords, checked in order (first match wins). Tool names are M-Care's own function names, such as
// requestOnDemandRide, callTrustedContact or matchDoctorsForProcedure.
/** @type {Array<[string, RegExp]>} */
const TOOL_TASKS = [
  ['car', /ride|driver|transport|chauffeur|taxi|pickup/i],
  ['call', /call|phone/i],
  ['doctor', /doctor|provider|clinic|specialist|consult|matchdoctor/i],
  ['weather', /weather/i],
  ['location', /location|place|map|nearby|geocod/i],
  ['document', /visa|passport|document|scan|vault|requirement/i],
  ['safety', /safe|risk|guardian|sos|emergency|medguard/i],
  ['payment', /pay|price|quote|proposal|estimate|rate|fee/i],
  ['travel', /flight|travel|trip|journey|briefing|itinerary/i],
  ['search', /research|knowledge|explain|recall|search|discover/i],
];

/** The ring's task for a running tool's name: one of the keys above, or 'working' for anything else. */
export function taskForTool(toolName) {
  const name = typeof toolName === 'string' ? toolName : '';
  for (const [task, pattern] of TOOL_TASKS) if (pattern.test(name)) return task;
  return 'working';
}

/**
 * What the ring's centre shows, highest priority first. null means an empty ring (asleep, idle, listening and
 * speaking show in the ring's own motion instead).
 */
/** @param {{ orbState?: string, toolName?: string|null, sosActive?: boolean, justCompleted?: boolean }} [opts] */
export function ringCenterFor({ orbState, toolName = null, sosActive = false, justCompleted = false } = {}) {
  if (sosActive) return 'sos';
  if (orbState === 'offline') return 'offline';
  if (orbState === 'alert') return 'alert';
  if (orbState === 'tool_executing') return taskForTool(toolName);
  if (justCompleted) return 'done';
  if (orbState === 'thinking') return 'thinking';
  return null;
}

/** The ring's own colour and motion state: the panel's orbState, or 'sos' while the countdown runs. */
/** @param {{ orbState?: string, sosActive?: boolean }} [opts] */
export function ringStateFor({ orbState, sosActive = false } = {}) {
  return sosActive ? 'sos' : (orbState || 'idle');
}

/**
 * Tells a single tap from a double tap. tap(now) returns 'double' when it lands within windowMs of the previous
 * single tap, else 'single'. A third quick tap starts over rather than counting as another double.
 */
export function createDoubleTapDetector(windowMs = DOUBLE_TAP_MS) {
  let lastSingleAt = null;
  return {
    tap(now) {
      if (lastSingleAt != null && now - lastSingleAt <= windowMs) {
        lastSingleAt = null;
        return 'double';
      }
      lastSingleAt = now;
      return 'single';
    },
    reset() { lastSingleAt = null; },
  };
}

/**
 * Whether the ring screen should fall asleep now. busy covers everything that keeps it awake whatever the clock says:
 * M-Care working, talking or listening, a safety alert, the SOS countdown, typing or recording.
 */
/** @param {{ idleMs?: number, hasConversation?: boolean, busy?: boolean }} [opts] */
export function ringShouldSleep({ idleMs, hasConversation = false, busy = false } = {}) {
  if (busy) return false;
  const limit = hasConversation ? RING_SLEEP_CONVERSATION_MS : RING_SLEEP_EMPTY_MS;
  return Number.isFinite(idleMs) && idleMs >= limit;
}

/**
 * What M-Care says once an SOS has been tried. Only claims what really happened:
 *   signedIn:      false means triggerSOS can't be sent at all (it needs a signed-in traveller)
 *   offline:       true means it was saved to send when the connection comes back
 *   ok:            the call returned without an error
 *   rateLimited:   triggerSOS refused because several were sent in the last few minutes
 *   notifications: triggerSOS's own notifications_sent list
 */
export function sosOutcomeMessage({ signedIn = true, offline = false, ok = false, rateLimited = false, notifications = [] } = {}) {
  if (!signedIn) {
    return "I can't send an SOS until you're signed in to M-Care. If you're in danger, call your local emergency number now.";
  }
  if (offline) {
    return "You're offline, so I've saved your SOS and I'll send it the moment you're back online. If you're in danger, call your local emergency number now.";
  }
  if (rateLimited) {
    return "You've already sent SOS alerts in the last few minutes, and the safety team has them. If you're in danger, call your local emergency number now.";
  }
  if (!ok) {
    return "I couldn't send your SOS just now. Call your local emergency number, and try again.";
  }
  const sent = Array.isArray(notifications) ? notifications : [];
  if (!sent.includes('admin_email')) {
    return "Your SOS is recorded, but I couldn't confirm the safety team was reached. Call your local emergency number now.";
  }
  let reply = "SOS sent. The M-Care safety team has your alert and your location.";
  if (sent.includes('emergency_contact')) reply += ' Your emergency contact has been told too.';
  if (sent.includes('patient_sms')) reply += " I've texted you a confirmation.";
  return reply;
}
