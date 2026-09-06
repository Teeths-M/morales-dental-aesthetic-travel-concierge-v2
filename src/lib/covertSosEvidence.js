/**
 * covertSosEvidence — rear-camera photo capture for a covert SOS follow-up.
 *
 * Kept as its own module, separate from useCovertSOS.js, so that hook's own
 * diff stays a one-line addition and every pinned invariant about its
 * gesture/cooldown logic stays untouched.
 *
 * Two exports:
 *   prewarmCovertSosCamera()        — resolve the browser permission prompt
 *                                      ahead of time, at a deliberate, visible
 *                                      moment (arming Covert SOS in Settings).
 *   captureCovertSosEvidenceAsync() — the real capture-on-trigger technique.
 *
 * Technique reuses the exact proven getUserMedia({video:{facingMode:
 * 'environment'}}) -> draw-to-canvas approach already live in
 * DocumentScannerCard.jsx, adapted to a DOM-detached hidden <video> instead
 * of that component's own visible preview UI (DocumentScannerCard itself is
 * a different, unrelated feature — document scanning — and is not imported
 * or modified here).
 *
 * Discreetness ceiling, stated plainly: the camera stream is never rendered
 * on screen (no visible preview, no UI at all), but the OS's own camera-in-
 * use indicator (the status-bar dot/icon on Android and iOS) cannot be
 * suppressed by any web/JS technique — that's an OS-level privacy control,
 * not a limitation of this code. The stream is torn down as fast as possible
 * (before the async blob encode even starts) specifically to minimize how
 * long that indicator is visible.
 *
 * Every step is best-effort and independently guarded: a permission denial,
 * missing camera hardware, slow device, or upload failure simply means
 * attachCovertSosEvidence is never called — zero impact on the primary
 * triggerCovertSOS alert, which has already fired by the time this runs.
 */
import { base44 } from '@/api/base44Client';

const CAPTURE_TIMEOUT_MS = 6000;
const VIDEO_READY_POLL_MS = 50;
const VIDEO_READY_MAX_POLLS = 40; // ~2s cap waiting for a first decoded frame

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('covert-sos-evidence-timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Best-effort, fire-and-forget: acquires and immediately releases the rear
 * camera so the browser's per-origin permission decision is already resolved
 * before a real covert trigger fires. Call this only at a deliberate, visible
 * moment (the patient actively arming Covert SOS in Settings) — never
 * silently on page load, since a real permission prompt appearing out of
 * nowhere would itself be a giveaway to anyone watching the screen.
 */
export function prewarmCovertSosCamera() {
  try {
    navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: 'environment' } })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => {});
  } catch (_) { /* best-effort only */ }
}

async function grabOneFrameBlob(stream) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  // Deliberately NOT display:none/visibility:hidden — both can stop frame
  // decode in some mobile WebViews. Off-screen + zero-opacity keeps the
  // element genuinely invisible while still painting real frames.
  Object.assign(video.style, {
    position: 'fixed', top: '-9999px', left: '-9999px',
    width: '1px', height: '1px', opacity: '0', pointerEvents: 'none',
  });
  document.body.appendChild(video);

  try {
    video.srcObject = stream;
    await video.play().catch(() => {});

    let polls = 0;
    while (video.readyState < 2 && polls < VIDEO_READY_MAX_POLLS) {
      await new Promise((r) => setTimeout(r, VIDEO_READY_POLL_MS));
      polls++;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    // Release the camera BEFORE the async encode below — minimizes how long
    // the OS camera-in-use indicator stays lit.
    stream.getTracks().forEach((t) => t.stop());
    video.remove();

    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    video.remove();
    throw e;
  }
}

/**
 * The real capture-on-trigger flow. Always resolves (never rejects/throws to
 * the caller) — every failure mode is swallowed internally, since a covert
 * SOS trigger must never surface anything on screen regardless of outcome.
 * @param {{caseId?: string|null}} [opts]
 */
export async function captureCovertSosEvidenceAsync(opts = {}) {
  const { caseId } = opts;
  /** @type {MediaStream | undefined} */
  let stream;
  try {
    if (!navigator.mediaDevices?.getUserMedia) return;

    const work = (async () => {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const blob = await grabOneFrameBlob(stream);
      if (!blob) return;

      const file = new File([blob], 'sos-evidence.jpg', { type: 'image/jpeg' });
      const uploadRes = await base44.integrations.Core.UploadPrivateFile({ file });
      const fileUri = uploadRes?.file_uri;
      if (!fileUri) return;

      await base44.functions.invoke('attachCovertSosEvidence', {
        case_id: caseId || null,
        file_uri: fileUri,
      });
    })();

    await withTimeout(work, CAPTURE_TIMEOUT_MS);
  } catch (_) {
    // Permission denied, no camera, timeout, upload failure — all silent.
  } finally {
    // Belt-and-suspenders: a stream that somehow survived the timeout race
    // must never be left running.
    if (stream) stream.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
  }
}
