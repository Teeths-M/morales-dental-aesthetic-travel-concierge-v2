/**
 * offlineUploadQueue.js
 * Queues file uploads when the device is offline.
 * Files stored as base64 (max 1 MB per file, max 3 items).
 * Pattern: identical to other offline queues (SOS, handshake, recovery, pause).
 *
 * Storage key: morales_offline_upload_queue
 */

const STORAGE_KEY   = 'morales_offline_upload_queue';
const MAX_QUEUE     = 3;
const MAX_QUEUE_MB  = 1;  // per-file limit for offline storage
const MAX_QUEUE_BYTES = MAX_QUEUE_MB * 1024 * 1024;

function shortId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Returns true if a file is small enough to store offline in localStorage. */
export function canQueueOffline(file) {
  return file.size <= MAX_QUEUE_BYTES;
}

/** Build a packet from a File object (async — reads file as base64). */
export async function buildUploadPacket({ file, documentType = '', tripId = '', userId = '' }) {
  const base64Data = await fileToBase64(file);
  return {
    offline_packet_id: `MUP_${shortId()}`,
    file_name:     file.name,
    file_type:     file.type,
    file_size:     file.size,
    base64_data:   base64Data,
    document_type: documentType,
    trip_id:       tripId,
    user_id:       userId,
    created_at:    new Date().toISOString(),
    synced:        false,
    file_url:      null,
    sync_error:    null,
  };
}

/** Reconstruct a File object from a stored packet. */
export function base64ToFile(packet) {
  const [meta, data] = packet.base64_data.split(',');
  const mime  = meta.match(/:(.*?);/)[1];
  const bstr  = atob(data);
  const bytes = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) bytes[i] = bstr.charCodeAt(i);
  return new File([bytes], packet.file_name, { type: mime });
}

export function getUploadQueue() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) { return []; }
}

export function enqueueUpload(packet) {
  if (!packet?.base64_data) return;
  const queue = getUploadQueue();
  if (queue.some(p => p.offline_packet_id === packet.offline_packet_id)) return;
  queue.unshift(packet);
  if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch (_) {}
}

export function getUnsyncedUploads() {
  return getUploadQueue().filter(p => !p.synced);
}

export function markUploadSynced(packetId, fileUrl = '') {
  const queue = getUploadQueue();
  const idx   = queue.findIndex(p => p.offline_packet_id === packetId);
  if (idx !== -1) {
    queue[idx].synced    = true;
    queue[idx].file_url  = fileUrl;
    queue[idx].synced_at = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch (_) {}
  }
}

export function markUploadError(packetId, error = '') {
  const queue = getUploadQueue();
  const idx   = queue.findIndex(p => p.offline_packet_id === packetId);
  if (idx !== -1) {
    queue[idx].sync_error = error;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch (_) {}
  }
}
