/**
 * incidentDispatchClient — the small subset of dispatch logic the UI needs.
 *
 * This is a deliberate frontend copy of three pure helpers from
 * base44/shared/incidentDispatch.ts. Frontend code cannot import from
 * base44/ (it isn't part of the client bundle), and these three must run in
 * the browser: the offline queue has to order actions locally, and every
 * screen has to render a notification status without ever claiming a SENT
 * message was delivered.
 *
 * tests/incidentDispatch.test.js asserts this copy and the server copy agree
 * on both behaviours, so the two cannot drift apart silently.
 */

export function orderQueuedActions(actions) {
  return [...(actions || [])].sort((a, b) => {
    const at = new Date(a.occurred_at).getTime();
    const bt = new Date(b.occurred_at).getTime();
    const safeA = Number.isFinite(at) ? at : Number.POSITIVE_INFINITY;
    const safeB = Number.isFinite(bt) ? bt : Number.POSITIVE_INFINITY;
    if (safeA !== safeB) return safeA - safeB;
    return (a.local_seq ?? 0) - (b.local_seq ?? 0);
  });
}

export function resolveOccurredAt(action, receivedAt) {
  const t = action?.occurred_at ? new Date(action.occurred_at).getTime() : NaN;
  if (Number.isFinite(t)) {
    return { occurred_at: new Date(t).toISOString(), occurred_at_source: 'client' };
  }
  return { occurred_at: new Date(receivedAt).toISOString(), occurred_at_source: 'server_fallback' };
}

/**
 * SENT is never DELIVERED. Mirrors notificationDisplayStatus in the shared
 * module exactly — see the parity test.
 */
export function notificationDisplayStatus(status) {
  switch (status) {
    case 'DELIVERED':
      return { label: 'Delivered', delivered: true, tone: 'ok' };
    case 'ACKNOWLEDGED':
      return { label: 'Acknowledged', delivered: true, tone: 'ok' };
    case 'SENT':
      return { label: 'Sent — not yet confirmed delivered', delivered: false, tone: 'pending' };
    case 'FAILED':
      return { label: 'Failed', delivered: false, tone: 'bad' };
    case 'QUEUED':
    default:
      return { label: 'Queued', delivered: false, tone: 'pending' };
  }
}