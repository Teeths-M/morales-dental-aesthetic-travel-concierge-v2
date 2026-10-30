import { CheckCircle2, Clock, FileText, Phone, TriangleAlert } from 'lucide-react';
import { AGREEMENT_LABEL, ATTEMPT_LABEL, STATUS_LABEL, TIER_META } from '@/lib/tripAssistance';

const STATUS_TONE = {
  agreed: 'text-emerald-700',
  completed: 'text-emerald-700',
  not_agreed: 'text-rose-700',
  escalated: 'text-rose-700',
  in_progress: 'text-sky-700',
  written_sent: 'text-sky-700',
  approved: 'text-[#B08D2E]',
  pending_approval: 'text-[#B08D2E]',
};

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className="text-right text-[12px] font-medium text-foreground">{value}</span>
    </div>
  );
}

/**
 * RequestList — every request and attempt, with connection and agreement kept
 * apart. "Connected" means someone picked up. "Agreed" means they said yes to
 * this specific ask. A list that merged them would be the same lie as a booking
 * marked confirmed by a status flag.
 */
export default function RequestList({ requests }) {
  if (!requests?.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-[12.5px] text-muted-foreground">
        Nothing asked yet. Anything you request appears here with what was said and what came back.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {requests.map((r) => {
        const isWritten = r.mode === 'written';
        return (
          <article key={r.id} className="rounded-2xl border border-border bg-card p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">
                  {isWritten ? <FileText className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                  Tier {r.tier} · {TIER_META[r.tier]?.short} · {r.category_label}
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-foreground">{r.ask_text}</p>
              </div>
              <span className={`shrink-0 text-[11px] font-semibold ${STATUS_TONE[r.status] || 'text-muted-foreground'}`}>
                {STATUS_LABEL[r.status] || r.status}
              </span>
            </div>

            <div className="mt-2 divide-y divide-border border-t border-border pt-1">
              <Row label="Recipient" value={r.recipient_name || 'Care team'} />
              <Row label="Attempt" value={ATTEMPT_LABEL[r.attempt_status] || 'No attempt yet'} />
              <Row label="Agreed" value={AGREEMENT_LABEL[r.agreement] || 'Not agreed yet'} />
              {r.next_step && <Row label="Next" value={r.next_step} />}
            </div>

            {r.summary_text && (
              <p className="mt-2 rounded-lg bg-secondary/60 px-2.5 py-2 text-[11.5px] leading-relaxed text-foreground">
                {r.summary_text}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(r.created_date).toLocaleString()}
              </span>
              {r.retry_used && (
                <span className="inline-flex items-center gap-1">
                  <TriangleAlert className="h-3 w-3" /> one retry used
                </span>
              )}
              {r.agreed_at && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> agreed
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}