/**
 * offlineRecoveryQueue.js
 * Offline-first queue for daily recovery check-ins.
 *
 * Mirrors Tasks 1 & 2 (offlineHandshakeQueue, offlineWelcomeCache) —
 * localStorage-first, sync-on-reconnect, no network dependency to record.
 *
 * One packet per check-in submission. Each packet carries enough data
 * to call checkRecoveryAnomaly when connectivity returns.
 */

const STORAGE_KEY = 'morales_offline_recovery_queue';
const MAX_QUEUE   = 30;

/** Short unique packet ID */
export function generateRecoveryPacketId() {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `MRC_${hex.toUpperCase()}`;
}

/**
 * Build an offline recovery packet.
 * @param {object} opts
 */
export function buildRecoveryPacket({
  sessionId     = '',
  tripId        = '',
  caseId        = '',
  painLevel     = 0,
  mobility      = null,
  appetite      = null,
  woundStatus   = 'good',
  notes         = '',
}) {
  return {
    offline_packet_id: generateRecoveryPacketId(),
    session_id:  sessionId,
    trip_id:     tripId,
    case_id:     caseId,
    pain_level:  painLevel,
    mobility,
    appetite,
    wound_status: woundStatus,
    notes,
    submitted_via: 'app',
    date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
    synced: false,
    sync_attempted_at: null,
  };
}

/** Persist packet — idempotent by offline_packet_id */
export function enqueueRecovery(packet) {
  const queue = getRecoveryQueue();
  if (queue.some(p => p.offline_packet_id === packet.offline_packet_id)) return;
  queue.unshift(packet);
  if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch (_) {}
}

export function getRecoveryQueue() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) { return []; }
}

export function getUnsyncedRecovery() {
  return getRecoveryQueue().filter(p => !p.synced);
}

export function markRecoverySynced(offlinePacketId) {
  const queue = getRecoveryQueue();
  const idx   = queue.findIndex(p => p.offline_packet_id === offlinePacketId);
  if (idx !== -1) {
    queue[idx].synced            = true;
    queue[idx].sync_attempted_at = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch (_) {}
  }
}

export function clearSyncedRecovery() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(getUnsyncedRecovery())); } catch (_) {}
}
