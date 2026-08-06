// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * BookingIntentEntry — M-Care super-agent Phase 2A: "type what you want in
 * one sentence" entry point. Calls parseBookingIntent (never a clinical
 * fact, see that function's own header) and hands the procedures +
 * destination country to /intake as a URL seed, reusing the exact same
 * seedAnswers mechanism /intake already uses for cart/doctor-link hand-offs.
 * Every remaining question — medical history included — is still asked one
 * at a time by the unmodified question graph. This component never decides
 * anything; it only pre-fills non-safety fields before that graph runs.
 *
 * Phase 4A: parseBookingIntent now also extracts a destination CITY and a
 * rough travel-timing phrase (month + early/mid/late). Neither is seeded
 * into /intake — there's no city field in questionGraph.js today, and
 * inventing an exact date from "early November" to seed the real
 * `preferred_date` DATE step would both put words in the patient's mouth
 * and wrongly skip that question via flowEngine's "already answered" logic.
 * Both are shown back in the confirm bubble only, so the patient feels
 * heard, then the real question graph still asks preferred_date normally.
 *
 * `initialQuery` (M-Care super-agent Phase 3): when routeMCareMessage hands
 * off here from the main chat, it carries the message the user already
 * typed/said so this flow runs immediately instead of asking them to repeat
 * themselves.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PROCEDURE_OPTIONS } from '@/lib/intakeFlow/questionGraph';
import VoiceInputButton from './VoiceInputButton';
import OrbMoment from './OrbMoment';

function procedureLabel(value) {
  return PROCEDURE_OPTIONS.find((o) => o.value === value)?.label || value;
}

const GOLD = '#D4AF37';
const DARK = '#060B16';

function AssistantBubble({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ maxWidth: '88%', padding: '9px 13px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, lineHeight: 1.65, color: '#fff' }}>
        {children}
      </div>
    </div>
  );
}

const chipStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 12,
  color: 'rgba(255,255,255,0.85)',
  cursor: 'pointer',
  textAlign: 'left',
};

export default function BookingIntentEntry({ onExit, initialQuery }) {
  const [value, setValue] = useState(initialQuery || '');
  const [thinking, setThinking] = useState(false);
  // Once parseBookingIntent returns something, show it back for an explicit
  // yes/no before navigating — an LLM guess at "which procedure" should
  // never silently redirect, even though the destination step (/intake's
  // own review screen) still lets the patient correct it either way. Same
  // "show the match, let them confirm" discipline as this app's existing
  // aiProcedureFallback cards on /procedures — a guess is proposed, not applied.
  const [pending, setPending] = useState(null); // { procedures, destination_country, destination_city, travel_month, travel_period } | null
  const [voiceError, setVoiceError] = useState(null);

  // destination_city/travel_month/travel_period are display-only (see header
  // comment) — only procedures + destination_country are ever seeded.
  const goToIntake = (procedures, country) => {
    const params = new URLSearchParams();
    if (procedures?.length) params.set('procedures', procedures.join(','));
    if (country) params.set('country', country);
    const qs = params.toString();
    window.location.href = qs ? `/intake?${qs}` : '/intake';
  };

  const runQuery = async (query) => {
    if (!query || thinking) return;
    setThinking(true);
    try {
      const res = await base44.functions.invoke('parseBookingIntent', { query });
      const payload = res?.data ?? res ?? {};
      const procedures = Array.isArray(payload.procedures) ? payload.procedures : [];
      const hasAnything = procedures.length > 0 || payload.destination_country || payload.destination_city || payload.travel_month;
      if (hasAnything) {
        setPending({
          procedures,
          destination_country: payload.destination_country || null,
          destination_city: payload.destination_city || null,
          travel_month: payload.travel_month || null,
          travel_period: payload.travel_period || null,
        });
      } else {
        // Nothing recognized — nothing to confirm, just start the normal flow.
        goToIntake([], null);
      }
    } catch (_) {
      // parseBookingIntent unreachable — fall through to the normal,
      // unmodified question-by-question flow rather than blocking.
      goToIntake([], null);
    } finally {
      setThinking(false);
    }
  };

  // Auto-run once if M-Care's router already seeded this flow with the
  // message the user typed/said in the main chat — see the header comment.
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) runQuery(initialQuery.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    runQuery(value.trim());
  };

  if (pending) {
    const parts = [];
    if (pending.procedures?.length) parts.push(pending.procedures.map(procedureLabel).join(' + '));
    const place = [pending.destination_city, pending.destination_country].filter(Boolean).join(', ');
    if (place) parts.push(place);
    if (pending.travel_month) parts.push(`${pending.travel_period || ''} ${pending.travel_month}`.trim());
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <OrbMoment headline={`Got it — ${parts.join(', ')}.`} caption="Sound right?" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => goToIntake(pending.procedures, pending.destination_country)}
              style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: GOLD, color: DARK, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >Yes, continue</button>
            <button onClick={() => setPending(null)} style={{ ...chipStyle, textAlign: 'center' }}>Let me re-type it</button>
          </div>
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer', padding: 0 }}>← Back to M-Care</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AssistantBubble>
          Tell me what you're looking for, in one sentence — the procedure and where, if you know. I'll get you straight to matched doctors.
        </AssistantBubble>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={thinking}
              placeholder="e.g. dental veneers in Mexico"
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '10px 12px', fontSize: 12, color: '#fff', outline: 'none' }}
            />
            <VoiceInputButton
              disabled={thinking}
              onTranscript={(text) => { setValue(text); setVoiceError(null); }}
              onError={setVoiceError}
            />
          </div>
          {voiceError && <p style={{ margin: 0, fontSize: 11, color: '#f87171' }}>{voiceError}</p>}
          <button type="submit" disabled={!value.trim() || thinking}
            style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: value.trim() && !thinking ? GOLD : 'rgba(255,255,255,0.06)', color: value.trim() && !thinking ? DARK : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, cursor: value.trim() && !thinking ? 'pointer' : 'default' }}
          >{thinking ? 'One moment...' : 'Find my match'}</button>
        </form>

        <button onClick={() => goToIntake(null, null)} style={{ ...chipStyle, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          Skip — just ask me questions instead
        </button>
      </div>

      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer', padding: 0 }}>← Back to M-Care</button>
      </div>
    </div>
  );
}
