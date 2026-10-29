import { stateLabel } from '@/lib/minorReunificationClient';

const KIND_LABEL = {
  state_change: 'State change',
  duplicate_trigger: 'Duplicate trigger attached',
  safety_answer: 'Safety answer',
  location_captured: 'Location captured',
};

const ACTOR_LABEL = {
  system: 'System',
  human: 'Care team',
  minor: 'The minor',
  third_party: 'A third party',
};

function detailLine(event) {
  const evidence = event.evidence || {};

  if (event.event_kind === 'duplicate_trigger') {
    return `A second ${String(event.reason_code || 'trigger').replace(/_/g, ' ')} reached an already-open case — no new case was opened.`;
  }

  if (event.event_kind === 'safety_answer') {
    const answer = evidence.answer === 'yes' ? 'safe' : evidence.answer === 'no' ? 'not safe' : 'not understood';
    return `Answered ${answer} (${evidence.method === 'voice' ? 'spoken' : 'tapped'}).`;
  }

  if (event.event_kind === 'location_captured') {
    return evidence.source === 'device'
      ? 'A live device location was captured.'
      : 'The last known location was used.';
  }

  if (event.to_state === 'NOTIFIED' && Array.isArray(evidence.channels)) {
    return `${evidence.notification_rows ?? evidence.channels.length} notifications dispatched at once: ${evidence.channels.join(', ')}.`;
  }

  if (event.to_state === 'ABORTED') {
    return `Aborted — ${String(event.reason_code || 'no reason recorded').replace(/_/g, ' ')}.`;
  }

  if (evidence.note) return String(evidence.note);

  return null;
}

/**
 * CaseEventTimeline — the case's append-only history, in sequence order.
 *
 * Read-only by construction: there is no edit, no delete and no reorder, because
 * the underlying rows cannot be changed by anyone. What this renders is the
 * evidence trail a care team would be asked to defend afterwards.
 */
export default function CaseEventTimeline({ events = [] }) {
  if (!events.length) {
    return <p className="text-sm text-muted-foreground">No events recorded yet.</p>;
  }

  const ordered = [...events].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));

  return (
    <ol className="space-y-3">
      {ordered.map((event) => {
        const detail = detailLine(event);
        const isStateChange = event.event_kind === 'state_change';

        return (
          <li key={event.id} className="relative border-l-2 border-border pl-4">
            <span
              className={`absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ${
                isStateChange ? 'bg-primary' : 'bg-muted-foreground/50'
              }`}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-medium text-foreground">
                {isStateChange
                  ? `${event.from_state ? `${stateLabel(event.from_state)} → ` : ''}${stateLabel(event.to_state)}`
                  : KIND_LABEL[event.event_kind] || event.event_kind}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.at ? new Date(event.at).toLocaleString() : '—'}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ACTOR_LABEL[event.actor_type] || event.actor_type}
              {event.actor_id ? ` · ${event.actor_id}` : ''}
              {event.sequence ? ` · #${event.sequence}` : ''}
            </p>
            {detail && <p className="mt-1 text-xs leading-relaxed text-foreground/80">{detail}</p>}
          </li>
        );
      })}
    </ol>
  );
}