import { ChevronRight } from 'lucide-react';
import { categoriesForTier, TIER_META } from '@/lib/tripAssistance';

const TIER_STYLE = {
  1: 'border-border hover:border-[#D4AF37]/60',
  2: 'border-border hover:border-sky-400/60',
  3: 'border-rose-200 bg-rose-50/40 hover:border-rose-400/70',
};

function TierBlock({ tier, onSelect }) {
  const meta = TIER_META[tier];
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
          Tier {tier} · {meta.label}
        </h3>
        <p className="text-[11px] text-muted-foreground">{meta.note}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {categoriesForTier(tier).map((category) => (
          <button
            key={category.key}
            type="button"
            onClick={() => onSelect(category)}
            className={`group flex items-start justify-between gap-3 rounded-xl border bg-card px-3.5 py-3 text-left transition-colors ${TIER_STYLE[tier]}`}
          >
            <span>
              <span className="block text-[13.5px] font-semibold leading-snug text-foreground">
                {category.label}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                {category.blurb}
              </span>
            </span>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** The closed list of things assistance may be asked for. Nothing else exists. */
export default function TierCategoryGrid({ onSelect }) {
  return (
    <section aria-label="What do you need" className="space-y-5">
      <TierBlock tier={1} onSelect={onSelect} />
      <TierBlock tier={2} onSelect={onSelect} />
      <TierBlock tier={3} onSelect={onSelect} />
    </section>
  );
}