/**
 * EmergencyMedCard — /dashboard/emergency-card
 *
 * Generates a printable offline emergency medical ID card in the patient's
 * destination language. Shown to first responders, local doctors, or police
 * if the patient is incapacitated abroad.
 *
 * Works completely offline — all data from the CaseRecord is embedded at
 * load time. Print = browser Save as PDF. Zero network calls at print time.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Printer, ArrowLeft, Shield, AlertTriangle, Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

// ── Per-language medical phrases ───────────────────────────────────────────────
// Covers the 8 most common Morales destination countries.
// Bilingual (English + destination) so local responders can understand both.
const PHRASES = {
  Venezuela:   { lang: 'es', name: 'Nombre', blood: 'Tipo de Sangre', allergies: 'Alergias', conditions: 'Condiciones Médicas', procedure: 'Procedimiento Reciente', emergency: 'Contacto de Emergencia', concierge: 'Coordinadora Médica', intro: 'Soy turista médico. Por favor contacte a mi coordinadora.', none: 'Ninguna conocida' },
  Colombia:    { lang: 'es', name: 'Nombre', blood: 'Tipo de Sangre', allergies: 'Alergias', conditions: 'Condiciones Médicas', procedure: 'Procedimiento Reciente', emergency: 'Contacto de Emergencia', concierge: 'Coordinadora Médica', intro: 'Soy turista médico. Por favor contacte a mi coordinadora.', none: 'Ninguna conocida' },
  Mexico:      { lang: 'es', name: 'Nombre', blood: 'Tipo de Sangre', allergies: 'Alergias', conditions: 'Condiciones Médicas', procedure: 'Procedimiento Reciente', emergency: 'Contacto de Emergencia', concierge: 'Coordinadora Médica', intro: 'Soy turista médico. Por favor contacte a mi coordinadora.', none: 'Ninguna conocida' },
  Turkey:      { lang: 'tr', name: 'Ad', blood: 'Kan Grubu', allergies: 'Alerjiler', conditions: 'Tıbbi Durumlar', procedure: 'Son İşlem', emergency: 'Acil Kişi', concierge: 'Tıbbi Koordinatör', intro: 'Tıbbi turistim. Lütfen koordinatörümle iletişime geçin.', none: 'Bilinen yok' },
  Thailand:    { lang: 'th', name: 'ชื่อ', blood: 'หมู่โลหิต', allergies: 'การแพ้', conditions: 'ภาวะทางการแพทย์', procedure: 'หัตถการล่าสุด', emergency: 'ผู้ติดต่อฉุกเฉิน', concierge: 'ผู้ประสานงานทางการแพทย์', intro: 'ฉันเป็นนักท่องเที่ยวเชิงการแพทย์ โปรดติดต่อผู้ประสานงานของฉัน', none: 'ไม่มีที่ทราบ' },
  Brazil:      { lang: 'pt', name: 'Nome', blood: 'Tipo Sanguíneo', allergies: 'Alergias', conditions: 'Condições Médicas', procedure: 'Procedimento Recente', emergency: 'Contato de Emergência', concierge: 'Coordenadora Médica', intro: 'Sou turista médico. Por favor, entre em contato com minha coordenadora.', none: 'Nenhuma conhecida' },
  Portugal:    { lang: 'pt', name: 'Nome', blood: 'Tipo Sanguíneo', allergies: 'Alergias', conditions: 'Condições Médicas', procedure: 'Procedimento Recente', emergency: 'Contato de Emergência', concierge: 'Coordenadora Médica', intro: 'Sou turista médico. Por favor, entre em contato com minha coordenadora.', none: 'Nenhuma conhecida' },
  India:       { lang: 'hi', name: 'नाम', blood: 'रक्त समूह', allergies: 'एलर्जी', conditions: 'चिकित्सा स्थितियां', procedure: 'हाल की प्रक्रिया', emergency: 'आपातकालीन संपर्क', concierge: 'चिकित्सा समन्वयक', intro: 'मैं मेडिकल टूरिस्ट हूं। कृपया मेरे समन्वयक से संपर्क करें।', none: 'कोई ज्ञात नहीं' },
};

function getPhrases(country) {
  return PHRASES[country] || PHRASES['Venezuela'];
}

// ── Card component — used for both screen and print ────────────────────────────
function MedCard({ caseRec, user }) {
  const p        = getPhrases(caseRec?.procedure_country || '');
  const firstName = (caseRec?.client_name || user?.full_name || 'Patient').split(' ')[0];
  const blood    = caseRec?.blood_type || '—';
  const allergies = (caseRec?.allergies || []).join(', ') || p.none;
  const conditions = (caseRec?.medical_conditions || []).join(', ') || p.none;
  const procedures = (caseRec?.procedures || []).join(', ') || '—';
  const country  = caseRec?.procedure_country || '—';
  const emergencyContact = caseRec?.emergency_contact || '—';
  const caseRef  = caseRec?.id?.slice(-8).toUpperCase() || '—';

  return (
    <div
      id="med-card"
      style={{
        width: '100%', maxWidth: 680, margin: '0 auto',
        background: '#fff', color: '#0f172a',
        borderRadius: 16, overflow: 'hidden',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxShadow: '0 0 0 1px #e2e8f0, 0 20px 60px rgba(0,0,0,0.15)',
      }}
    >
      {/* Gold top bar */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${GOLD}, #F0D060, ${GOLD})` }} />

      {/* Header */}
      <div style={{ background: '#060B16', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#060B16', fontFamily: 'Georgia, serif' }}>
            M
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Morales Medical</div>
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Emergency Medical ID</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Case Reference</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: GOLD, fontFamily: 'monospace' }}>MRC-{caseRef}</div>
        </div>
      </div>

      {/* Intro phrase — large, bilingual */}
      <div style={{ background: '#fef9ec', borderBottom: '1px solid #fcd34d', padding: '14px 28px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>
          ⚠️ I am a medical tourist under Morales Medical concierge care.
        </div>
        <div style={{ fontSize: 12, color: '#78350f' }}>{p.intro}</div>
      </div>

      {/* Main content grid */}
      <div style={{ padding: '20px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Name */}
          <Field label={`Name / ${p.name}`} value={firstName} highlight />

          {/* Blood type */}
          <Field label={`Blood Type / ${p.blood}`} value={blood} highlight color="#dc2626" />

          {/* Allergies */}
          <Field label={`Allergies / ${p.allergies}`} value={allergies} danger={allergies !== p.none} />

          {/* Medical conditions */}
          <Field label={`Conditions / ${p.conditions}`} value={conditions} />

        </div>

        {/* Recent procedure — full width */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Recent Procedure / {p.procedure}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{procedures}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Destination: {country}</div>
        </div>

        {/* Emergency contacts — full width */}
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            🚨 Emergency Contacts / {p.emergency}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, color: '#0f172a' }}>
              <span style={{ fontWeight: 600 }}>Personal:</span> {emergencyContact}
            </div>
            <div style={{ fontSize: 13, color: '#0f172a' }}>
              <span style={{ fontWeight: 600 }}>Morales 24/7 Concierge ({p.concierge}):</span>{' '}
              <span style={{ color: '#be123c', fontWeight: 700 }}>+1 (800) MORALES</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>
            moralesdentalandaesthetics.com · Safe-T4life™ Protected
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>
            Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Gold bottom bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${GOLD}, #F0D060, ${GOLD})` }} />
    </div>
  );
}

function Field({ label, value, highlight, danger, color }) {
  return (
    <div style={{ background: danger ? '#fff1f2' : '#f8fafc', border: `1px solid ${danger ? '#fecdd3' : '#e2e8f0'}`, borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: highlight ? 18 : 14, fontWeight: highlight ? 800 : 600, color: danger ? '#be123c' : color || '#0f172a' }}>
        {value}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function EmergencyMedCard() {
  const [user,    setUser]    = useState(null);
  const [caseRec, setCaseRec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('Venezuela');

  useEffect(() => {
    async function load() {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const cases = await base44.entities.CaseRecord.filter({ client_email: u.email }, '-created_date', 5);
        const active = cases.find(c => !['Completed', 'Closed', 'Cancelled'].includes(c.status)) || cases[0];
        if (active) {
          setCaseRec(active);
          if (active.procedure_country) setCountry(active.procedure_country);
        }
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, []);

  function handlePrint() {
    window.print();
  }

  const p = getPhrases(country);

  return (
    <div style={{ minHeight: '100vh', background: '#060B16' }}>

      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #med-card, #med-card * { visibility: visible !important; }
          #med-card { position: fixed !important; inset: 0 !important; width: 100vw !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          #no-print { display: none !important; }
        }
      `}</style>

      {/* Screen UI */}
      <div id="no-print">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 24px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Dashboard
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <Shield style={{ width: 16, height: 16, color: GOLD }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Emergency Medical Card</span>
          </div>

          {/* Explainer */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#0C1A1D', border: `1px solid ${GOLD}30`, borderRadius: 16, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Heart style={{ width: 18, height: 18, color: GOLD, flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  Your lifeline if you cannot speak
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  Show this card to any first responder, local doctor, or police officer abroad.
                  It contains your blood type, allergies, recent procedure, and emergency contacts
                  — in English and the local language. Print it and keep it in your wallet.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Language selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Destination:</span>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              style={{ background: '#0C1A1D', border: `1px solid ${GOLD}40`, borderRadius: 8, color: GOLD, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {Object.keys(PHRASES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Card renders in English + {p.lang.toUpperCase()}</span>
          </div>

          {/* Warning if no case */}
          {!loading && !caseRec && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
              <AlertTriangle style={{ width: 16, height: 16, color: '#fbbf24', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#fbbf24' }}>
                No active case found — the card will show placeholder data. Complete a consultation to auto-fill your medical details.
              </p>
            </div>
          )}

          {/* Print button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 99, background: GOLD, color: '#060B16', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              <Printer style={{ width: 14, height: 14 }} />
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* The card itself */}
      <div style={{ padding: '0 16px 48px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: GOLD, borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <MedCard caseRec={caseRec ? { ...caseRec, procedure_country: country } : null} user={user} />
        )}
      </div>
    </div>
  );
}
