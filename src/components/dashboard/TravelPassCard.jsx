/**
 * TravelPassCard — "M-Safe Travel Pass": printable QR codes for navigating
 * to the hotel/clinic and for sharing emergency contact info, offline and
 * without needing the Morales app installed on the scanning device.
 *
 * Deliberately does NOT include a medical-history QR. This app already has a
 * full medical manifest (blood type, allergies, medications, conditions,
 * doctor contact) behind a PIN gate — /emergency-manifest, verifyEmergencyPIN
 * — kept deliberately PIN-gated so a lost/photographed physical card can't
 * become permanent, unrevoked access to someone's full medical history.
 * Contact info (a name + phone number) carries none of that risk, so it's
 * safe to encode directly, the same way it would be written on a paper
 * medical-alert card today.
 *
 * Renders nothing until the active CaseRecord has a real hotel or clinic
 * address — no placeholder QR codes pointing nowhere.
 */
import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG as _QRCodeSVG } from 'qrcode.react';
import { MapPin, Download, Printer, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CACHE } from '@/lib/constants';
import { useActiveCaseRecord } from '@/hooks/useActiveCaseRecord';

const QRCodeSVG = /** @type {any} */ (_QRCodeSVG);
const GOLD = '#D4AF37';

// A Google Maps universal link — resolves to the native app on both iOS and
// Android (unlike an Apple Maps link, which won't open on Android), so it's
// the right single choice for a QR a driver or bystander might scan on any
// phone. Mirrors src/lib/mapLinks.js's generateMapLink() destination
// formatting for the google_maps case.
function buildMapsUrl(destination) {
  const dest = (destination || '').trim();
  if (!dest) return null;
  const isCoords = /^-?\d{1,3}\.\d+,-?\d{1,3}\.\d+$/.test(dest);
  return `https://www.google.com/maps/dir/?api=1&destination=${isCoords ? dest : encodeURIComponent(dest)}`;
}

function coordsToString(coords) {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return null;
  return `${coords.lat},${coords.lng}`;
}

// Hand-built vCard — same "no library, plain text format" approach this repo
// already uses for .ics calendar files (generateItineraryCalendar). Contact
// info only, never medical data.
function buildVCard({ name, phone, note }) {
  if (!phone) return null;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${(name || 'Emergency Contact').replace(/\r?\n/g, ' ')}`,
    `TEL;TYPE=CELL:${phone}`,
    note ? `NOTE:${note.replace(/\r?\n/g, ' ')}` : null,
    'END:VCARD',
  ].filter(Boolean);
  return lines.join('\n');
}

// Renders one QR + a "Save" button that exports it as a PNG. Same
// SVG->canvas->PNG mechanic as src/components/baggage/QRCodeDisplay.jsx —
// works fully offline, no network call, unlike an external QR-image API.
function QRBlock({ label, sublabel = null, value, filename }) {
  const containerRef = useRef(null);
  if (!value) return null;

  const handleDownload = () => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const padding = 16;
      const canvas = document.createElement('canvas');
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding);
      URL.revokeObjectURL(svgUrl);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = filename;
      a.click();
    };
    img.src = svgUrl;
  };

  return (
    <div style={{ textAlign: 'center', flex: '1 1 140px', minWidth: 140 }}>
      <div ref={containerRef} style={{ background: '#fff', borderRadius: 12, padding: 10, display: 'inline-block' }}>
        <QRCodeSVG value={value} size={140} bgColor="#ffffff" fgColor="#0f172a" level="M" />
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: '#fff' }}>{label}</p>
      {sublabel && <p style={{ margin: '2px 0 8px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{sublabel}</p>}
      <button
        onClick={handleDownload}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6,
          padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.7)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <Download style={{ width: 11, height: 11 }} /> Save
      </button>
    </div>
  );
}

export default function TravelPassCard({ userEmail }) {
  const [open, setOpen] = useState(false);
  const { data: caseRec } = useActiveCaseRecord(userEmail);

  const { data: doctor } = useQuery({
    queryKey: ['doctor-for-case', caseRec?.doctor_email],
    queryFn: () => base44.entities.Doctor.filter({ email: caseRec.doctor_email }, '-created_date', 1).then((r) => r?.[0] || null),
    enabled: !!caseRec?.doctor_email,
    staleTime: CACHE.LONG,
  });

  const hasAddress = !!(caseRec?.hotel_address || caseRec?.clinic_address);
  if (!hasAddress) return null;

  const clinicDest = coordsToString(caseRec.clinic_coords) || caseRec.clinic_address || null;
  const hotelDest = coordsToString(caseRec.hotel_coords) || caseRec.hotel_address || null;
  const clinicUrl = buildMapsUrl(clinicDest);
  // Skip a second identical QR if hotel and clinic addresses are the same.
  const hotelUrl = hotelDest && hotelDest !== clinicDest ? buildMapsUrl(hotelDest) : null;

  const doctorNote = doctor?.phone ? `Doctor: ${doctor.full_name || 'Care team'}, ${doctor.phone}` : undefined;
  const contactVCard = buildVCard({
    name: caseRec.emergency_contact,
    phone: caseRec.emergency_contact_number,
    note: doctorNote,
  });

  const hasAnyQr = !!(clinicUrl || hotelUrl || contactVCard);
  if (!hasAnyQr) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #travel-pass-print, #travel-pass-print * { visibility: visible !important; }
          #travel-pass-print { position: fixed !important; inset: 0 !important; width: 100vw !important; margin: 0 !important; padding: 24px !important; background: #fff !important; }
          #travel-pass-noprint { display: none !important; }
        }
      `}</style>

      <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin style={{ width: 18, height: 18, color: GOLD }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>M-Safe Travel Pass</span>
          </div>
          <ChevronRight style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {open && (
          <div id="travel-pass-print" style={{ marginTop: 16 }}>
            <div id="travel-pass-noprint">
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Print or save these QR codes — a driver or anyone helping you can scan them with any phone camera, no app needed.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {clinicUrl && <QRBlock label="Navigate: Clinic" value={clinicUrl} filename="morales-navigate-clinic.png" />}
              {hotelUrl && <QRBlock label="Navigate: Hotel" value={hotelUrl} filename="morales-navigate-hotel.png" />}
              {contactVCard && (
                <QRBlock
                  label="Emergency Contact"
                  sublabel="Scan to save contact"
                  value={contactVCard}
                  filename="morales-emergency-contact.png"
                />
              )}
            </div>

            <div id="travel-pass-noprint" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={handlePrint}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 99,
                  background: GOLD, color: '#060B16', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <Printer style={{ width: 13, height: 13 }} /> Print / Save as PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
