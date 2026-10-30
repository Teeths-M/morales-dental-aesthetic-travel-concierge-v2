/**
 * tripCardPdf — the print-ready sheet.
 *
 * The card face is the only part of this surface that has to work with no scan,
 * no signal, no app and no battery, so the sheet is built to be printed plainly:
 * black on white, one QR per card face, the number large enough to dial from a
 * step away, and nothing identifying on it at all. No surname, no city, no
 * procedure, no dates, no trip details, no terms, no second code.
 *
 * It renders from the STORED tokens on every request rather than being kept as a
 * blob, so asking for the pack again produces byte-identical cards instead of a
 * second set. That is the difference between a resend and a reissue.
 */

import { jsPDF } from 'npm:jspdf@4.0.0';
import QRCodeLib from 'npm:qrcode@1.5.4';
import {
  FRONT_LINE,
  BACK_LINE_EN,
  BACK_CALL_EN,
  PRINT_INSTRUCTION,
  cardBackLines,
} from './tripCardSet.ts';

const QRCode = (QRCodeLib as any).default || QRCodeLib;

const CREDIT = { w: 85.6, h: 54 };
const A6 = { w: 105, h: 148 };
const PAGE_W = 210;

export interface CardFaceSource {
  short_ref: string;
  card_url: string;
}

async function qrFor(url: string, px = 720): Promise<string> {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: px,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
}

function mark(doc: any, x: number, y: number, r: number) {
  doc.setFillColor(0, 0, 0);
  doc.circle(x + r, y, r, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(r * 2.1);
  doc.text('M', x + r, y + r * 0.36, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

/**
 * The FRONT of one card. Everything here is either the mark, the QR, the number
 * or the reference — the whole content of the face, and nothing else.
 */
function drawFront(
  doc: any,
  x: number,
  y: number,
  size: { w: number; h: number },
  card: CardFaceSource,
  qr: string,
  number: string,
  numberLabel: string,
  small: boolean,
) {
  const { w, h } = size;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0);
  doc.setLineWidth(0.35);
  doc.rect(x, y, w, h, 'FD');

  const pad = small ? 4 : 7;
  const r = small ? 2.8 : 4.6;

  // Mark + wordmark.
  mark(doc, x + pad, y + (small ? 6 : 11), r);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(small ? 6.4 : 10);
  doc.text('M-CARE', x + pad + r * 2 + 1.8, y + (small ? 7.1 : 12.4));

  // The one line that says what this is.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(small ? 4.8 : 7.4);
  doc.text(FRONT_LINE, x + pad, y + (small ? 15 : 25), { maxWidth: w - pad * 2 });

  // One QR. Never two — a stranger who has to choose scans the wrong one.
  const qs = small ? 22 : 40;
  const qx = x + (w - qs) / 2;
  const qy = y + (small ? 18 : 32);
  doc.addImage(qr, 'PNG', qx, qy, qs, qs);

  // The number, large and plain. This is the part that works with no app.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(small ? 11.5 : 20);
  const numberY = qy + qs + (small ? 5.6 : 12);
  doc.text(number, x + w / 2, numberY, { align: 'center' });

  if (numberLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(small ? 3.6 : 5.6);
    doc.text(numberLabel, x + w / 2, numberY + (small ? 2.6 : 4.6), { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(small ? 4.2 : 6.4);
  doc.text(card.short_ref, x + w / 2, y + h - (small ? 2.6 : 4), { align: 'center' });
}

/** The BACK: how to use it, in the language of the country the card is in. */
function drawBack(
  doc: any,
  x: number,
  y: number,
  size: { w: number; h: number },
  lang: string,
  small: boolean,
) {
  const { w, h } = size;
  const copy = cardBackLines(lang);
  const latin = copy.latin;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0);
  doc.setLineWidth(0.35);
  doc.rect(x, y, w, h, 'FD');

  const pad = small ? 5 : 10;
  doc.setTextColor(0, 0, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(small ? 9.4 : 16);
  doc.text(latin ? copy.scan : BACK_LINE_EN, x + w / 2, y + (small ? 16 : 52), {
    align: 'center',
    maxWidth: w - pad * 2,
  });

  if (latin) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(small ? 6.2 : 11);
    doc.text(BACK_CALL_EN, x + w / 2, y + (small ? 33 : 108), {
      align: 'center',
      maxWidth: w - pad * 2,
    });
  } else {
    // No glyphs for this script in the built-in fonts. The English line still
    // tells a stranger exactly what to do, and the scanned page renders the
    // local language properly.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(small ? 5.4 : 9.4);
    doc.text(copy.scan, x + w / 2, y + (small ? 26 : 76), { align: 'center', maxWidth: w - pad * 2 });
    doc.setFontSize(small ? 5 : 8.4);
    doc.text(BACK_CALL_EN, x + w / 2, y + (small ? 40 : 118), {
      align: 'center',
      maxWidth: w - pad * 2,
    });
  }
}

function sheetHeader(doc: any, label: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('M-CARE  ·  EMERGENCY CARDS', 12, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(label, -12, 12, { align: 'right' });
}

/**
 * Build the whole sheet: one page of credit-card faces, then A6 front and back
 * per card. Printed at 100% on A4, black and white is fine.
 */
export async function buildCardPdf(params: {
  cards: CardFaceSource[];
  number: string;
  numberLabel?: string | null;
  language: string;
}): Promise<string> {
  const number = String(params.number || '').trim();
  const label = params.numberLabel ? String(params.numberLabel) : 'M-Care, 24 hours';

  const qrs = await Promise.all(params.cards.map((c) => qrFor(c.card_url)));

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  // ── Page 1: credit-card size, both cards, front and back ───────────────────
  sheetHeader(doc, 'Credit card size  ·  cut along the borders');

  const cols = [12, PAGE_W / 2 + 4];
  const rows = [24, 24 + CREDIT.h + 8];

  params.cards.slice(0, 2).forEach((card, i) => {
    const qx = cols[i % 2];
    const qy = rows[Math.floor(i / 2)];
    drawFront(doc, qx, qy, CREDIT, card, qrs[i], number, label, true);
    drawBack(doc, qx, qy + CREDIT.h + 4, CREDIT, params.language, true);
  });

  // The placement instruction belongs on the sheet, not only in the email: the
  // person printing this is the person who has to put the cards in the right two
  // places.
  const noteY = rows[1] + CREDIT.h * 2 + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Where these two cards go', 12, noteY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.text(PRINT_INSTRUCTION, 12, noteY + 5, { maxWidth: PAGE_W - 24 });
  doc.setFontSize(6.4);
  doc.text(
    'Print at 100% size. Black and white is fine. A card left in the room safe only helps the room.',
    12,
    noteY + 20,
    { maxWidth: PAGE_W - 24 },
  );

  // ── A6: front and back, full size, one side per page ──────────────────────
  const a6x = (PAGE_W - A6.w) / 2;
  const a6y = (297 - A6.h) / 2;

  params.cards.forEach((card, i) => {
    doc.addPage();
    sheetHeader(doc, `A6  ·  card ${i + 1} of ${params.cards.length}  ·  front`);
    drawFront(doc, a6x, a6y, A6, card, qrs[i], number, label, false);

    doc.addPage();
    sheetHeader(doc, `A6  ·  card ${i + 1} of ${params.cards.length}  ·  back`);
    drawBack(doc, a6x, a6y, A6, params.language, false);
  });

  return doc.output('base64');
}