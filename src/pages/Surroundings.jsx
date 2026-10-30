import React, { useState } from 'react';
import { Radar, RefreshCw, Loader2, Navigation, Info, ShieldCheck } from 'lucide-react';
import { BackButton } from '@/components/nav/BackButton';
import { useSurroundings } from '@/hooks/useSurroundings';
import AlertCard from '@/components/surroundings/AlertCard';
import AroundYouControl from '@/components/surroundings/AroundYouControl';
import SavedPlacesPanel from '@/components/surroundings/SavedPlacesPanel';

/**
 * Surroundings — "Around You".
 *
 * The whole screen is built to avoid two lies: the reassurance lie ("nothing
 * nearby, you're fine") and the drama lie ("DANGER IN YOUR AREA"). What it can
 * honestly say is: here is what is on record from a named source, here is how
 * far it is, here is when it was last checked, and here is whether it applies to
 * you at all. When there is nothing on record it says exactly that.
 */
const CARD = { background: '#0C1A1D', border: '1px solid rgba(212,175,55,0.12)' };

export default function Surroundings() {
  const s = useSurroundings();
  const [locMsg, setLocMsg] = useState('');

  const meta = s.meta;
  const locationSource = meta?.location_source || 'none';

  const handleUseLocation = async () => {
    setLocMsg('');
    const result = await s.useMyLocation();
    if (!result?.success) {
      setLocMsg('Your device did not share a precise location. M-Care can still use the places you saved.');
      return null;
    }
    return result.location;
  };

  const handleRefresh = async () => {
    setLocMsg('');
    await s.reload();
  };

  const locationLine = () => {
    if (locationSource === 'gps') {
      const age = meta?.location_age_minutes;
      return `Using your exact location${age != null ? ` · last updated ${age < 1 ? 'just now' : `${age} min ago`}` : ''}`;
    }
    if (locationSource === 'approximate') {
      return 'Using an approximate location from your network — it can be several kilometres out.';
    }
    return 'M-Care does not have your location yet. Add it to check what is happening near you.';
  };

  return (
    <div className="min-h-screen" style={{ background: '#060B16' }}>
      <div className="max-w-2xl mx-auto px-4 py-5 pb-16">
        <div className="flex items-center gap-2 mb-4">
          <BackButton />
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4" style={{ color: '#D4AF37' }} />
            <h1 className="text-lg font-semibold text-white tracking-tight">Around You</h1>
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
          What M-Care has on record about the area you are in, and whether it affects you or a place you saved.
        </p>

        {/* ── Location ── */}
        <div className="rounded-2xl px-4 py-3.5 mb-4" style={CARD}>
          <div className="flex items-start gap-2.5">
            <Navigation className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: locationSource === 'gps' ? '#6EE7B7' : 'rgba(255,255,255,0.35)' }} />
            <p className="text-[11.5px] leading-snug flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {locationLine()}
            </p>
          </div>

          {locMsg ? (
            <p className="text-[10.5px] leading-snug mt-2" style={{ color: '#FBBF24' }}>{locMsg}</p>
          ) : null}

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={s.locating}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11.5px] font-semibold disabled:opacity-50"
              style={{ background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
            >
              {s.locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
              {s.locating ? 'Locating…' : 'Use my exact location'}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={s.loading}
              className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-semibold disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${s.loading ? 'animate-spin' : ''}`} />
              Check now
            </button>
          </div>
        </div>

        {/* ── Feed ── */}
        {s.error ? (
          <div className="rounded-2xl px-4 py-4 mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="text-[12.5px] leading-snug" style={{ color: '#FCA5A5' }}>{s.error}</p>
            <button type="button" onClick={handleRefresh} className="text-[11.5px] font-bold mt-2" style={{ color: '#D4AF37' }}>
              Try again
            </button>
          </div>
        ) : s.loading && !s.data ? (
          <div className="rounded-2xl px-4 py-8 flex flex-col items-center gap-2.5 mb-4" style={CARD}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#D4AF37' }} />
            <p className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Checking what is on record near you…</p>
          </div>
        ) : s.feed.length === 0 ? (
          <div className="rounded-2xl px-4 py-5 mb-4" style={CARD}>
            <p className="text-sm font-semibold text-white">Nothing is on record that applies to you.</p>
            <p className="text-[11.5px] leading-relaxed mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {meta?.coverage_note || 'Only advisories recorded from a named source appear here.'}
            </p>
            {meta?.country ? (
              <p className="text-[10.5px] mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Destination on file: {meta.country}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {s.feed.map((item) => (
              <AlertCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* ── Controls ── */}
        <div className="space-y-3">
          <AroundYouControl settings={s.settings} busy={s.busy} onSave={s.saveSettings} />
          <SavedPlacesPanel
            places={s.places}
            onAdd={s.addPlace}
            onDelete={s.deletePlace}
            onUseLocation={handleUseLocation}
          />
        </div>

        {/* ── Honest limits ── */}
        <div className="rounded-2xl px-4 py-4 mt-4" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <p className="text-[9.5px] uppercase font-bold" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em' }}>
              What this does not do
            </p>
          </div>
          <ul className="space-y-1.5">
            {[
              'It does not watch your surroundings while the app is closed — that needs native background location, which is not implemented.',
              'Distance is measured to a point, not along your route, because no routing provider is connected yet.',
              'An empty list is not an all-clear. It means nothing has been recorded from a source — not that the area is safe.',
              'It does not listen to or look at anything. No microphone, no camera, no sensor claims.',
            ].map((line) => (
              <li key={line} className="text-[10.5px] leading-snug flex gap-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <span style={{ color: 'rgba(212,175,55,0.5)' }}>·</span>
                {line}
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5 text-[10px] mt-3" style={{ color: 'rgba(110,231,183,0.65)' }}>
            <ShieldCheck className="w-3 h-3" />
            Every alert names its source and when it was last checked. Nothing is generated.
          </p>
        </div>
      </div>
    </div>
  );
}