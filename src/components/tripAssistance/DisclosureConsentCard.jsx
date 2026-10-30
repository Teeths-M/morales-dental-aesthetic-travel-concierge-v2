import { ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DisclosureConsentCard — the standing list, approved while calm.
 *
 * This is the list a care-team human may read aloud when the traveller cannot
 * answer, and nothing else. It is approved here, at booking, precisely so that
 * nobody has to decide the boundaries of someone's privacy at 3am.
 */
export default function DisclosureConsentCard({ disclosure, onApprove, busy, error }) {
  if (!disclosure) return null;
  const fields = disclosure.fields || [];
  const approved = disclosure.approved === true;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-serif text-[17px] text-foreground">
            <ShieldCheck className="h-4 w-4 text-[#B08D2E]" />
            What may be said if you cannot answer
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            If you are unable to respond during an emergency, the care team may say exactly these
            things and nothing more. Anything beyond this list needs a reason recorded before it is
            spoken.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
            approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {approved ? 'Approved' : 'Not approved'}
        </span>
      </div>

      <ul className="mt-3 divide-y divide-border border-t border-border">
        {fields.map((f) => (
          <li key={f.key} className="flex items-baseline justify-between gap-3 py-2">
            <span className="text-[12px] text-muted-foreground">{f.label}</span>
            <span
              className={`max-w-[58%] text-right text-[12.5px] ${
                f.value ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}
            >
              {f.value || 'not on file'}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-2">
        <Lock className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Never disclosed: payment details, passport or identity documents, and your full medical
          record. Approving this list does not authorise anything outside it.
        </p>
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      {!approved && (
        <Button onClick={onApprove} disabled={busy} className="mt-3 h-10 w-full">
          {busy ? 'Saving…' : 'I approve this list'}
        </Button>
      )}
      {approved && disclosure.approved_at && (
        <p className="mt-2 text-[10.5px] text-muted-foreground">
          Approved {new Date(disclosure.approved_at).toLocaleString()} · version{' '}
          {disclosure.version || 1}
        </p>
      )}
    </section>
  );
}