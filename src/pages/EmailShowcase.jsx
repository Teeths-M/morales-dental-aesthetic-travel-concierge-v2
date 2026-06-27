/**
 * EmailShowcase — /demo/emails
 *
 * Shows all 5 key Morales email templates as live rendered previews.
 * Public, no login required. Built for buildathon judges.
 */
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';
const APP_URL = window.location.origin;

// ── Email HTML templates (mirrors what edge functions send) ──────────────────

const EMAILS = [
  {
    id: 'golden_m',
    icon: '🏆',
    label: 'Golden M',
    who: 'Patient',
    when: 'HS9 completed — patient safely home',
    subject: 'Welcome home. The Golden M is yours.',
    html: `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="padding:48px 32px 32px;text-align:center;">
  <div style="font-size:64px;margin-bottom:16px;filter:drop-shadow(0 0 20px rgba(212,175,55,0.8));">🏆</div>
  <div style="width:160px;height:1px;background:linear-gradient(to right,transparent,#D4AF37,#F0D060,#D4AF37,transparent);margin:0 auto 20px;"></div>
  <div style="font-family:Georgia,serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#D4AF37;margin-bottom:16px;">Journey Complete</div>
  <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;font-weight:400;color:#fff;line-height:1.2;">Welcome home, Maria.</h1>
  <p style="margin:16px 0 0;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.6;">All 9 handshakes confirmed. The Golden M is yours.</p>
</td></tr>
<tr><td style="padding:0 32px 32px;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:14px;overflow:hidden;margin-bottom:24px;">
    <tr><td style="padding:16px 20px;border-bottom:1px solid #2A3F4A;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4AF37;margin-bottom:12px;">Journey Summary</div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;width:45%;">Handshakes confirmed</td><td style="padding:5px 0;color:#fff;font-size:14px;font-weight:700;">9 / 9 ✓</td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Procedure</td><td style="padding:5px 0;color:#fff;font-size:13px;">Dental Veneers + Whitening</td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Journey duration</td><td style="padding:5px 0;color:#fff;font-size:13px;">8 days</td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Case reference</td><td style="padding:5px 0;color:#D4AF37;font-size:13px;font-weight:700;">MRC-2026-001</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:14px 20px;background:rgba(212,175,55,0.06);">
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.7;font-style:italic;">"We are honoured to have walked this journey beside you. Your trust means everything."</p>
      <p style="margin:8px 0 0;font-size:12px;color:#D4AF37;">— The Morales Concierge Team</p>
    </td></tr>
  </table>
  <div style="text-align:center;">
    <a href="#" style="display:inline-block;background:#D4AF37;color:#060B16;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;">View Journey Summary →</a>
  </div>
</td></tr>
</table></td></tr></table></body></html>`,
  },
  {
    id: 'handshake',
    icon: '✅',
    label: 'Handshake Alert',
    who: 'Doctor',
    when: 'HS5 — patient arrives at clinic',
    subject: 'HS5 Confirmed — Your patient has arrived at the clinic.',
    html: `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:24px 32px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">Morales Dental &amp; Aesthetics</div>
  <div style="width:100px;height:1px;background:linear-gradient(to right,transparent,#D4AF37,transparent);margin:10px auto;"></div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4AF37;">Handshake 5 / 9 — Confirmed</div>
</td></tr>
<tr><td style="padding:32px;">
  <div style="font-size:40px;text-align:center;margin-bottom:12px;">🏥</div>
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#13221d;text-align:center;">HS5 Confirmed</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#40514a;text-align:center;">Dear Dr. Ramírez, <strong>Maria C.</strong>'s journey milestone has been recorded.</p>
  <div style="background:#f8faf9;border:1px solid #e7ede9;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#40514a;">Your patient has arrived at the clinic. Please proceed with your consultation protocol.</p>
    <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;">
      <tr><td style="padding:5px 0;color:#64746d;font-size:12px;width:40%;">Patient</td><td style="padding:5px 0;color:#13221d;font-size:13px;font-weight:700;">Maria C.</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:12px;">Time confirmed</td><td style="padding:5px 0;color:#13221d;font-size:13px;">Today at 9:32 AM</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:12px;">Case reference</td><td style="padding:5px 0;color:#D4AF37;font-size:13px;font-weight:700;">MRC-2026-001</td></tr>
    </table>
  </div>
  <div style="text-align:center;">
    <a href="#" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:700;">Open Doctor Dashboard →</a>
  </div>
</td></tr>
</table></td></tr></table></body></html>`,
  },
  {
    id: 'companion',
    icon: '🌍',
    label: 'Companion Briefing',
    who: 'Companion',
    when: 'Companion accepts a job offer',
    subject: '🌍 Your Mission Briefing — Maria in Caracas',
    html: `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="background:#0C1A1D;padding:24px 32px;border-bottom:1px solid #2A3F4A;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">Morales Dental &amp; Aesthetics</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4AF37;margin-top:6px;">Companion Mission Briefing</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#fff;">Your assignment is confirmed, Sofia.</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.6);">Your patient is counting on your presence. Here is everything you need.</p>
  <div style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:12px;padding:18px;margin-bottom:18px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4AF37;margin-bottom:12px;">Mission Details</div>
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;width:42%;">Patient (first name)</td><td style="padding:5px 0;color:#fff;font-size:14px;font-weight:700;">Maria</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Destination</td><td style="padding:5px 0;color:#fff;font-size:14px;">Caracas, Venezuela</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Hotel</td><td style="padding:5px 0;color:#fff;font-size:14px;">Hotel Alba Caracas</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Arrival</td><td style="padding:5px 0;color:#fff;font-size:13px;">Monday, July 14 2026</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Departure</td><td style="padding:5px 0;color:#fff;font-size:13px;">Monday, July 21 2026</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Package fee</td><td style="padding:5px 0;color:#D4AF37;font-size:14px;font-weight:700;">$650</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;">Meals included</td><td style="padding:5px 0;color:#fff;font-size:13px;">✓ Yes</td></tr>
    </table>
  </div>
  <div style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:12px;padding:18px;margin-bottom:18px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4AF37;margin-bottom:12px;">Your Responsibilities</div>
    <ul style="margin:0;padding:0 0 0 16px;color:rgba(255,255,255,0.7);font-size:13px;line-height:1.9;">
      <li>Meet patient at hotel on arrival</li>
      <li>Accompany to clinic for procedure</li>
      <li>Coordinate meal delivery during recovery</li>
      <li>Be available via WhatsApp throughout stay</li>
      <li>Complete HS6 in the Morales app</li>
    </ul>
  </div>
  <div style="text-align:center;margin-bottom:18px;">
    <a href="#" style="display:inline-block;background:#D4AF37;color:#060B16;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;">Open Companion Dashboard →</a>
  </div>
  <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:14px;">
    <p style="margin:0;font-size:12px;color:#fca5a5;line-height:1.6;"><strong>Emergency:</strong> If you or the patient are in danger, contact Morales Emergency Line immediately. Patient safety is always the priority.</p>
  </div>
</td></tr>
</table></td></tr></table></body></html>`,
  },
  {
    id: 'guardian',
    icon: '🛡️',
    label: 'Guardian Alert',
    who: 'Emergency Contact',
    when: 'Guardian escalation Strike 2 — check-in missed',
    subject: '[Morales Guardian] Maria hasn\'t checked in — please contact her',
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
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Last known location</td><td style="padding:5px 0;color:#13221d;font-size:13px;">Hotel Alba Caracas, Venezuela</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Last check-in</td><td style="padding:5px 0;color:#dc2626;font-size:13px;font-weight:700;">3 hours ago</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Status</td><td style="padding:5px 0;color:#dc2626;font-size:13px;font-weight:700;">2nd check-in missed</td></tr>
    </table>
  </div>
  <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#40514a;">Please try to contact Maria immediately. If you cannot reach her, call the Morales Emergency Line. Our team is standing by.</p>
  <div style="text-align:center;">
    <a href="#" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;">View Guardian Tracker →</a>
  </div>
  <p style="margin:20px 0 0;font-size:12px;color:#64746d;text-align:center;">Morales Dental &amp; Aesthetics · Guardian Safety System · Case MRC-2026-001</p>
</td></tr>
</table></td></tr></table></body></html>`,
  },
  {
    id: 'travel',
    icon: '✈️',
    label: 'Travel Quote Request',
    who: 'Travel Agency',
    when: 'Patient requests travel logistics',
    subject: '✈️ New Travel Quote Request — Maria C. to Caracas',
    html: `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:24px 32px;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">Morales Dental &amp; Aesthetics</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4AF37;margin-top:6px;">New Travel Quote Request</div>
</td></tr>
<tr><td style="padding:32px;">
  <div style="font-size:36px;margin-bottom:12px;">✈️</div>
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#13221d;">New patient travel request</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#40514a;">A Morales patient requires travel coordination. Please submit your flight and hotel quote via the Travel Agency Portal.</p>
  <div style="background:#f8faf9;border:1px solid #e7ede9;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;width:40%;">Patient name</td><td style="padding:5px 0;color:#13221d;font-size:14px;font-weight:700;">Maria C.</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Destination</td><td style="padding:5px 0;color:#13221d;font-size:13px;">Caracas, Venezuela</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Preferred arrival</td><td style="padding:5px 0;color:#13221d;font-size:13px;">July 14, 2026</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Return date</td><td style="padding:5px 0;color:#13221d;font-size:13px;">July 21, 2026</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Procedure</td><td style="padding:5px 0;color:#13221d;font-size:13px;">Dental Veneers + Whitening</td></tr>
      <tr><td style="padding:5px 0;color:#64746d;font-size:13px;">Case reference</td><td style="padding:5px 0;color:#D4AF37;font-size:13px;font-weight:700;">MRC-2026-001</td></tr>
    </table>
  </div>
  <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">⏰ Please submit your quote within 24 hours. Hotel GPS coordinates are required for the patient's Journey Map.</p>
  </div>
  <div style="text-align:center;">
    <a href="#" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;">Submit Travel Quote →</a>
  </div>
</td></tr>
</table></td></tr></table></body></html>`,
  },
];

const DEMO_EMAIL = 'theonmorales@gmail.com';

export default function EmailShowcase() {
  const [active,      setActive]      = useState('golden_m');
  const [sending,     setSending]     = useState(false);
  const [sent,        setSent]        = useState(null); // template id of last sent
  const [sendErr,     setSendErr]     = useState(false);
  const [cooldownMsg, setCooldownMsg] = useState(null);
  const cooldowns = useRef({});
  const current = EMAILS.find(e => e.id === active);

  async function sendToInbox() {
    const lastSent  = cooldowns.current[active] ?? 0;
    const remaining = Math.ceil((10_000 - (Date.now() - lastSent)) / 1000);
    if (remaining > 0) {
      setCooldownMsg(`Wait ${remaining}s before resending`);
      setTimeout(() => setCooldownMsg(null), 2500);
      return;
    }
    setSending(true);
    setSent(null);
    setSendErr(false);
    try {
      await base44.functions.invoke('sendTestEmail', {
        to:          DEMO_EMAIL,
        template_id: active,
      });
      cooldowns.current[active] = Date.now();
      setSent(active);
      setTimeout(() => setSent(null), 5000);
    } catch {
      setSendErr(true);
      setTimeout(() => setSendErr(false), 4000);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B16', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Demo
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail style={{ width: 18, height: 18, color: GOLD }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Email Communication System</span>
          </div>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: 700 }}>
            Live Templates
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Tab list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              5 Key Emails
            </p>
            {EMAILS.map(em => (
              <button key={em.id} onClick={() => setActive(em.id)}
                style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 14px', borderRadius: 14, border: `1px solid ${active === em.id ? GOLD + '50' : 'rgba(255,255,255,0.08)'}`, background: active === em.id ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
              >
                <span style={{ fontSize: 18 }}>{em.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: active === em.id ? GOLD : '#fff' }}>{em.label}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>→ {em.who}</span>
              </button>
            ))}
          </div>

          {/* Email preview */}
          <div>
            <div style={{ marginBottom: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                <div><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>To</span><br /><span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{current.who}</span></div>
                <div><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fires when</span><br /><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{current.when}</span></div>
                <div style={{ flex: 1 }}><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Subject</span><br /><span style={{ fontSize: 13, color: GOLD, fontWeight: 600 }}>{current.subject}</span></div>
              </div>
              {/* Send to inbox CTA */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 12, color: cooldownMsg ? '#f59e0b' : sent === active ? '#22c55e' : sendErr ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>
                    {cooldownMsg ?? (sent === active ? `✓ Sent to ${DEMO_EMAIL}` : sendErr ? '✗ Send failed — resume System Pause first' : `Send a live version to ${DEMO_EMAIL}`)}
                  </span>
                  <button
                    onClick={sendToInbox}
                    disabled={sending}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 18px', borderRadius: 99,
                      background: sent === active ? 'rgba(34,197,94,0.15)' : sendErr ? 'rgba(239,68,68,0.12)' : cooldownMsg ? 'rgba(245,158,11,0.12)' : GOLD,
                      color: sent === active ? '#22c55e' : sendErr ? '#ef4444' : cooldownMsg ? '#f59e0b' : '#060B16',
                      border: `1px solid ${sent === active ? 'rgba(34,197,94,0.35)' : sendErr ? 'rgba(239,68,68,0.35)' : cooldownMsg ? 'rgba(245,158,11,0.35)' : 'transparent'}`,
                      fontSize: 12, fontWeight: 700, cursor: sending ? 'wait' : 'pointer',
                      opacity: sending ? 0.7 : 1, transition: 'all 0.2s',
                    }}
                  >
                    {sent === active
                      ? <><CheckCircle2 style={{ width: 13, height: 13 }} /> Delivered</>
                      : sending
                        ? 'Sending…'
                        : <><Send style={{ width: 13, height: 13 }} /> Send to My Inbox</>
                    }
                  </button>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
                  ⚠️ System Pause blocks sends.{' '}
                  <Link to="/admin" style={{ color: 'rgba(212,175,55,0.55)', textDecoration: 'none' }}>
                    Resume from Admin
                  </Link>{' '}before the demo.
                </p>
              </div>
            </div>
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', height: 560 }}>
              <iframe
                srcDoc={current.html}
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                title={`${current.label} email preview`}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          All emails use Morales branded HTML templates. Delivered via Base44 integrations.
        </p>
      </div>
    </div>
  );
}
