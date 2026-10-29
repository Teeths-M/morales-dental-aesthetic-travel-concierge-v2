import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Loader2, UserRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMinorModuleEnabled } from '@/hooks/useMinorModuleEnabled';
import ModuleDisabledNotice from '@/components/minor/ModuleDisabledNotice';
import {
  stateLabel,
  triggerSourceLabel,
  formatAge,
  safeAnswerLabel,
  isTerminalState,
} from '@/lib/minorReunificationClient';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'TRIGGERED', label: 'Triggered' },
  { key: 'LOCATING', label: 'Locating' },
  { key: 'NOTIFIED', label: 'Notified' },
  { key: 'REUNITING', label: 'Reuniting' },
  { key: 'HANDED_OVER', label: 'Handed over' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'ABORTED', label: 'Aborted' },
];

function StateBadge({ state }) {
  const open = !isTerminalState(state);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        state === 'ABORTED'
          ? 'bg-muted text-muted-foreground'
          : open
            ? 'bg-primary/15 text-primary'
            : 'bg-muted text-foreground'
      }`}
    >
      {stateLabel(state)}
    </span>
  );
}

/**
 * MinorReunificationConsole — the care team's list of open and past cases.
 *
 * Read-only apart from opening a case. Every state change happens on the case
 * page, where it can be made deliberately with a reason. A list view that could
 * silently move cases would be the fastest possible way to lose one.
 *
 * The whole page is behind the module's feature flag and shows a plain
 * "not enabled" notice when it is off, rather than an empty table that looks
 * like a loading failure.
 */
export default function MinorReunificationConsole() {
  const { enabled, loading: flagLoading } = useMinorModuleEnabled();
  const [state, setState] = useState('loading');
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const res = await base44.functions.invoke('getReunificationCase', filter ? { state: filter } : {});
      const data = res?.data ?? res;
      setCases(Array.isArray(data?.cases) ? data.cases : []);
      setState('ready');
    } catch (err) {
      setError(err?.message || 'Could not load cases.');
      setState('error');
    }
  }, [filter]);

  useEffect(() => {
    if (!flagLoading && enabled) load();
  }, [flagLoading, enabled, load]);

  if (flagLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!enabled) return <ModuleDisabledNotice title="Minor reunification is off" />;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Minor reunification</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every case below is driven by a fixed state machine. Nothing here is opened or closed by automation.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {state === 'loading' && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          </div>
        )}

        {state === 'error' && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {state === 'ready' && cases.length === 0 && (
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">No cases{filter ? ' in this state' : ''}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A case appears here the moment one of the four triggers fires.
            </p>
          </div>
        )}

        {state === 'ready' && cases.length > 0 && (
          <ul className="space-y-2">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/admin/minor-reunification/${c.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {c.minor_display_name || 'Minor'}
                      </p>
                      <StateBadge state={c.state} />
                      {Number(c.trigger_count) > 1 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {c.trigger_count} triggers
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {triggerSourceLabel(c.trigger_source)} · {formatAge(c.opened_at)} ·{' '}
                      {safeAnswerLabel(c.safe_answer, c.safe_answer_method)}
                    </p>
                  </div>

                  <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:block">
                    {String(c.id).slice(-6)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}