import { Link } from 'react-router-dom';
import { Maximize2, Globe } from 'lucide-react';

/**
 * ShowCardStrip — the sentences that survive a dead phone.
 *
 * These are generated at booking and cached on the device, so they still render
 * in a basement, in airplane mode, or when the traveller cannot speak. The
 * preview here is short; the full-screen page is the thing you hold up.
 */
export default function ShowCardStrip({ cards, cached }) {
  if (!cards?.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-serif text-[17px] text-foreground">
            <Globe className="h-4 w-4 text-[#B08D2E]" />
            Show this screen
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Full-screen sentences in {cards[0]?.language_name || 'the local language'}, saved on this
            device to work with no signal.
          </p>
        </div>
        <Link
          to="/trip-assistance/card"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11.5px] font-semibold text-foreground"
        >
          <Maximize2 className="h-3 w-3" />
          Open
        </Link>
      </div>

      <ul className="mt-3 space-y-1.5">
        {cards.slice(0, 3).map((c) => (
          <li key={c.situation} className="rounded-lg bg-secondary/60 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-[0.09em] text-muted-foreground">{c.label}</p>
            <p className="mt-0.5 line-clamp-1 text-[12.5px] text-foreground">{c.text_local}</p>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[10.5px] text-muted-foreground">
        {cached ? 'Saved for offline use on this device.' : 'Saving for offline use…'}
      </p>
    </section>
  );
}