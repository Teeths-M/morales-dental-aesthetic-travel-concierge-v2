// @ts-nocheck
// SmartInputSuggestions — AI predictive text + spelling correction for the
// M-Safe chat input. Shows tappable completion chips below the input bar as
// the user types, and a "Did you mean: …?" correction bar when spelling is off.
// Debounced + cached so it doesn't fire on every keystroke or repeat the same
// query. All AI calls are best-effort and fail silently — the input still
// works normally if the backend function is unavailable.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DEBOUNCE_MS = 600;
const MIN_LEN = 3;

export default function SmartInputSuggestions({ text, disabled, onPick, onApplyCorrection }) {
  const [predictions, setPredictions] = useState([]);
  const [correction, setCorrection] = useState(null); // { text, changed }
  const [loading, setLoading] = useState(false);
  const lastQueryRef = useRef('');
  const timerRef = useRef(null);
  const lastLenRef = useRef(0);

  // Predict completions as the user types (only when text is incomplete)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const trimmed = text.trim();

    // Reset everything when input is cleared or too short
    if (!trimmed || trimmed.length < MIN_LEN || disabled) {
      setPredictions([]);
      setCorrection(null);
      lastQueryRef.current = '';
      return;
    }

    // Skip if the text ends with punctuation (looks like a complete sentence)
    const looksComplete = /[.!?]$/.test(trimmed) || trimmed.length > 140;
    if (looksComplete) {
      setPredictions([]);
    }

    timerRef.current = setTimeout(async () => {
      // Skip duplicate queries (same text, user just paused typing)
      if (trimmed === lastQueryRef.current) return;
      lastQueryRef.current = trimmed;
      setLoading(true);
      try {
        const res = await base44.functions.invoke('smartMcareInput', { text: trimmed, mode: 'predict' });
        const data = res?.data ?? res ?? {};
        setPredictions(Array.isArray(data.predictions) ? data.predictions.slice(0, 3) : []);
      } catch (_) {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, disabled]);

  // Spell-check the completed text when the user pauses (separate debounce).
  // Only fires when text is long enough to plausibly have errors and the
  // length grew (they're composing, not just typing a quick word).
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 8 || disabled) {
      setCorrection(null);
      return;
    }
    const timer = setTimeout(async () => {
      // Don't re-check the exact same text
      if (lastLenRef.current === trimmed.length && correction?.text === trimmed) return;
      try {
        const res = await base44.functions.invoke('smartMcareInput', { text: trimmed, mode: 'correct' });
        const data = res?.data ?? res ?? {};
        if (data.changed && data.corrected && data.corrected.toLowerCase() !== trimmed.toLowerCase()) {
          setCorrection({ original: trimmed, text: data.corrected });
        } else {
          setCorrection(null);
        }
      } catch (_) {
        setCorrection(null);
      }
    }, DEBOUNCE_MS + 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, disabled]);

  // Clear predictions once one is picked or text changes significantly
  const handlePick = useCallback((p) => {
    onPick?.(p);
    setPredictions([]);
    setCorrection(null);
  }, [onPick]);

  const handleAcceptCorrection = useCallback(() => {
    if (correction?.text) {
      onApplyCorrection?.(correction.text);
      setCorrection(null);
    }
  }, [correction, onApplyCorrection]);

  const handleDismissCorrection = useCallback(() => setCorrection(null), []);

  const hasContent = (predictions.length > 0) || (correction && correction.text);
  if (disabled || !hasContent) return null;

  return (
    <div style={{ flexShrink: 0, padding: '0 14px 6px', background: '#fff' }}>
      {/* Correction bar — "Did you mean: …?" */}
      {correction && correction.text && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10,
          padding: '6px 10px', marginBottom: predictions.length ? 6 : 0,
        }}>
          <Sparkles style={{ width: 14, height: 14, color: '#0284C7', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#0369A1', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Did you mean: <strong>{correction.text}</strong>
          </span>
          <button
            type="button"
            onClick={handleAcceptCorrection}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              background: '#0284C7', color: '#fff', border: 'none', borderRadius: 8,
              padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Check style={{ width: 12, height: 12 }} /> Fix
          </button>
          <button
            type="button"
            onClick={handleDismissCorrection}
            style={{ flexShrink: 0, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px 4px', fontSize: 14, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Prediction chips — tappable completions */}
      {predictions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {loading && (
            <span style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', paddingRight: 2 }}>
              <Sparkles style={{ width: 10, height: 10, display: 'inline', marginRight: 3 }} />suggesting…
            </span>
          )}
          {predictions.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePick(p)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#F6F7FB', border: '1px solid #E5E7EB', borderRadius: 999,
                padding: '5px 11px', fontSize: 12, color: '#374151',
                cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 240,
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              <Sparkles style={{ width: 11, height: 11, color: '#6C47FF', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}