// Thin wrapper around pdf-lib (the one new, free, MIT-licensed, zero-cost
// dependency this build introduces) for the M-Care Scanner's "Save as PDF"
// feature — combines an ordered set of already-captured page images into
// one PDF, entirely client-side. Never touches the source page blobs; this
// only ever produces an ADDITIONAL combined file, matching VaultDocument's
// "original_file_urls is never overwritten" rule.
import { PDFDocument } from 'pdf-lib';

const PAGE_WIDTH = 612;  // 8.5in at 72dpi
const PAGE_HEIGHT = 792; // 11in at 72dpi

/**
 * combinePagesToPdf — takes an ordered array of image Blobs (jpeg/png) and
 * returns a single combined PDF as a Blob, one page per image, scaled to
 * fit while preserving aspect ratio.
 */
export async function combinePagesToPdf(pageBlobs) {
  const pdfDoc = await PDFDocument.create();

  for (const blob of pageBlobs) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const isPng = blob.type === 'image/png';
    const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

    const scale = Math.min(PAGE_WIDTH / image.width, PAGE_HEIGHT / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;

    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawImage(image, {
      x: (PAGE_WIDTH - width) / 2,
      y: (PAGE_HEIGHT - height) / 2,
      width,
      height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  // TS's DOM lib types Uint8Array's .buffer as ArrayBufferLike (which also
  // covers SharedArrayBuffer), stricter than Blob's BlobPart accepts — same
  // cast convention this repo already uses for other DOM-type mismatches
  // (e.g. VoiceMode.jsx's SpeechRecognition cast).
  return new Blob([/** @type {any} */ (pdfBytes)], { type: 'application/pdf' });
}
