import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CALM } from '@/lib/brandTokens';

/**
 * CheckYourDoctor — public, no-login doctor look-up embedded on the landing page.
 *
 * REVIEW BUILD: the check is MOCKED (runMockCheck below) so the tone of the
 * three result states — idle, "found nothing", and "populated" — can be reviewed
 * BEFORE any real data source is wired. Nothing here calls a backend yet.
 *
 * Tone rules baked into the copy (do not soften into accusation):
 *  - Absence of a signal is "we couldn't verify", never "fraud"/"fake".
 *  - Presence of a signal is "consistent with", never "verified/safe/guaranteed".
 *  - "not found" renders NEUTRAL grey (—), never a red danger state.
 *  - The internal HIGH-RISK / scored view is for admin network review only and
 *    is deliberately NOT used here.
 */

// ── Copy (kept together so the reviewable tone is easy to see/edit) ──────────
const COPY = {
  headline: 'Know who is who — before you commit.',
  subhead: 'Before you pay. Before you commit. Check your doctor.',
  button: 'Check Your Doctor',
  microcopy: 'Free. No account needed. Takes 30 seconds.',

  checking: 'Checking public records…',

  // Neutral disclosure shown near every result.
  disclosure:
    'These are public verification signals — not proof of wrongdoing, and not a background check. ' +
    'A limited online footprint is not evidence of a problem, and a strong one is not a guarantee of safety. ' +
    'Always confirm a provider’s credentials directly with them and with the relevant licensing board before you commit.',

  correctionPrompt: 'Are you this doctor, or do you know their details?',
  correctionCta: 'Request a correction',
  correctionNote: 'A real person on our team reviews every submission — nothing is changed automatically.',
  correctionThanks: 'Thank you — this has been sent to our team for human review. If it checks out, we’ll update the record.',

  conversionLead: 'Want us to vet your entire procedure plan, not just one doctor?',
  conversionCta: 'Start your journey',
};

// Neutral, non-accusatory summaries for the two result outcomes.
const SUMMARY = {
  partial:
    'We couldn’t independently verify this doctor from the public sources we can access. ' +
    'That doesn’t mean anything is wrong — many good doctors have a small online footprint, and some registries aren’t publicly searchable. ' +
    'It does mean the picture is incomplete, so confirm their credentials directly before you commit.',
  found:
    'We found public records consistent with this doctor. That’s a reassuring sign — but verification signals aren’t proof, ' +
    'so it’s still worth confirming directly with the provider before you book.',
};

// ── Mock check (placeholder for the real signal-gathering, pending review) ───
// Deterministic so both outcomes are reviewable: a couple of demo names return
// the "populated" state; anything else returns "found nothing".
const KNOWN_DEMO = ['martinez', 'reyes', 'silva'];

function runMockCheck({ doctorName, clinic, location }) {
  const isKnown = KNOWN_DEMO.some((n) => doctorName.toLowerCase().includes(n));
  const country = location || 'the destination';

  if (isKnown) {
    return {
      outcome: 'found',
      doctorName, clinic, location,
      signals: [
        { label: 'License registry', status: 'found',
          finding: `A licence record matching “${doctorName}” was found in ${country}’s public registry.` },
        { label: 'Web & social presence', status: 'found',
          finding: `Found a Google Business listing and social profiles consistent with ${clinic}.` },
        { label: 'News & public records', status: 'clear',
          finding: 'No litigation, complaint, or adverse-news mentions found.' },
        { label: 'Our safety network', status: 'clear',
          finding: 'No matches in Morales’ fraud-signal database.' },
      ],
      summary: SUMMARY.found,
    };
  }

  return {
    outcome: 'partial',
    doctorName, clinic, location,
    signals: [
      { label: 'License registry', status: 'not_found',
        finding: `No public licence record found for “${doctorName}” in ${country}’s registry we can access.` },
      { label: 'Web & social presence', status: 'not_found',
        finding: `We couldn’t find an established public profile (Google Business, Instagram, Facebook) matching this name and ${clinic}.` },
      { label: 'News & public records', status: 'clear',
        finding: 'No news, litigation, or complaint mentions found — and none confirming their practice either.' },
      { label: 'Our safety network', status: 'clear',
        finding: 'No matches in Morales’ fraud-signal database — we have no red flags on record (not the same as verified).' },
    ],
    summary: SUMMARY.partial,
  };
}

// ── Signal row — neutral iconography only ────────────────────────────────────
function SignalIcon({ status }) {
  if (status === 'found') return <Dot color={CALM.action} glyph="✓" />;      // consistent-with
  if (status === 'clear') return <Dot color={CALM.textFaint} glyph="✓" />;   // nothing concerning
  return <Dot color={CALM.textFaint} glyph="–" muted />;                     // not found = neutral grey
}

function Dot({ color, glyph, muted = false }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: muted ? 'transparent' : `${color}18`,
        border: `1.5px solid ${muted ? CALM.border : color}`,
        color, fontSize: 12, fontWeight: 700, lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  );
}

/** @type {import('react').CSSProperties} */
const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box',
  background: CALM.surfaceSoft, border: `1px solid ${CALM.border}`,
  color: CALM.text, fontSize: 14.5, outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: CALM.textSoft, marginBottom: 6 };

export default function CheckYourDoctor() {
  const [form, setForm] = useState({ doctorName: '', clinic: '', location: '', license: '', photoName: '' });
  const [status, setStatus] = useState('idle'); // idle | checking | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionSent, setCorrectionSent] = useState(false);
  const resultsRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.doctorName.trim() || !form.clinic.trim() || !form.location.trim()) {
      setError('Please add the doctor’s name, their clinic, and a country or city.');
      return;
    }
    setError('');
    setStatus('checking');
    setResult(null);
    setShowCorrection(false);
    setCorrectionSent(false);
    // Simulated look-up window (mock). Real signal-gathering wires in after tone review.
    setTimeout(() => {
      setResult(runMockCheck(form));
      setStatus('done');
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }, 1400);
  };

  return (
    <section style={{ background: CALM.page, padding: '64px 20px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: CALM.text, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {COPY.headline}
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: CALM.textSoft, lineHeight: 1.6 }}>{COPY.subhead}</p>
        </div>

        {/* Tool card */}
        <div style={{ background: CALM.surface, border: `1px solid ${CALM.border}`, borderRadius: 20, padding: 24, boxShadow: '0 10px 40px rgba(23,48,44,0.06)' }}>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Doctor’s name</label>
                <input style={inputStyle} value={form.doctorName} onChange={set('doctorName')} placeholder="e.g. Dr. Ana Martinez" />
              </div>
              <div>
                <label style={labelStyle}>Clinic or practice name</label>
                <input style={inputStyle} value={form.clinic} onChange={set('clinic')} placeholder="e.g. Smile Clinic Tijuana" />
              </div>
              <div>
                <label style={labelStyle}>Country or city</label>
                <input style={inputStyle} value={form.location} onChange={set('location')} placeholder="e.g. Tijuana, Mexico" />
              </div>

              <details style={{ marginTop: -2 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: CALM.action, listStyle: 'none' }}>
                  Add licence number or a photo (optional — stronger match)
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                  <div>
                    <label style={labelStyle}>Licence / registration number <span style={{ fontWeight: 400, color: CALM.textFaint }}>— optional</span></label>
                    <input style={inputStyle} value={form.license} onChange={set('license')} placeholder="If you have it" />
                  </div>
                  <div>
                    <label style={labelStyle}>Photo of the doctor <span style={{ fontWeight: 400, color: CALM.textFaint }}>— optional</span></label>
                    <input
                      type="file" accept="image/*"
                      onChange={(e) => setForm((f) => ({ ...f, photoName: e.target.files?.[0]?.name || '' }))}
                      style={{ fontSize: 13, color: CALM.textSoft }}
                    />
                    {form.photoName && <p style={{ margin: '6px 0 0', fontSize: 12, color: CALM.textFaint }}>Attached: {form.photoName}</p>}
                  </div>
                </div>
              </details>

              {error && <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>{error}</p>}

              <button
                type="submit"
                disabled={status === 'checking'}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 999, border: 'none',
                  cursor: status === 'checking' ? 'default' : 'pointer',
                  background: CALM.action, color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.01em',
                }}
              >
                {status === 'checking' ? COPY.checking : COPY.button}
              </button>
              <p style={{ margin: 0, textAlign: 'center', fontSize: 12.5, color: CALM.textFaint }}>{COPY.microcopy}</p>
            </div>
          </form>
        </div>

        {/* Results — expand inline below the form */}
        <div ref={resultsRef}>
          <AnimatePresence>
            {status === 'done' && result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: 18, background: CALM.surface, border: `1px solid ${CALM.border}`, borderRadius: 20, padding: 24 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: CALM.action }}>
                    What we could — and couldn’t — verify
                  </p>
                  <h3 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 700, color: CALM.text }}>
                    {result.doctorName} · {result.clinic}
                  </h3>

                  {/* Signal rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {result.signals.map((s) => (
                      <div key={s.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <SignalIcon status={s.status} />
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 13.5, fontWeight: 600, color: CALM.text }}>{s.label}</p>
                          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: CALM.textSoft }}>{s.finding}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Neutral summary */}
                  <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: CALM.surfaceSoft, border: `1px solid ${CALM.border}` }}>
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: CALM.text }}>{result.summary}</p>
                  </div>

                  {/* Disclosure */}
                  <p style={{ margin: '14px 0 0', fontSize: 11.5, lineHeight: 1.6, color: CALM.textFaint }}>{COPY.disclosure}</p>

                  {/* Request a correction */}
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${CALM.border}` }}>
                    {correctionSent ? (
                      <p style={{ margin: 0, fontSize: 13, color: CALM.action, fontWeight: 500 }}>{COPY.correctionThanks}</p>
                    ) : !showCorrection ? (
                      <p style={{ margin: 0, fontSize: 13, color: CALM.textSoft }}>
                        {COPY.correctionPrompt}{' '}
                        <button type="button" onClick={() => setShowCorrection(true)}
                          style={{ background: 'none', border: 'none', padding: 0, color: CALM.action, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                          {COPY.correctionCta}
                        </button>
                      </p>
                    ) : (
                      <CorrectionForm onDone={() => { setShowCorrection(false); setCorrectionSent(true); }} />
                    )}
                    {!correctionSent && <p style={{ margin: '6px 0 0', fontSize: 11.5, color: CALM.textFaint }}>{COPY.correctionNote}</p>}
                  </div>
                </div>

                {/* Soft conversion prompt */}
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: CALM.textSoft }}>{COPY.conversionLead}</p>
                  <Link to="/intake" style={{ display: 'inline-block', padding: '11px 22px', borderRadius: 999, background: 'transparent', border: `1.5px solid ${CALM.action}`, color: CALM.action, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                    {COPY.conversionCta} →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// Minimal correction form (mock submit → human queue, pending real wiring).
function CorrectionForm({ onDone }) {
  const [msg, setMsg] = useState('');
  const [contact, setContact] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea
        rows={3} value={msg} onChange={(e) => setMsg(e.target.value)}
        placeholder="Share the real credentials or what’s inaccurate (licence number, registry link, clinic details)…"
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
      />
      <input style={inputStyle} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email so we can follow up (optional)" />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onDone} disabled={!msg.trim()}
          style={{ padding: '10px 18px', borderRadius: 999, border: 'none', background: msg.trim() ? CALM.action : 'rgba(14,138,125,0.35)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: msg.trim() ? 'pointer' : 'default' }}>
          Send for review
        </button>
        <button type="button" onClick={onDone}
          style={{ padding: '10px 18px', borderRadius: 999, border: `1px solid ${CALM.border}`, background: 'transparent', color: CALM.textSoft, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
