/**
 * DemoCheatsheet — /demo/cheatsheet
 *
 * Presenter's quick-reference card. Open on your phone before the pitch.
 * Lists every deep-link, keyboard shortcut, and the recommended walk-through order.
 * Hidden from the main nav — accessed via the ? icon in the demo header.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, CheckCircle2, Keyboard, Link2, PlayCircle, Lightbulb, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const GOLD = '#D4AF37';
const BASE = window.location.origin;

const DEEP_LINKS = [
  { label: 'Cold open — CRITICAL scenario',  url: `${BASE}/demo?tab=medguard&start=critical`,    tag: '🔥 Max impact' },
  { label: 'Full MedGuard auto-advance',     url: `${BASE}/demo?tab=medguard`,                   tag: '🛡️ MedGuard' },
  { label: 'Kidnapping rescue demo',         url: `${BASE}/demo?tab=emergency`,                  tag: '🚨 Emergency' },
  { label: 'Vault lockdown / robbery',       url: `${BASE}/demo?tab=nightlife`,                  tag: '🔒 Nightlife' },
  { label: 'Family Recovery Tracker',        url: `${BASE}/demo/recovery`,                       tag: '📡 Viral hook' },
  { label: 'Email system — 5 templates',     url: `${BASE}/demo/emails`,                         tag: '📧 Email' },
  { label: 'Pattern Intelligence demo',      url: `${BASE}/demo/medguard`,                       tag: '🧠 AI' },
  { label: 'Full platform overview',         url: `${BASE}/demo`,                                tag: '🏥 Overview' },
];

const SHORTCUTS = [
  { keys: ['Space', '→'],  where: 'MedGuard tab',        action: 'Advance to next risk scenario' },
  { keys: ['←'],           where: 'MedGuard tab',        action: 'Rewind to previous scenario' },
  { keys: ['→'],           where: '/demo/recovery',      action: 'Advance Maria\'s journey stage' },
  { keys: ['←'],           where: '/demo/recovery',      action: 'Rewind journey stage' },
];

const PITCH_ORDER = [
  { step: 1, emoji: '🛡️', title: 'Open with MedGuard CRITICAL',   url: '/demo?tab=medguard&start=critical',  desc: 'Judges see security dispatch before you say a word. Hook landed.' },
  { step: 2, emoji: '🚨', title: 'Run the Kidnapping Scenario',    url: '/demo?tab=emergency',                desc: 'Full automated rescue chain. No other platform does this.' },
  { step: 3, emoji: '📡', title: 'Show the Family Tracker',        url: '/demo/recovery',                    desc: 'Press → to advance Maria home. Viral marketing angle explained.' },
  { step: 4, emoji: '📧', title: 'Send a live email',              url: '/demo/emails',                      desc: 'Tap "Send to My Inbox" — golden email lands in real inbox live.' },
];

function CopyButton({ url }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
               background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
               color: copied ? '#22c55e' : '#64748b',
               border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : '#2A3F4A'}`, flexShrink: 0 }}>
      {copied ? <CheckCircle2 style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Section({ icon: Icon, iconColor, title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: `${iconColor}18`, border: `1px solid ${iconColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 14, height: 14, color: iconColor }} />
        </div>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function DemoCheatsheet() {
  return (
    <div style={{ minHeight: '100vh', background: '#060B16', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Demo
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Presenter Cheat Sheet</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 9px', borderRadius: 99, background: `${GOLD}18`, color: GOLD, fontWeight: 700, border: `1px solid ${GOLD}30` }}>
            Internal
          </span>
        </div>

        <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(212,175,55,0.07)', border: `1px solid ${GOLD}25`, marginBottom: 28 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            Open this on your phone before the pitch. Every link, shortcut, and talking point in one place.
            Works offline once loaded.
          </p>
        </div>

        {/* ── Recommended walk-through ── */}
        <Section icon={PlayCircle} iconColor="#22c55e" title="Recommended Judge Walk-Through (4 moves)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PITCH_ORDER.map(({ step, emoji, title, url, desc }) => (
              <div key={step} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${GOLD}18`, border: `1px solid ${GOLD}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: GOLD, flexShrink: 0 }}>
                  {step}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14 }}>{emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <code style={{ fontSize: 10, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 5, border: '1px solid #1e2d35', wordBreak: 'break-all' }}>{url}</code>
                    <CopyButton url={`${BASE}${url}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Deep links ── */}
        <Section icon={Link2} iconColor={GOLD} title="All Deep Links">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEEP_LINKS.map(({ label, url, tag }) => (
              <div key={url} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{label}</span>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: '#64748b' }}>{tag}</span>
                  </div>
                  <code style={{ fontSize: 10, color: '#475569', wordBreak: 'break-all' }}>{url}</code>
                </div>
                <CopyButton url={url} />
              </div>
            ))}
          </div>
        </Section>

        {/* ── Keyboard shortcuts ── */}
        <Section icon={Keyboard} iconColor="#60a5fa" title="Keyboard Shortcuts (clicker-compatible)">
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #2A3F4A' }}>
            {SHORTCUTS.map(({ keys, where, action }, i) => (
              <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: i % 2 === 0 ? '#0C1A1D' : '#080f17', borderTop: i > 0 ? '1px solid #1e2d35' : 'none' }}>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {keys.map(k => (
                    <kbd key={k} style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 6, background: '#1e2d35', border: '1px solid #2A3F4A', fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{k}</kbd>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{action}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#475569' }}>{where}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Tips ── */}
        <Section icon={Lightbulb} iconColor="#f59e0b" title="Pitch Tips">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Resume System Pause before the demo — "Send to My Inbox" is blocked while paused.',
              'The email button needs 10s between sends — don\'t double-tap it during the demo.',
              'Recovery Tracker starts at "In Recovery" — press → twice to show Maria arriving home.',
              'MedGuard auto-advances every 3.5s — let it run for the first 2 stages, then press Space to take control.',
              'The Golden M certificate can be printed live — judges can scan the QR for a physical takeaway.',
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{tip}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── QR Code ── */}
        <Section icon={QrCode} iconColor="#a855f7" title="Judge Scan-to-Follow">
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '20px', borderRadius: 16, background: '#0C1A1D', border: '1px solid #2A3F4A', flexWrap: 'wrap' }}>
            {/* QR — white background so it scans cleanly */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 12, flexShrink: 0 }}>
              <QRCodeSVG
                value={`${BASE}/demo`}
                size={140}
                level="M"
                fgColor="#060B16"
                bgColor="#ffffff"
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                Let judges follow along on their phone
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                Say: <em style={{ color: GOLD }}>"Scan this — you can try the demo yourself."</em><br />
                They land on the full platform overview with all 7 tabs.
              </p>
              <code style={{ fontSize: 11, color: '#475569' }}>{BASE}/demo</code>
              <div style={{ marginTop: 10 }}>
                <CopyButton url={`${BASE}/demo`} />
              </div>
            </div>
          </div>
        </Section>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 8 }}>
          Morales Dental & Aesthetic Travel Concierge · Presenter Use Only
        </p>

      </div>
    </div>
  );
}
