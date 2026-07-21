/**
 * offlineHandshakeQueue.js
 * Offline-first queue for handshake confirmations.
 *
 * Mirrors the SOS queue pattern (offlineSosPacket.js) — identical
 * enqueue / getUnsynced / markSynced lifecycle, different storage key
 * and packet shape. Writes to localStorage first; syncs to the
 * completeHandshake backend when connectivity returns.
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

/**
 * Ordered list of handshake types, index === handshake number (1-9).
 * Index 0 is unused so `HANDSHAKE_TYPES[n]` reads naturally.
 * Mirrors HANDSHAKE_MAP in base44/functions/completeHandshake/entry.ts.
 */
export const HANDSHAKE_TYPES = [
  null,
  'driver_pickup', 'airport_dropoff', 'airport_checkin', 'hotel_checkin',
  'clinic_arrival', 'recovery_handoff', 'hotel_checkout', 'airport_boarding',
  'home_dropoff',
];

/**
 * Send every queued handshake to the server.
 *
 * This is the single flush implementation, used both by HandshakeButton after
 * a tap and by the global offline sync controller on reconnect. It previously
 * lived privately inside HandshakeButton and was only ever called from inside
 * a tap handler, so a handshake confirmed in airplane mode was never sent
 * unless the patient happened to open the app and tap again while online —
 * despite the toast promising "we'll confirm this step when you reconnect."
 *
 * @param {object} base44 SDK client (injected to keep this module dependency-free)
 * @returns {Promise<{synced:number, failed:number}>}
 */
export async function flushHandshakeQueue(base44) {
  const unsynced = getUnsyncedHandshakes();
  let synced = 0;
  let failed = 0;

  for (const packet of unsynced) {
    const handshakeNumber = HANDSHAKE_TYPES.indexOf(packet.handshake_type);
    if (handshakeNumber < 1) {
      // Unknown type would be rejected as "must be 1-9" forever, wedging the
      // queue. Drop it rather than retry indefinitely.
      console.error('[offlineHandshakeQueue] dropping packet with unknown type:', packet.handshake_type);
      markHandshakeSynced(packet.offline_packet_id);
      failed++;
      continue;
    }
    try {
      await base44.functions.invoke('completeHandshake', {
        trip_id: packet.trip_id,
        handshake_number: handshakeNumber,
        gps_location: packet.gps_lat
          ? { lat: packet.gps_lat, lng: packet.gps_lng, accuracy_m: packet.gps_accuracy_m }
          : null,
        trigger_method: 'app',
        offline_packet_id: packet.offline_packet_id,
      });
      markHandshakeSynced(packet.offline_packet_id);
      synced++;
    } catch (_) {
      // Leave queued for the next flush.
      failed++;
    }
  }
  return { synced, failed };
}

/**
 * Called when a journey completes (HS9 confirmed or case marked Completed).
 * Syncs any remaining unsynced packets then clears the queue.
 */
export async function clearHandshakeQueue(caseId, base44) {
  if (!caseId) return;
  try {
    // Flush before deleting — this block used to be empty, so unsynced
    // confirmations for the case were silently discarded here.
    const queue = getHandshakeQueue();
    const unsynced = queue.filter(p => !p.synced && p.case_id === caseId);

    if (unsynced.length > 0 && base44 && navigator.onLine) {
      await flushHandshakeQueue(base44).catch(() => {});
    }

    // Remove all packets for this case
    const remaining = queue.filter(p => p.case_id !== caseId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));

    return { cleared: queue.length - remaining.length };
  } catch (err) {
    console.error('[offlineHandshakeQueue] Failed to clear queue:', err?.message);
    return { cleared: 0 };
  }
}
