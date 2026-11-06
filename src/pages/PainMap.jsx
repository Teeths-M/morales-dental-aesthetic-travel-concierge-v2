import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import BodyMap, { regionsForView } from '@/components/body/BodyMap';

const GOLD = '#D4AF37';
const INK = '#F3F5F7';
const MUTED = 'rgba(243,245,247,0.55)';
const CARD = '#0E1725';
const BORDER = '#22303F';

const QUALITIES = ['sharp', 'dull', 'aching', 'burning', 'throbbing', 'numbness', 'swelling', 'stiffness', 'other'];
const ONSETS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'weeks', label: 'A few weeks' },
  { value: 'months', label: 'Months' },
  { value: 'unknown', label: 'Not sure' },
];

/**
 * The anatomical pain map.
 *
 * It records what the traveller points at, in their own words, at their own
 * severity. It never suggests a cause and never scores the pain for them.
 */
export default function PainMap() {
  const { user } = useAuth();

  const [view, setView] = useState('front');
  const [selected, setSelected] = useState([]);
  const [severity, setSeverity] = useState(5);
  const [quality, setQuality] = useState('aching');
  const [onset, setOnset] = useState('today');
  const [description, setDescription] = useState('');

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadEntries = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      const page = await base44.entities.PainLocation.filter(
        { patient_email: user.email, status: 'active' },
        { sort: '-recorded_at', limit: 40 },
      );
      setEntries(page?.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [user?.email]);

  const regions = regionsForView(view);
  const labelFor = (regionId) => regions.find((region) => region.id === regionId)?.label || regionId;

  const toggleRegion = (regionId) => {
    setSelected((current) => (
      current.includes(regionId)
        ? current.filter((id) => id !== regionId)
        : [...current, regionId]
    ));
  };

  const save = async () => {
    if (!user?.email || selected.length === 0) return;
    setSaving(true);
    setSaveError('');
    try {
      const recordedAt = new Date().toISOString();
      await base44.entities.PainLocation.bulkCreate(
        selected.map((regionId) => ({
          patient_email: user.email,
          region_id: regionId,
          region_label: labelFor(regionId),
          body_view: view,
          severity: Number(severity),
          quality,
          onset,
          description: description.trim(),
          status: 'active',
          recorded_at: recordedAt,
          source: 'traveller',
        })),
      );
      setSelected([]);
      setDescription('');
      await loadEntries();
    } catch {
      setSaveError('That did not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resolve = async (id) => {
    await base44.entities.PainLocation.update(id, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    });
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060B16', color: INK, paddingBottom: 70 }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '22px 18px 0' }}>
        <Link
          to="/dashboard"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED, textDecoration: 'none' }}
        >
          <ArrowLeft size={15} /> Dashboard
        </Link>

        <h1 style={{ margin: '18px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Where does it hurt?
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.6, color: MUTED }}>
          Tap the places that hurt. This records what you tell us — it is not a diagnosis, and M-Care
          never decides a cause for you.
        </p>

        {/* View switch */}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          {['front', 'back'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { setView(option); setSelected([]); }}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer',
                background: view === option ? 'rgba(212,175,55,0.14)' : CARD,
                border: `1px solid ${view === option ? GOLD : BORDER}`,
                color: view === option ? GOLD : MUTED,
                fontSize: 12.5, fontWeight: 600, textTransform: 'capitalize',
              }}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Map */}
        <div style={{ marginTop: 14, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '18px 14px' }}>
          <BodyMap view={view} value={selected} onChange={toggleRegion} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 16 }}>
            {regions.map((region) => {
              const isOn = selected.includes(region.id);
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => toggleRegion(region.id)}
                  style={{
                    padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 550,
                    background: isOn ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isOn ? 'rgba(212,175,55,0.6)' : BORDER}`,
                    color: isOn ? GOLD : MUTED,
                  }}
                >
                  {region.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div style={{ marginTop: 16, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED }}>
              How strong, 0 to 10
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{severity}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            style={{ width: '100%', marginTop: 10, accentColor: GOLD }}
          />

          <p style={{ margin: '16px 0 8px', fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED }}>
            How it feels
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {QUALITIES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setQuality(option)}
                style={{
                  padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 550, textTransform: 'capitalize',
                  background: quality === option ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${quality === option ? 'rgba(212,175,55,0.6)' : BORDER}`,
                  color: quality === option ? GOLD : MUTED,
                }}
              >
                {option}
              </button>
            ))}
          </div>

          <p style={{ margin: '16px 0 8px', fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED }}>
            Since when
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {ONSETS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setOnset(option.value)}
                style={{
                  padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 550,
                  background: onset === option.value ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${onset === option.value ? 'rgba(212,175,55,0.6)' : BORDER}`,
                  color: onset === option.value ? GOLD : MUTED,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={600}
            placeholder="Anything else in your own words (optional)"
            style={{
              marginTop: 16, width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
              background: '#0A1220', border: `1px solid ${BORDER}`, color: INK, fontSize: 14, resize: 'vertical',
            }}
          />

          <button
            type="button"
            onClick={save}
            disabled={saving || selected.length === 0}
            style={{
              marginTop: 14, width: '100%', padding: '13px 16px', borderRadius: 12, border: 'none',
              cursor: selected.length === 0 ? 'default' : 'pointer',
              background: selected.length === 0 ? 'rgba(212,175,55,0.28)' : GOLD,
              color: '#060B16', fontSize: 14, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving
              ? 'Saving…'
              : selected.length === 0
                ? 'Tap a place on the body to begin'
                : `Record ${selected.length} place${selected.length === 1 ? '' : 's'}`}
          </button>

          {saveError && <p style={{ marginTop: 10, fontSize: 12.5, color: '#F87171' }}>{saveError}</p>}
        </div>

        {/* Recorded */}
        <div style={{ marginTop: 24 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>As you reported it</h2>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: MUTED }}>
            Your own reports, kept in your own words.
          </p>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, color: MUTED, fontSize: 13 }}>
              <Loader2 size={15} className="animate-spin" /> Loading…
            </div>
          )}

          {!loading && entries.length === 0 && (
            <p style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6, color: MUTED }}>
              Nothing recorded yet.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{entry.region_label}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: MUTED }}>
                    {entry.quality} · {entry.severity}/10 · {String(entry.onset || 'unknown').replace('_', ' ')}
                  </p>
                  {entry.description && (
                    <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.5, color: 'rgba(243,245,247,0.65)' }}>
                      “{entry.description}”
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => resolve(entry.id)}
                  style={{
                    flexShrink: 0, padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
                    background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED,
                    fontSize: 11.5, fontWeight: 600,
                  }}
                >
                  Resolved
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}