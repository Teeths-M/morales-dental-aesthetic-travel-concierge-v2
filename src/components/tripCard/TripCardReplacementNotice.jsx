import React from 'react';
import { Phone, Printer, Store } from 'lucide-react';

/**
 * TripCardReplacementNotice — what a replacement actually means today.
 *
 * Boardy's last point, and the one that decides whether this helps: a replacement
 * PDF is useless to someone already in a hotel in Margarita with nothing to print
 * on. So this says it plainly and hands over the one thing that works right now —
 * the digital card and the number — plus where to print locally.
 */
export default function TripCardReplacementNotice({ replacement, whatsappNumber }) {
  if (!replacement) return null;

  const { short_ref, local_number, card_url } = replacement;

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/5 p-3.5">
      <p className="text-[13px] font-semibold text-foreground">
        {replacement.action === 'stolen' ? 'Card revoked — replacement issued' : 'Replacement issued'}
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-foreground">
        {replacement.action === 'stolen'
          ? `Card ${replacement.replaced_ref || ''} no longer works. Your new card is ${short_ref}.`
          : `Your new card is ${short_ref}. Card ${replacement.replaced_ref || ''} still works if it turns up.`}
      </p>

      <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Use this today</p>
        <a
          href={`tel:${String(local_number || '').replace(/[^0-9+]/g, '')}`}
          className="mt-1 flex items-center gap-2 text-[17px] font-semibold tracking-tight text-foreground"
        >
          <Phone className="h-4 w-4 text-accent" /> {local_number}
        </a>
        {whatsappNumber && (
          <a
            href={`https://wa.me/${String(whatsappNumber).replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[11px] font-medium text-primary underline"
          >
            Message M-Care on WhatsApp
          </a>
        )}
        {card_url && (
          <p className="mt-1.5 break-all font-mono text-[10px] text-muted-foreground">{card_url}</p>
        )}
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <Printer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        Your hotel may not be able to print this, so don't count on the desk.
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        Any local print or copy shop can print it from your phone. Ask them for card size and print it in
        black and white if that is all they have.
      </p>
    </div>
  );
}