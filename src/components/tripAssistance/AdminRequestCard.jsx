import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ATTEMPTS = ['not_started', 'attempted', 'connected', 'no_answer', 'wrong_department', 'dropped'];
const AGREEMENTS = ['unknown', 'agreed', 'partial', 'refused'];

const selectClass =
  'w-full rounded-lg border border-input bg-background px-2.5 py-2 text-[12.5px] text-foreground outline-none focus:border-[#D4AF37]';

/**
 * AdminRequestCard — the care team's own account of a request.
 *
 * Two things a human can do here: record what actually happened, and authorise
 * an exception to the standing disclosure list. The exception form asks for the
 * reason before the button is pressable, because the record has to exist before
 * the words are said.
 */
export default function AdminRequestCard({ request, onSaved, userEmail }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(request.attempt_status || 'not_started');
  const [agreement, setAgreement] = useState(request.agreement || 'unknown');
  const [notes, setNotes] = useState(request.outcome_notes || '');
  const [nextStep, setNextStep] = useState(request.next_step || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exception, setException] = useState({ field_label: '', reason: '', disclosed_to: '' });

  const save = async () => {
    setError('');
    setBusy('save');
    try {
      const res = await base44.functions.invoke('recordTripAssistanceOutcome', {
        request_id: request.id,
        attempt_status: attempt,
        agreement,
        outcome_notes: notes,
        next_step: nextStep,
      });
      const out = res?.data || res;
      if (out?.error) throw new Error(out.error);
      await onSaved();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not save that.');
    } finally {
      setBusy('');
    }
  };

  const recordException = async () => {
    setError('');
    setBusy('exception');
    try {
      const res = await base44.functions.invoke('recordTripDisclosureException', {
        trip_id: request.trip_id,
        incident_id: request.incident_id || request.case_id || request.trip_id,
        request_id: request.id,
        patient_email: request.patient_email,
        field_label: exception.field_label,
        reason: exception.reason,
        disclosed_to: exception.disclosed_to,
        authorized_by: userEmail,
      });
      const out = res?.data || res;
      if (out?.error) throw new Error(out.error);
      setException({ field_label: '', reason: '', disclosed_to: '' });
      setExceptionOpen(false);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not record that.');
    } finally {
      setBusy('');
    }
  };

  const urgent = request.tier === 3;

  return (
    <article
      className={`rounded-2xl border bg-card p-3.5 ${
        urgent ? 'border-rose-300' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">
            Tier {request.tier} · {request.category_label} · {request.mode.replace(/_/g, ' ')}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-foreground">{request.ask_text}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {request.patient_email} · {request.recipient_name} · {request.status.replace(/_/g, ' ')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-border p-1.5"
          aria-label="Record outcome"
        >
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {request.summary_text && (
        <p className="mt-2 rounded-lg bg-secondary/60 px-2.5 py-2 text-[11.5px] leading-relaxed text-foreground">
          {request.summary_text}
        </p>
      )}

      {open && (
        <div className="mt-3 space-y-2.5 border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                Attempt
              </span>
              <select value={attempt} onChange={(e) => setAttempt(e.target.value)} className={selectClass}>
                {ATTEMPTS.map((a) => (
                  <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                Agreed
              </span>
              <select value={agreement} onChange={(e) => setAgreement(e.target.value)} className={selectClass}>
                {AGREEMENTS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              What was said
            </span>
            <textarea
              value={notes}
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
              className={`${selectClass} resize-none`}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              Next step
            </span>
            <input value={nextStep} onChange={(e) => setNextStep(e.target.value)} className={selectClass} />
          </label>

          <Button onClick={save} disabled={busy === 'save'} className="h-9 w-full">
            {busy === 'save' ? 'Saving…' : 'Save outcome'}
          </Button>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            One retry is allowed on a failed attempt. After that this is marked escalated and a
            human owns it — the record never quietly retries.
          </p>

          {!exceptionOpen ? (
            <button
              type="button"
              onClick={() => setExceptionOpen(true)}
              className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-rose-200 bg-rose-50/50 px-2.5 py-2 text-left text-[11.5px] text-rose-900"
            >
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Disclose something outside the standing list
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/50 p-2.5">
              <p className="text-[10.5px] leading-relaxed text-rose-900">
                Recorded before it is spoken. Without a reason and your name, nothing may be said
                beyond the traveller's approved list.
              </p>
              <input
                placeholder="What is being disclosed"
                value={exception.field_label}
                onChange={(e) => setException({ ...exception, field_label: e.target.value })}
                className={selectClass}
              />
              <input
                placeholder="Who is being told"
                value={exception.disclosed_to}
                onChange={(e) => setException({ ...exception, disclosed_to: e.target.value })}
                className={selectClass}
              />
              <textarea
                placeholder="Why it cannot wait for the traveller's own approval"
                rows={2}
                value={exception.reason}
                onChange={(e) => setException({ ...exception, reason: e.target.value })}
                className={`${selectClass} resize-none`}
              />
              <Button
                onClick={recordException}
                disabled={busy === 'exception' || !exception.reason.trim() || !exception.field_label.trim()}
                className="h-9 w-full"
              >
                {busy === 'exception' ? 'Recording…' : 'Record authorisation'}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-[11.5px] text-destructive">
          {error}
        </p>
      )}
    </article>
  );
}