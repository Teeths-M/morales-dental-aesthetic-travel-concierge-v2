// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * AvailabilityIntentEntry — M-Care super-agent Phase 2C: a doctor says "free
 * Tuesday and Thursday for the next month" instead of clicking through
 * DoctorAvailabilityCalendar.jsx day by day.
 *
 * Two-step, parse-then-confirm-then-apply — same shape as
 * BookingIntentEntry (Phase 2A): parseAvailabilityIntent only extracts
 * structured days/weeks (no writes at all), the doctor sees a plain-English
 * summary and explicitly confirms, and only THEN does
 * applyDoctorAvailability — a fully deterministic function, no LLM — expand
 * that into real DoctorAvailability rows. Already-booked dates
 * (locked_case_id) are never touched; the confirmation after applying says
 * so honestly if any were skipped.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import VoiceInputButton from './VoiceInputButton';

const GOLD = '#D4AF37';
const DARK = '#060B16';

const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

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

function daysSentence(days) {
  const labels = days.map((d) => DAY_LABELS[d] || d);
  if (labels.length === 1) return labels[0] + 's';
  return labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1] + 's';
}

export default function AvailabilityIntentEntry({ onExit }) {
  const [value, setValue] = useState('');
  const [thinking, setThinking] = useState(false);
  const [parsed, setParsed] = useState(null); // { days, weeks } | null
  const [result, setResult] = useState(null); // { updated, skipped_locked } | null
  const [error, setError] = useState(null);

  const handleParse = async (e) => {
    e.preventDefault();
    const query = value.trim();
    if (!query || thinking) return;
    setThinking(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('parseAvailabilityIntent', { query });
      const payload = res?.data ?? res ?? {};
      if (payload.days?.length > 0) {
        setParsed({ days: payload.days, weeks: payload.weeks || 8 });
      } else {
        setError("I didn't catch specific days — try naming them directly, like \"Mondays and Fridays.\"");
      }
    } catch (_) {
      setError("Couldn't reach that just now — try again in a moment.");
    } finally {
      setThinking(false);
    }
  };

  const handleApply = async () => {
    setThinking(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('applyDoctorAvailability', { days: parsed.days, weeks: parsed.weeks });
      const payload = res?.data ?? res ?? {};
      setResult(payload);
    } catch (_) {
      setError("Couldn't update your calendar just now — try again, or use the calendar directly from your dashboard.");
    } finally {
      setThinking(false);
    }
  };

  if (result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AssistantBubble>
            Done — marked you available on {result.updated} date{result.updated === 1 ? '' : 's'}.
            {result.skipped_locked > 0 && ` ${result.skipped_locked} date${result.skipped_locked === 1 ? ' was' : 's were'} already booked, so I left ${result.skipped_locked === 1 ? 'it' : 'those'} alone.`}
          </AssistantBubble>
          <button onClick={onExit} style={{ ...chipStyle, textAlign: 'center', color: GOLD, borderColor: 'rgba(212,175,55,0.3)' }}>Done</button>
        </div>
      </div>
    );
  }

  if (parsed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AssistantBubble>
            I'll mark you available every {daysSentence(parsed.days)} for the next {parsed.weeks} week{parsed.weeks === 1 ? '' : 's'}. Sound right?
          </AssistantBubble>
          {error && <AssistantBubble>{error}</AssistantBubble>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={handleApply} disabled={thinking}
              style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: GOLD, color: DARK, fontSize: 12, fontWeight: 700, cursor: thinking ? 'default' : 'pointer' }}
            >{thinking ? 'Updating...' : 'Yes, update my calendar'}</button>
            <button onClick={() => { setParsed(null); setError(null); }} style={{ ...chipStyle, textAlign: 'center' }}>Let me re-type it</button>
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
          Tell me your availability in one sentence — e.g. "free Tuesday and Thursday for the next month."
        </AssistantBubble>

        {error && <AssistantBubble>{error}</AssistantBubble>}

        <form onSubmit={handleParse} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={thinking}
              placeholder="e.g. free Tuesday and Thursday for the next month"
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '10px 12px', fontSize: 12, color: '#fff', outline: 'none' }}
            />
            <VoiceInputButton disabled={thinking} onTranscript={setValue} onError={setError} />
          </div>
          <button type="submit" disabled={!value.trim() || thinking}
            style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: value.trim() && !thinking ? GOLD : 'rgba(255,255,255,0.06)', color: value.trim() && !thinking ? DARK : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, cursor: value.trim() && !thinking ? 'pointer' : 'default' }}
          >{thinking ? 'One moment...' : 'Update my availability'}</button>
        </form>
      </div>

      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer', padding: 0 }}>← Back to M-Care</button>
      </div>
    </div>
  );
}
