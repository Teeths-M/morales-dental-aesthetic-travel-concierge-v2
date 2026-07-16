import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, AlertTriangle, CheckCircle2, Clock, Pill, Plane, Utensils, Activity, FileHeart, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

const GOLD = '#D4AF37';
const DARK = '#060B16';
const CARD = '#0C1A1D';

const URGENCY_STYLE = {
  critical: { bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.4)', dot: '#dc2626', label: 'CRITICAL' },
  important: { bg: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.35)', dot: '#eab308', label: 'IMPORTANT' },
  advisory: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', dot: '#3b82f6', label: 'NOTE' },
};

const CATEGORY_ICON = {
  Travel: Plane, Diet: Utensils, Medication: Pill,
  Activity: Activity, 'Wound Care': FileHeart,
};

function RestrictionCard({ r }) {
  const s = URGENCY_STYLE[r.urgency] || URGENCY_STYLE.advisory;
  const Icon = CATEGORY_ICON[r.category] || CheckCircle2;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 16, height: 16, color: s.dot }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: s.dot, letterSpacing: '0.08em' }}>{s.label}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>{r.category}</span>
            {r.duration && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>· {r.duration}</span>}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#fff', lineHeight: 1.6 }}>{r.instruction}</p>
        </div>
      </div>
    </div>
  );
}

function MedCard({ med }) {
  return (
    <div style={{ background: 'rgba(212,175,55,0.07)', border: `1px solid ${GOLD}25`, borderRadius: 14, padding: '12px 16px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#fff' }}>{med.name}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{med.dose} · {med.frequency} · {med.duration}</p>
        </div>
        {med.with_food && (
          <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, background: `${GOLD}15`, border: `1px solid ${GOLD}30`, borderRadius: 6, padding: '2px 8px' }}>WITH FOOD</span>
        )}
      </div>
    </div>
  );
}

export default function DischargePaperReader() {
  const [phase, setPhase] = useState('upload'); // upload | scanning | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRedFlags, setShowRedFlags] = useState(true);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setPhase('scanning');

    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(/** @type {string} */(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await base44.functions.invoke('readDischargePaper', {
        image_base64: base64,
        language: navigator.language?.slice(0, 2) || 'en',
      });

      const parsed = res?.parsed ?? res?.data?.parsed;
      if (!parsed) throw new Error('No data returned');

      setResult(parsed);
      setPhase('done');
    } catch (_e) {
      setErrorMsg('M could not read this document. Please ensure the image is clear and well-lit, then try again.');
      setPhase('error');
    }
  };

  const reset = () => { setPhase('upload'); setResult(null); setErrorMsg(''); };

  return (
    <div style={{ minHeight: '100vh', background: DARK, padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{ background: CARD, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', marginBottom: 16 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${GOLD}18`, border: `1.5px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: GOLD, flexShrink: 0 }}>M</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Discharge Paper Reader</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>M reads your discharge papers — plain language, any language</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
        <AnimatePresence mode="wait">

          {/* Upload */}
          {phase === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ background: `${GOLD}06`, border: `2px dashed ${GOLD}30`, borderRadius: 20, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${GOLD}60`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${GOLD}30`}
              >
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${GOLD}12`, border: `1.5px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Camera style={{ width: 28, height: 28, color: GOLD }} />
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#fff' }}>Photograph your discharge papers</p>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  M will read everything and translate it into plain language — any language, any procedure.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`, color: DARK, fontSize: 13, fontWeight: 800, padding: '12px 28px', borderRadius: 99 }}>
                  <Upload style={{ width: 15, height: 15 }} /> Choose Photo or PDF
                </div>
                <p style={{ margin: '12px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>JPG, PNG, or PDF · Max 10MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />

              {/* What M reads */}
              <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: Plane, label: 'Travel restrictions', sub: 'When you can fly home' },
                  { icon: Pill, label: 'Medications', sub: 'What to take and when' },
                  { icon: Utensils, label: 'Diet & drink', sub: 'What to eat or avoid' },
                  { icon: AlertTriangle, label: 'Red flags', sub: 'When to call a doctor' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} style={{ background: CARD, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px' }}>
                    <Icon style={{ width: 18, height: 18, color: GOLD, marginBottom: 8 }} />
                    <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#fff' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scanning */}
          {phase === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${GOLD}12`, border: `2px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: GOLD, margin: '0 auto 24px', animation: 'pulse 1.5s ease infinite' }}>M</div>
              <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#fff' }}>M is reading your papers...</p>
              <p style={{ margin: '0 0 28px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Extracting restrictions, medications, and red flags. This takes about 10 seconds.</p>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: `pulse 0.8s ease ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.9)}}`}</style>
            </motion.div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '40px 24px' }}>
              <AlertTriangle style={{ width: 48, height: 48, color: '#dc2626', margin: '0 auto 16px' }} />
              <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#fff' }}>Could not read document</p>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{errorMsg}</p>
              <button onClick={reset} style={{ background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`, color: DARK, fontSize: 13, fontWeight: 800, padding: '12px 28px', borderRadius: 99, border: 'none', cursor: 'pointer' }}>Try Again</button>
            </motion.div>
          )}

          {/* Results */}
          {phase === 'done' && result && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

              {/* M summary */}
              <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}30`, borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${GOLD}18`, border: `1.5px solid ${GOLD}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: GOLD, flexShrink: 0 }}>M</div>
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{result.summary}</p>
              </div>

              {/* Red flags — always first, most urgent */}
              {result.red_flags?.length > 0 && (
                <div style={{ background: 'rgba(220,38,38,0.10)', border: '1.5px solid rgba(220,38,38,0.4)', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
                  <button onClick={() => setShowRedFlags(v => !v)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle style={{ width: 18, height: 18, color: '#dc2626' }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#fca5a5' }}>Seek help immediately if you notice:</span>
                    </div>
                    {showRedFlags ? <ChevronUp style={{ width: 16, height: 16, color: '#fca5a5' }} /> : <ChevronDown style={{ width: 16, height: 16, color: '#fca5a5' }} />}
                  </button>
                  <AnimatePresence>
                    {showRedFlags && (
                      <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ margin: '12px 0 0', padding: 0, listStyle: 'none' }}>
                        {result.red_flags.map((flag, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                            <span style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }}>⚠</span>
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{flag}</span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Restrictions */}
              {result.restrictions?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Your Restrictions</p>
                  {result.restrictions.map((r, i) => <RestrictionCard key={i} r={r} />)}
                </div>
              )}

              {/* Medications */}
              {result.medications?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Your Medications</p>
                  {result.medications.map((med, i) => <MedCard key={i} med={med} />)}
                </div>
              )}

              {/* Follow-up */}
              {result.follow_up?.when && (
                <div style={{ background: CARD, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Clock style={{ width: 18, height: 18, color: GOLD, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Follow-up: {result.follow_up.when}</p>
                    {result.follow_up.with && <p style={{ margin: '0 0 2px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>With: {result.follow_up.with}</p>}
                    {result.follow_up.notes && <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{result.follow_up.notes}</p>}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                {result.clinic_name && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '4px 10px' }}>{result.clinic_name}</span>}
                {result.doctor_name && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '4px 10px' }}>{result.doctor_name}</span>}
                {result.discharge_date && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '4px 10px' }}>Discharged: {result.discharge_date}</span>}
                {result.language_detected && result.language_detected !== 'English' && <span style={{ fontSize: 11, color: GOLD, background: `${GOLD}10`, border: `1px solid ${GOLD}20`, borderRadius: 8, padding: '4px 10px' }}>Translated from {result.language_detected}</span>}
              </div>

              <button onClick={reset} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: '13px 0', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                Scan Another Document
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
