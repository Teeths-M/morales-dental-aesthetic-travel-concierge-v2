/**
 * offlineSosPacket.js
 * Builds, stores, and retrieves offline SOS packets using localStorage.
 * Works with navigator.onLine === false.
 * GPS is captured separately via useOfflineSOS hook.
 *
 * Browser limitation note:
 * This module uses localStorage (not IndexedDB) for maximum cross-browser
 * compatibility and simplicity in a buildathon context. Data persists across
 * page refreshes and app restarts. IndexedDB can replace this for larger payloads.
 */

const STORAGE_KEY = 'morales_offline_sos_queue';
const MAX_QUEUE = 20; // prevent unbounded growth

/** Generate a short unique packet ID */
export function generatePacketId() {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `MSOS_${hex.toUpperCase()}`;
}

/**
 * Build a compact SOS packet object.
 * @param {object} opts
 */
export function buildSosPacket({
  caseId = '',
  userId = '',
  userEmail = '',
  activitySessionId = '',
  activityType = 'unknown',
  latitude = null,
  longitude = null,
  accuracyMeters = null,
  emergencyPin = '',
  medicalCode = '',  // short user-consented medical baseline (e.g. "DM2,NKA")
  emergencyType = 'wilderness_injury',
}) {
  const packetId = generatePacketId();
  const ts = Math.floor(Date.now() / 1000); // unix seconds

  return {
    packet_id: packetId,
    case_ref: caseId ? caseId.slice(-8).toUpperCase() : 'NOCASE',
    user_ref: userId ? userId.slice(-6).toUpperCase() : 'NOUSER',
    activity_session_id: activitySessionId || '',
    activity_type: activityType,
    emergency_type: emergencyType,
    latitude,
    longitude,
    accuracy_meters: accuracyMeters,
    ts,
    timestamp_iso: new Date(ts * 1000).toISOString(),
    emergency_pin_ref: emergencyPin ? emergencyPin.slice(0, 4) : '',
    medical_code: medicalCode,
    synced: false,
    sync_attempted_at: null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Format packet as compact SMS-friendly string.
 * Target: under 160 chars for single SMS.
 * Format: MORALES SOS <id> LAT:<lat> LNG:<lng> ACC:<m> CASE:<ref> ACT:<type> TS:<unix>
 */
export function packetToSmsPayload(packet) {
  const parts = ['MORALES SOS', packet.packet_id];

  if (packet.latitude != null) parts.push(`LAT:${packet.latitude.toFixed(5)}`);
  if (packet.longitude != null) parts.push(`LNG:${packet.longitude.toFixed(5)}`);
  if (packet.accuracy_meters != null) parts.push(`ACC:${Math.round(packet.accuracy_meters)}m`);
  if (packet.case_ref) parts.push(`CASE:${packet.case_ref}`);
  if (packet.activity_type && packet.activity_type !== 'unknown') {
    parts.push(`ACT:${packet.activity_type.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 10).toUpperCase()}`);
  }
  parts.push(`TS:${packet.ts}`);
  if (packet.medical_code) parts.push(`MED:${packet.medical_code.slice(0, 20)}`);

  return parts.join(' ');
}

/** Persist packet to local queue */
export function enqueuePacket(packet) {
  const queue = getQueue();
  // Idempotency: don't re-add same packet_id
  if (queue.some(p => p.packet_id === packet.packet_id)) return;
  queue.unshift(packet);
  if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

/** Get all queued packets */
export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

/** Get unsynced packets */
export function getUnsynced() {
  return getQueue().filter(p => !p.synced);
}

/** Mark a packet as synced */
export function markSynced(packetId) {
  const queue = getQueue();
  const idx = queue.findIndex(p => p.packet_id === packetId);
  if (idx !== -1) {
    queue[idx].synced = true;
    queue[idx].sync_attempted_at = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch (_) {}
  }
}

/** Clear all synced packets (housekeeping) */
export function clearSynced() {
  const unsynced = getUnsynced();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(unsynced)); } catch (_) {}
}

/** Get Twilio number from env for SMS link */
export function getTwilioNumber() {
  // VITE_ prefix required for Vite to expose env vars to browser
  return import.meta.env?.VITE_TWILIO_PHONE_NUMBER || '';
}

/** Build sms: deep link with pre-filled body */
export function buildSmsDeepLink(smsPayload) {
  const number = getTwilioNumber();
  const encoded = encodeURIComponent(smsPayload);
  if (number) {
    // iOS: sms:+1234567890&body=... | Android: sms:+1234567890?body=...
    // Using & separator works on most platforms
    return `sms:${number}&body=${encoded}`;
  }
  // Fallback: open SMS with just body (user must enter number)
  return `sms:?body=${encoded}`;
}