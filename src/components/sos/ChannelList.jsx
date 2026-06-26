/**
 * ChannelList — SOS Channel Availability Indicator
 *
 * Shows the 6 communication channels with live detection status.
 *
 * Detection logic:
 *   Satellite SBD   — always "ready" (server-side Rock Seven / Iridium)
 *   goTenna Pro     — "partial" if Web Bluetooth API present (BLE capable device nearby may be paired)
 *   inReach Mini    — "partial" if Web Bluetooth API present
 *   SMS             — always "ready" (Twilio server-side)
 *   QR Code         — always "ready" (offline-capable, no connectivity needed)
 *   Web Share       — "ready" if navigator.share present, "partial" otherwise
 *
 * Status values:
 *   ready       — channel confirmed available (green)
 *   partial     — available but requires device pairing or fallback (amber)
 *   unavailable — not available on this platform (gray)
 *   detecting   — async check in progress (faded)
 *
 * Props:
 *   compact  {bool}     — true = icon-only row (for FloatingSOSButton popover)
 *                         false = labeled pill row (for EmergencyHub)
 *   onDetected {fn}    — called with string[] of ready/partial channel ids
 */
import React, { useState, useEffect } from 'react';
import { Satellite, Radio, Navigation, MessageSquare, QrCode, Share2 } from 'lucide-react';

// ── Device detection helpers ─────────────────────────────────────────────────

async function bleAvailable() {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) return false;
  try { return await navigator.bluetooth.getAvailability(); } catch (_) { return false; }
}

// ── Channel definitions ──────────────────────────────────────────────────────

const CHANNELS = [
  {
    id:     'satellite',
    label:  'Satellite SBD',
    sub:    'Rock Seven · Iridium',
    Icon:   Satellite,
    color:  '#D4AF37',
    detect: async () => 'ready',
  },
  {
    id:     'gotenna',
    label:  'goTenna Pro',
    sub:    'Mesh radio · BLE',
    Icon:   Radio,
    color:  '#3b82f6',
    detect: async () => (await bleAvailable()) ? 'partial' : 'unavailable',
  },
  {
    id:     'inreach',
    label:  'inReach Mini',
    sub:    'Garmin · Iridium BLE',
    Icon:   Navigation,
    color:  '#06b6d4',
    detect: async () => (await bleAvailable()) ? 'partial' : 'unavailable',
  },
  {
    id:     'sms',
    label:  'SMS',
    sub:    'Twilio · 190+ countries',
    Icon:   MessageSquare,
    color:  '#22c55e',
    detect: async () => 'ready',
  },
  {
    id:     'qr',
    label:  'QR Code',
    sub:    'Offline · no signal needed',
    Icon:   QrCode,
    color:  '#22c55e',
    detect: async () => 'ready',
  },
  {
    id:     'webshare',
    label:  'Web Share',
    sub:    'Native OS share sheet',
    Icon:   Share2,
    color:  '#22c55e',
    detect: async () => (typeof navigator !== 'undefined' && 'share' in navigator) ? 'ready' : 'partial',
  },
];

const DOT_COLORS = {
  ready:       null,      // uses channel color
  partial:     '#f59e0b',
  unavailable: 'rgba(255,255,255,0.15)',
  detecting:   'rgba(255,255,255,0.10)',
};

const STATUS_TIPS = {
  ready:       'Available',
  partial:     'Pair device to activate',
  unavailable: 'Not available on this platform',
  detecting:   'Detecting…',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ChannelList({ compact = false, onDetected }) {
  const [statuses, setStatuses] = useState(
    Object.fromEntries(CHANNELS.map(c => [c.id, 'detecting']))
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const results = {};
      for (const ch of CHANNELS) {
        try { results[ch.id] = await ch.detect(); }
        catch (_) { results[ch.id] = 'unavailable'; }
      }
      if (!alive) return;
      setStatuses(results);
      onDetected?.(
        Object.entries(results)
          .filter(([, v]) => v === 'ready' || v === 'partial')
          .map(([id]) => id)
      );
    })();
    return () => { alive = false; };
  }, []);

  if (compact) {
    return (
      <div style={{
        display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center',
        padding: '6px 4px 2px',
      }}>
        {CHANNELS.map(({ id, label, Icon, color }) => {
          const st    = statuses[id];
          const avail = st === 'ready' || st === 'partial';
          const dot   = DOT_COLORS[st] ?? color;
          return (
            <div key={id} title={`${label}: ${STATUS_TIPS[st] || st}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'default' }}>
              <Icon style={{ width: 13, height: 13, color: avail ? color : 'rgba(255,255,255,0.18)', flexShrink: 0 }} strokeWidth={2} />
              <span style={{
                width: 4, height: 4, borderRadius: '50%', background: dot, display: 'block',
                boxShadow: st === 'ready' ? `0 0 5px ${color}` : 'none',
                opacity: st === 'detecting' ? 0.4 : 1,
                transition: 'background 0.4s ease, box-shadow 0.4s ease',
              }} />
            </div>
          );
        })}
      </div>
    );
  }

  // Full labelled mode (for EmergencyHub / standalone use)
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.35)', marginBottom: 8, marginTop: 0 }}>
        SOS Channels
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {CHANNELS.map(({ id, label, sub, Icon, color }) => {
          const st    = statuses[id];
          const avail = st === 'ready' || st === 'partial';
          const dot   = DOT_COLORS[st] ?? color;
          const bgAlpha = st === 'ready' ? '15' : st === 'partial' ? '0c' : '04';
          const bdAlpha = st === 'ready' ? '30' : st === 'partial' ? '18' : '08';
          return (
            <div key={id} title={STATUS_TIPS[st] || st}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 9px', borderRadius: 8,
                background: `${color}${bgAlpha}`,
                border: `1px solid ${color}${bdAlpha}`,
                opacity: st === 'detecting' ? 0.55 : 1,
                transition: 'opacity 0.3s ease',
                cursor: 'default',
              }}>
              <Icon style={{ width: 12, height: 12, color: avail ? color : 'rgba(255,255,255,0.22)', flexShrink: 0 }} strokeWidth={2} />
              <div style={{ lineHeight: 1 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: avail ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                  {label}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>
                  {st === 'partial' ? 'Pair device' : sub}
                </p>
              </div>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0,
                boxShadow: st === 'ready' ? `0 0 5px ${color}` : 'none',
                transition: 'background 0.4s ease',
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
