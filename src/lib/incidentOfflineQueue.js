import { orderQueuedActions, resolveOccurredAt } from '@/lib/incidentDispatchClient';

/**
 * Client-side queue for responder actions taken while offline.
 *
 * The rule this exists to protect: an action keeps the timestamp of the
 * moment it HAPPENED. A responder who accepted at 09:14 on a dead connection
 * accepted at 09:14, not at the 09:20 moment their phone reached the network.
 * Rewriting it would make a valid accept look late when it was early — and in
 * an emergency the response time is evidence.
 */

const STORAGE_KEY = 'morales_incident_queue_v1';

function readRaw() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(queue) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable — the caller still has its own retry path.
  }
}

/** Monotonic per-device sequence, used only to break ties within one timestamp. */
export function nextLocalSeq(queue) {
  return (queue || []).reduce((max, a) => Math.max(max, Number(a.local_seq) || 0), 0) + 1;
}

export function buildQueuedAction(queue, params, occurredAt) {
  return {
    incident_id: params.incident_id,
    offer_id: params.offer_id || null,
    offer_token: params.offer_token,
    action: params.action,
    occurred_at: occurredAt,
    local_seq: nextLocalSeq(queue),
  };
}

export function enqueueIncidentAction(params) {
  const queue = readRaw();
  const action = buildQueuedAction(queue, params, new Date().toISOString());
  writeRaw([...queue, action]);
  return action;
}

export function readIncidentQueue() {
  return orderQueuedActions(readRaw());
}

export function clearIncidentAction(occurredAt, localSeq) {
  const remaining = readRaw().filter(
    (a) => !(a.occurred_at === occurredAt && a.local_seq === localSeq),
  );
  writeRaw(remaining);
}

/** The order to replay in — oldest action first. */
export function flushOrder() {
  return orderQueuedActions(readRaw());
}

/**
 * Replays the queue through the supplied invoke function. Each action keeps
 * its original timestamp; a failure leaves it queued for the next attempt
 * rather than dropping it.
 */
export async function flushIncidentQueue(invoke) {
  const queue = orderQueuedActions(readRaw());
  const results = [];

  for (const action of queue) {
    const occurred = resolveOccurredAt(action, new Date().toISOString());
    try {
      const res = await invoke('respondToDispatchOffer', {
        offer_token: action.offer_token,
        action: action.action,
        occurred_at: occurred.occurred_at,
      });
      const payload = res?.data ?? res;
      results.push({ action, ok: true, payload });
      clearIncidentAction(action.occurred_at, action.local_seq);
    } catch (error) {
      results.push({ action, ok: false, error: String(error?.message || error) });
    }
  }

  return results;
}