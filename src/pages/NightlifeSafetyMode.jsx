import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, MapPin, Clock, Shield, CheckCircle2, AlertTriangle,
  Navigation, Share2, Phone, ChevronRight, Star, Zap, Eye,
  Lock, ArrowLeft, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { BackButton } from '@/components/nav/BackButton';

const ACTIVITY_TYPES = [
  { id: 'nightlife',     label: 'Nightlife',      icon: Moon,    color: 'border-purple-400 bg-purple-50', active: 'bg-purple-600 border-purple-600 text-white' },
  { id: 'dinner',        label: 'Dinner Out',     icon: Star,    color: 'border-amber-400 bg-amber-50',  active: 'bg-amber-600 border-amber-600 text-white' },
  { id: 'walking_tour',  label: 'Walking Tour',   icon: Navigation, color: 'border-emerald-400 bg-emerald-50', active: 'bg-emerald-600 border-emerald-600 text-white' },
  { id: 'excursion',     label: 'Excursion',      icon: Zap,     color: 'border-blue-400 bg-blue-50',    active: 'bg-blue-600 border-blue-600 text-white' },
  { id: 'taxi_ride',     label: 'Taxi Ride',      icon: Navigation, color: 'border-yellow-400 bg-yellow-50', active: 'bg-yellow-600 border-yellow-600 text-white' },
  { id: 'beach',         label: 'Beach / Pool',   icon: Shield,  color: 'border-cyan-400 bg-cyan-50',    active: 'bg-cyan-600 border-cyan-600 text-white' },
  { id: 'adventure',     label: 'Adventure',      icon: Zap,     color: 'border-red-400 bg-red-50',      active: 'bg-red-600 border-red-600 text-white' },
  { id: 'custom',        label: 'Custom',         icon: MapPin,  color: 'border-slate-400 bg-slate-50',  active: 'bg-slate-700 border-slate-700 text-white' },
];

const RETURN_OPTIONS = [
  { label: '2 hours', value: 2 },
  { label: '4 hours', value: 4 },
  { label: '6 hours', value: 6 },
  { label: '8 hours', value: 8 },
];

const INTERVAL_OPTIONS = [
  { label: 'Every 30 min', value: 30 },
  { label: 'Every hour',   value: 60 },
  { label: 'Every 2 hrs',  value: 120 },
];

export default function NightlifeSafetyMode() {
  const [step, setStep] = useState('select'); // select | setup | active | confirm_safe
  const [activityType, setActivityType] = useState('nightlife');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [returnHours, setReturnHours] = useState(4);
  const [intervalMins, setIntervalMins] = useState(60);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | acquiring | ready | denied
  const [gpsCoords, setGpsCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [existingSession, setExistingSession] = useState(null);
  const [hasPIN, setHasPIN] = useState(false);
  const [hasGuardian, setHasGuardian] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const { toast } = useToast();
  const intervalRef = useRef(null);

  useEffect(() => {
    // Check for existing active session
    base44.entities.NightlifeSafetySession.filter({ status: 'active' }, '-created_at', 1)
      .then(sessions => { if (sessions[0]) setExistingSession(sessions[0]); })
      .catch(() => {});

    // Check if PIN is set
    base44.auth.me().then(user => {
      if (!user) return;
      base44.functions.invoke('verifyEmergencyPIN', { action: 'get_hint', user_email: user.email })
        .then(r => setHasPIN(!!r.data?.has_pin))
        .catch(() => {});
    }).catch(() => {});
  }, []);

  const acquireGPS = () => {
    setGpsStatus('acquiring');
    if (!('geolocation' in navigator)) { setGpsStatus('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsStatus('ready');
      },
      () => setGpsStatus('denied'),
      { timeout: 10000, maximumAge: 30000 }
    );
  };

  // Start frequent GPS polling when session is active
  useEffect(() => {
    if (activeSession && 'geolocation' in navigator) {
      intervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(pos => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
          // Update live location while session active
          if (activeSession.case_id) {
            base44.functions.invoke('updateLiveLocation', {
              case_id: activeSession.case_id,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy_meters: pos.coords.accuracy,
              source: 'gps',
            }).catch(() => {});
          }
        }, () => {}, { maximumAge: 60000 });
      }, 90000); // every 90 seconds
    }
    return () => clearInterval(intervalRef.current);
  }, [activeSession]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('startActivitySafetyMode', {
        activity_type: activityType,
        venue_name: venueName || undefined,
        venue_address: venueAddress || undefined,
        start_latitude: gpsCoords?.lat ?? undefined,
        start_longitude: gpsCoords?.lng ?? undefined,
        expected_return_hours: returnHours,
        checkin_interval_minutes: intervalMins,
        is_demo: isDemo,
      });
      if (res.data?.success) {
        setActiveSession(res.data);
        setStep('active');
        toast({ title: `✅ ${activityType.replace('_', ' ')} Safety Mode Active`, description: `Check-in every ${intervalMins} min. Guardian link created.` });
      }
    } catch {
      toast({ title: 'Failed to start safety mode', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleConfirmSafe = async () => {
    setLoading(true);
    try {
      if (existingSession?.id || activeSession?.session_id) {
        const sid = existingSession?.id || activeSession?.session_id;
        await base44.entities.NightlifeSafetySession.update(sid, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }
      setStep('confirm_safe');
      clearInterval(intervalRef.current);
    } catch {
      toast({ title: 'Error confirming safe', variant: 'destructive' });
    }
    setLoading(false);
  };

  const copyGuardianLink = async () => {
    const url = activeSession?.guardian_url || existingSession?.guardian_url;
    if (url && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast({ title: '📋 Guardian link copied!' });
    }
  };

  if (step === 'confirm_safe') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-slate-900 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full text-center">
          <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
          <h1 className="text-3xl font-semibold text-white mb-2">You're Marked Safe</h1>
          <p className="text-emerald-300 mb-6">Safety mode ended. Your guardian has been notified.</p>
          <Link to="/dashboard">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">Return to Dashboard</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (step === 'active' || existingSession) {
    const session = activeSession || existingSession;
    const returnTime = session?.expected_return_time ? new Date(session.expected_return_time) : null;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 p-4">
        <div className="max-w-lg mx-auto space-y-4 pt-4">
          <BackButton fallback="/emergency" className="mb-2" />

          {/* Active banner */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-900/60 to-slate-800/60 border border-purple-500/40 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-purple-300 text-xs font-semibold uppercase tracking-widest">Safety Mode Active</p>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-1">
              {ACTIVITY_TYPES.find(a => a.id === (session?.activity_type || activityType))?.label || 'Activity'} Mode
            </h2>
            {session?.venue_name && <p className="text-purple-300 text-sm">{session.venue_name}</p>}
            {returnTime && (
              <p className="text-slate-400 text-xs mt-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Expected back by {returnTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {gpsCoords && (
              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                GPS active · {gpsCoords.lat?.toFixed(4)}, {gpsCoords.lng?.toFixed(4)}
              </p>
            )}
          </motion.div>

          {/* Status checklist */}
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Safety Status</p>
            {[
              { label: 'GPS location captured', done: !!gpsCoords, action: gpsCoords ? null : { label: 'Capture GPS', fn: acquireGPS } },
              { label: 'Guardian link created', done: !!(session?.guardian_url), action: session?.guardian_url ? { label: 'Copy Link', fn: copyGuardianLink } : null },
              { label: 'Emergency PIN set', done: hasPIN, action: !hasPIN ? { label: 'Set PIN', link: '/emergency' } : null },
              { label: 'Safety check-in scheduled', done: true, action: null },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  <span className={`text-sm ${item.done ? 'text-slate-300' : 'text-amber-300'}`}>{item.label}</span>
                </div>
                {item.action && (
                  item.action.link
                    ? <Link to={item.action.link} className="text-xs text-blue-400 underline">{item.action.label}</Link>
                    : <button onClick={item.action.fn} className="text-xs text-blue-400 underline">{item.action.label}</button>
                )}
              </div>
            ))}
          </div>

          {/* Check-in info */}
          <div className="bg-amber-900/30 border border-amber-700/40 rounded-2xl p-4 text-sm text-amber-200">
            <p className="font-semibold mb-1 flex items-center gap-2"><Clock className="w-4 h-4" />Check-in reminder every {intervalMins} min</p>
            <p className="text-xs text-amber-300 opacity-80">If you don't respond within {intervalMins + 15} min, automatic escalation begins.</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={handleConfirmSafe} disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-base font-semibold gap-3">
              <CheckCircle2 className="w-5 h-5" />
              {loading ? 'Confirming...' : "I'm Back Safe — End Safety Mode"}
            </Button>
            <Link to="/emergency">
              <Button variant="outline" className="w-full border-red-500/40 text-red-400 hover:bg-red-900/30 gap-2">
                <AlertTriangle className="w-4 h-4" /> Emergency SOS
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-slate-500">
            Safety mode runs server-side. Even if your phone dies, escalation continues automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900 p-4">
      <div className="max-w-lg mx-auto space-y-5 pt-4 pb-12">
        <BackButton fallback="/emergency" className="mb-2" />

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-900/50 border border-purple-700/50 flex items-center justify-center mx-auto mb-3">
            <Moon className="w-7 h-7 text-purple-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Activity Safety Mode</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            Going out? Activate safety mode. If you go silent, Morales escalates automatically.
          </p>
        </div>

        {/* Step 1: Activity type */}
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">What are you doing?</p>
          <div className="grid grid-cols-4 gap-2">
            {ACTIVITY_TYPES.map(a => {
              const Icon = a.icon;
              const selected = activityType === a.id;
              return (
                <button key={a.id} onClick={() => setActivityType(a.id)}
                  className={`rounded-xl border-2 p-2 flex flex-col items-center gap-1 text-[11px] font-semibold transition-all ${selected ? a.active : 'border-slate-600 bg-slate-800/40 text-slate-400 hover:border-slate-500'}`}>
                  <Icon className="w-4 h-4" />
                  <span className="leading-tight text-center">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Venue & details */}
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Where are you going? (optional)</p>
          <input value={venueName} onChange={e => setVenueName(e.target.value)}
            placeholder="Venue / restaurant / bar name"
            className="w-full bg-slate-900/60 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <input value={venueAddress} onChange={e => setVenueAddress(e.target.value)}
            placeholder="Address (optional)"
            className="w-full bg-slate-900/60 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        {/* Step 3: Timing */}
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Return estimate</p>
          <div className="flex gap-2 flex-wrap">
            {RETURN_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setReturnHours(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${returnHours === o.value ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-2">Check-in frequency</p>
          <div className="flex gap-2 flex-wrap">
            {INTERVAL_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setIntervalMins(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${intervalMins === o.value ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: GPS */}
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {gpsStatus === 'ready' ? `GPS captured` : 'Capture starting GPS'}
              </p>
              {gpsCoords && <p className="text-xs text-emerald-400 mt-0.5">{gpsCoords.lat?.toFixed(5)}, {gpsCoords.lng?.toFixed(5)}</p>}
              {gpsStatus === 'denied' && <p className="text-xs text-amber-400 mt-0.5">GPS denied — IP location will be used as fallback</p>}
            </div>
            {gpsStatus !== 'ready' && (
              <button onClick={acquireGPS} disabled={gpsStatus === 'acquiring'}
                className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                {gpsStatus === 'acquiring' ? <><RefreshCw className="w-3 h-3 animate-spin" />Getting...</> : 'Get GPS'}
              </button>
            )}
          </div>
        </div>

        {/* Safety warnings */}
        {!hasPIN && (
          <div className="bg-amber-900/30 border border-amber-700/40 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              <p className="font-semibold">⚠️ Emergency PIN not set</p>
              <p>If your phone is lost, you won't be able to access emergency recovery without your PIN. <Link to="/emergency" className="underline">Set it now →</Link></p>
            </div>
          </div>
        )}

        {/* Demo toggle */}
        <div className="flex items-center gap-2 px-1">
          <input type="checkbox" id="demo-mode" checked={isDemo} onChange={e => setIsDemo(e.target.checked)}
            className="rounded" />
          <label htmlFor="demo-mode" className="text-xs text-slate-500">Demo mode (clearly labeled, won't trigger real escalations)</label>
        </div>

        {/* Start button */}
        <Button onClick={handleStart} disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white h-14 text-base font-semibold gap-3">
          <Moon className="w-5 h-5" />
          {loading ? 'Activating...' : 'Activate Safety Mode'}
        </Button>

        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">What happens next:</p>
          <p>• Your GPS starting point is saved</p>
          <p>• A guardian tracking link is created automatically</p>
          <p>• Check-in reminder every {intervalMins} min</p>
          <p>• If you go silent: SMS → voice call → guardian alert → security dispatch</p>
          <p>• All of this continues server-side even if your phone dies</p>
        </div>
      </div>
    </div>
  );
}