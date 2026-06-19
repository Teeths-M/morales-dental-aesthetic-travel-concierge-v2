/**
 * LiveBeaconPanel
 * Visible UI for the solo traveler's live location beacon.
 * Shows Start/Stop controls, GPS status, privacy notice, and guardian link copy.
 */
import React, { useState } from 'react';
import { Radio, Navigation, Globe, WifiOff, Pause, Play, Copy, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { useLiveLocationBeacon } from '@/hooks/useLiveLocationBeacon';
import { base44 } from '@/api/base44Client';

const STATUS_CONFIG = {
  idle:        { label: 'Beacon off',              color: 'text-slate-400',   dot: 'bg-slate-400' },
  requesting:  { label: 'Requesting GPS...',        color: 'text-amber-400',   dot: 'bg-amber-400 animate-pulse' },
  active:      { label: 'Live GPS · Beacon active', color: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
  denied:      { label: 'GPS denied',               color: 'text-amber-400',   dot: 'bg-amber-400' },
  ip_fallback: { label: 'Network location fallback',color: 'text-blue-400',    dot: 'bg-blue-400 animate-pulse' },
  unavailable: { label: 'Location unavailable',     color: 'text-red-400',     dot: 'bg-red-400' },
  paused:      { label: 'Beacon paused',            color: 'text-slate-400',   dot: 'bg-slate-400' },
};

export default function LiveBeaconPanel({ caseId, caseStatus, guardianToken, isAdmin = false }) {
  const [beaconEnabled, setBeaconEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const { status, lastUpdate, currentLocation, isPaused, pause, resume } = useLiveLocationBeacon({
    caseId,
    caseStatus,
    enabled: beaconEnabled,
  });

  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const isRunning = beaconEnabled && !isPaused;
  const appUrl = window.location.origin;
  const guardianLink = guardianToken ? `${appUrl}/guardian/${guardianToken}` : null;

  const copyGuardianLink = () => {
    if (!guardianLink) return;
    navigator.clipboard.writeText(guardianLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Admin test: simulate small movement
  const simulateMovement = async () => {
    if (!caseId || simulating) return;
    setSimulating(true);
    const baseLat = currentLocation?.lat ?? 10.4806;
    const baseLng = currentLocation?.lng ?? -66.9036;
    const jitter = () => (Math.random() - 0.5) * 0.002;
    try {
      await base44.functions.invoke('updateLiveLocation', {
        case_id: caseId,
        latitude: baseLat + jitter(),
        longitude: baseLng + jitter(),
        accuracy_meters: 15,
        source: 'gps',
      });
    } catch (_) {}
    setSimulating(false);
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
        <Radio className={`w-4 h-4 flex-shrink-0 ${sc.color}`} />
        <span className={`text-sm font-semibold ${sc.color}`}>{sc.label}</span>
        {lastUpdate && (
          <span className="ml-auto text-[10px] text-slate-500">
            Last sent {new Date(lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {/* Current coords */}
      {currentLocation && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          {currentLocation.source === 'gps' ? <Navigation className="w-3 h-3 text-emerald-400" /> : <Globe className="w-3 h-3 text-blue-400" />}
          {currentLocation.lat?.toFixed(6)}, {currentLocation.lng?.toFixed(6)}
          {currentLocation.accuracy != null && <span className="text-slate-500"> ±{Math.round(currentLocation.accuracy)}m</span>}
          {currentLocation.heading != null && <span className="text-slate-500"> {Math.round(currentLocation.heading)}°</span>}
        </div>
      )}

      {/* GPS denied warning */}
      {status === 'denied' && (
        <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-700/40 rounded-xl px-3 py-2.5 text-xs text-amber-300">
          <WifiOff className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>GPS permission denied. Using approximate network location. Enable browser location permissions for precise tracking.</span>
        </div>
      )}

      {/* Privacy notice — always visible when beacon enabled */}
      {beaconEnabled && (
        <div className="flex items-start gap-2 bg-blue-950/50 border border-blue-800/40 rounded-xl px-3 py-2.5 text-[11px] text-blue-300">
          <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            Live location sharing is active for your solo safety protocol. Your guardian can see your last known GPS location while this safety link is active. Browser tracking works while the app is open — if updates stop, we will escalate check-ins automatically.
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        {!isRunning ? (
          <button
            onClick={() => { setBeaconEnabled(true); if (isPaused) resume(); }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Start Safety Beacon
          </button>
        ) : (
          <button
            onClick={() => { pause(); }}
            className="flex items-center gap-1.5 bg-amber-600/80 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            <Pause className="w-3.5 h-3.5" /> Pause Beacon
          </button>
        )}

        {guardianLink && (
          <button
            onClick={copyGuardianLink}
            className="flex items-center gap-1.5 border border-slate-600 text-slate-300 hover:bg-slate-700/50 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Guardian Live Link'}
          </button>
        )}
      </div>

      {/* Admin demo controls */}
      {isAdmin && (
        <div className="pt-1 border-t border-slate-700/50">
          <button
            onClick={simulateMovement}
            disabled={simulating || !caseId}
            className="flex items-center gap-1.5 bg-purple-800/40 border border-purple-600/40 hover:bg-purple-700/50 text-purple-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <AlertTriangle className="w-3 h-3" />
            {simulating ? 'Simulating...' : '[DEMO] Simulate Movement'}
          </button>
          <p className="text-[10px] text-slate-600 mt-1">Admin only · Sends fake position update to backend</p>
        </div>
      )}
    </div>
  );
}