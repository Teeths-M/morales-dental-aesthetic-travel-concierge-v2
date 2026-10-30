import { AlertTriangle, Check, FileText, User, MessagesSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ScriptReview — the last screen before anything leaves the device.
 *
 * Every line here is a fact, not a summary: who is being contacted, the exact
 * sentence that will be said, every personal detail disclosed, what is
 * forbidden, what answer is expected and the question that closes it. The
 * approval is for THIS script and THIS call only, and it is recorded verbatim.
 */
export default function ScriptReview({ script, onApprove, onBack, busy, error }) {
  if (!script) return null;

  const isWritten = script.mode === 'written';
  const ChannelIcon = isWritten ? FileText : Phone;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10.5px] uppercase tracking-[0.11em] text-muted-foreground">
          {isWritten ? 'Sent as a written request to' : 'Will be called'}
        </p>
        <div className="mt-1 flex items-start gap-2.5">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-[#B08D2E]" />
          <div>
            <p className="text-[15px] font-semibold leading-tight text-foreground">
              {script.recipient_name}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {script.recipient_contact} · {String(script.channel || '').replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10.5px] uppercase tracking-[0.11em] text-muted-foreground">
          The exact sentence
        </p>
        <p className="mt-2 font-serif text-[19px] leading-snug text-foreground">
          {script.ask_text}
        </p>
        {script.ask_language !== 'en' && (
          <p className="mt-2 border-t border-border pt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {script.ask_text_en}
          </p>
        )}
        {script.translation_missing && (
          <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-amber-800">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            No approved {String(script.ask_language).toUpperCase()} template exists for this
            category, so the sentence stays in English.
          </p>
        )}
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/60 p-2.5">
          <MessagesSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[12px] leading-relaxed text-foreground">
            <span className="text-muted-foreground">Closes with: </span>
            {script.closing_question}
          </p>
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          Expected answer: {script.expected_answer}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10.5px] uppercase tracking-[0.11em] text-muted-foreground">
          Personal details disclosed ({script.disclosures?.length || 0})
        </p>
        {script.disclosures?.length ? (
          <ul className="mt-2 divide-y divide-border">
            {script.disclosures.map((d) => (
              <li key={d.label} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="text-[12px] text-muted-foreground">{d.label}</span>
                <span className="text-right text-[12.5px] font-medium text-foreground">{d.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-[12.5px] text-foreground">
            Nothing about you — this script names no person.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
        <p className="text-[10.5px] uppercase tracking-[0.11em] text-rose-800">
          Never said on this call
        </p>
        <ul className="mt-2 space-y-1">
          {(script.prohibited || []).map((p) => (
            <li key={p} className="text-[12px] leading-relaxed text-rose-900">
              · {p}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button onClick={onApprove} disabled={busy} className="h-11 flex-1 gap-2">
          <Check className="h-4 w-4" />
          {busy ? 'Approving…' : isWritten ? 'Approve and send this' : 'Approve this call only'}
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={busy} className="h-11 flex-1">
          Change something
        </Button>
      </div>
      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <ChannelIcon className="mt-0.5 h-3 w-3 shrink-0" />
        Approval covers this one script. Nothing else is authorised, and a different call needs a
        fresh approval.
      </p>
    </div>
  );
}