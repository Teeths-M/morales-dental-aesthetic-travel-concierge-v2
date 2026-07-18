import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CALM } from '@/lib/brandTokens';
import cityData from '@/lib/cityData.json';
import { SERVED_COUNTRIES } from '@/lib/countryCity';
import SearchSelect from '@/components/ui-system/SearchSelect';

const COUNTRIES = [...SERVED_COUNTRIES].sort((a, b) => a.localeCompare(b));
function citiesFor(country) {
  if (!country) return [];
  const key = COUNTRIES.find((k) => k.toLowerCase() === country.toLowerCase());
  return key ? cityData[key] : [];
}

/**
 * CheckYourDoctor — public, no-login doctor look-up embedded on the landing page.
 *
 * Wired to publicDoctorCheck (neutral signal-gathering: license registry, web/
 * social, news/litigation, fraud-network overlap) and submitDoctorCorrection
 * (human admin queue). Deliberately NOT the internal HIGH-RISK scored engine,
 * and it never fingerprints the searcher.
 *
 * Tone rules (do not soften into accusation):
 *  - Absence of a signal is "we couldn't verify", never "fraud"/"fake".
 *  - Presence of a signal is "consistent with", never "verified/safe/guaranteed".
 *  - "not found" / "unknown" render NEUTRAL grey, never a red danger state.
 *  - Result copy is produced server-side; this renders it verbatim.
 */

const COPY = {
  headline: 'Know who is who — before you commit.',
  subhead: 'Before you pay. Before you commit. Check your doctor.',
  button: 'Check Your Doctor',
  microcopy: 'Free. No account needed. Takes 30 seconds.',
  checking: 'Checking public records…',

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

// ── Signal row — neutral iconography only ────────────────────────────────────
function SignalIcon({ status }) {
  if (status === 'found') return <Dot color={CALM.action} glyph="✓" />;      // consistent-with
  if (status === 'clear') return <Dot color={CALM.textFaint} glyph="✓" />;   // nothing concerning
  return <Dot color={CALM.textFaint} glyph="–" muted />;                     // not found / unknown = neutral grey
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
  const [form, setForm] = useState({ doctorName: '', clinic: '', website: '', country: '', city: '', license: '', photoName: '' });
  const [status, setStatus] = useState('idle'); // idle | checking | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionSent, setCorrectionSent] = useState(false);
  const resultsRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.doctorName.trim() || !form.clinic.trim() || !form.country.trim()) {
      setError('Please add the doctor’s name, their clinic, and a country.');
      return;
    }
    const location = [form.city.trim(), form.country.trim()].filter(Boolean).join(', ');
    setError('');
    setStatus('checking');
    setResult(null);
    setShowCorrection(false);
    setCorrectionSent(false);
    try {
      const res = await base44.functions.invoke('publicDoctorCheck', {
        doctor_name: form.doctorName.trim(),
        clinic: form.clinic.trim(),
        location,
        website_url: form.website.trim() || undefined,
        license: form.license.trim() || undefined,
      });
      const data = res?.data ?? res;
      if (data?.error) { setError(data.error); setStatus('idle'); return; }
      setResult(data);
      setStatus('done');
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError(err?.response?.data?.error || 'We couldn’t run the check right now. Please try again in a moment.');
      setStatus('idle');
    }
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
                <label style={labelStyle}>Website</label>
                <input style={inputStyle} value={form.website} onChange={set('website')} placeholder="e.g. smileclinic.com" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label style={labelStyle}>Country</label>
                  <SearchSelect boxed value={form.country} options={COUNTRIES} placeholder="Select or type"
                    onChange={(v) => setForm((f) => ({ ...f, country: v, city: '' }))} />
                </div>
                <div>
                  <label style={labelStyle}>City <span style={{ fontWeight: 400, color: CALM.textFaint }}>— optional</span></label>
                  <SearchSelect boxed value={form.city} options={citiesFor(form.country)}
                    placeholder={form.country ? 'Select or type' : 'Pick a country'}
                    disabled={!form.country}
                    onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
                </div>
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {(result.signals || []).map((s) => (
                      <div key={s.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <SignalIcon status={s.status} />
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 13.5, fontWeight: 600, color: CALM.text }}>{s.label}</p>
                          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: CALM.textSoft }}>{s.finding}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: CALM.surfaceSoft, border: `1px solid ${CALM.border}` }}>
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: CALM.text }}>{result.summary}</p>
                  </div>

                  <p style={{ margin: '14px 0 0', fontSize: 11.5, lineHeight: 1.6, color: CALM.textFaint }}>{COPY.disclosure}</p>

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
                      <CorrectionForm
                        doctor={{ doctorName: result.doctorName, clinic: result.clinic, location: result.location }}
                        onDone={() => { setShowCorrection(false); setCorrectionSent(true); }}
                      />
                    )}
                    {!correctionSent && <p style={{ margin: '6px 0 0', fontSize: 11.5, color: CALM.textFaint }}>{COPY.correctionNote}</p>}
                  </div>
                </div>

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

// Correction form → submitDoctorCorrection (human admin queue; never auto-applied).
function CorrectionForm({ doctor, onDone }) {
  const [msg, setMsg] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const send = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    setErr('');
    try {
      await base44.functions.invoke('submitDoctorCorrection', {
        doctor_name: doctor.doctorName,
        clinic: doctor.clinic,
        location: doctor.location,
        message: msg.trim(),
        contact_email: contact.trim() || undefined,
      });
      onDone();
    } catch (e) {
      setErr(e?.response?.data?.error || 'We couldn’t send that just now — please try again shortly.');
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea
        rows={3} value={msg} onChange={(e) => setMsg(e.target.value)}
        placeholder="Share the real credentials or what’s inaccurate (licence number, registry link, clinic details)…"
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
      />
      <input style={inputStyle} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email so we can follow up (optional)" />
      {err && <p style={{ margin: 0, fontSize: 12.5, color: '#dc2626' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={send} disabled={!msg.trim() || sending}
          style={{ padding: '10px 18px', borderRadius: 999, border: 'none', background: msg.trim() && !sending ? CALM.action : 'rgba(14,138,125,0.35)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: msg.trim() && !sending ? 'pointer' : 'default' }}>
          {sending ? 'Sending…' : 'Send for review'}
        </button>
        <button type="button" onClick={onDone} disabled={sending}
          style={{ padding: '10px 18px', borderRadius: 999, border: `1px solid ${CALM.border}`, background: 'transparent', color: CALM.textSoft, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}