/**
 * WildernessActivityStart
 * Enhanced adventure mode start panel with GPS capture,
 * offline preparation checklist, and risk briefing.
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mountain, Wind, Waves, Leaf, Zap, TreePine, Droplets, Anchor,
  MapPin, Shield, WifiOff, CheckCircle2, Circle, Loader2, AlertTriangle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import WildernessSafetyNudge from './WildernessSafetyNudge';
import WildernessSOSPanel from './WildernessSOSPanel';

const WILDERNESS_TYPES = [
  { id: 'zip_line',     label: 'Zip-line / Canopy',    icon: Wind,      risk: 'high',   remote: true  },
  { id: 'hiking',       label: 'Hiking / Trekking',    icon: Mountain,  risk: 'medium', remote: true  },
  { id: 'jungle',       label: 'Jungle / Cloud Forest',icon: TreePine,  risk: 'high',   remote: true  },
  { id: 'waterfall',    label: 'Waterfall / Ravine',   icon: Droplets,  risk: 'high',   remote: true  },
  { id: 'boat',         label: 'Boat / River',         icon: Anchor,    risk: 'medium', remote: false },
  { id: 'atv',          label: 'ATV / Off-Road',       icon: Zap,       risk: 'high',   remote: true  },
  { id: 'scuba',        label: 'Scuba / Snorkeling',   icon: Waves,     risk: 'medium', remote: false },
  { id: 'nightlife',    label: 'Nightlife / Social',   icon: Leaf,      risk: 'medium', remote: false },
  { id: 'custom',       label: 'Custom Activity',      icon: Zap,       risk: 'unknown',remote: false },
];

const PREP_ITEMS = [
  { id: 'guardian',  label: 'Guardian link active & shared with someone you trust' },
  { id: 'pin',       label: 'Emergency PIN set up' },
  { id: 'gps',       label: 'GPS beacon enabled (keep app open)' },
  { id: 'offline',   label: 'Offline emergency profile downloaded' },
  { id: 'return',    label: 'Expected return time set' },
];

export default function WildernessActivityStart({ user, caseId, onSessionCreated }) {
  const [selected, setSelected]   = useState(null);
  const [venueName, setVenueName]  = useState('');
  const [operator, setOperator]   = useState('');
  const [returnTime, setReturnTime]= useState('');
  const [prepDone, setPrepDone]   = useState({});
  const [gpsState, setGpsState]   = useState('idle'); // idle | capturing | captured | failed
  const [gpsCoords, setGpsCoords]  = useState(null);
  const [session, setSession]     = useState(null);
  const [starting, setStarting]   = useState(false);
  const [showSOS, setShowSOS]     = useState(false);
  const [step, setStep]           = useState('select'); // select | prep | active

  const captureGPS = useCallback(async () => {
    setGpsState('capturing');
    return new Promise((resolve) => {
      if (!navigator.geolocation) { setGpsState('failed'); resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
          setGpsCoords(c);
          setGpsState('captured');
          resolve(c);
        },
        () => { setGpsState('failed'); resolve(null); },
        { timeout: 12000, enableHighAccuracy: true }
      );
    });
  }, []);

  const startActivity = async () => {
    if (!selected) return;
    setStarting(true);

    const coords = await captureGPS();

    // Store offline-safe activity profile locally
    const offlineProfile = {
      activity_type: selected.id,
      activity_label: selected.label,
      venue_name: venueName,
      operator,
      start_latitude: coords?.latitude ?? null,
      start_longitude: coords?.longitude ?? null,
      expected_return_time: returnTime || null,
      started_at: new Date().toISOString(),
      user_email: user?.email || '',
      case_id: caseId || '',
    };
    try {
      localStorage.setItem('morales_active_wilderness_session', JSON.stringify(offlineProfile));
    } catch (_) {}

    // Create ActivitySession in Base44 when online
    let createdSession = null;
    if (navigator.onLine && user) {
      try {
        createdSession = await base44.entities.ActivitySession.create({
          case_id: caseId || '',
          patient_id: user.id,
          patient_email: user.email,
          patient_name: user.full_name,
          activity_name: selected.label,
          activity_category: 'wilderness',
          risk_level: selected.risk,
          location: venueName,
          operator_name: operator,
          start_latitude: coords?.latitude,
          start_longitude: coords?.longitude,
          scheduled_start_at: new Date().toISOString(),
          scheduled_end_at: returnTime ? new Date(returnTime).toISOString() : null,
          handshake_due_at: returnTime ? new Date(new Date(returnTime).getTime() + 2 * 3600000).toISOString() : null,
          handshake_status: 'pending',
          status: 'active',
        });
        setSession(createdSession);
        if (onSessionCreated) onSessionCreated(createdSession);

        // Log breadcrumb at activity start
        if (coords) {
          await base44.entities.LocationBreadcrumb.create({
            case_id: caseId || '',
            patient_email: user.email,
            patient_name: user.full_name,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy_meters: coords.accuracy,
            source: 'activity_start',
            provider: 'browser_gps',
            location_precision: coords.accuracy && coords.accuracy < 100 ? 'precise' : 'approximate',
            logged_at: new Date().toISOString(),
            is_saved: true,
          }).catch(() => {});
        }
      } catch (_) {}
    }

    setStarting(false);
    setStep('active');
  };

  const togglePrep = (id) => setPrepDone(prev => ({ ...prev, [id]: !prev[id] }));
  const allPrepDone = PREP_ITEMS.every(i => prepDone[i.id]);

  const activeProfile = (() => {
    try { return JSON.parse(localStorage.getItem('morales_active_wilderness_session') || 'null'); } catch (_) { return null; }
  })();

  // ── ACTIVE MODE ──────────────────────────────────────────────────────────
  if (step === 'active') {
    const act = selected || { id: activeProfile?.activity_type || 'custom', label: activeProfile?.activity_label || 'Activity' };
    return (
      <div className="space-y-4">
        {/* Active banner */}
        <div className="bg-emerald-900/40 border-2 border-emerald-500/60 rounded-2xl p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/50 flex items-center justify-center flex-shrink-0">
              <Mountain className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex-1">
              <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wider">Adventure Mode Active</p>
              <p className="text-white font-semibold">{act.label}</p>
              {(venueName || activeProfile?.venue_name) && (
                <p className="text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{venueName || activeProfile.venue_name}
                </p>
              )}
            </div>
            {gpsCoords && (
              <div className="text-right">
                <p className="text-emerald-400 text-[10px] font-mono">
                  {gpsCoords.latitude.toFixed(5)}, {gpsCoords.longitude.toFixed(5)}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${gpsCoords.latitude},${gpsCoords.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 text-[10px] flex items-center justify-end gap-1 hover:underline"
                >
                  <Navigation className="w-2.5 h-2.5" />Maps
                </a>
              </div>
            )}
          </div>
        </div>

        {/* SOS toggle */}
        <button
          onClick={() => setShowSOS(!showSOS)}
          className={`w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl transition-all text-sm ${
            showSOS
              ? 'bg-slate-700/50 border border-slate-600 text-slate-300'
              : 'bg-red-700 hover:bg-red-800 text-white shadow-lg shadow-red-900/40'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          {showSOS ? 'Hide SOS Panel' : '🆘 Trigger Emergency SOS'}
        </button>

        <AnimatePresence>
          {showSOS && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <WildernessSOSPanel
                caseId={caseId}
                userId={user?.id || ''}
                userEmail={user?.email || ''}
                activitySessionId={session?.id || ''}
                activityType={act.id}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!showSOS && (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 text-xs text-slate-400">
            <p>• GPS beacon active while this page is open.</p>
            <p>• If you lose signal, press the red SOS button to create an offline emergency packet.</p>
            <p>• If SMS is available, send the emergency packet by text.</p>
          </div>
        )}

        <button onClick={() => setStep('select')} className="w-full text-slate-500 text-xs py-2 hover:text-slate-300">
          End activity / start new
        </button>
      </div>
    );
  }

  // ── PREP CHECKLIST ───────────────────────────────────────────────────────
  if (step === 'prep') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-emerald-400" />
          <p className="text-white font-semibold text-sm">Pre-Activity Safety Checklist</p>
        </div>
        {PREP_ITEMS.map(item => (
          <button key={item.id} onClick={() => togglePrep(item.id)}
            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
              prepDone[item.id]
                ? 'bg-emerald-900/30 border-emerald-600/40'
                : 'bg-slate-800/40 border-slate-600/40'
            }`}
          >
            {prepDone[item.id]
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              : <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />}
            <span className={`text-xs ${prepDone[item.id] ? 'text-emerald-300' : 'text-slate-300'}`}>{item.label}</span>
          </button>
        ))}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => setStep('select')} className="flex-1 border-slate-600 text-slate-300 text-sm">
            Back
          </Button>
          <Button
            onClick={startActivity}
            disabled={starting}
            className={`flex-2 text-white font-semibold text-sm flex-1 ${
              allPrepDone ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-500'
            }`}
          >
            {starting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting…</>
              : `Start ${selected?.label || 'Activity'}`}
          </Button>
        </div>

        {!allPrepDone && (
          <p className="text-amber-400 text-[10px] text-center">
            You can proceed without completing all checks, but we strongly recommend them.
          </p>
        )}
      </div>
    );
  }

  // ── SELECT ACTIVITY ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <p className="text-white font-semibold text-sm mb-1">Select Wilderness Activity</p>
        <p className="text-slate-400 text-xs">Morales will activate the appropriate safety protocol and GPS beacon.</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {WILDERNESS_TYPES.map(type => {
          const Icon = type.icon;
          const isSelected = selected?.id === type.id;
          return (
            <button key={type.id} onClick={() => setSelected(type)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                isSelected
                  ? 'border-red-500 bg-red-900/30'
                  : 'border-slate-600/40 bg-slate-800/30 hover:border-slate-500/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${isSelected ? 'text-red-400' : 'text-slate-400'}`} />
              <span className="text-[10px] font-semibold text-slate-300 leading-tight">{type.label}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                type.risk === 'high' ? 'bg-red-900/60 text-red-400 border border-red-700/50' :
                type.risk === 'medium' ? 'bg-amber-900/50 text-amber-400 border border-amber-700/50' :
                'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
              }`}>{type.risk}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <WildernessSafetyNudge
              activityType={selected.id}
              hasOperator={!!operator}
              isRemote={selected.remote}
              isSolo={true}
              dark={true}
            />

            <input value={venueName} onChange={e => setVenueName(e.target.value)}
              placeholder="Venue / location name (optional)"
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
            <input value={operator} onChange={e => setOperator(e.target.value)}
              placeholder="Tour operator / guide (optional)"
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Expected return time</label>
              <input type="datetime-local" value={returnTime} onChange={e => setReturnTime(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>

            <Button onClick={() => setStep('prep')} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl py-3">
              <Shield className="w-4 h-4 mr-2" />
              Start Activity + Safety Checklist
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-3 text-[11px] text-slate-500 space-y-0.5">
        <p>• GPS captures your start location without internet.</p>
        <p>• If you lose signal, the SOS panel creates an offline emergency packet.</p>
        <p>• Guardian links show last-known location, not private medical records.</p>
      </div>
    </div>
  );
}