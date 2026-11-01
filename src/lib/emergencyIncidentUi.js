/**
 * emergencyIncidentUi — the presentation contract for the incident surface.
 *
 * Every label here is deliberately literal. An emergency screen that says
 * "help is on the way" when a provider merely accepted a message is worse than
 * one that says nothing: it stops the traveller looking for other help. So
 * `SENT` is never rendered as delivered, `DELIVERED` never as acknowledged, and
 * an accepted transport offer never as a secured ride.
 *
 * Class names are written as literal strings because Tailwind purges anything
 * it cannot see in source.
 */

const TONE_CLASS = {
  ok: 'text-msafe-positive',
  warn: 'text-msafe-warn',
  bad: 'text-msafe-critical',
  neutral: 'text-msafe-muted',
};

const TONE_BG = {
  ok: 'bg-msafe-positive/10 border-msafe-positive/35',
  warn: 'bg-msafe-warn/10 border-msafe-warn/35',
  bad: 'bg-msafe-critical/10 border-msafe-critical/40',
  neutral: 'bg-msafe-raised border-msafe-border',
};

export function toneText(tone) {
  return TONE_CLASS[tone] || TONE_CLASS.neutral;
}

export function toneSurface(tone) {
  return TONE_BG[tone] || TONE_BG.neutral;
}

// ── Response capability ───────────────────────────────────────────────────────

export const CAPABILITY_COPY = {
  confirmed: {
    label: 'Security response confirmed',
    tone: 'ok',
    sentence: 'An operational, on-duty team covers this location and has been contacted.',
  },
  unconfirmed: {
    label: 'Security response not confirmed',
    tone: 'warn',
    sentence: 'A message was sent, but nobody has acknowledged it. Treat this as unconfirmed.',
  },
  unavailable: {
    label: 'No security response available',
    tone: 'bad',
    sentence: 'M-Care cannot reach an operational team for this location. Call local emergency services.',
  },
};

export function capabilityCopy(capability) {
  return CAPABILITY_COPY[capability] || CAPABILITY_COPY.unavailable;
}

// ── Per-recipient state ───────────────────────────────────────────────────────

export const RECIPIENT_STATE_COPY = {
  QUEUED: { label: 'Queued', tone: 'neutral' },
  SENT: { label: 'Sent — delivery not confirmed', tone: 'warn' },
  DELIVERED: { label: 'Delivered — not acknowledged', tone: 'warn' },
  ACKNOWLEDGED: { label: 'Acknowledged', tone: 'ok' },
  ACCEPTED: { label: 'Responder accepted', tone: 'ok' },
  EN_ROUTE: { label: 'Responder en route', tone: 'ok' },
  ARRIVED: { label: 'Responder arrived', tone: 'ok' },
  FAILED: { label: 'Failed', tone: 'bad' },
  TIMED_OUT: { label: 'No acknowledgement — timed out', tone: 'bad' },
  ESCALATED: { label: 'Escalated to care team', tone: 'warn' },
};

export function recipientStateCopy(state) {
  return RECIPIENT_STATE_COPY[state] || { label: state || 'Unknown', tone: 'neutral' };
}

// ── Location integrity ────────────────────────────────────────────────────────

export const LOCATION_SOURCE_LABEL = {
  gps: 'Device GPS',
  network: 'Network / IP derived',
  manual: 'Entered by hand',
  none: 'Not available',
};

export const LOCATION_FRESHNESS_COPY = {
  current: { label: 'Current', tone: 'ok' },
  stale: { label: 'Stale', tone: 'warn' },
  unknown: { label: 'Age unknown', tone: 'warn' },
  unavailable: { label: 'No position', tone: 'neutral' },
};

// ── Transport ─────────────────────────────────────────────────────────────────

export const TRANSPORT_STATE_COPY = {
  REQUESTED: { label: 'Requested — no driver yet', tone: 'warn' },
  OFFERED: { label: 'Offered to a driver — not secured', tone: 'warn' },
  ACCEPTED: { label: 'Driver accepted — not arrived', tone: 'ok' },
  EN_ROUTE: { label: 'Driver en route', tone: 'ok' },
  ARRIVED: { label: 'Driver arrived', tone: 'ok' },
  UNAVAILABLE: { label: 'No transport available', tone: 'bad' },
  FAILED: { label: 'Transport failed', tone: 'bad' },
};

export function transportStateCopy(state) {
  return TRANSPORT_STATE_COPY[state] || { label: state || 'Not requested', tone: 'neutral' };
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function clockTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function relativeAge(iso, nowMs = Date.now()) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const secs = Math.max(0, Math.round((nowMs - t) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

export function countdown(deadlineIso, nowMs = Date.now()) {
  if (!deadlineIso) return null;
  const t = new Date(deadlineIso).getTime();
  if (!Number.isFinite(t)) return null;
  const secs = Math.round((t - nowMs) / 1000);
  return secs;
}

export function countdownLabel(deadlineIso, nowMs = Date.now()) {
  const secs = countdown(deadlineIso, nowMs);
  if (secs === null) return null;
  if (secs <= 0) return 'deadline passed';
  if (secs < 60) return `${secs}s left`;
  return `${Math.round(secs / 60)}m left`;
}