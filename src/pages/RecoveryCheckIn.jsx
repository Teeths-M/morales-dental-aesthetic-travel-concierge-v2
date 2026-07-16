/**
 * RecoveryCheckIn — /recovery-check-in/:token
 *
 * Public page — no login required. Patient clicks the link from their
 * Day 3/7/14/30 email and submits their recovery status in under 60 seconds.
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

const CONCERN_OPTIONS = [
  { id: 'swelling',   label: 'Swelling or bruising' },
  { id: 'pain',       label: 'Unexpected pain' },
  { id: 'bleeding',   label: 'Bleeding' },
  { id: 'infection',  label: 'Signs of infection' },
  { id: 'allergic',   label: 'Allergic reaction' },
  { id: 'other',      label: 'Something else' },
];

const RATING_LABELS = ['', 'Not well at all', 'Struggling a bit', 'Getting there', 'Feeling good', 'Excellent recovery'];
const RATING_COLORS = ['', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981'];

export default function RecoveryCheckIn() {
  const { token } = useParams();
  const [rating,    setRating]    = useState(0);
  const [pain,      setPain]      = useState(0);
  const [concerns,  setConcerns]  = useState([]);
  const [note,      setNote]      = useState('');
  const [step,      setStep]      = useState(1); // 1=rating, 2=pain+concerns, 3=note, 4=done
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState('');
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);

  function toggleConcern(id) {
    setConcerns(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await base44.functions.invoke('submitPostOpCheckIn', {
        token, rating, pain_level: pain, note, concerns,
      });
      const data = res?.data ?? res;
      if (data?.already_submitted) { setAlreadyDone(true); return; }
      setStep(4);
      // Non-blocking AI interpretation — shows personalized message on done screen
      base44.functions.invoke('interpretRecoveryCheckIn', { rating, pain_level: pain, concerns, note })
        .then(r => { const msg = (r?.data ?? r)?.patient_message; if (msg) setAiMessage(msg); })
        .catch(() => {});
    } catch (_e) {
      setError('Could not submit. Please try again or contact your Morales coordinator.');
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadyDone) return (
    <Page><div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <CheckCircle2 style={{ width: 48, height: 48, color: GOLD, margin: '0 auto 16px' }} />
      <h2 style={{ margin: '0 0 8px', color: '#fff', fontFamily: 'Georgia, serif', fontSize: 24 }}>Already submitted</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>You already completed this check-in. Thank you for staying in touch with your care team.</p>
    </div></Page>
  );

  return (
    <Page>
      <AnimatePresence mode="wait">

        {/* Step 1 — How are you feeling overall? */}
        {step === 1 && (
          <Step key="s1">
            <Label>How is your recovery going?</Label>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>
              Tap a star to rate your overall recovery so far.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
              {[1,2,3,4,5].map(r => (
                <button key={r} onClick={() => setRating(r)}
                  style={{ fontSize: 36, cursor: 'pointer', background: 'none', border: 'none', filter: r <= rating ? 'none' : 'grayscale(1) opacity(0.3)', transform: r === rating ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s' }}>
                  ⭐
                </button>
              ))}
            </div>
            {rating > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p style={{ textAlign: 'center', fontSize: 15, fontWeight: 600, color: RATING_COLORS[rating], marginBottom: 28 }}>
                  {RATING_LABELS[rating]}
                </p>
                <NextBtn onClick={() => setStep(2)}>Next →</NextBtn>
              </motion.div>
            )}
          </Step>
        )}

        {/* Step 2 — Pain level + concerns */}
        {step === 2 && (
          <Step key="s2">
            <Label>Pain level right now</Label>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>0 = no pain · 10 = severe</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} onClick={() => setPain(i)}
                  style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${pain === i ? (i >= 7 ? '#ef4444' : i >= 4 ? '#f59e0b' : '#22c55e') : '#2A3F4A'}`, background: pain === i ? (i >= 7 ? 'rgba(239,68,68,0.15)' : i >= 4 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)') : '#0C1A1D', color: pain === i ? '#fff' : '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {i}
                </button>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 13, color: pain >= 7 ? '#ef4444' : '#64748b', marginBottom: 24 }}>
              {pain >= 7 ? '⚠️ We will alert your doctor.' : pain >= 4 ? 'Moderate — we\'ll keep an eye on this.' : pain <= 2 ? '✓ Great — low pain.' : ''}
            </p>

            <Label style={{ marginBottom: 12 }}>Any concerns? (optional)</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {CONCERN_OPTIONS.map(c => (
                <button key={c.id} onClick={() => toggleConcern(c.id)}
                  style={{ padding: '8px 14px', borderRadius: 99, border: `1px solid ${concerns.includes(c.id) ? '#ef4444' : '#2A3F4A'}`, background: concerns.includes(c.id) ? 'rgba(239,68,68,0.12)' : '#0C1A1D', color: concerns.includes(c.id) ? '#fca5a5' : '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {c.label}
                </button>
              ))}
            </div>
            <NextBtn onClick={() => setStep(3)}>Next →</NextBtn>
          </Step>
        )}

        {/* Step 3 — Note */}
        {step === 3 && (
          <Step key="s3">
            <Label>Anything else you want your care team to know?</Label>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>Optional. Your doctor and Morales coordinator will see this.</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. My smile looks amazing! / I have some sensitivity on the left side..."
              rows={4}
              style={{ width: '100%', background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 12, color: '#fff', fontSize: 14, padding: '12px 14px', resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
            {error && <p style={{ color: '#fca5a5', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)}
                style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid #2A3F4A', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                ← Back
              </button>
              <button onClick={submit} disabled={submitting}
                style={{ flex: 2, padding: '14px', borderRadius: 12, background: GOLD, border: 'none', color: '#060B16', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting…' : 'Submit Recovery Update →'}
              </button>
            </div>
          </Step>
        )}

        {/* Step 4 — Done */}
        {step === 4 && (
          <Step key="s4">
            <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                <CheckCircle2 style={{ width: 56, height: 56, color: GOLD, margin: '0 auto 20px' }} />
              </motion.div>
              <h2 style={{ margin: '0 0 8px', color: '#fff', fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400 }}>
                Thank you{concerns.length > 0 || pain >= 7 ? ', we\'re on it.' : '.'}
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                {concerns.length > 0 || pain >= 7
                  ? 'We\'ve alerted your doctor and a Morales coordinator will be in touch shortly.'
                  : 'Your recovery update has been recorded. Your care team will review it.'
                }
              </p>
              {concerns.length > 0 || pain >= 7 ? (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                  <AlertTriangle style={{ width: 16, height: 16, color: '#fca5a5', margin: '0 auto 6px' }} />
                  <p style={{ margin: 0, fontSize: 13, color: '#fca5a5' }}>Your doctor has been notified and will follow up with you directly.</p>
                </div>
              ) : null}
              {aiMessage && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 16px', padding: '12px 14px', background: 'rgba(212,175,55,0.07)', borderRadius: 10, border: '1px solid rgba(212,175,55,0.2)' }}
                >
                  {aiMessage}
                </motion.p>
              )}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Morales Medical Travel Safety</p>
            </div>
          </Step>
        )}

      </AnimatePresence>
    </Page>
  );
}

// ── Reusable layout pieces ────────────────────────────────────────────────────

function Page({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#060B16', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      {/* Morales header */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 24, fontWeight: 900, color: '#060B16', fontFamily: 'Georgia, serif' }}>M</div>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.2em', color: GOLD, textTransform: 'uppercase' }}>Morales · Recovery Care</p>
      </div>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {children}
      </div>
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Heart style={{ width: 12, height: 12, color: GOLD }} />
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Care that follows you home</p>
      </div>
    </div>
  );
}

function Step({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 20, padding: '28px 24px' }}
    >
      {children}
    </motion.div>
  );
}

function Label({ children, style = null }) {
  return <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#fff', fontFamily: 'Georgia, serif', ...style }}>{children}</h3>;
}

function NextBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '14px', borderRadius: 12, background: GOLD, border: 'none', color: '#060B16', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
      {children}
    </button>
  );
}
