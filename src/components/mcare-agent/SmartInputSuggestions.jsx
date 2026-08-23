// @ts-nocheck
// SmartInputSuggestions — spelling/grammar correction for the M-Safe chat
// input. Shows a "Did you mean: …?" correction bar when the user pauses
// typing and the text looks off. Debounced + cached so it doesn't fire on
// every keystroke or repeat the same query. Best-effort and fails silently
// — the input still works normally if the backend function is unavailable.
//
// Predictive completions used to live here too, as tappable chips — they
// were replaced by inline "ghost text" auto-fill (GhostTextOverlay.jsx +
// useGhostTextSuggestion.js), which shows the same smartMcareInput
// predictions inline after the cursor with Tab to accept, instead of a
// separate row of buttons doing the same job.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DEBOUNCE_MS = 600;

export default function SmartInputSuggestions({ text, disabled, onApplyCorrection }) {
  const [correction, setCorrection] = useState(null); // { text, changed }
  const lastLenRef = useRef(0);

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

  const handleAcceptCorrection = useCallback(() => {
    if (correction?.text) {
      onApplyCorrection?.(correction.text);
      setCorrection(null);
    }
  }, [correction, onApplyCorrection]);

  const handleDismissCorrection = useCallback(() => setCorrection(null), []);

  if (disabled || !correction?.text) return null;

  return (
    <div style={{ flexShrink: 0, padding: '0 14px 6px', background: '#fff' }}>
      {/* Correction bar — "Did you mean: …?" */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10,
        padding: '6px 10px',
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
    </div>
  );
}