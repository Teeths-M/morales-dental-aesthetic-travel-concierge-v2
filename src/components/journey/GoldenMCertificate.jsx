/**
 * GoldenMCertificate — printable completion certificate.
 *
 * Renders as a full-page print layout. Patient clicks "Download Certificate"
 * and the browser's Save As PDF dialog handles the rest — zero dependencies.
 *
 * Props:
 *   patientName    string
 *   procedure      string
 *   destination    string
 *   completedDate  string (ISO or friendly)
 *   duration       string (e.g. "7 days")
 *   certNumber     string (e.g. "MRC-2026-A4F2E1")
 *   onClose        fn
 */
import React from 'react';

const GOLD = '#D4AF37';
const DARK = '#060B16';

function generateCertNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MRC-${year}-${rand}`;
}

export default function GoldenMCertificate({ patientName, procedure, destination, completedDate, duration, certNumber, onClose }) {
  const num = certNumber || generateCertNumber();
  const dateLabel = completedDate
    ? new Date(completedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    const text = `✅ I just completed my ${procedure || 'medical journey'} in ${destination || 'my destination'} with Morales Medical Concierge — 9/9 checkpoints, safely home. 🏆 #MoralesMedical #GoldenM #MedicalTravel`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Caption copied — paste it on your social media!');
    }
  }

  return (
    <>
      {/* Print-only CSS — hides everything except the certificate */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #golden-m-cert, #golden-m-cert * { visibility: visible !important; }
          #golden-m-cert { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; }
          #cert-actions { display: none !important; }
        }
        @keyframes certFade { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Full-screen overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(6,11,22,0.95)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        animation: 'certFade 0.4s ease',
      }}>
        {/* Certificate card */}
        <div
          id="golden-m-cert"
          style={{
            background: '#fff',
            width: '100%', maxWidth: 680,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: `0 0 80px rgba(212,175,55,0.3)`,
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: DARK,
          }}
        >
          {/* Gold top border */}
          <div style={{ height: 6, background: `linear-gradient(90deg, ${GOLD}, #F0D060, ${GOLD})` }} />

          <div style={{ padding: '40px 56px 32px', textAlign: 'center' }}>
            {/* M mark */}
            <div style={{
              width: 72, height: 72, margin: '0 auto 16px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${GOLD}, #b8960f)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 32px rgba(212,175,55,0.45)`,
            }}>
              <span style={{ fontSize: 38, color: '#fff', fontWeight: 900, fontFamily: 'Georgia, serif', lineHeight: 1 }}>M</span>
            </div>

            {/* Header */}
            <p style={{ margin: '0 0 2px', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#94a3b8' }}>
              MORALES MEDICAL CONCIERGE
            </p>
            <h1 style={{ margin: '6px 0 4px', fontSize: 28, fontWeight: 700, color: DARK, letterSpacing: '0.04em' }}>
              Certificate of Journey Completion
            </h1>
            <div style={{ width: 120, height: 2, margin: '0 auto 20px', background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

            {/* Body text */}
            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#64748b', letterSpacing: '0.05em' }}>
              THIS CERTIFIES THAT
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 32, fontWeight: 700, color: DARK, letterSpacing: '0.02em' }}>
              {patientName || 'The Patient'}
            </p>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#64748b' }}>
              has successfully completed their medical journey
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: DARK }}>
              {procedure || 'Medical Procedure'}
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b' }}>
              in {destination || 'their destination'}
            </p>

            {/* Stats row */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap',
              background: '#f8fafc', borderRadius: 12, padding: '16px 24px', marginBottom: 24,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: GOLD }}>9 / 9</p>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', letterSpacing: '0.08em' }}>CHECKPOINTS</p>
              </div>
              <div style={{ width: 1, background: '#e2e8f0' }} />
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: DARK }}>{dateLabel}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', letterSpacing: '0.08em' }}>COMPLETION DATE</p>
              </div>
              {duration && (
                <>
                  <div style={{ width: 1, background: '#e2e8f0' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: DARK }}>{duration}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', letterSpacing: '0.08em' }}>JOURNEY LENGTH</p>
                  </div>
                </>
              )}
            </div>

            {/* Golden M achieved */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 999,
              background: `rgba(212,175,55,0.10)`, border: `1.5px solid ${GOLD}`,
              marginBottom: 28,
            }}>
              <span style={{ fontSize: 16 }}>🏆</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Golden M Achieved
              </span>
            </div>

            {/* Signature line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ width: 140, height: 1, background: '#cbd5e1', marginBottom: 6 }} />
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Morales Concierge Director</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em' }}>CERTIFICATE NUMBER</p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#475569', fontFamily: 'monospace' }}>{num}</p>
              </div>
            </div>
          </div>

          {/* Gold bottom border */}
          <div style={{ height: 4, background: `linear-gradient(90deg, ${GOLD}, #F0D060, ${GOLD})` }} />
        </div>

        {/* Action buttons — hidden on print */}
        <div id="cert-actions" style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={handlePrint} style={{
            padding: '12px 28px', background: GOLD, color: DARK, border: 'none',
            borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            ⬇ Download Certificate
          </button>
          <button onClick={handleShare} style={{
            padding: '12px 28px', background: 'transparent', color: GOLD,
            border: `1.5px solid ${GOLD}`, borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            ↗ Share My Journey
          </button>
          <button onClick={onClose} style={{
            padding: '12px 28px', background: 'transparent', color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>

        <p style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          In your browser: File → Print → Save as PDF
        </p>
      </div>
    </>
  );
}
