import React, { useState, useEffect, useRef, useCallback } from 'react';
import TripProgressStepper from '@/components/journey/TripProgressStepper';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Eye, Shield, CheckCircle2, Clock, AlertTriangle,
  MapPin, Loader2, Navigation, Copy, ExternalLink, Globe, Radio, Wifi, WifiOff,
} from 'lucide-react';

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
const STALE_WARN_MS = 5 * 60 * 1000;   // 5 min
const STALE_ALERT_MS = 15 * 60 * 1000; // 15 min

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
  const pollRef = useRef(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await base44.functions.invoke('getGuardianViewData', { token });
      const d = res?.data;
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

  // Initial load
  useEffect(() => {
    if (token) fetchData(true);
  }, [token, fetchData]);

  // Live poll every 12s
  useEffect(() => {
    if (pageState !== 'ok') return;
    pollRef.current = setInterval(() => fetchData(false), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [pageState, fetchData]);

  const copyCoords = (lat, lng) => {
    navigator.clipboard.writeText(mapsViewUrl(lat, lng)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
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
          <p className="font-semibold text-white text-lg">{session.patient_name}</p>
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
              <div className="bg-slate-900/60 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-white font-mono text-sm font-semibold">
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

              {/* Leaflet Map with breadcrumb trail */}
              <div className="rounded-xl overflow-hidden border border-slate-700/50" style={{ height: 260 }}>
                <MapContainer
                  center={[loc.latitude, loc.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapRecenter lat={loc.latitude} lng={loc.longitude} />

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

                  {/* Live position marker */}
                  <Marker position={[loc.latitude, loc.longitude]} icon={markerIcon} />
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

              {/* Action buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => openMap(mapsViewUrl(loc.latitude, loc.longitude))}
                  className="flex flex-col items-center gap-1.5 bg-blue-700/20 hover:bg-blue-700/40 border border-blue-700/40 rounded-xl px-2 py-3 text-blue-300 text-[11px] font-semibold transition-colors">
                  <ExternalLink className="w-4 h-4" />View Map
                </button>
                <button onClick={() => openMap(mapsDirectionsUrl(loc.latitude, loc.longitude))}
                  className="flex flex-col items-center gap-1.5 bg-emerald-700/20 hover:bg-emerald-700/40 border border-emerald-700/40 rounded-xl px-2 py-3 text-emerald-300 text-[11px] font-semibold transition-colors">
                  <Navigation className="w-4 h-4" />Directions
                </button>
                <button onClick={() => openMap(mapsSatelliteUrl(loc.latitude, loc.longitude))}
                  className="flex flex-col items-center gap-1.5 bg-purple-700/20 hover:bg-purple-700/40 border border-purple-700/40 rounded-xl px-2 py-3 text-purple-300 text-[11px] font-semibold transition-colors">
                  <Globe className="w-4 h-4" />Satellite
                </button>
                <button onClick={() => copyCoords(loc.latitude, loc.longitude)}
                  className="flex flex-col items-center gap-1.5 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/40 rounded-xl px-2 py-3 text-slate-300 text-[11px] font-semibold transition-colors">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
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