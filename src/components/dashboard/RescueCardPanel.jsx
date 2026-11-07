/**
 * RescueCardPanel — "M-Safe Rescue Card": a card to print before a trip, for
 * when the traveler's phone dies. Anyone can scan its QR code with their own
 * phone, or type its code, to text the M-Care safety number. Scanning needs
 * no internet, and sending the text needs only a phone signal. M-Care then
 * alerts the traveler's emergency contacts, companion and doctor, and texts
 * the helper back (rescueCardFlow.ts).
 *
 * The card carries no personal details: no name, no medical information.
 * The code only means something to M-Care.
 *
 * Renders nothing without an active trip. getMyRescueCard re-checks that,
 * and also says plainly when the safety number isn't set up, rather than
 * showing a card that can't work.
 */
import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG as _QRCodeSVG } from 'qrcode.react';
import { LifeBuoy, Printer, Download, RefreshCw, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ConfirmDialog } from '@/components/ui-system';
import { useActiveCaseRecord } from '@/hooks/useActiveCaseRecord';
import { buildRescueSmsQr, formatRescueCode, rescueCardText } from '@/lib/rescueCard';

const QRCodeSVG = /** @type {any} */ (_QRCodeSVG);
const GOLD = '#D4AF37';
const TERMINAL = ['Completed', 'Closed', 'Cancelled'];
const PRINT_CLASS = 'printing-rescue-card';

/** @type {React.CSSProperties} */
const BUTTON = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
  color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
};

/** @type {React.CSSProperties} */
const FACE = {
  width: 340, maxWidth: '100%', aspectRatio: '85.6 / 54', background: '#fff', color: '#0f172a',
  borderRadius: 12, padding: 12, boxSizing: 'border-box', boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
  fontFamily: 'Arial, Helvetica, sans-serif', overflow: 'hidden',
};

const UNAVAILABLE = {
  no_active_trip: 'Your rescue card appears once you have an active trip.',
  sms_not_configured: "The rescue card isn't switched on yet. The M-Care team needs to set up the safety text number first.",
};

/** One line in the trip country's language, then English (or English alone). */
function Bilingual({ line, size = 9.5, strong = false }) {
  const base = { margin: 0, fontSize: size, lineHeight: 1.25, fontWeight: strong ? 700 : 400 };
  return (
    <>
      {line.local && <p style={base}>{line.local}</p>}
      <p style={{ ...base, color: line.local ? '#475569' : '#0f172a' }}>{line.en}</p>
    </>
  );
}

export default function RescueCardPanel({ userEmail }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const qrRef = useRef(null);
  const queryClient = useQueryClient();
  const { data: caseRec } = useActiveCaseRecord(userEmail);

  const cardQuery = useQuery({
    queryKey: ['rescue-card', userEmail],
    queryFn: () => base44.functions.invoke('getMyRescueCard', { action: 'get' }).then((res) => res?.data || null),
    enabled: open && !!userEmail,
    staleTime: 5 * 60 * 1000,
  });

  const replace = useMutation({
    mutationFn: () => base44.functions.invoke('getMyRescueCard', { action: 'replace' }).then((res) => res?.data || null),
    onSuccess: (data) => {
      queryClient.setQueryData(['rescue-card', userEmail], data);
      setNotice('New card made. Print it before you travel. Your old card no longer works.');
    },
    onError: () => setNotice("Couldn't make a new card. Please try again."),
  });

  if (!caseRec || TERMINAL.includes(caseRec.status)) return null;

  const card = cardQuery.data;
  const qrValue = card?.available ? buildRescueSmsQr(card.sms_number, card.code, card.keyword) : null;
  const text = qrValue
    ? rescueCardText(card.language, {
      keyword: card.keyword, code: card.code, smsNumber: card.sms_number, emergencyNumber: card.emergency_number,
    })
    : null;

  function handlePrint() {
    const root = document.documentElement;
    const done = () => {
      root.classList.remove(PRINT_CLASS);
      window.removeEventListener('afterprint', done);
    };
    root.classList.add(PRINT_CLASS);
    window.addEventListener('afterprint', done);
    window.print();
  }

  // The QR alone as a PNG, for a sticker on the back of a phone case. Same
  // SVG -> canvas -> PNG steps as TravelPassCard; works offline.
  function handleSaveQr() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const pad = 24;
      const canvas = document.createElement('canvas');
      canvas.width = img.width + pad * 2;
      canvas.height = img.height + pad * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad);
      URL.revokeObjectURL(svgUrl);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'morales-rescue-qr.png';
      a.click();
    };
    img.src = svgUrl;
  }

  // Resolves either way, so the dialog closes; a failure shows in the notice.
  async function confirmReplace() {
    setNotice('');
    await replace.mutateAsync().catch(() => {});
  }

  return (
    <>
      <style>{`
        @media print {
          html.${PRINT_CLASS} body * { visibility: hidden !important; }
          html.${PRINT_CLASS} #rescue-card-print,
          html.${PRINT_CLASS} #rescue-card-print * { visibility: visible !important; }
          html.${PRINT_CLASS} #rescue-card-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 10mm !important; background: #fff !important; }
          html.${PRINT_CLASS} #travel-pass-print { display: none !important; }
          html.${PRINT_CLASS} .rescue-noprint { display: none !important; }
          html.${PRINT_CLASS} .rescue-face { width: 85.6mm !important; height: 54mm !important; box-shadow: none !important; border: 0.3mm dashed #94a3b8 !important; break-inside: avoid; }
          html.${PRINT_CLASS} .rescue-qr svg { width: 30mm !important; height: 30mm !important; }
        }
      `}</style>

      <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LifeBuoy style={{ width: 18, height: 18, color: GOLD }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>M-Safe Rescue Card</span>
          </div>
          <ChevronRight style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {open && (
          <div style={{ marginTop: 14 }}>
            <p className="rescue-noprint" style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              Print this card and keep it with your passport, or put the QR code on your phone case. If your phone dies, anyone can scan it with their own phone to text M-Care for help. Their phone needs a signal, not internet. M-Care then alerts your emergency contacts, your companion and your doctor. The card shows no personal details.
            </p>

            {cardQuery.isLoading && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Getting your card…</p>}

            {cardQuery.isError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#fca5a5' }}>Couldn&apos;t load your rescue card.</p>
                <button style={BUTTON} onClick={() => cardQuery.refetch()}>Try again</button>
              </div>
            )}

            {card && !card.available && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{UNAVAILABLE[card.reason] || UNAVAILABLE.sms_not_configured}</p>
            )}

            {card?.available && !qrValue && (
              <p style={{ fontSize: 12, color: '#fca5a5' }}>The safety number isn&apos;t set up correctly, so the card can&apos;t be made yet.</p>
            )}

            {qrValue && text && (
              <>
                <div id="rescue-card-print" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* Front */}
                  <div className="rescue-face" style={{ ...FACE, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div ref={qrRef} className="rescue-qr" style={{ flex: '0 0 auto' }}>
                      <QRCodeSVG value={qrValue} size={118} bgColor="#ffffff" fgColor="#0f172a" level="M" />
                    </div>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <p style={{ margin: 0, fontSize: 8, letterSpacing: 1.5, color: '#64748b', fontWeight: 700 }}>M-CARE · MORALES</p>
                      <Bilingual line={text.title} size={11} strong />
                      <p style={{ margin: '2px 0', fontSize: 22, fontWeight: 800, letterSpacing: 2, fontFamily: 'Menlo, Consolas, monospace' }}>
                        {formatRescueCode(card.code)}
                      </p>
                      <Bilingual line={text.scan} size={9} />
                    </div>
                  </div>

                  {/* Back */}
                  <div className="rescue-face" style={{ ...FACE, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
                    <Bilingual line={text.text} size={9.5} strong />
                    <Bilingual line={text.signal} size={9} />
                    <Bilingual line={text.emergency} size={9.5} strong />
                    <Bilingual line={text.private} size={8.5} />
                  </div>
                </div>

                <div className="rescue-noprint" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button style={BUTTON} onClick={handleSaveQr}>
                    <Download style={{ width: 12, height: 12 }} /> Save QR image
                  </button>
                  <button style={BUTTON} onClick={() => setConfirmOpen(true)} disabled={replace.isPending}>
                    <RefreshCw style={{ width: 12, height: 12 }} /> {replace.isPending ? 'Making a new card…' : 'Get a new code'}
                  </button>
                  <button style={{ ...BUTTON, background: GOLD, color: '#060B16', border: 'none', fontWeight: 700 }} onClick={handlePrint}>
                    <Printer style={{ width: 12, height: 12 }} /> Print / Save as PDF
                  </button>
                </div>

                {card.use_count > 0 && (
                  <p className="rescue-noprint" style={{ margin: '10px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
                    Someone has used this card {card.use_count === 1 ? 'once' : `${card.use_count} times`}.
                  </p>
                )}
              </>
            )}

            {notice && (
              <p className="rescue-noprint" style={{ margin: '10px 0 0', fontSize: 12, color: GOLD }}>{notice}</p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmReplace}
        title="Make a new rescue card?"
        message="Your current card will stop working. Print the new one before you travel."
        confirmLabel="Make a new card"
        variant="warning"
      />
    </>
  );
}
