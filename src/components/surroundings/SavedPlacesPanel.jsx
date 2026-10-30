import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Loader2, Crosshair, X } from 'lucide-react';

/**
 * SavedPlacesPanel — the traveller's own list of places they want to visit or
 * would rather avoid.
 *
 * "Avoid" is explained in the UI as a personal preference on purpose. The moment
 * it reads like a safety verdict about an area, the feature has become something
 * else and we would be encouraging exactly the neighbourhood judgement this
 * product refuses to make.
 */
const CARD = { background: '#0C1A1D', border: '1px solid rgba(212,175,55,0.12)' };

function KindChip({ kind }) {
  const avoid = kind === 'avoid';
  return (
    <span
      className="text-[9px] uppercase font-bold rounded-full shrink-0"
      style={{
        background: avoid ? 'rgba(251,146,60,0.14)' : 'rgba(212,175,55,0.14)',
        border: `1px solid ${avoid ? 'rgba(251,146,60,0.3)' : 'rgba(212,175,55,0.3)'}`,
        color: avoid ? '#FB923C' : '#D4AF37',
        padding: '2px 7px',
        letterSpacing: '0.12em',
      }}
    >
      {avoid ? 'Avoid' : 'Visit'}
    </span>
  );
}

export default function SavedPlacesPanel({ places, onAdd, onDelete, onUseLocation }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState('visit');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);

  const field = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 13,
    padding: '9px 10px',
    width: '100%',
  };

  const reset = () => {
    setLabel('');
    setKind('visit');
    setAddress('');
    setCoords(null);
    setError('');
    setOpen(false);
  };

  const captureLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const loc = await onUseLocation();
      if (!loc) {
        setError('No precise location available. You can still type an address.');
        return;
      }
      setCoords({ latitude: loc.latitude, longitude: loc.longitude });
      if (!label.trim()) setLabel('My current location');
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Give the place a name so you recognise it later.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onAdd({
        label: label.trim(),
        kind,
        address: address.trim(),
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        source: coords ? 'current_location' : 'manual',
      });
      reset();
    } catch (err) {
      setError(err?.response?.data?.error || 'That place could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl px-4 py-4" style={CARD}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">Places that matter to you</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>
            {places.length === 0
              ? 'Nothing saved yet.'
              : `${places.length} saved · ${places.filter((p) => p.kind === 'avoid').length} to avoid`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (open ? reset() : setOpen(true))}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
        >
          {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-3 space-y-2.5">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Place name (e.g. Hotel Posada del Sol)"
            maxLength={120}
            style={field}
          />

          <div className="flex gap-2">
            {['visit', 'avoid'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className="flex-1 rounded-xl py-2 text-[11.5px] font-semibold"
                style={{
                  background: kind === k ? (k === 'avoid' ? 'rgba(251,146,60,0.16)' : 'rgba(212,175,55,0.16)') : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${kind === k ? (k === 'avoid' ? 'rgba(251,146,60,0.4)' : 'rgba(212,175,55,0.4)') : 'rgba(255,255,255,0.08)'}`,
                  color: kind === k ? (k === 'avoid' ? '#FB923C' : '#D4AF37') : 'rgba(255,255,255,0.5)',
                }}
              >
                {k === 'visit' ? 'I want to go' : 'I’d rather avoid'}
              </button>
            ))}
          </div>

          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address or area (optional)"
            maxLength={300}
            style={field}
          />

          <button
            type="button"
            onClick={captureLocation}
            disabled={locating}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11.5px] font-semibold disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)' }}
          >
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
            {coords ? 'Location captured' : 'Use where I am now'}
          </button>

          {error ? <p className="text-[11px] leading-snug" style={{ color: '#FCA5A5' }}>{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold disabled:opacity-50"
            style={{ background: '#D4AF37', color: '#060B16' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save place
          </button>
        </form>
      ) : null}

      {places.length > 0 ? (
        <div className="mt-3 space-y-2">
          {places.map((place) => (
            <div
              key={place.id}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-white/90 truncate">{place.label}</p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {[place.address, place.city, place.country].filter(Boolean).join(' · ') || 'No address'}
                  {place.latitude == null ? ' · no exact point' : ''}
                </p>
              </div>
              <KindChip kind={place.kind} />
              {confirming === place.id ? (
                <button
                  type="button"
                  onClick={() => { onDelete(place.id); setConfirming(null); }}
                  className="text-[10px] font-bold shrink-0"
                  style={{ color: '#FCA5A5' }}
                >
                  Confirm
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(place.id)}
                  className="shrink-0"
                  style={{ color: 'rgba(255,255,255,0.28)' }}
                  aria-label={`Remove ${place.label}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}