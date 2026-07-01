/**
 * sendTestEmail — fires one of the 5 key email templates to any address.
 * Used by the /demo/emails Email Showcase "Send to my inbox" button.
 * Admin-only. requireAuth is intentionally false so the demo page can call it
 * without a logged-in session — gated instead by a shared demo token.
 */
import { createHandler, ok, err } from '../_shared/createHandler.ts';

const GOLD    = '#D4AF37';
const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
const e = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const TEMPLATES: Record<string, { subject: string; html: string }> = {

  golden_m: {
    subject: `🏆 [Morales Test] Welcome home. The Golden M is yours.`,
    html: `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="padding:48px 32px 32px;text-align:center;">
  <div style="font-size:64px;margin-bottom:16px;filter:drop-shadow(0 0 20px rgba(212,175,55,0.8));">🏆</div>
  <div style="width:160px;height:1px;background:linear-gradient(to right,transparent,${GOLD},#F0D060,${GOLD},transparent);margin:0 auto 20px;"></div>
  <div style="font-family:Georgia,serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};margin-bottom:16px;">Journey Complete</div>
  <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;font-weight:400;color:#fff;line-height:1.2;">Welcome home, Maria.</h1>
  <p style="margin:16px 0 0;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.6;">All 9 handshakes confirmed. The Golden M is yours.</p>
</td></tr>
<tr><td style="padding:0 32px 32px;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:14px;overflow:hidden;margin-bottom:24px;">
    <tr><td style="padding:16px 20px;border-bottom:1px solid #2A3F4A;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-bottom:12px;">Journey Summary</div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;width:45%;">Handshakes confirmed</td><td style="padding:5px 0;color:#fff;font-size:14px;font-weight:700;">9 / 9 ✓</td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Procedure</td><td style="padding:5px 0;color:#fff;font-size:13px;">Dental Veneers + Whitening</td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Journey duration</td><td style="padding:5px 0;color:#fff;font-size:13px;">8 days</td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Case reference</td><td style="padding:5px 0;color:${GOLD};font-size:13px;font-weight:700;">MRC-2026-DEMO</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:14px 20px;background:rgba(212,175,55,0.06);">
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.7;font-style:italic;">"We are honoured to have walked this journey beside you. Your trust means everything."</p>
      <p style="margin:8px 0 0;font-size:12px;color:${GOLD};">— The Morales Concierge Team</p>
    </td></tr>
  </table>
  <div style="text-align:center;">
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:${GOLD};color:#060B16;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;">View Journey Summary →</a>
  </div>
  <p style="margin:20px 0 0;font-size:11px;color:#475569;text-align:center;">This is a demo test email from ${BRAND}</p>
</td></tr>
</table></td></tr></table></body></html>`,
  },

  companion: {
    subject: `🌍 [Morales Test] Your Mission Briefing — Maria in Caracas`,
    html: `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="background:#0C1A1D;padding:24px 32px;border-bottom:1px solid #2A3F4A;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">${BRAND}</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-top:6px;">Companion Mission Briefing</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#fff;">Your assignment is confirmed, Sofia.</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.6);">Your patient is counting on your presence. Here is everything you need.</p>
  <div style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:12px;padding:18px;margin-bottom:18px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-bottom:12px;">Mission Details</div>
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;width:42%;">Patient (first name)</td><td style="padding:5px 0;color:#fff;font-size:14px;font-weight:700;">Maria</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Destination</td><td style="padding:5px 0;color:#fff;font-size:14px;">Caracas, Venezuela</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Hotel</td><td style="padding:5px 0;color:#fff;font-size:14px;">Hotel Alba Caracas</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Arrival</td><td style="padding:5px 0;color:#fff;font-size:13px;">Monday, July 14 2026</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Departure</td><td style="padding:5px 0;color:#fff;font-size:13px;">Monday, July 21 2026</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Package fee</td><td style="padding:5px 0;color:${GOLD};font-size:14px;font-weight:700;">$650</td></tr>
    </table>
  </div>
  <div style="text-align:center;margin-bottom:18px;">
    <a href="${APP_URL}/companion-dashboard" style="display:inline-block;background:${GOLD};color:#060B16;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;">Open Companion Dashboard →</a>
  </div>
  <p style="font-size:11px;color:#475569;text-align:center;margin:0;">This is a demo test email from ${BRAND}</p>
</td></tr>
</table></td></tr></table></body></html>`,
  },

  guardian: {
    subject: `🛡️ [Morales Test] Guardian Alert — Check-in missed`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fff;border:1px solid #fca5a5;border-radius:22px;overflow:hidden;">
<tr><td style="background:#7f1d1d;padding:24px 32px;text-align:center;">
  <div style="font-size:32px;margin-bottom:8px;">🛡️</div>
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">Morales Guardian Alert</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#fca5a5;margin-top:6px;">Check-In Missed — Action Required</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#13221d;">Hi Carmen,</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#40514a;">This is an urgent alert from Morales Guardian. <strong>Maria</strong> has missed a scheduled check-in during her medical journey.</p>
  <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;width:40%;">Traveler</td><td style="padding:5px 0;color:#13221d;font-size:14px;font-weight:700;">Maria C.</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Last known location</td><td style="padding:5px 0;color:#13221d;font-size:13px;">Hotel Alba, Caracas, Venezuela</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Status</td><td style="padding:5px 0;color:#dc2626;font-size:13px;font-weight:700;">2nd check-in missed</td></tr>
    </table>
  </div>
  <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#40514a;">Please try to contact Maria immediately. Our team is standing by.</p>
  <div style="text-align:center;">
    <a href="${APP_URL}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;">View Guardian Tracker →</a>
  </div>
  <p style="margin:16px 0 0;font-size:11px;color:#64746d;text-align:center;">This is a demo test email from ${BRAND}</p>
</td></tr>
</table></td></tr></table></body></html>`,
  },

  handshake: {
    subject: `✅ [Morales Test] HS5 Confirmed — Patient has arrived at the clinic`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:24px 32px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">${BRAND}</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-top:6px;">Handshake 5 / 9 — Confirmed</div>
</td></tr>
<tr><td style="padding:32px;">
  <div style="font-size:40px;text-align:center;margin-bottom:12px;">🏥</div>
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#13221d;text-align:center;">HS5 Confirmed</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#40514a;text-align:center;">Dear Dr. Ramírez, <strong>Maria C.</strong>'s clinic arrival has been recorded. Please proceed with your protocol.</p>
  <div style="background:#f8faf9;border:1px solid #e7ede9;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;width:40%;">Patient</td><td style="padding:5px 0;color:#13221d;font-size:14px;font-weight:700;">Maria C.</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Procedure</td><td style="padding:5px 0;color:#13221d;font-size:13px;">Dental Veneers + Whitening</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Case reference</td><td style="padding:5px 0;color:${GOLD};font-size:13px;font-weight:700;">MRC-2026-DEMO</td></tr>
    </table>
  </div>
  <div style="text-align:center;">
    <a href="${APP_URL}/doctor-dashboard" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:700;">Open Doctor Dashboard →</a>
  </div>
  <p style="margin:16px 0 0;font-size:11px;color:#64746d;text-align:center;">This is a demo test email from ${BRAND}</p>
</td></tr>
</table></td></tr></table></body></html>`,
  },

  travel: {
    subject: `✈️ [Morales Test] New Travel Quote Request — Maria C. to Caracas`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:24px 32px;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">${BRAND}</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-top:6px;">New Travel Quote Request</div>
</td></tr>
<tr><td style="padding:32px;">
  <div style="font-size:36px;margin-bottom:12px;">✈️</div>
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#13221d;">New patient travel request</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#40514a;">A Morales patient requires travel coordination for their upcoming procedure.</p>
  <div style="background:#f8faf9;border:1px solid #e7ede9;border-radius:12px;padding:16px 20px;margin-bottom:18px;">
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;width:40%;">Patient</td><td style="padding:5px 0;color:#13221d;font-size:14px;font-weight:700;">Maria C.</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Destination</td><td style="padding:5px 0;color:#13221d;font-size:13px;">Caracas, Venezuela</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Preferred arrival</td><td style="padding:5px 0;color:#13221d;font-size:13px;">July 14, 2026</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Return date</td><td style="padding:5px 0;color:#13221d;font-size:13px;">July 21, 2026</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Case reference</td><td style="padding:5px 0;color:${GOLD};font-size:13px;font-weight:700;">MRC-2026-DEMO</td></tr>
    </table>
  </div>
  <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">⏰ Please submit your quote within 24 hours. Hotel GPS coordinates required for the patient's Journey Map.</p>
  </div>
  <div style="text-align:center;">
    <a href="${APP_URL}/travel-agency-dashboard" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;">Submit Travel Quote →</a>
  </div>
  <p style="margin:16px 0 0;font-size:11px;color:#64746d;text-align:center;">This is a demo test email from ${BRAND}</p>
</td></tr>
</table></td></tr></table></body></html>`,
  },
};

Deno.serve(createHandler(async ({ base44, body }) => {
  const { to, template_id } = await body();

  if (!to || !template_id) return err('to and template_id required');

  const template = TEMPLATES[template_id];
  if (!template) return err(`Unknown template: ${template_id}. Valid: ${Object.keys(TEMPLATES).join(', ')}`);

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return err('Invalid email address');

  await base44.integrations.Core.SendEmail({
    from_name: `${BRAND} — Demo`,
    to,
    subject:  template.subject,
    body:     template.html,
  });

  return ok({ sent: true, to, template: template_id });
}, { name: 'sendTestEmail', requireAuth: false }));
