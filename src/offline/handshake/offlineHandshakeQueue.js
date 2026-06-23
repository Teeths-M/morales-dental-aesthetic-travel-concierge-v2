/**
 * offlineHandshakeQueue.js
 * Offline-first queue for handshake confirmations.
 *
 * Mirrors the SOS queue pattern (offlineSosPacket.js) — identical
 * enqueue / getUnsynced / markSynced lifecycle, different storage key
 * and packet shape. Writes to localStorage first; syncs to
 * confirmHandshake backend when connectivity returns.
 *
 * Packet shape matches the OfflineHandshake entity:
 *   { handshake_id, trip_id, type, status, confirmed_by, timestamp,
 *     gps_lat, gps_lng, gps_accuracy_m, method, offline_packet_id,
 *     case_id, synced, created_at }
 */

const STORAGE_KEY = 'morales_offline_handshake_queue';
const MAX_QUEUE   = 30;

/** Short unique packet ID for offline correlation */
export function generateHandshakePacketId() {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `MHS_${hex.toUpperCase()}`;
}

/**
 * Build an offline handshake packet.
 * @param {object} opts
 * @param {string} opts.checkpointId   - Server-assigned HS_XXXXX id (or local if offline)
 * @param {string} opts.tripId
 * @param {string} opts.caseId
 * @param {string} opts.handshakeType  - driver_pickup | airport_dropoff | …
 * @param {string} opts.confirmedBy    - user ID
 * @param {string} opts.confirmedByName
 * @param {number|null} opts.gpsLat
 * @param {number|null} opts.gpsLng
 * @param {number|null} opts.gpsAccuracyM
 * @param {string} opts.method         - 'tap'
 */
export function buildHandshakePacket({
  checkpointId   = '',
  tripId         = '',
  caseId         = '',
  handshakeType  = 'driver_pickup',
  confirmedBy    = '',
  confirmedByName = '',
  gpsLat         = null,
  gpsLng         = null,
  gpsAccuracyM   = null,
  method         = 'tap',
}) {
  return {
    offline_packet_id: generateHandshakePacketId(),
    checkpoint_id:     checkpointId,
    trip_id:           tripId,
    case_id:           caseId,
    handshake_type:    handshakeType,
    status:            'confirmed',
    confirmed_by:      confirmedBy,
    confirmed_by_name: confirmedByName,
    gps_lat:           gpsLat,
    gps_lng:           gpsLng,
    gps_accuracy_m:    gpsAccuracyM,
    method,
    timestamp:         new Date().toISOString(),
    synced:            false,
    sync_attempted_at: null,
    created_at:        new Date().toISOString(),
  };
}

/** SMS payload for the tap method (shown to user as copy/fallback) */
export function packetToSmsPayload(packet) {
  return `HANDSHAKE ${packet.checkpoint_id}`;
}

/** Persist packet to local queue — idempotent by offline_packet_id */
export function enqueueHandshake(packet) {
  const queue = getHandshakeQueue();
  if (queue.some(p => p.offline_packet_id === packet.offline_packet_id)) return;
  queue.unshift(packet);
  if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

/** All queued packets */
export function getHandshakeQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

/** Unsynced packets only */
export function getUnsyncedHandshakes() {
  return getHandshakeQueue().filter(p => !p.synced);
}

/** Mark a packet as successfully synced to the backend */
export function markHandshakeSynced(offlinePacketId) {
  const queue = getHandshakeQueue();
  const idx   = queue.findIndex(p => p.offline_packet_id === offlinePacketId);
  if (idx !== -1) {
    queue[idx].synced            = true;
    queue[idx].sync_attempted_at = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch (_) {}
  }
}

/** Remove all synced packets (housekeeping) */
export function clearSyncedHandshakes() {
  const unsynced = getUnsyncedHandshakes();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(unsynced)); } catch (_) {}
}
