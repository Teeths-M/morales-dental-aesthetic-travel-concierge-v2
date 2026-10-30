import { useState } from 'react';
import { AlertTriangle, FileDown, Send, ShieldX, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RECIPIENTS = [
  { key: 'driver', label: 'Driver', channel: 'sms', note: 'Body of the message. A driver does not open links.' },
  { key: 'driver_whatsapp', label: 'Driver (WhatsApp)', channel: 'whatsapp', note: 'Body of the message, same content.' },
  { key: 'clinic', label: 'Clinic', channel: 'email', note: 'Body of the email, so it reads without a click.' },
  { key: 'care_team', label: 'Care team (internal)', channel: 'internal', note: 'Internal view — they are already inside.' },
  { key: 'hospital_handover', label: 'Hospital handover', channel: 'pdf', note: 'PDF, only when a person asks for it.' },
];

const OUTCOME_LABEL = {
  accepted: 'Accepted by the provider',
  delivered_confirmed: 'Delivery confirmed',
  failed: 'Did not land',
};

/**
 * PacketPanel — what a responder actually needs, already written.
 *
 * Deliberately separate from the disclosure consent list above it. That list
 * governs what may be SAID out loud. This is a document: assembled at booking,
 * versioned, and sent in one action to whoever is responding. Police never
 * receive it — it becomes what the care-team human reads down the line, address
 * first.
 */
export default function PacketPanel({ packet, deliveries, onSend, onRequestPdf, busy, error }) {
  const [selected, setSelected] = useState('driver');
  if (!packet) return null;

  const missing = (packet.fields || []).filter((f) => f.missing);
  const recipient = RECIPIENTS.find((r) => r.key === selected);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-serif text-[17px] text-foreground">
            <Package className="h-4 w-4 text-[#B08D2E]" />
            Emergency packet
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Written at booking, not composed at 3am. One action sends it to whoever is responding.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          v{packet.version} · {packet.status === 'ready' ? 'ready' : 'draft'}
        </span>
      </div>

      <ul className="mt-3 divide-y divide-border border-y border-border">
        {(packet.fields || []).map((f) => (
          <li key={f.key} className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="text-[11.5px] text-muted-foreground">{f.label}</span>
            <span
              className={`max-w-[60%] text-right text-[12px] ${
                f.missing ? 'text-amber-800' : 'font-medium text-foreground'
              }`}
            >
              {f.value || 'missing'}
            </span>
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {missing.length} item{missing.length > 1 ? 's' : ''} still missing. A packet can be sent as
          it stands, but a driver without the gate code stands at a gate.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {RECIPIENTS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setSelected(r.key)}
            className={`rounded-lg border px-2.5 py-2 text-left text-[11.5px] font-medium transition-colors ${
              selected === r.key
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-rose-200 bg-rose-50/50 px-2.5 py-2 text-[11px] text-rose-800">
          <ShieldX className="h-3 w-3 shrink-0" />
          Police never receive this packet.
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{recipient?.note}</p>

      {error && (
        <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => onSend(recipient.key, recipient.channel)}
          disabled={busy || recipient.channel === 'pdf'}
          className="h-10 flex-1 gap-2"
        >
          <Send className="h-3.5 w-3.5" />
          {busy ? 'Sending…' : `Send v${packet.version} to ${recipient.label}`}
        </Button>
        <Button variant="outline" onClick={onRequestPdf} disabled={busy} className="h-10 gap-2 sm:w-auto">
          <FileDown className="h-3.5 w-3.5" />
          PDF
        </Button>
      </div>

      {deliveries?.length > 0 && (
        <div className="mt-3">
          <p className="text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">What went out</p>
          <ul className="mt-1.5 space-y-1">
            {deliveries.map((d) => (
              <li key={d.id} className="flex items-baseline justify-between gap-2 rounded-lg bg-secondary/60 px-2.5 py-1.5">
                <span className="text-[11.5px] text-foreground">
                  v{d.packet_version} → {d.recipient_label || d.recipient_type} · {d.channel}
                </span>
                <span
                  className={`shrink-0 text-[10.5px] font-medium ${
                    d.outcome === 'failed' ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {OUTCOME_LABEL[d.outcome] || d.outcome}
                  {d.outcome === 'failed' ? ' · call instead' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}