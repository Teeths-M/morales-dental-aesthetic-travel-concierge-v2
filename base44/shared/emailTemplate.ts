/**
 * emailTemplate — Shared premium HTML email wrapper
 *
 * One consistent, on-brand shell for every outbound email: real Golden M
 * logo, official design tokens (dark navy / gold — matches src/index.css
 * and CLAUDE.md), responsive layout. Replaces the ~8 near-identical inline
 * emailLayout() copies previously duplicated across individual functions.
 *
 * Usage:
 *   import { renderEmail } from '../../shared/emailTemplate.ts';
 *   const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
 *   const html = renderEmail({
 *     appUrl,
 *     eyebrow: 'Payment Confirmed',
 *     title: `Your journey is underway, ${clientName}`,
 *     intro: 'Your deposit has been received and our concierge team is now coordinating your itinerary.',
 *     rows: [['Procedure', procedureLabel], ['Destination', country]],
 *     note: 'Please reply to this email if you need assistance.',
 *     ctaText: 'View My Journey', ctaUrl: `${appUrl}/dashboard`,
 *   });
 */

const GOLD = '#D4AF37';
const BG_DARK = '#060B16';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

export const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export interface EmailOptions {
  /** App base URL (no trailing slash) — used to build the hosted logo URL and any relative links. */
  appUrl: string;
  /** Hidden preview text shown in inbox lists before the email is opened. */
  preheader?: string;
  /** Small uppercase label above the title, e.g. "Payment Confirmed". */
  eyebrow?: string;
  /** Main heading. */
  title: string;
  /** Intro paragraph, rendered before the rows table. */
  intro?: string;
  /** [label, value] pairs rendered as a clean key/value table. */
  rows?: Array<[string, string | number]>;
  /** Optional highlighted callout box below the rows. */
  note?: string;
  /** Escape hatch for fully custom content — rendered after intro/rows/note if provided. */
  bodyHtml?: string;
  ctaText?: string;
  ctaUrl?: string;
  /** Overrides the default footer line. */
  footer?: string;
}

export function renderEmail(opts: EmailOptions): string {
  const {
    appUrl,
    preheader = '',
    eyebrow = '',
    title,
    intro = '',
    rows = [],
    note = '',
    bodyHtml = '',
    ctaText,
    ctaUrl,
    footer = 'Questions? Reply to this email or contact us at concierge@morales-dental.com',
  } = opts;

  const logoUrl = `${appUrl.replace(/\/$/, '')}/morales-m-mark.png`;

  const rowsHtml = rows.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};margin:22px 0;">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="padding:10px 0;color:rgba(238,242,247,0.45);font-size:13px;width:38%;">${escapeHtml(label)}</td>
            <td style="padding:10px 0;color:#EEF2F7;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
          </tr>`).join('')}
      </table>`
    : '';

  const noteHtml = note
    ? `<div style="margin:22px 0;padding:16px 18px;background:rgba(212,175,55,0.08);border-left:3px solid ${GOLD};border-radius:8px;color:rgba(238,242,247,0.7);font-size:13px;line-height:1.6;">${escapeHtml(note)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Morales Medical Travel Safety</title>
<style>
  body { margin:0; padding:0; background:${BG_DARK}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; }
  .wrapper { background:${BG_DARK}; padding:40px 16px; }
  .container { max-width:600px; margin:0 auto; background:${CARD}; border:1px solid ${BORDER}; border-radius:16px; overflow:hidden; }
  .header { padding:36px 40px 28px; text-align:center; border-bottom:1px solid ${BORDER}; }
  .logo { width:44px; height:44px; margin-bottom:14px; }
  .brand { font-family:Georgia,'Times New Roman',serif; font-size:20px; font-weight:400; color:#FFFFFF; letter-spacing:2px; text-transform:uppercase; margin:0; }
  .tagline { font-size:10px; color:${GOLD}; letter-spacing:2.5px; text-transform:uppercase; margin:6px 0 0; }
  .content { padding:40px; color:#EEF2F7; }
  .eyebrow { font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:${GOLD}; margin:0 0 14px; }
  .title { font-family:Georgia,serif; font-size:26px; font-weight:400; color:#FFFFFF; line-height:1.3; margin:0 0 22px; }
  .intro { font-size:15px; line-height:1.65; color:rgba(238,242,247,0.75); margin:0 0 6px; }
  .cta-wrap { text-align:center; margin:32px 0 8px; }
  .cta { display:inline-block; background:${GOLD}; color:${BG_DARK}; text-decoration:none; padding:15px 42px; border-radius:999px; font-size:14px; font-weight:700; letter-spacing:0.5px; }
  .footer { padding:24px 40px 32px; border-top:1px solid ${BORDER}; font-size:12px; color:rgba(238,242,247,0.4); line-height:1.6; text-align:center; }
  @media (max-width:600px) {
    .wrapper { padding:20px 8px; }
    .header, .content, .footer { padding-left:24px; padding-right:24px; }
    .title { font-size:22px; }
  }
</style>
</head>
<body>
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img class="logo" src="${logoUrl}" alt="Morales" />
        <p class="brand">Morales</p>
        <p class="tagline">Medical Travel Safety</p>
      </div>
      <div class="content">
        ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
        <h1 class="title">${escapeHtml(title)}</h1>
        ${intro ? `<p class="intro">${escapeHtml(intro)}</p>` : ''}
        ${rowsHtml}
        ${noteHtml}
        ${bodyHtml}
        ${ctaText && ctaUrl ? `<div class="cta-wrap"><a class="cta" href="${ctaUrl}">${escapeHtml(ctaText)}</a></div>` : ''}
      </div>
      <div class="footer">
        <p>${footer}</p>
        <p style="margin-top:8px;">Morales Medical Travel Safety Team</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}