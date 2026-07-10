// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';
const DARK = '#060B16';

const RESEND_COOLDOWN_S = 30;

/**
 * ContactVerificationStep — runs at submission time (guest-first: browsing is
 * never gated on this). In-flow verification is PHONE ONLY — the safety-
 * critical channel coordinators and the emergency chain actually dial.
 * Email is verified passively via the "Confirm your email" link inside the
 * confirmation email itself (proof the promised email actually arrived).
 * The component still supports multiple stages via props. No dead-ends: if
 * codes can't be delivered, the user can continue unverified and the record
 * carries the flag = false for the coordinator to confirm by hand
 * (M Ease: a broken SMS route must never lose a patient).
 */
export default function ContactVerificationStep({ email = null, phone = null, onComplete }) {
  // Stages actually needed — an answer the user never gave can't be verified.
  const stages = [email && 'email', phone && 'phone'].filter(Boolean);
  const [stageIdx, setStageIdx] = useState(0);
  const [results, setResults] = useState({ email_verified: false, phone_verified: false });

  const stage = stages[stageIdx]; // 'email' | 'phone' | undefined (done)
  const target = stage === 'email' ? email : phone;

  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [sentOnce, setSentOnce] = useState(false);
  const [demoCode, setDemoCode] = useState(null);
  const [failCount, setFailCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const sentForStage = useRef(null);

  // Nothing to verify at all — complete immediately.
  useEffect(() => {
    if (stages.length === 0) onComplete({ email_verified: false, phone_verified: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = useCallback(async () => {
    if (!stage || sending) return;
    setSending(true);
    setError(null);
    setDemoCode(null);
    try {
      const payload = stage === 'email' ? { email: target } : { phone: target };
      const res = await base44.functions.invoke('sendOtp', payload);
      if (res?.data?.error) {
        setError(res.data.error);
        setFailCount((n) => n + 1);
      } else {
        setSentOnce(true);
        setCooldown(RESEND_COOLDOWN_S);
        if (res?.data?.demo_code) setDemoCode(res.data.demo_code); // mock mode (no SMS credits)
      }
    } catch (e) {
      // Throttled (429) or delivery failure — surface honestly, count toward the escape hatch.
      setError(e?.response?.data?.error || "We couldn't send the code. Please try again.");
      setFailCount((n) => n + 1);
    } finally {
      setSending(false);
    }
  }, [stage, target, sending]);

  // Auto-send when a stage becomes active (once per stage).
  useEffect(() => {
    if (!stage || sentForStage.current === stage) return;
    sentForStage.current = stage;
    setCode('');
    setSentOnce(false);
    setFailCount(0);
    sendCode();
  }, [stage, sendCode]);

  // Resend cooldown tick.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const advance = (nextResults) => {
    if (stageIdx + 1 < stages.length) {
      setStageIdx(stageIdx + 1);
      setError(null);
      setDemoCode(null);
    } else {
      onComplete(nextResults);
    }
  };

  const verify = async () => {
    if (checking || code.trim().length < 6) return;
    setChecking(true);
    setError(null);
    try {
      const payload = stage === 'email'
        ? { email: target, code: code.trim() }
        : { phone: target, code: code.trim() };
      const res = await base44.functions.invoke('verifyOtp', payload);
      if (res?.data?.verified) {
        const nextResults = { ...results, [`${stage}_verified`]: true };
        setResults(nextResults);
        advance(nextResults);
      } else {
        setError(res?.data?.error || 'Incorrect code. Please check and try again.');
        setFailCount((n) => n + 1);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Incorrect code. Please check and try again.');
      setFailCount((n) => n + 1);
    } finally {
      setChecking(false);
    }
  };

  // Escape hatch appears after repeated failures — never a dead-end.
  const showEscapeHatch = failCount >= 2;
  const skipStage = () => advance(results);

  if (!stage) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '32px 28px', textAlign: 'center' }}
    >
      <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>
        {stage === 'email' ? 'Verify your email' : 'Verify your phone'}
        {stages.length > 1 && <span style={{ color: 'rgba(255,255,255,0.35)' }}> · {stageIdx + 1} of {stages.length}</span>}
      </p>

      <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>
        {stageIdx === 0 ? 'One quick check before we submit' : 'And one more'}
      </h2>

      <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)' }}>
        We sent a 6-digit code to <strong style={{ color: '#fff' }}>{target}</strong> — this is how your
        care team will reach you, so it has to be right.
      </p>

      {demoCode && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: `${GOLD}12`, border: `1px solid ${GOLD}30`, marginBottom: 18 }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>DEMO MODE — NO SMS CREDITS</p>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '0.3em' }}>{demoCode}</p>
        </div>
      )}

      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(null); }}
        onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
        placeholder="······"
        aria-label="6-digit verification code"
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 14, textAlign: 'center',
          fontSize: 24, letterSpacing: '0.45em', fontWeight: 700,
          background: DARK, border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : BORDER}`, color: '#fff', outline: 'none',
        }}
      />

      {error && (
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#f87171' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={verify}
        disabled={checking || code.trim().length < 6}
        style={{
          width: '100%', marginTop: 16, padding: '14px 20px', borderRadius: 999, border: 'none',
          cursor: checking || code.trim().length < 6 ? 'not-allowed' : 'pointer',
          background: code.trim().length < 6 ? 'rgba(212,175,55,0.35)' : GOLD,
          color: DARK, fontSize: 14, fontWeight: 700,
        }}
      >
        {checking ? 'Checking…' : 'Verify'}
      </button>
      {code.trim().length < 6 && !checking && (
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
          Enter all 6 digits to continue
        </p>
      )}

      <button
        type="button"
        onClick={sendCode}
        disabled={sending || cooldown > 0}
        style={{
          marginTop: 14, background: 'none', border: 'none', fontSize: 13,
          color: cooldown > 0 ? 'rgba(255,255,255,0.3)' : GOLD,
          cursor: cooldown > 0 ? 'default' : 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        {sending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : sentOnce ? 'Resend code' : 'Send code'}
      </button>

      {showEscapeHatch && (
        <p style={{ margin: '16px 0 0', fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.45)' }}>
          Having trouble receiving codes?{' '}
          <button
            type="button"
            onClick={skipStage}
            style={{ background: 'none', border: 'none', padding: 0, color: GOLD, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Continue anyway
          </button>
          {' '}— your coordinator will confirm this {stage === 'email' ? 'email' : 'number'} with you directly.
        </p>
      )}
    </motion.div>
  );
}
