import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMinorModuleEnabled } from '@/hooks/useMinorModuleEnabled';
import ModuleDisabledNotice from '@/components/minor/ModuleDisabledNotice';
import NotificationStateGrid from '@/components/minor/NotificationStateGrid';
import CaseEventTimeline from '@/components/minor/CaseEventTimeline';
import {
  stateLabel,
  triggerSourceLabel,
  safeAnswerLabel,
  formatAge,
  allowedNextStates,
  isTerminalState,
  TRANSITION_LABELS,
  ABORT_REASON_CODES,
  ABORT_REASON_LABELS,
} from '@/lib/minorReunificationClient';

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

/**
 * MinorCaseDetail — one case, its evidence trail, and the only controls that
 * can move it.
 *
 * The buttons are limited to the states the machine actually permits next,
 * which is a convenience, not a guard: advanceReunificationState re-validates
 * every move server-side. An abort cannot even be attempted without choosing a
 * reason first, because an unexplained abort is not a decision a care team can
 * defend later.
 */
export default function MinorCaseDetail() {
  const { id } = useParams();
  const { enabled, loading: flagLoading } = useMinorModuleEnabled();

  const [state, setState] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [pending, setPending] = useState('');
  const [note, setNote] = useState('');
  const [abortReason, setAbortReason] = useState('');
  const [showAbort, setShowAbort] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setActionError('');
    try {
      const res = await base44.functions.invoke('getReunificationCase', { case_id: id });
      const payload = res?.data ?? res;
      setData(payload);
      setState('ready');
    } catch (err) {
      setError(err?.response?.status === 403 ? 'You do not have access to this case.' : (err?.message || 'Could not load the case.'));
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    if (!flagLoading && enabled) load();
  }, [flagLoading, enabled, load]);

  const advance = async (to) => {
    if (to === 'ABORTED' && !abortReason) {
      setActionError('Choose a reason before aborting — an unexplained abort cannot be defended later.');
      return;
    }

    setPending(to);
    setActionError('');

    try {
      await base44.functions.invoke('advanceReunificationState', {
        case_id: id,
        to,
        reason_code: to === 'ABORTED' ? abortReason : null,
        note: note.trim() || null,
      });
      setNote('');
      setShowAbort(false);
      setAbortReason('');
      await load();
    } catch (err) {
      setActionError(err?.message || 'That move was refused.');
    } finally {
      setPending('');
    }
  };

  if (flagLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!enabled) return <ModuleDisabledNotice title="Minor reunification is off" />;

  if (state === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link to="/admin/minor-reunification" className="mt-4 inline-block text-sm font-semibold text-primary underline">
          Back to all cases
        </Link>
      </div>
    );
  }

  const c = data?.case || {};
  const terminal = isTerminalState(c.state);
  const nextStates = allowedNextStates(c.state).filter((s) => s !== 'ABORTED');
  const canAbort = allowedNextStates(c.state).includes('ABORTED');

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/admin/minor-reunification"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All cases
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {c.minor_display_name || 'Minor'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {triggerSourceLabel(c.trigger_source)} · opened {formatAge(c.opened_at)}
                {Number(c.trigger_count) > 1 ? ` · ${c.trigger_count} triggers` : ''}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                c.state === 'ABORTED'
                  ? 'bg-muted text-muted-foreground'
                  : terminal
                    ? 'bg-muted text-foreground'
                    : 'bg-primary/15 text-primary'
              }`}
            >
              {stateLabel(c.state)}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-3">
            <Field label="Are they safe?">
              <span className={c.safe_answer === 'no' ? 'font-semibold text-destructive' : ''}>
                {safeAnswerLabel(c.safe_answer, c.safe_answer_method)}
              </span>
            </Field>
            <Field label="Location">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {c.location_source === 'none' || c.location_latitude == null
                  ? 'Not known'
                  : c.location_source === 'last_known'
                    ? 'Last known position'
                    : 'Live device fix'}
              </span>
            </Field>
            <Field label="Case">
              <span className="font-mono text-xs">{c.id}</span>
            </Field>
          </div>

          {c.safe_answer_transcript && (
            <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs italic text-muted-foreground">
              Said aloud: “{c.safe_answer_transcript}”
            </p>
          )}

          {c.abort_reason_code && (
            <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Aborted — {ABORT_REASON_LABELS[c.abort_reason_code] || c.abort_reason_code}
              {c.abort_actor_id ? ` by ${c.abort_actor_id}` : ''}
            </p>
          )}
        </div>

        {/* ── Transitions ─────────────────────────────────────────────────── */}
        {!terminal && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Move this case</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Only the next legal step is offered. Every move is written to the case's permanent record.
            </p>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional note for the record"
              className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {nextStates.map((to) => (
                <button
                  key={to}
                  type="button"
                  disabled={!!pending}
                  onClick={() => advance(to)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {pending === to && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {TRANSITION_LABELS[`${c.state}->${to}`] || stateLabel(to)}
                </button>
              ))}

              {canAbort && (
                <button
                  type="button"
                  onClick={() => setShowAbort((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive"
                >
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  Abort case
                </button>
              )}
            </div>

            {showAbort && canAbort && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <label className="block text-xs font-semibold text-foreground" htmlFor="abort-reason">
                  Why is this case being aborted?
                </label>
                <select
                  id="abort-reason"
                  value={abortReason}
                  onChange={(e) => setAbortReason(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Choose a reason…</option>
                  {ABORT_REASON_CODES.map((code) => (
                    <option key={code} value={code}>{ABORT_REASON_LABELS[code] || code}</option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!!pending || !abortReason}
                  onClick={() => advance('ABORTED')}
                  className="mt-3 flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                >
                  {pending === 'ABORTED' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Abort with this reason
                </button>
              </div>
            )}

            {actionError && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{actionError}</p>
            )}
          </div>
        )}

        {/* ── Notifications ───────────────────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Who has actually been reached</h2>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Sent, delivered, acknowledged and answered are four different facts. A message sitting at
            “sent” means nobody has confirmed receiving it.
          </p>
          <NotificationStateGrid notifications={data?.notifications || []} />
        </div>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Case record</h2>
          <CaseEventTimeline events={data?.events || []} />
        </div>
      </div>
    </div>
  );
}