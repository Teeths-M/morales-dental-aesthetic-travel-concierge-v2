import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { MapPin, Trash2, Bookmark, Loader2, Navigation, Wifi, WifiOff, Pause, Play, Globe, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAutoLocation } from '@/hooks/useAutoLocation';

// Throttle: min minutes between auto-breadcrumbs by source
const GPS_THROTTLE_MIN = 15;
const IP_GEO_THROTTLE_MIN = 30;
// Meaningful movement threshold for GPS refresh (meters)
const MOVEMENT_THRESHOLD_M = 100;

function minutesSince(isoStr) {
  if (!isoStr) return Infinity;
  return (Date.now() - new Date(isoStr).getTime()) / 60000;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LocationBreadcrumbTracker({ caseId }) {
  const [crumbs, setCrumbs] = useState([]);
  const [logging, setLogging] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { ipLocation, gpsLocation, gpsStatus, requestGPS, prefs, setPaused } = useAutoLocation();
  const mountedRef = useRef(true);
  const refreshTimerRef = useRef(null);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Load breadcrumbs ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    const res = await base44.functions.invoke('logLocationBreadcrumb', { action: 'list', case_id: caseId });
    if (mountedRef.current && res.data?.crumbs) {
      setCrumbs(res.data.crumbs.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at)));
    }
    if (mountedRef.current) setLoading(false);
  }, [caseId]);

  useEffect(() => { if (caseId) load(); }, [caseId, load]);

  // ── Auto-log on mount + background refresh ────────────────────────────────
  const autoLog = useCallback(async (source) => {
    if (!caseId || prefs.locationPaused) return;

    // Check throttle against last crumb of same source
    const lastSame = crumbs.find(c => c.source === source);
    const throttle = source === 'gps' ? GPS_THROTTLE_MIN : IP_GEO_THROTTLE_MIN;
    if (minutesSince(lastSame?.logged_at) < throttle) return;

    if (source === 'gps' && gpsLocation) {
      // Skip if not moved significantly
      if (lastSame?.latitude && lastSame?.longitude) {
        const dist = distanceMeters(gpsLocation.latitude, gpsLocation.longitude, lastSame.latitude, lastSame.longitude);
        if (dist < MOVEMENT_THRESHOLD_M && minutesSince(lastSame.logged_at) < GPS_THROTTLE_MIN) return;
      }
      await doLog({
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy_meters: gpsLocation.accuracy_meters,
        source: 'gps',
      });
    } else if (source === 'ip_geo' && ipLocation) {
      await doLog({
        latitude: ipLocation.latitude,
        longitude: ipLocation.longitude,
        place_label: [ipLocation.city, ipLocation.country].filter(Boolean).join(', ') || null,
        country: ipLocation.country,
        country_code: ipLocation.country_code,
        city: ipLocation.city,
        region: ipLocation.region,
        timezone: ipLocation.timezone,
        source: 'ip_geo',
      });
    }
  }, [caseId, crumbs, gpsLocation, ipLocation, prefs.locationPaused]);

  // Auto-log once after initial load
  useEffect(() => {
    if (loading || !caseId) return;
    if (gpsStatus === 'granted' && gpsLocation) {
      autoLog('gps');
    } else if (ipLocation && !prefs.locationPaused) {
      autoLog('ip_geo');
    }
  }, [loading, gpsStatus]);  

  // Background refresh every 15 minutes while page visible
  useEffect(() => {
    if (!caseId) return;
    const tick = () => {
      if (document.visibilityState !== 'visible' || prefs.locationPaused) return;
      if (gpsStatus === 'granted') autoLog('gps');
      else autoLog('ip_geo');
    };
    refreshTimerRef.current = setInterval(tick, GPS_THROTTLE_MIN * 60 * 1000);
    return () => clearInterval(refreshTimerRef.current);
  }, [caseId, gpsStatus, prefs.locationPaused, autoLog]);

  // ── Core log helper ───────────────────────────────────────────────────────
  const doLog = async (payload) => {
    const res = await base44.functions.invoke('logLocationBreadcrumb', {
      action: 'log', case_id: caseId, ...payload,
    });
    if (res.data?.logged && mountedRef.current) load();
    return res.data?.logged;
  };

  // ── Manual "Log Now" — always requests fresh GPS ──────────────────────────
  const logCurrent = async () => {
    setLogging(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0
        })
      );
      const logged = await doLog({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_meters: pos.coords.accuracy ?? null,
        source: 'gps',
      });
      if (logged) toast({ title: '📍 GPS location logged', duration: 3000 });
    } catch (err) {
      const denied = err?.code === 1;
      if (denied) {
        // Fallback to IP geo on denied GPS
        if (ipLocation) {
          const logged = await doLog({
            latitude: ipLocation.latitude,
            longitude: ipLocation.longitude,
            place_label: [ipLocation.city, ipLocation.country].filter(Boolean).join(', ') || null,
            country: ipLocation.country,
            country_code: ipLocation.country_code,
            city: ipLocation.city,
            region: ipLocation.region,
            timezone: ipLocation.timezone,
            source: 'ip_geo',
          });
          if (logged) {
            toast({ title: '🌐 Approximate location logged', description: 'GPS denied — using network location.', duration: 4000 });
          }
        } else {
          toast({
            title: 'Location permission required',
            description: 'Enable location in your browser settings to share precise GPS.',
            variant: 'destructive',
          });
        }
      } else {
        toast({ title: 'GPS unavailable', description: 'Could not get GPS signal. Try again outdoors.', variant: 'destructive' });
      }
    } finally {
      if (mountedRef.current) setLogging(false);
    }
  };

  const save = async (id) => {
    await base44.functions.invoke('logLocationBreadcrumb', { action: 'save', breadcrumb_id: id });
    toast({ title: 'Location saved permanently', duration: 3000 });
    load();
  };

  const purgeAll = async () => {
    const res = await base44.functions.invoke('logLocationBreadcrumb', { action: 'purge_journey', case_id: caseId });
    toast({ title: `${res.data?.purged_count || 0} unsaved locations purged`, duration: 3000 });
    load();
  };

  const openDirections = (crumb) => {
    let url;
    if (typeof crumb.latitude === 'number' && typeof crumb.longitude === 'number') {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${crumb.latitude},${crumb.longitude}`)}&travelmode=driving`;
    } else if (crumb.city || crumb.country) {
      const q = [crumb.city, crumb.country].filter(Boolean).join(', ');
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    } else {
      toast({ title: 'No location available for directions', variant: 'destructive' });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Location status indicator
  const locationStatus = prefs.locationPaused ? 'paused'
    : gpsStatus === 'granted' ? 'gps'
    : gpsStatus === 'denied' ? 'denied'
    : ipLocation ? 'ip_geo'
    : 'none';

  // Stale signal: most recent crumb is >30 min old and GPS isn't actively updating.
  // This could be a technical drop or deliberate interference — warn the patient
  // so they know their emergency contacts are seeing a frozen position, not current.
  const STALE_WARN_MIN = 30;
  const newestCrumb = crumbs[0] ?? null;
  const newestCrumbAge = newestCrumb ? minutesSince(newestCrumb.logged_at) : null;
  const isSignalStale = !loading && newestCrumb &&
    newestCrumbAge != null && newestCrumbAge >= STALE_WARN_MIN &&
    locationStatus !== 'gps';

  const statusConfig = {
    gps: { icon: <Navigation className="w-3.5 h-3.5" />, label: 'Precise GPS active', color: 'text-emerald-600', dot: 'bg-emerald-500' },
    ip_geo: { icon: <Globe className="w-3.5 h-3.5" />, label: 'Approximate location', color: 'text-blue-600', dot: 'bg-blue-500' },
    denied: { icon: <WifiOff className="w-3.5 h-3.5" />, label: 'GPS permission denied', color: 'text-amber-600', dot: 'bg-amber-500' },
    paused: { icon: <Pause className="w-3.5 h-3.5" />, label: 'Sharing paused', color: 'text-slate-500', dot: 'bg-slate-400' },
    none: { icon: <Wifi className="w-3.5 h-3.5" />, label: 'Detecting...', color: 'text-slate-400', dot: 'bg-slate-300' },
  };
  const status = statusConfig[locationStatus];

  return (
    <div className="space-y-4">
      {/* Stale signal warning — shown when GPS drops and last crumb is >30 min old.
          Emergency contacts are seeing a frozen position; patient needs to know. */}
      {isSignalStale && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-semibold text-amber-800">Your location is no longer broadcasting</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Emergency contacts see your last known position as of {Math.round(newestCrumbAge)} minutes ago — not your current location.
              Tap <span className="font-semibold">Log Now</span> to re-share.
            </p>
          </div>
        </div>
      )}

      {/* Header + controls */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-600" /> Last Known Locations
          </p>
          <div className={`flex items-center gap-1.5 mt-0.5 text-xs ${status.color}`}>
            {status.icon} {status.label}
            {locationStatus === 'ip_geo' && ipLocation?.city && (
              <span className="text-slate-500">— {[ipLocation.city, ipLocation.country].filter(Boolean).join(', ')}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {gpsStatus === 'idle' && !prefs.locationPaused && (
            <button onClick={requestGPS}
              className="flex items-center gap-1.5 text-xs font-semibold border border-blue-200 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-50">
              <Navigation className="w-3.5 h-3.5" /> Enable GPS
            </button>
          )}
          <button onClick={logCurrent} disabled={logging}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl disabled:opacity-60">
            {logging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            Log Now
          </button>
          <button onClick={() => setPaused(!prefs.locationPaused)}
            className={`flex items-center gap-1.5 text-xs font-semibold border px-3 py-2 rounded-xl ${prefs.locationPaused ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {prefs.locationPaused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
          </button>
          {crumbs.some(c => !c.is_saved) && (
            <button onClick={purgeAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" /> Purge Unsaved
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb list */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : crumbs.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No location breadcrumbs yet</p>
          <p className="text-xs text-slate-400 mt-1">Tap "Log Now" or enable GPS to auto-record your location</p>
        </div>
      ) : (
        <div className="space-y-2">
          {crumbs.map((crumb, i) => (
            <motion.div key={crumb.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${crumb.is_saved ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                i === 0
                  ? isSignalStale ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
                  : 'bg-slate-300'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{crumb.place_label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  {new Date(crumb.logged_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  <span className={`uppercase font-medium ${crumb.source === 'gps' ? 'text-emerald-600' : 'text-blue-500'}`}>
                    · {crumb.source === 'ip_geo' ? 'approx.' : crumb.source}
                  </span>
                  {crumb.accuracy_meters != null && <span>· ±{Math.round(crumb.accuracy_meters)}m</span>}
                  {crumb.is_saved && <span className="text-emerald-600 font-semibold">· Saved</span>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openDirections(crumb)}
                  className="text-slate-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50"
                  title="Open directions">
                  <MapPin className="w-3.5 h-3.5" />
                </button>
                {!crumb.is_saved && (
                  <button onClick={() => save(crumb.id)} className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50">
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}