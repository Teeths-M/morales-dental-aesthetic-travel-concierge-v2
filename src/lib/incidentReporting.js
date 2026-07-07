import * as Sentry from '@sentry/react';
import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'morales_incident_session_id';

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch (_) {
    return undefined;
  }
}

function detectDevice() {
  if (typeof navigator === 'undefined') return undefined;
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

function getSentryEventId() {
  try {
    return Sentry.lastEventId?.();
  } catch (_) {
    return undefined;
  }
}

/** Collision-resistant, coordination-free reference ID — not sequential. Mirrors the server-side generator in base44/functions/_shared/incidentReporting.ts. */
export function generateIncidentCode() {
  const year = new Date().getFullYear();
  const timePart = Date.now().toString(36).toUpperCase();
  const randPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `M-${year}-${timePart}${randPart}`;
}

/**
 * reportIncident — generates (or reuses) an incident code and fires a
 * best-effort, non-blocking report to the backend. Returns the code
 * immediately so the UI can display it without waiting on the network.
 *
 * Pass an existing `incidentCode` + `userDescription` to append a user's
 * follow-up description to an already-reported incident (upsert, no re-email).
 */
export function reportIncident({
  incidentCode,
  severity = 'medium',
  source = 'frontend',
  feature,
  page,
  errorMessage,
  stackTrace,
  userDescription,
} = {}) {
  const code = incidentCode || generateIncidentCode();

  base44.functions.invoke('reportIncident', {
    incident_code: code,
    severity,
    source,
    feature,
    page: page || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    session_id: getSessionId(),
    browser: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    device: detectDevice(),
    error_message: errorMessage,
    stack_trace: stackTrace,
    user_description: userDescription,
    sentry_event_id: getSentryEventId(),
  }).catch(() => {});

  return code;
}
