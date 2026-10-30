import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ModuleOffNote from '@/components/tripAssistance/ModuleOffNote';

const CACHE_PREFIX = 'mcare_show_card_';

/**
 * TripShowCard — the screen you hold up when you cannot speak.
 *
 * Nothing here needs the network: the sentences are generated at booking and
 * cached on the device, because the moment this is needed is the moment the
 * signal is worst. Deliberately spare — one large sentence, the local number,
 * an English toggle and a way back. A second button on this screen is a second
 * decision for a frightened person to make.
 */
export default function TripShowCard() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);

  useEffect(() => {
    let cacheKey = `${CACHE_PREFIX}pending`;

    const readCache = () => {
      try {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key?.startsWith(CACHE_PREFIX)) {
            const parsed = JSON.parse(localStorage.getItem(key));
            if (parsed?.cards?.length) return parsed;
          }
        }
      } catch (_) {}
      return null;
    };

    const cached = readCache();
    if (cached) {
      setPayload(cached);
      setLoading(false);
    }

    (async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        if (!user) {
          setLoading(false);
          return;
        }
        cacheKey = `${CACHE_PREFIX}${user.email}`;
        const res = await base44.functions.invoke('getTripAssistance', {});
        const data = res?.data || res;
        if (data?.enabled && data?.cards?.length) {
          const slim = {
            language_name: data.cards[0]?.language_name,
            local_number: data.trip?.local_number,
            local_number_label: data.trip?.local_number_label,
            cards: data.cards,
          };
          setPayload(slim);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(slim));
          } catch (_) {}
        }
      } catch (_) {
        // Offline is the expected case here — the cache above is the product.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const card = useMemo(() => payload?.cards?.[index] || null, [payload, index]);

  if (loading && !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060B16] text-[13px] text-white/60">
        Loading…
      </div>
    );
  }

  if (!payload?.cards?.length) return <ModuleOffNote />;

  const text = showEnglish ? card.text_en : card.text_local;

  return (
    <div className="flex min-h-screen flex-col bg-[#060B16] text-white">
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/trip-assistance'))}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-medium text-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <button
          type="button"
          onClick={() => setShowEnglish((v) => !v)}
          className="rounded-full border border-[#D4AF37]/60 px-3 py-1.5 text-[12px] font-semibold text-[#D4AF37]"
        >
          {showEnglish ? payload.cards[0]?.language_code?.toUpperCase() || 'LOCAL' : 'EN'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setIndex((i) => (i + 1) % payload.cards.length)}
        className="flex flex-1 flex-col justify-center px-5 text-left"
      >
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">{card.label}</p>
        <p className="mt-4 text-[30px] font-semibold leading-[1.25] tracking-tight sm:text-[38px]">
          {text}
        </p>
        {showEnglish && card.text_local !== text && (
          <p className="mt-4 text-[15px] leading-snug text-white/50">{card.text_local}</p>
        )}
      </button>

      <div className="px-4 pb-8">
        <div className="mb-4 flex items-center justify-center gap-1.5">
          {payload.cards.map((c, i) => (
            <span
              key={c.situation}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-[#D4AF37]' : 'w-1.5 bg-white/25'
              }`}
            />
          ))}
        </div>

        <a
          href={`tel:${String(payload.local_number || '').replace(/\s/g, '')}`}
          className="block rounded-2xl bg-[#D4AF37] px-4 py-4 text-center"
        >
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#060B16]/70">
            {payload.local_number_label || 'M-Care, 24 hours'}
          </span>
          <span className="mt-0.5 block text-[26px] font-bold tracking-tight text-[#060B16]">
            {payload.local_number || '—'}
          </span>
        </a>

        <p className="mt-3 text-center text-[10.5px] leading-relaxed text-white/40">
          Tap the sentence for the next one. Works without signal.
        </p>
      </div>
    </div>
  );
}