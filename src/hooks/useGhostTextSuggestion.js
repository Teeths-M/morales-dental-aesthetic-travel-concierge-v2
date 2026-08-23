/**
 * useGhostTextSuggestion
 *
 * Powers inline "ghost text" auto-fill on M-Care's chat input (Gmail
 * Smart Compose style) — as the traveler types, a short predicted
 * continuation is fetched in the background and can be shown inline via
 * GhostTextOverlay, then accepted with Tab.
 *
 * Reuses the same smartMcareInput predict endpoint (and the same
 * debounce/dedup thresholds) that previously powered the tappable
 * prediction chips in SmartInputSuggestions.jsx, before those were
 * replaced by this inline UI. No new backend — same real, already-live
 * function, called the same way.
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { shouldQueryGhostSuggestion } from '@/lib/ghostTextSuggestion';

const DEBOUNCE_MS = 600;

function caretAtEnd(inputRef, text) {
  const el = inputRef?.current;
  if (!el) return false;
  const len = (text || '').length;
  return el.selectionStart === len && el.selectionEnd === len;
}

export function useGhostTextSuggestion({ text, disabled, inputRef }) {
  const [suggestion, setSuggestion] = useState(null);
  const lastQueryRef = useRef('');
  const timerRef = useRef(null);
  const requestTokenRef = useRef(0);

  // Clear immediately on any text change so a stale suggestion never
  // lingers on screen against newly-typed text while the next debounced
  // fetch is still in flight.
  useEffect(() => {
    setSuggestion(null);
  }, [text]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!shouldQueryGhostSuggestion({ text, caretAtEnd: caretAtEnd(inputRef, text), disabled })) {
      lastQueryRef.current = '';
      return;
    }

    const trimmed = text.trim();
    const myToken = ++requestTokenRef.current;

    timerRef.current = setTimeout(async () => {
      // Re-check the caret fresh at fetch time — the user may have
      // clicked elsewhere during the debounce window.
      if (!shouldQueryGhostSuggestion({ text, caretAtEnd: caretAtEnd(inputRef, text), disabled })) return;
      if (trimmed === lastQueryRef.current) return;
      lastQueryRef.current = trimmed;
      try {
        const res = await base44.functions.invoke('smartMcareInput', { text: trimmed, mode: 'predict' });
        const data = res?.data ?? res ?? {};
        const predictions = Array.isArray(data.predictions) ? data.predictions : [];
        // A slower, superseded request must never overwrite a newer one's result.
        if (myToken !== requestTokenRef.current) return;
        if (!predictions[0]) return;
        // Caret may have moved on since the request went out — don't show
        // a suggestion the visible cursor position no longer supports.
        if (!caretAtEnd(inputRef, text)) return;
        setSuggestion(predictions[0]);
      } catch (_) {
        // Best-effort — the input still works normally either way.
      }
    }, DEBOUNCE_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, disabled]);

  const clearSuggestion = () => setSuggestion(null);

  return { suggestion, clearSuggestion };
}
