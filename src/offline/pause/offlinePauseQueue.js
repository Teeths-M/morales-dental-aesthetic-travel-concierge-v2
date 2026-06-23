/**
 * offlinePauseQueue.js
 * Offline-first queue for pause/resume actions.
 *
 * Pattern: identical to Tasks 1-3 queues (sos, handshake, recovery, welcome).
 * Pause/resume flips a local flag immediately — no internet required.
 * When reconnected, the queued action syncs to manageTripPause and triggers
 * recalculateTripTimings on the server.
 *
 * Storage key: morales_offline_pause_queue
 */

const STORAGE_KEY = 'morales_offline_pause_queue';
const MAX_QUEUE   = 10; // pause/resume events are infrequent

export function buildPausePacket({
  tripId   = '',
  action   = 'pause',    // 'pause' | 'resume'
  reason   = '',
  pausedAt = null,       // ISO string — set when pausing
}) {
  return {
    offline_packet_id: `MPR_${Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`,
    trip_id:   tripId,
    action,
    reason,
    paused_at: pausedAt,
    created_at: new Date().toISOString(),
    synced: false,
    sync_attempted_at: null,
  };
}

export function enqueuePause(packet) {
  const queue = getPauseQueue();
  if (queue.some(p => p.offline_packet_id === packet.offline_packet_id)) return;
  queue.unshift(packet);
  if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch (_) {}
}

export function getPauseQueue() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) { return []; }
}

export function getUnsyncedPause() {
  return getPauseQueue().filter(p => !p.synced);
}

export function markPauseSynced(offlinePacketId) {
  const queue = getPauseQueue();
  const idx   = queue.findIndex(p => p.offline_packet_id === offlinePacketId);
  if (idx !== -1) {
    queue[idx].synced            = true;
    queue[idx].sync_attempted_at = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch (_) {}
  }
}

/** Local pause state — persists the flag offline so UI reflects it immediately */
const LOCAL_KEY = 'morales_trip_pause_state';

export function setLocalPauseState(tripId, paused, reason = '', pausedAt = null) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    all[tripId] = { paused, reason, paused_at: pausedAt, updated_at: new Date().toISOString() };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch (_) {}
}

export function getLocalPauseState(tripId) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return all[tripId] || { paused: false };
  } catch (_) { return { paused: false }; }
}
