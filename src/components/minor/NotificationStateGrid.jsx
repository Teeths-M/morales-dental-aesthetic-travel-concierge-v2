import { notificationStateCells, minorNotificationLabel } from '@/lib/minorReunificationClient';

const CHANNEL_LABEL = {
  sms: 'Text message',
  email: 'Email',
  call: 'Phone call',
  push: 'Push',
  app: 'In-app',
};

const ROLE_LABEL = {
  guardian: 'Guardian',
  group_leader: 'Group leader',
  care_team: 'Care team',
  authorised_adult: 'Authorised adult',
  minor: 'Minor',
};

/**
 * NotificationStateGrid — the four outcomes, shown as four separate facts.
 *
 * This is the visual half of the "never collapsed into 'alert sent'" rule. Each
 * column is a distinct state with its own tick or dash, derived from its own
 * timestamp, so a row sitting at SENT reads unmistakably as "we handed it to the
 * carrier and nobody has confirmed anything" — not as done.
 */
function StateCell({ label, reached, failed }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={
          failed
            ? 'flex h-5 w-5 items-center justify-center rounded-full bg-destructive/15 text-[11px] font-bold text-destructive'
            : reached
              ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary'
              : 'flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground'
        }
        aria-label={`${label}: ${failed ? 'failed' : reached ? 'yes' : 'not yet'}`}
      >
        {failed ? '!' : reached ? '✓' : '—'}
      </span>
    </div>
  );
}

export default function NotificationStateGrid({ notifications = [] }) {
  if (!notifications.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No notifications were created for this case.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((row) => {
        const cells = notificationStateCells(row);
        const failed = cells.failed;

        return (
          <div
            key={row.id}
            className="rounded-xl border border-border bg-card px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {ROLE_LABEL[row.recipient_role] || row.recipient_role}
                  {row.recipient_name ? ` — ${row.recipient_name}` : ''}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {CHANNEL_LABEL[row.channel] || row.channel}
                  {row.recipient_ref ? ` · ${row.recipient_ref}` : ''}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  failed
                    ? 'bg-destructive/10 text-destructive'
                    : row.status === 'ANSWERED'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {minorNotificationLabel(row.status)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1 border-t border-border pt-3">
              <StateCell label="Sent" reached={cells.sent} failed={failed} />
              <StateCell label="Delivered" reached={cells.delivered} failed={failed} />
              <StateCell label="Acked" reached={cells.acknowledged} failed={failed} />
              <StateCell label="Answered" reached={cells.answered} failed={failed} />
            </div>

            {failed && row.failure_reason && (
              <p className="mt-2 text-xs text-destructive">
                {row.failure_reason}
              </p>
            )}

            {row.answered_by && (
              <p className="mt-2 text-xs text-muted-foreground">
                Answered by {row.answered_by}
                {row.answer_note ? ` — ${row.answer_note}` : ''}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}