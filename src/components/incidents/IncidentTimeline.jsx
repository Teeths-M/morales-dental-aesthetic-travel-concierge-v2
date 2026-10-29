import React from 'react';
import { format } from 'date-fns';

/**
 * IncidentTimeline — one merged, timestamped record of everything that
 * happened on an incident: every notification, every offer, every acceptance
 * and every escalation. Read-only by construction; it renders data it is given
 * and performs no writes.
 */
const KIND_STYLE = {
  notification: 'bg-slate-400',
  offer: 'bg-amber-500',
  audit: 'bg-emerald-500',
};

export default function IncidentTimeline({ timeline = [] }) {
  if (!timeline.length) {
    return <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-3 border-l border-border pl-5">
      {timeline.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="relative">
          <span className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ${KIND_STYLE[entry.kind] || 'bg-slate-300'}`} />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium text-foreground">{entry.label}</span>
            <span className="text-xs text-muted-foreground">{entry.status}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {entry.at ? format(new Date(entry.at), 'dd MMM yyyy, HH:mm:ss') : 'no timestamp'}
            {entry.detail ? ` · ${entry.detail}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}