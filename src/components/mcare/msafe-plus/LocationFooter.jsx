import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Apple, Car, MapPin } from 'lucide-react';
import { generateMapLink, openInMapsApp } from '@/lib/mapLinks';

/**
 * LocationFooter — the block that turns an address into movement: a QR a
 * driver can scan and three buttons that open the clinic in a real maps app.
 *
 * The QR encodes the same Google Maps destination the buttons use, so a scan
 * and a tap land on the identical place. Nothing here is a picture of a map.
 */
const APPS = [
  { id: 'apple_maps', label: 'Apple Maps', Icon: Apple },
  { id: 'waze', label: 'Waze', Icon: Car },
  { id: 'google_maps', label: 'Google Maps', Icon: MapPin },
];

export default function LocationFooter({ name, address, destination }) {
  const qrValue = generateMapLink(destination, 'google_maps');

  return (
    <div
      className="flex gap-3.5 px-4 py-3.5"
      style={{ borderTop: '1px solid var(--ms-border-soft)', background: 'var(--ms-raised)' }}
    >
      {qrValue && (
        <div
          className="flex-shrink-0 rounded-lg p-1.5"
          style={{ background: '#FFFFFF', border: '1px solid var(--ms-border)' }}
        >
          <QRCodeSVG value={qrValue} size={84} level="M" bgColor="#FFFFFF" fgColor="#333333" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] font-semibold" style={{ color: 'var(--ms-ink)' }}>
          Scan for directions
        </p>
        <p className="text-[11px] leading-snug mt-0.5" style={{ color: 'var(--ms-ink-soft)' }}>
          {[name, address].filter(Boolean).join(' · ')}
        </p>
        <p className="text-[10.5px] leading-snug mt-1" style={{ color: 'var(--ms-ink-faint)' }}>
          Share this with your driver or anyone picking you up.
        </p>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {APPS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => openInMapsApp(id, destination)}
              className="msafe-map-btn inline-flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'var(--ms-card)', border: '1px solid var(--ms-border)' }}
            >
              <Icon className="w-3 h-3" strokeWidth={1.9} style={{ color: 'var(--ms-ink-soft)' }} />
              <span className="text-[10.5px] font-medium" style={{ color: 'var(--ms-ink)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .msafe-map-btn:hover { border-color: var(--ms-gold); }
        .msafe-map-btn:active { transform: scale(0.96); }
      `}</style>
    </div>
  );
}