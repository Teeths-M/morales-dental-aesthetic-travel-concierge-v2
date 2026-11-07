/**
 * sosQueue — SOS alerts saved on this device while offline, sent when the connection comes back.
 *
 * Used by the SOS button (SOSDropdown) and M-Care's ring screen (double tap on Talk). Both flush the same queue, so a
 * flush takes the whole queue off the device before sending anything: two screens flushing at once can't send the
 * same alert twice. An alert that fails to send goes back on the queue for the next try.
 */

export const SOS_QUEUE_KEY = 'morales_sos_offline_queue';

function readQueue(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(SOS_QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Saves one SOS payload to send later. Returns false if the device wouldn't store it. */
export function queueSos(payload, storage = globalThis.localStorage) {
  try {
    const queue = readQueue(storage);
    queue.push(payload);
    storage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

/** Removes and returns every queued SOS payload in one step. */
export function takeQueuedSos(storage = globalThis.localStorage) {
  try {
    const queue = readQueue(storage);
    if (queue.length) storage.removeItem(SOS_QUEUE_KEY);
    return queue;
  } catch {
    return [];
  }
}

/** Whether a failed send is worth trying again later: no answer at all, a server fault, or "too many just now". */
export function shouldRetrySos(error) {
  const status = error?.response?.status ?? error?.status;
  return !status || status >= 500 || status === 429;
}

/**
 * Sends every queued SOS with send(payload). One that failed for a reason that can pass (see shouldRetrySos) goes
 * back on the queue; one the server refused outright (a signed-out device, a malformed alert) is dropped, or it
 * would be retried forever. Returns how many were sent.
 */
export async function flushQueuedSos(send, storage = globalThis.localStorage) {
  const queue = takeQueuedSos(storage);
  let sent = 0;
  for (const payload of queue) {
    try {
      await send(payload);
      sent += 1;
    } catch (error) {
      if (shouldRetrySos(error)) queueSos(payload, storage);
    }
  }
  return sent;
}
