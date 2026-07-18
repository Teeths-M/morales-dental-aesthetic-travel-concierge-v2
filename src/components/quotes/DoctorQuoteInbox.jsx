import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Loader2, Send, Inbox, CheckCircle2 } from 'lucide-react';

/**
 * DoctorQuoteInbox — pending pricing requests for the logged-in doctor.
 * The de-identified patient summary is read IN-PORTAL (never sent by email). The
 * doctor must confirm they reviewed the consultation before a quote can be submitted.
 */
export default function DoctorQuoteInbox({ doctor }) {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const highlightId = params.get('request');

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['doctor-pending-quotes', doctor?.email],
    enabled: !!doctor?.email,
    queryFn: async () => {
      const dq = await base44.entities.DoctorQuote
        .filter({ doctor_email: doctor.email }, '-created_date', 50).catch(() => []);
      const open = dq.filter((q) => q.status === 'pending' || q.status === 'needs_more_info');
      return Promise.all(open.map(async (q) => {
        const req = q.request_id ? await base44.entities.QuoteRequest.get(q.request_id).catch(() => null) : null;
        return { ...q, request: req };
      }));
    },
  });

  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>;
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-2xl">
        <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No pricing requests right now.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">When a patient requests a procedure you specialise in, it appears here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quotes.map((q) => (
        <RequestCard key={q.id} quote={q} highlight={q.request_id === highlightId}
          onDone={() => qc.invalidateQueries({ queryKey: ['doctor-pending-quotes'] })} />
      ))}
    </div>
  );
}

function RequestCard({ quote, highlight, onDone }) {
  const req = quote.request || {};
  const procedures = (req.procedures && req.procedures.length ? req.procedures : ['Procedure']);
  const [reviewed, setReviewed] = useState(false);
  const [prices, setPrices] = useState({});
  const [notes, setNotes] = useState('');

  // Best-effort: stamp viewed_at the first time the doctor opens the request.
  useEffect(() => {
    if (!quote.viewed_at) {
      base44.entities.DoctorQuote.update(quote.id, { viewed_at: new Date().toISOString() }).catch(() => {});
    }
  }, [quote.id, quote.viewed_at]);

  const total = procedures.reduce((s, p) => s + (Number(prices[p]) || 0), 0);

  const submit = useMutation({
    mutationFn: () => base44.functions.invoke('submitDoctorQuote', {
      quote_id: quote.id,
      reviewed_consultation: reviewed,
      total_usd: total,
      line_items: procedures.map((p) => ({ procedure: p, qty: 1, unit_price_usd: Number(prices[p]) || 0 })),
      doctor_notes: notes,
    }),
    onSuccess: onDone,
  });

  if (submit.isSuccess) {
    return (
      <div className="rounded-2xl p-5 border border-emerald-200 bg-emerald-50 flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-800">Quote submitted</p>
          <p className="text-sm text-emerald-700">The patient will be notified in their portal. Thank you.</p>
        </div>
      </div>
    );
  }

  const canSubmit = reviewed && total > 0 && !submit.isPending;

  return (
    <div className={`rounded-2xl p-5 border bg-card transition-all ${highlight ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">New pricing request</h3>
      </div>

      {/* De-identified summary (in-portal only) */}
      <div className="bg-secondary/40 border border-border rounded-lg p-3 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Patient request</p>
        <p className="text-sm text-foreground">{req.deidentified_summary || procedures.join(', ')}</p>
        <p className="text-[11px] text-muted-foreground/70 mt-2">
          The patient's full identity and contact details are shared only if they select you.
        </p>
      </div>

      {/* Per-procedure price inputs */}
      <div className="space-y-2 mb-4">
        {procedures.map((p) => (
          <div key={p} className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground flex-1">{p}</span>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">$</span>
              <Input type="number" min="0" placeholder="USD" className="w-28"
                value={prices[p] ?? ''} onChange={(e) => setPrices((s) => ({ ...s, [p]: e.target.value }))} />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-lg font-semibold text-primary">${total.toLocaleString()}</span>
        </div>
      </div>

      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes for the patient (optional) — kept in-portal."
        className="w-full p-2.5 text-sm border border-border rounded-lg bg-card resize-none mb-4" rows={2} />

      {/* Required attestation */}
      <label className="flex items-start gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5" />
        <span className="text-sm text-foreground">I have reviewed this patient's consultation and my quote reflects it.</span>
      </label>

      <Button onClick={() => submit.mutate()} disabled={!canSubmit} className="w-full">
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
        Submit fair, transparent quote
      </Button>
      {submit.isError && <p className="text-xs text-red-600 mt-2 text-center">Couldn't submit — please check the total and try again.</p>}
    </div>
  );
}
