import React, { useState } from 'react';
import { QRCodeSVG as _QRCodeSVG } from 'qrcode.react';
const QRCodeSVG = /** @type {any} */ (_QRCodeSVG);
import { QrCode, X } from 'lucide-react';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';

// Drop this anywhere on a portal page — shows current URL as QR code.
// No internet needed to display. Partner scans with phone camera to open portal.
export default function PortalQRCode({ label = 'Open on another device' }) {
  const [open, setOpen] = useState(false);
  const url = window.location.href;

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
          background: open ? `${GOLD}18` : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? GOLD + '60' : BORDER}`,
          color: open ? GOLD : 'rgba(255,255,255,0.5)',
          fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
        }}
      >
        {open ? <X style={{ width: 13, height: 13 }} /> : <QrCode style={{ width: 13, height: 13 }} />}
        {open ? 'Close QR' : 'No internet? Scan QR'}
      </button>

      {open && (
        <div style={{
          marginTop: 10, padding: 20, borderRadius: 16,
          background: CARD, border: `1px solid ${GOLD}40`,
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <div style={{ padding: 12, background: '#fff', borderRadius: 10 }}>
            <QRCodeSVG
              value={url}
              size={160}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: 180, lineHeight: 1.6 }}>
            {label}<br />
            <span style={{ color: GOLD, fontWeight: 700 }}>No internet needed to scan</span>
          </p>
        </div>
      )}
    </div>
  );
}
