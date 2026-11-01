import React from 'react';
import { Clock } from 'lucide-react';
import MSafeCard from '@/components/mobile/MSafeCard';
import MSafeText from '@/components/mobile/MSafeText';
import { clockTime, countdownLabel, recipientStateCopy, toneText } from '@/lib/emergencyIncidentUi';

/**
 * RecipientStatusList — one line per recipient per channel.
 *
 * Rows are never collapsed into a single "notified" badge. The whole point of
 * the per-recipient record is that "we emailed the guardian" and "the guardian
 * knows" are different states, and a screen that merges them will eventually
 * tell a frightened person that help is coming when nobody picked up.
 */
export default function RecipientStatusList({ recipients = [], nowMs }) {
  if (recipients.length === 0) {
    return (
      <MSafeCard>
        <MSafeText variant="eyebrow" as="p">Who has been contacted</MSafeText>
        <p className="mt-2 text-[12.5px] text-msafe-muted">No recipients recorded yet.</p>
      </MSafeCard>
    );
  }

  return (
    <MSafeCard>
      <MSafeText variant="eyebrow" as="p">Who has been contacted</MSafeText>
      <ul className="mt-3 divide-y divide-msafe-border">
        {recipients.map((r) => {
          const state = recipientStateCopy(r.state);
          const ackLabel = r.state === 'ACKNOWLEDGED' || r.state === 'ACCEPTED' || r.state === 'EN_ROUTE' || r.state === 'ARRIVED'
            ? null
            : countdownLabel(r.acknowledgement_deadline_at, nowMs);

          return (
            <li key={r.id || `${r.recipient_role}-${r.channel}`} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-msafe-ink">
                    {r.recipient_name || r.recipient_role}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-msafe-muted">
                    {String(r.channel || '').replace(/_/g, ' ')} · {String(r.recipient_role || '').replace(/_/g, ' ')}
                  </p>
                </div>
                <span className={`shrink-0 text-right text-[11.5px] font-semibold ${toneText(state.tone)}`}>
                  {state.label}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-msafe-muted">
                {clockTime(r.sent_at || r.queued_at) && <span>queued {clockTime(r.sent_at || r.queued_at)}</span>}
                {clockTime(r.acknowledged_at) && <span>acknowledged {clockTime(r.acknowledged_at)}</span>}
                {ackLabel && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {ackLabel}
                  </span>
                )}
                {r.escalated_at && <span className="text-msafe-warn">escalated {clockTime(r.escalated_at)}</span>}
              </div>

              {r.failure_reason && (
                <p className="mt-1 text-[11px] text-msafe-critical">{r.failure_reason}</p>
              )}
              {r.translation_state === 'human_required' && (
                <p className="mt-1 text-[11px] text-msafe-warn">
                  No approved template for this language — routed to the human team.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 border-t border-msafe-border pt-3 text-[10.5px] leading-relaxed text-msafe-muted">
        Sent means the provider accepted the message. Delivered means the device received it.
        Neither means a person read it — only Acknowledged does.
      </p>
    </MSafeCard>
  );
}