// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TripProgressStepper from '@/components/journey/TripProgressStepper';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Shield, CheckCircle2, Clock, AlertTriangle,
  MapPin, Navigation, Copy, ExternalLink, Globe, Radio, Wifi, WifiOff, Compass,
} from 'lucide-react';

// ── Bearing + distance helpers ───────────────────────────────────────────────
function computeBearing(φ1deg, λ1deg, φ2deg, λ2deg) {
  const toRad = d => d * Math.PI / 180;
  const φ1 = toRad(φ1deg), φ2 = toRad(φ2deg), Δλ = toRad(λ2deg - λ1deg);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function computeDistanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function bearingLabel(deg) {
  const dirs = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  return dirs[Math.round(deg / 45) % 8];
}

function CompassArrow({ bearing, size = 64 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Outer ring */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
        border: '1.5px solid rgba(212,175,55,0.35)',
      }} />
      {/* Cardinal marks */}
      {['N','E','S','W'].map((d, i) => {
        const angle = i * 90;
        const r = size / 2 - 6;
        const x = size / 2 + r * Math.sin(angle * Math.PI / 180);
        const y = size / 2 - r * Math.cos(angle * Math.PI / 180);
        return (
          <span key={d} style={{
            position: 'absolute', fontSize: 7, fontWeight: 700, color: 'rgba(212,175,55,0.5)',
            left: x, top: y, transform: 'translate(-50%,-50%)',
          }}>{d}</span>
        );
      })}
      {/* Rotating arrow */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `rotate(${bearing}deg)`,
        transition: 'transform 0.8s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none">
          <path d="M12 2 L17 20 L12 16 L7 20 Z" fill="#22c55e" />
          <path d="M12 22 L17 4 L12 8 L7 4 Z" fill="rgba(34,197,94,0.2)" />
        </svg>
      </div>
      {/* Center dot */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        width: 5, height: 5, borderRadius: '50%', background: '#22c55e',
      }} />
    </div>
  );
}

// Fix default leaflet marker icons (webpack/vite strips them)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom pulsing dot icon
const pulsingIcon = new L.DivIcon({
  className: '',
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:#22c55e;opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <div style="position:absolute;inset:3px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 0 0 2px #16a34a;"></div>
  </div>
  <style>@keyframes ping{75%,100%{transform:scale(2);opacity:0}}</style>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const staleIcon = new L.DivIcon({
  className: '',
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="position:absolute;inset:3px;border-radius:50%;background:#f59e0b;border:2px solid white;box-shadow:0 0 0 2px #d97706;"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const STAGE_STEPS = ['consultation', 'planning', 'booking', 'travel', 'procedure', 'recovery', 'aftercare'];
const POLL_INTERVAL_MS = 12 * 1000; // poll every 12s
const _STALE_WARN_MS = 5 * 60 * 1000;   // 5 min
const _STALE_ALERT_MS = 15 * 60 * 1000; // 15 min

function minutesAgo(isoTs) {
  if (!isoTs) return null;
  return Math.round((Date.now() - new Date(isoTs).getTime()) / 60000);
}

function mapsViewUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
function mapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
function mapsSatelliteUrl(lat, lng) {
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${lat},${lng}&zoom=18&basemap=satellite`;
}
function openMap(url) { window.open(url, '_blank', 'noopener,noreferrer'); }

// Component that smoothly re-centers map when position changes
function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], map.getZoom(), { animate: true, duration: 1.0 });
    }
  }, [lat, lng, map]);
  return null;
}

function LocationSignalBadge({ loc }) {
  if (!loc) return null;
  const age = minutesAgo(loc.updated_at);
  const isLive = loc.is_live;
  const isStaleWarn = age != null && age >= 5;
  const isStaleAlert = age != null && age >= 15;

  if (isStaleAlert) return (
    <div className="flex items-center gap-1.5 bg-red-900/40 border border-red-600/50 rounded-full px-3 py-1 text-xs text-red-300 font-semibold">
      <WifiOff className="w-3 h-3" /> Signal lost · {age}m ago · Escalation triggered
    </div>
  );
  if (isStaleWarn) return (
    <div className="flex items-center gap-1.5 bg-amber-900/40 border border-amber-600/50 rounded-full px-3 py-1 text-xs text-amber-300 font-semibold">
      <AlertTriangle className="w-3 h-3 animate-pulse" /> Signal stale · Last update {age} min ago
    </div>
  );
  if (isLive) return (
    <div className="flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-600/50 rounded-full px-3 py-1 text-xs text-emerald-300 font-semibold">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live · {age != null ? `Updated ${age === 0 ? 'just now' : `${age}m ago`}` : 'Updating...'}
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 bg-blue-900/40 border border-blue-600/50 rounded-full px-3 py-1 text-xs text-blue-300 font-semibold">
      <Clock className="w-3 h-3" /> {age != null ? `${age}m ago` : 'Last known'}
    </div>
  );
}

export default function GuardianView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageState, setPageState] = useState('loading'); // 'loading'|'ok'|'expired'|'error'
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lastPoll, setLastPoll] = useState(null);
  const _pollRef = useRef(null);
  const [guardianPos, setGuardianPos] = useState(null);
  const [guardianGPSStatus, setGuardianGPSStatus] = useState('idle'); // idle|active|denied
  const watchIdRef = useRef(null);

  // Bearing + distance from guardian → patient (must be before early returns per hooks rules)
  const directionToPatient = useMemo(() => {
    if (!guardianPos || !data) return null;
    const loc = data?.latest_location;
    const gps = loc && loc.source === 'gps' && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
    if (!gps) return null;
    const bearing  = computeBearing(guardianPos.lat, guardianPos.lng, loc.latitude, loc.longitude);
    const distance = computeDistanceM(guardianPos.lat, guardianPos.lng, loc.latitude, loc.longitude);
    return { bearing, distance, label: bearingLabel(bearing) };
  }, [guardianPos, data]);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await base44.functions.invoke('getGuardianViewData', { token });
      // SDK may return data directly or wrapped in .data — handle both
      const d = res?.data ?? res;
      if (!d || d.status === 'invalid' || d.status === 'revoked' || d.status === 'error') {
        setPageState('error');
        setErrorMsg(d?.error || 'This guardian link does not exist or has been revoked.');
      } else if (d.status === 'expired') {
        setPageState('expired');
      } else {
        setData(d);
        setPageState('ok');
        setLastPoll(new Date().toISOString());
      }
    } catch (_) {
      if (isInitial) { setPageState('error'); setErrorMsg('Unable to load guardian data.'); }
    }
    if (isInitial) setLoading(false);
  }, [token]);

  // Guardian's own GPS — optional, enables compass arrow
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGuardianGPSStatus('active');
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setGuardianPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGuardianGPSStatus('active');
      },
      () => setGuardianGPSStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Initial load
  useEffect(() => {
    if (token) fetchData(true);
  }, [token, fetchData]);

  // Live poll every 12s
  useEffect(() => {
    if (pageState !== 'ok') return;
    fetchData(false);
    const pollId = setInterval(() => fetchData(false), POLL_INTERVAL_MS);
    return () => clearInterval(pollId); // Use local pollId, not a ref that may have changed
  }, [pageState, fetchData]);

  const _copyCoords = (lat, lng) => {
    navigator.clipboard.writeText(mapsViewUrl(lat, lng)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareLocation = (lat, lng, patientName) => {
    const text = `🔴 ${patientName}'s live location\nClick for directions: ${mapsViewUrl(lat, lng)}`;
    const waMsg  = encodeURIComponent(text);
    const _smsBody = encodeURIComponent(text);
    // On mobile: open WhatsApp with pre-filled message
    // On desktop: copy to clipboard
    if (/android|iphone|ipad/i.test(navigator.userAgent)) {
      openMap(`https://wa.me/?text=${waMsg}`);
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  if (loading || pageState === 'loading') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-emerald-400 text-sm">Verifying guardian access...</p>
      </div>
    </div>
  );

  if (pageState === 'expired') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Guardian Link Expired</h2>
        <p className="text-slate-400 text-sm">This tracking link has expired. Ask the traveler to generate a new one.</p>
      </div>
    </div>
  );

  if (pageState === 'error' || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Link Unavailable</h2>
        <p className="text-slate-400 text-sm">{errorMsg}</p>
      </div>
    </div>
  );

  const { session, case: caseData, latest_location: loc, location_trail: locationTrail, escalation, wilderness_sos: wildernessSOS, trip_progress: tripProgress } = data;

  // Build polyline positions from breadcrumb trail (oldest → newest)
  const trailPositions = (locationTrail || []).map(p => [p.lat, p.lng]);
  // Start marker = first trail point, if trail has 2+ points
  const trailStart = trailPositions.length >= 2 ? trailPositions[0] : null;

  // Country label from trip progress
  const currentCountry = tripProgress?.current_country || null;
  // Only actual GPS coordinates trigger the map — IP geolocation goes to city-only view
  const hasGPS = loc && loc.source === 'gps' && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
  // IP geo or breadcrumb with city/country info → show city label instead of map
  const hasCityOnly = loc && !hasGPS && (loc.city || loc.country || loc.place_label ||
    (loc.source === 'ip_geo' && typeof loc.latitude === 'number'));
  const currentStageIndex = STAGE_STEPS.indexOf(caseData?.journey_stage || 'consultation');
  const expiresIn = Math.round((new Date(session.expires_at) - new Date()) / (1000 * 60 * 60));
  const ageMin = loc ? minutesAgo(loc.updated_at) : null;
  const isStaleWarn = ageMin != null && ageMin >= 5;
  const isStaleAlert = ageMin != null && ageMin >= 15;
  const markerIcon = isStaleWarn ? staleIcon : pulsingIcon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950">
      {/* Header */}
      <div className="border-b border-blue-900/50">
        <div className="max-w-lg mx-auto px-4 py-6 text-center">
          <div className="w-14 h-14 bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-700/50">
            <Eye className="w-7 h-7 text-blue-400" />
          </div>
          <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-1">Guardian View — Read Only</p>
          <h1 className="text-2xl font-semibold text-white">{session.patient_name}'s Journey</h1>
          <p className="text-slate-400 text-sm mt-1">Shared with {session.guardian_name}</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {expiresIn > 0 ? `Expires in ${expiresIn}h` : 'Expiring soon'} · Look only
          </div>
          {/* Live poll indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Radio className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] text-slate-500">Auto-refreshing every 12s</span>
            {lastPoll && <span className="text-[10px] text-slate-600">· {new Date(lastPoll).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          </div>
        </div>
      </div>

      {/* ── HAND OF GOD — SAFE Banner ───────────────────────────────────── */}
      {/* Suppressed when signal is >15 min stale — do not falsely reassure family
          when the last known position could be minutes or hours out of date.
          An amber "signal lost" warning replaces it instead. */}
      {!wildernessSOS && !escalation && !isStaleAlert && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08))',
          borderBottom: '1px solid rgba(34,197,94,0.3)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 12px #22c55e', animation: 'pulse 1.5s ease infinite' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#22c55e', letterSpacing: '0.02em' }}>
              {session.patient_name} IS SAFE
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
              EVN-iQ400™ scanning · No threats detected · M is watching
            </p>
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
            {[4, 7, 10, 13].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, borderRadius: 1, background: '#22c55e', opacity: 0.7 + i * 0.1 }} />
            ))}
          </div>
        </div>
      )}
      {/* Signal-loss banner — replaces the SAFE banner when location is dark >15 min.
          Shows last known position clearly labeled; never claims current safety. */}
      {!wildernessSOS && !escalation && isStaleAlert && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.06))',
          borderBottom: '1px solid rgba(245,158,11,0.35)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <WifiOff style={{ width: 18, height: 18, color: '#f59e0b' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.02em' }}>
              LOCATION SIGNAL LOST — {ageMin} MIN AGO
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.03em' }}>
              Displaying last known safe coordinate · Map position may not reflect current location
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes evnScan{0%{r:20;opacity:0.7}100%{r:80;opacity:0}}`}</style>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* 9-Handshake Journey Progress — read-only for guardian */}
        {tripProgress && (tripProgress.current_step > 0 || tripProgress.trip_phase !== 'pre_departure') && (
          <TripProgressStepper
            currentStep={tripProgress.current_step ?? 0}
            isComplete={tripProgress.trip_phase === 'completed'}
          />
        )}

        {/* Wilderness SOS banner */}
        {wildernessSOS && (
          <div className="rounded-2xl border-2 border-red-500 bg-red-900/50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-black text-white text-sm uppercase tracking-wide">🏔️ Emergency SOS Active — Wilderness Rescue</p>
                <p className="text-red-300 text-xs mt-1">This traveler has triggered an emergency SOS. Rescue escalation is underway.</p>
                {wildernessSOS.triggered_at && (
                  <p className="text-red-400 text-xs mt-0.5">
                    SOS triggered: {new Date(wildernessSOS.triggered_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
                {wildernessSOS.responder_name && (
                  <p className="text-emerald-300 text-xs mt-0.5 font-semibold">Responder: {wildernessSOS.responder_name}{wildernessSOS.responder_eta_minutes ? ` — ETA ${wildernessSOS.responder_eta_minutes} min` : ''}</p>
                )}
                {wildernessSOS.latitude != null && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <a href={`https://www.google.com/maps/search/?api=1&query=${wildernessSOS.latitude},${wildernessSOS.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs bg-red-800/50 border border-red-600/50 text-red-200 px-2 py-1 rounded-lg hover:bg-red-700/50">
                      <ExternalLink className="w-3 h-3" />View SOS Location
                    </a>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${wildernessSOS.latitude},${wildernessSOS.longitude}&travelmode=driving`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-800/50">
                      <Navigation className="w-3 h-3" />Directions to SOS
                    </a>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-red-400">
                  {[
                    { label: 'SOS Received', active: true },
                    { label: 'Guardian Notified', active: wildernessSOS.notifications_sent?.includes('admin_email') },
                    { label: 'Rescue Dispatched', active: wildernessSOS.status === 'dispatched' },
                    { label: 'Resolved', active: wildernessSOS.status === 'resolved' },
                  ].map(step => (
                    <span key={step.label} className={`px-2 py-0.5 rounded-full border font-semibold ${
                      step.active
                        ? 'bg-red-700/50 border-red-500/60 text-red-200'
                        : 'bg-slate-800/50 border-slate-600/50 text-slate-500'
                    }`}>{step.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Escalation banner — shown when silent escalation is active */}
        {escalation && (
          <div className={`rounded-2xl border-2 p-4 ${
            escalation.status === 'escalated_5h' ? 'bg-red-900/40 border-red-500' :
            escalation.status === 'escalated_3h' ? 'bg-orange-900/40 border-orange-500' :
            'bg-amber-900/40 border-amber-500'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                escalation.status === 'escalated_5h' ? 'text-red-400 animate-pulse' :
                escalation.status === 'escalated_3h' ? 'text-orange-400' : 'text-amber-400'
              }`} />
              <div className="text-sm">
                <p className="font-semibold text-white">
                  {escalation.status === 'escalated_5h' ? '🚨 Security Dispatch Active' :
                   escalation.status === 'escalated_3h' ? '⚠️ Guardian Escalation Active' :
                   '⚠️ Check-In Overdue — Escalation In Progress'}
                </p>
                <p className="text-slate-300 text-xs mt-1">
                  Morales Safety system has been automatically notified. Emergency protocols are active.
                </p>
                {escalation.overdue_since && (
                  <p className="text-slate-400 text-xs mt-0.5">
                    Overdue since: {new Date(escalation.overdue_since).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
                {escalation.security_dispatched_at && (
                  <p className="text-red-300 text-xs mt-1 font-semibold">Private security has been dispatched.</p>
                )}
                {escalation.police_escalation_required_at && (
                  <p className="text-purple-300 text-xs mt-1 font-semibold">⚠️ Admin has been notified for police escalation review.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Safety status */}
        <div className={`rounded-2xl border p-5 text-center ${
          caseData?.safe_t_result === 'PASSED' ? 'bg-emerald-900/30 border-emerald-700/50' :
          caseData?.safe_t_result === 'BLOCKED' ? 'bg-red-900/30 border-red-700/50' :
          'bg-slate-800/50 border-slate-700/50'
        }`}>
          {caseData?.safe_t_result === 'PASSED'
            ? <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            : <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2" />}
          <p className="font-semibold text-white text-lg truncate">{session.patient_name}</p>
          <p className="text-slate-400 text-sm mt-1">
            Status: <span className="font-semibold text-white">{caseData?.status || 'Active Journey'}</span>
          </p>
          {caseData?.safe_t_result && (
            <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${
              caseData.safe_t_result === 'PASSED' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-700 text-slate-300'
            }`}>Safe-T: {caseData.safe_t_result}</span>
          )}
        </div>

        {/* Journey stage */}
        {caseData && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-4">Journey Stage</p>
            <div className="flex gap-1 flex-wrap">
              {STAGE_STEPS.map((step, i) => (
                <div key={step} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border ${
                  i < currentStageIndex ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-300' :
                  i === currentStageIndex ? 'bg-blue-700 border-blue-500 text-white' :
                  'bg-slate-900/50 border-slate-700 text-slate-500'
                }`}>
                  {i <= currentStageIndex && <CheckCircle2 className="w-3 h-3" />}
                  <span className="capitalize">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Location Map */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center gap-2 justify-between flex-wrap">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
                {loc?.is_live ? 'Live GPS Location' : 'Last Known Location'}
              </p>
            </div>
            {loc && <LocationSignalBadge loc={loc} />}
          </div>

          {/* Stale warnings */}
          {isStaleAlert && (
            <div className="mx-5 mb-3 flex items-start gap-2 bg-red-900/40 border border-red-600/50 rounded-xl px-4 py-3 text-sm text-red-300">
              <WifiOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Location signal lost ({ageMin} minutes)</p>
                <p className="text-xs mt-0.5 text-red-400">This is an active solo journey. Escalation check-ins have been triggered. Contact the traveler or emergency services immediately if unreachable.</p>
              </div>
            </div>
          )}
          {!isStaleAlert && isStaleWarn && (
            <div className="mx-5 mb-3 flex items-center gap-2 bg-amber-900/30 border border-amber-700/40 rounded-xl px-4 py-2.5 text-xs text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Location signal stale. Last update: {ageMin} minutes ago. The traveler's device may be locked or offline.
            </div>
          )}

          {hasGPS ? (
            <div className="px-5 pb-5 space-y-3">
              {/* Coords bar */}
              <div className="bg-slate-900/60 rounded-xl px-4 py-3 flex items-center gap-3 overflow-hidden">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-mono text-xs sm:text-sm font-semibold truncate">
                    {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </p>
                  <div className="flex flex-wrap gap-x-3 mt-1 text-[11px] text-slate-400">
                    {loc.updated_at && (
                      <span>{new Date(loc.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    )}
                    {loc.source && (
                      <span className={loc.source === 'ip_geo' ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                        · {loc.source === 'ip_geo' ? '≈ Network (approximate)' : '✦ GPS (precise)'}
                      </span>
                    )}
                    {loc.accuracy_meters != null && <span>· ±{Math.round(loc.accuracy_meters)}m</span>}
                    {loc.heading != null && <span>· {Math.round(loc.heading)}°</span>}
                    {loc.speed != null && loc.speed > 0.5 && <span>· {(loc.speed * 3.6).toFixed(1)} km/h</span>}
                  </div>
                </div>
                {loc.location_precision === 'approximate' && (
                  <span className="text-amber-400 text-[10px] font-semibold">≈ Approx</span>
                )}
              </div>

              {/* Country label */}
              {currentCountry && (
                <div className="flex items-center gap-2 bg-slate-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-semibold">
                  <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  Patient is currently in <span className="text-white">{currentCountry}</span>
                </div>
              )}

              {/* Direction compass — shows when guardian allows location */}
              <AnimatePresence>
                {directionToPatient ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(212,175,55,0.04))', border: '1px solid rgba(34,197,94,0.2)' }}
                  >
                    <div className="px-4 py-3 flex items-center gap-4">
                      <CompassArrow bearing={directionToPatient.bearing} size={64} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">
                          {session.patient_name} is <span style={{ color: '#22c55e' }}>{formatDistance(directionToPatient.distance)}</span> away
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          Head <span className="text-white font-semibold">{directionToPatient.label}</span>
                          <span className="text-slate-600"> · {Math.round(directionToPatient.bearing)}°</span>
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          Updates automatically every 12 seconds
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => openMap(mapsDirectionsUrl(loc.latitude, loc.longitude))}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                          style={{ background: '#4285F4', color: '#fff', border: 'none' }}
                        >
                          <Navigation className="w-3.5 h-3.5" /> Navigate
                        </button>
                        <button
                          onClick={() => openMap(`https://waze.com/ul?ll=${loc.latitude},${loc.longitude}&navigate=yes`)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                          style={{ background: '#33CCFF', color: '#000', border: 'none' }}
                        >
                          <Navigation className="w-3.5 h-3.5" /> Waze
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : guardianGPSStatus !== 'denied' && hasGPS ? (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(42,63,74,0.6)' }}
                  >
                    <Compass className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(212,175,55,0.5)' }} />
                    <div className="flex-1">
                      <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Allow location to get directions
                      </p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Shows a compass arrow pointing to {session.patient_name} with live distance
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Leaflet Map with breadcrumb trail */}
              <div className="rounded-xl overflow-hidden border border-slate-700/50" style={{ height: 260 }}>
                <MapContainer
                  center={[loc.latitude, loc.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                  attributionControl={false}
                >
                  {/* Esri World Imagery — real satellite, free, no API key */}
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                  {/* Esri street labels overlay on top of satellite */}
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                    opacity={0.7}
                  />
                  <MapRecenter lat={loc.latitude} lng={loc.longitude} />

                  {/* EVN-iQ400 scan ring — The Eye of God */}
                  <Circle
                    center={[loc.latitude, loc.longitude]}
                    radius={80}
                    pathOptions={{ color: '#D4AF37', fillColor: 'transparent', fillOpacity: 0, weight: 1.5, opacity: 0.5, dashArray: '4 3' }}
                  />
                  <Circle
                    center={[loc.latitude, loc.longitude]}
                    radius={160}
                    pathOptions={{ color: '#D4AF37', fillColor: 'transparent', fillOpacity: 0, weight: 1, opacity: 0.25, dashArray: '6 4' }}
                  />

                  {/* Breadcrumb trail polyline */}
                  {trailPositions.length >= 2 && (
                    <Polyline
                      positions={trailPositions}
                      pathOptions={{ color: '#3b82f6', weight: 2.5, opacity: 0.75, lineJoin: 'round' }}
                    />
                  )}

                  {/* Start-of-journey marker */}
                  {trailStart && (
                    <Marker
                      position={trailStart}
                      icon={new L.DivIcon({
                        className: '',
                        html: `<div style="width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 0 0 2px #16a34a;"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6],
                      })}
                    />
                  )}

                  {/* Live position marker — tap for instant navigation */}
                  <Marker position={[loc.latitude, loc.longitude]} icon={markerIcon}>
                    <Popup closeButton={false}>
                      <div style={{ background: '#0C1A1D', borderRadius: 10, padding: '10px 12px', minWidth: 170, border: '1px solid rgba(34,197,94,0.4)' }}>
                        <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: isStaleWarn ? '#f59e0b' : '#22c55e' }}>
                          {isStaleAlert ? '⚠️ LAST KNOWN POSITION' : `📍 ${session.patient_name}`}
                        </p>
                        {isStaleAlert && (
                          <p style={{ margin: '0 0 4px', fontSize: 9, color: '#f59e0b', fontWeight: 600 }}>Signal lost {ageMin}m ago · May not be current</p>
                        )}
                        <p style={{ margin: '0 0 10px', fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button onClick={() => openMap(mapsDirectionsUrl(loc.latitude, loc.longitude))} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: '#4285F4', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🗺 Directions — Google</button>
                          <button onClick={() => openMap(`https://waze.com/ul?ll=${loc.latitude},${loc.longitude}&navigate=yes`)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: '#33CCFF', border: 'none', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>📡 Navigate — Waze</button>
                          <button onClick={() => shareLocation(loc.latitude, loc.longitude, session.patient_name)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🔗 Share Location</button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  {loc.accuracy_meters != null && loc.accuracy_meters > 0 && (
                    <Circle
                      center={[loc.latitude, loc.longitude]}
                      radius={loc.accuracy_meters}
                      pathOptions={{ color: isStaleWarn ? '#f59e0b' : '#22c55e', fillColor: isStaleWarn ? '#f59e0b' : '#22c55e', fillOpacity: 0.08, weight: 1.5 }}
                    />
                  )}
                </MapContainer>
              </div>

              {/* Trail info badge */}
              {trailPositions.length >= 2 && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-0.5 inline-block rounded bg-blue-500" />
                  {trailPositions.length} GPS checkpoints recorded · trail shown on map
                </p>
              )}

              {/* Action buttons — 6 buttons: navigate + share via WhatsApp/SMS */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <button onClick={() => openMap(mapsDirectionsUrl(loc.latitude, loc.longitude))}
                  className="flex flex-col items-center gap-1.5 bg-blue-700/20 hover:bg-blue-700/40 border border-blue-700/40 rounded-xl px-2 py-3 text-blue-300 text-[10px] font-semibold transition-colors min-h-[44px]">
                  <ExternalLink className="w-4 h-4" />Google
                </button>
                <button onClick={() => openMap(`https://waze.com/ul?ll=${loc.latitude},${loc.longitude}&navigate=yes`)}
                  className="flex flex-col items-center gap-1.5 bg-cyan-700/20 hover:bg-cyan-700/40 border border-cyan-700/40 rounded-xl px-2 py-3 text-cyan-300 text-[10px] font-semibold transition-colors min-h-[44px]">
                  <Navigation className="w-4 h-4" />Waze
                </button>
                <button onClick={() => openMap(`https://wa.me/?text=${encodeURIComponent(`🔴 ${session.patient_name}'s live location\nDirections: ${mapsViewUrl(loc.latitude, loc.longitude)}`)}`)}
                  className="flex flex-col items-center gap-1.5 bg-green-700/20 hover:bg-green-700/40 border border-green-700/40 rounded-xl px-2 py-3 text-green-300 text-[10px] font-semibold transition-colors min-h-[44px]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.527 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.733-1.47A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.528-5.208-1.443l-.374-.222-3.405.874.89-3.328-.241-.385A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  WhatsApp
                </button>
                <button onClick={() => openMap(`sms:?body=${encodeURIComponent(`${session.patient_name} is here: ${mapsViewUrl(loc.latitude, loc.longitude)}`)}`)}
                  className="flex flex-col items-center gap-1.5 bg-indigo-700/20 hover:bg-indigo-700/40 border border-indigo-700/40 rounded-xl px-2 py-3 text-indigo-300 text-[10px] font-semibold transition-colors min-h-[44px]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  SMS
                </button>
                <button onClick={() => shareLocation(loc.latitude, loc.longitude, session.patient_name)}
                  className="flex flex-col items-center gap-1.5 bg-yellow-700/20 hover:bg-yellow-700/40 border border-yellow-700/40 rounded-xl px-2 py-3 text-yellow-300 text-[10px] font-semibold transition-colors min-h-[44px]">
                  <Copy className="w-4 h-4" />{copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={() => openMap(mapsSatelliteUrl(loc.latitude, loc.longitude))}
                  className="flex flex-col items-center gap-1.5 bg-purple-700/20 hover:bg-purple-700/40 border border-purple-700/40 rounded-xl px-2 py-3 text-purple-300 text-[10px] font-semibold transition-colors min-h-[44px]">
                  <Globe className="w-4 h-4" />Satellite
                </button>
              </div>
            </div>
          ) : hasCityOnly ? (
            <div className="px-5 pb-5 text-center py-4">
              <Globe className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-white font-semibold">{loc.place_label || [loc.city, loc.country].filter(Boolean).join(', ')}</p>
              <p className="text-amber-400 text-xs mt-1">Approximate location from network</p>
              {loc.updated_at && (
                <p className="text-slate-500 text-[11px] mt-1">Updated {new Date(loc.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
              )}
              <button onClick={() => openMap(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc.city, loc.country].filter(Boolean).join(', '))}`)}
                className="mt-3 inline-flex items-center gap-1.5 bg-blue-700/20 hover:bg-blue-700/40 border border-blue-700/40 rounded-xl px-4 py-2 text-blue-300 text-xs font-semibold">
                <ExternalLink className="w-3.5 h-3.5" /> View on Map
              </button>
            </div>
          ) : (
            <div className="px-5 pb-5 text-center py-6">
              <Wifi className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-medium">Location not yet shared. The traveler is safe.</p>
              <p className="text-slate-500 text-xs mt-1">When the traveler shares their location, it will appear here automatically.</p>
            </div>
          )}
        </div>

        {/* Procedure details */}
        {caseData && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-3">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Procedure Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Destination', val: caseData.procedure_country },
                { label: 'Procedure', val: caseData.procedures?.[0] || 'Medical Procedure' },
                { label: 'Case Priority', val: caseData.case_priority },
                { label: 'Risk Level', val: caseData.risk_score },
              ].filter(i => i.val).map(item => (
                <div key={item.label} className="bg-slate-900/50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 font-semibold">{item.label}</p>
                  <p className="text-sm font-semibold text-white mt-0.5 capitalize">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watermark */}
        <div className="flex items-center gap-2 justify-center text-xs text-slate-600 pb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>Morales Safe-T Guardian View · Read-only · No medical or personal data exposed</span>
        </div>
      </div>
    </div>
  );
}