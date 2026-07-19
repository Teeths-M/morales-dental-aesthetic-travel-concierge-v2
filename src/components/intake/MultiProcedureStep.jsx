import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { CALM } from '@/lib/brandTokens';

const TEAL = CALM.action;
const BORDER = CALM.border;

// Picks made here are React state, so they die the moment the patient leaves
// to look at the full procedure page — which is exactly the trip we now invite
// them to take. Persisting them means browsing costs nothing: they come back
// to their own selections, not to an empty list. The intake's other answers
// were already safe (guest draft + ConversationSession + localStorage cart);
// this step was the one place that would have made someone start over.
const PENDING_KEY = 'morales_intake_pending_procedures';

/** Set while the patient is away browsing, so /procedures can greet them
 *  as someone mid-consultation rather than someone starting fresh. */
export const BROWSING_KEY = 'morales_intake_browsing';

function loadPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/**
 * Lets a patient select more than one procedure in a single beat — the
 * precondition for Morales's core "wow moment": narrating that it's
 * evaluating whether the combination is safe (ProcedureEvaluationStep,
 * reusing the same procedureCompatibility engine every other cart-driven
 * flow in the app relies on) rather than silently accepting whatever was
 * picked.
 */
export default function MultiProcedureStep({ options, onContinue }) {
  const navigate = useNavigate();
  // Restored by value against the live options list, so a renamed or retired
  // procedure drops out quietly instead of resurfacing as a stale chip.
  const [selected, setSelected] = useState(() => {
    const saved = loadPending();
    return options.filter((o) => saved.includes(o.value));
  });

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(selected.map((s) => s.value)));
    } catch { /* private mode — worst case the patient re-picks, nothing breaks */ }
  }, [selected]);

  const toggle = (opt) => {
    setSelected((prev) =>
      prev.some((s) => s.value === opt.value) ? prev.filter((s) => s.value !== opt.value) : [...prev, opt]
    );
  };

  const browseAll = () => {
    try { localStorage.setItem(BROWSING_KEY, '1'); } catch { /* non-essential */ }
    navigate('/procedures');
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    const labels = selected.map((s) => s.label).join(', ');
    // The step is answered — clear the scratch copy so a later visit starts
    // from the real answers, not from a stale draft of them.
    try {
      localStorage.removeItem(PENDING_KEY);
      localStorage.removeItem(BROWSING_KEY);
    } catch { /* non-essential */ }
    onContinue({
      rawText: labels,
      extracted: {
        procedure_interest: selected[0].value,
        selected_procedures: selected.map((s) => s.value),
      },
    });
  };

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {selected.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggle(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: CALM.actionSoft,
                border: `1px solid ${TEAL}`,
                color: TEAL,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s.label} <span style={{ opacity: 0.7 }}>×</span>
            </button>
          ))}
        </div>
      )}

      {/* Choosing surgery from a cramped scrolling list of names is the wrong
          way to make this decision — a name alone doesn't tell anyone what a
          procedure involves, what it costs, or how long they'd be recovering.
          The full page has photographs, detail and pricing. Nothing is lost by
          going: the picks above are persisted and the rest of the conversation
          already survives navigation. */}
      <button
        type="button"
        onClick={browseAll}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textAlign: 'left',
          padding: '13px 16px',
          marginBottom: 14,
          borderRadius: 14,
          background: CALM.actionSoft,
          border: `1px solid ${TEAL}`,
          color: TEAL,
          cursor: 'pointer',
        }}
      >
        <LayoutGrid className="w-4 h-4" style={{ flexShrink: 0 }} aria-hidden="true" />
        <span>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
            Browse all procedures
          </span>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 500, opacity: 0.85 }}>
            See photos, details and pricing — you&rsquo;ll come back here with your choices
          </span>
        </span>
      </button>

      <p style={{ margin: '0 0 10px', fontSize: 12, color: CALM.textFaint }}>
        Or pick from the list:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
        {options.map((opt) => {
          const isSelected = selected.some((s) => s.value === opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt)}
              style={{
                textAlign: 'left',
                padding: '13px 16px',
                borderRadius: 14,
                background: isSelected ? CALM.actionSoft : CALM.surfaceSoft,
                border: `1px solid ${isSelected ? TEAL : BORDER}`,
                color: CALM.text,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {opt.label}
              {isSelected && <span style={{ color: TEAL, fontWeight: 700 }}>✓</span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={selected.length === 0}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '13px 20px',
          borderRadius: 999,
          cursor: selected.length === 0 ? 'default' : 'pointer',
          background: selected.length === 0 ? 'rgba(14,138,125,0.35)' : TEAL,
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {selected.length > 1 ? `Continue with ${selected.length} procedures` : 'Continue'}
      </button>
    </div>
  );
}
