/**
 * Finds the most recent {{qr:...}} or {{maps:...}} token M-Care already
 * emitted in this conversation, so MCareOrb.jsx can re-surface it the
 * instant the browser goes offline — a pure client-side re-render of data
 * the app already has, never a new network call (which would fail offline
 * anyway).
 *
 * Mirrors MessageBubble.jsx's extractQr/extractMaps token regex on purpose
 * (same {{qr:LABEL|DEST}} / {{maps:LABEL|DEST}} format) — this is a
 * different operation (scan message history for the LATEST mention, not
 * strip a token from one already-known string), so it isn't a drop-in reuse
 * of those functions, but the format must stay identical to what M-Care
 * actually emits.
 *
 * Pure and testable: given a messages array, always returns either
 * {label, dest, tokenType} or null, never throws.
 */
const QR_RE = /\{\{qr:([^|]*)\|([\s\S]*?)\}\}/;
const MAPS_RE = /\{\{maps:([^|]*)\|([\s\S]*?)\}\}/;

export function findLastMapOrQrToken(messages) {
  if (!Array.isArray(messages)) return null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const content = messages[i]?.content;
    if (!content) continue;

    const qrMatch = content.match(QR_RE);
    if (qrMatch) return { label: qrMatch[1].trim(), dest: qrMatch[2].trim(), tokenType: 'qr' };

    const mapsMatch = content.match(MAPS_RE);
    if (mapsMatch) return { label: mapsMatch[1].trim(), dest: mapsMatch[2].trim(), tokenType: 'maps' };
  }

  return null;
}
