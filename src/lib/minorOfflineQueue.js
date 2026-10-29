/**
 * minorOfflineQueue — client-side queue for reunification actions taken while
 * offline.
 *
 * The rule this protects: an action keeps the timestamp of the moment it
 * HAPPENED. A child who pressed help at 09:14 on a dead connection pressed help
 * at 09:14 — not at 09:40 when their phone found signal. Rewriting it would
 * make a fast alarm look slow, and the response time is the thing being
 * measured.
 *
 * Same shape as the incident queue, deliberately: one pattern for "queued
 * action survives the network" across the whole product.
 */

const STORAGE_KEY = 'morales_minor_reunification_queue_v1';

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
    // Storage unavailable — the caller still has its own retry path.
  }
}

function nextLocalSeq(queue) {
  return (queue || []).reduce((max, a) => Math.max(max, Number(a.local_seq) || 0), 0) + 1;
}

/** Oldest first: the moment each action happened, then a local tiebreak. */
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

export function readMinorQueue() {
  return orderQueuedActions(readRaw());
}

export function hasQueuedActions() {
  return readRaw().length > 0;
}

/**
 * Queues a help trigger. `occurred_at` is captured NOW, on the device, and is
 * what the server ultimately records as the moment the alarm was raised.
 */
export function enqueueTrigger({ token, kind = 'help', latitude = null, longitude = null }) {
  const queue = readRaw();
  const action = {
    action: 'trigger',
    token,
    kind,
    latitude,
    longitude,
    occurred_at: new Date().toISOString(),
    local_seq: nextLocalSeq(queue),
  };
  writeRaw([...queue, action]);
  return action;
}

/** Queues the answer to the one question, stamped when it was answered. */
export function enqueueSafetyAnswer({ token, answer = null, transcript = null, latitude = null, longitude = null }) {
  const queue = readRaw();
  const action = {
    action: 'safety_answer',
    token,
    answer,
    transcript,
    latitude,
    longitude,
    occurred_at: new Date().toISOString(),
    local_seq: nextLocalSeq(queue),
  };
  writeRaw([...queue, action]);
  return action;
}

function clearAction(occurredAt, localSeq) {
  writeRaw(readRaw().filter((a) => !(a.occurred_at === occurredAt && a.local_seq === localSeq)));
}

/**
 * Replays the queue oldest-first. Every action carries its original
 * `occurred_at`, so the server records when it happened rather than when the
 * network returned. A failure leaves the action queued for the next attempt
 * instead of dropping it.
 */
export async function flushMinorQueue(invoke) {
  const queue = orderQueuedActions(readRaw());
  const results = [];

  for (const action of queue) {
    try {
      const fn = action.action === 'trigger' ? 'openReunificationCase' : 'recordMinorSafetyUpdate';
      const payload = action.action === 'trigger'
        ? {
          token: action.token,
          kind: action.kind,
          occurred_at: action.occurred_at,
          latitude: action.latitude,
          longitude: action.longitude,
        }
        : {
          token: action.token,
          occurred_at: action.occurred_at,
          answer: action.answer,
          transcript: action.transcript,
          latitude: action.latitude,
          longitude: action.longitude,
        };

      const res = await invoke(fn, payload);
      const data = res?.data ?? res;
      results.push({ action, ok: true, data });
      clearAction(action.occurred_at, action.local_seq);
    } catch (error) {
      results.push({ action, ok: false, error: String(error?.message || error) });
    }
  }

  return results;
}