/**
 * SoloSafetyBeaconStatus
 * Compact beacon status bar shown on dashboard/safety pages for active solo travelers.
 * Wires useSoloSafetyBeacon and shows current state clearly.
 */
import React from 'react';
import { Radio, Navigation, Globe, WifiOff, Pause, AlertTriangle } from 'lucide-react';
import { useSoloSafetyBeacon } from '@/hooks/useSoloSafetyBeacon';

export default function SoloSafetyBeaconStatus({ caseId, caseStatus, isSoloTraveler }) {
  const { beaconActive, lastLocation, gpsStatus, lastLoggedAt, requestGPS } = useSoloSafetyBeacon({
    caseId, caseStatus, isSoloTraveler,
  });

  if (!isSoloTraveler || !caseId) return null;

  const isProcedurePause = caseStatus === 'Procedure-In-Progress' || caseStatus === 'SURGICAL_EXECUTION_WINDOW';

  if (isProcedurePause) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
        <Pause className="w-3.5 h-3.5 flex-shrink-0" />
        <span><strong>Safety beacon paused</strong> — medical procedure in progress</span>
      </div>
    );
  }

  if (!beaconActive) return null;

  const isGPS = gpsStatus === 'active';
  const isIpFallback = gpsStatus === 'ip_fallback';
  const isDenied = gpsStatus === 'denied';

  return (
    <div className={`rounded-xl border px-4 py-3 text-xs space-y-1.5 ${
      isGPS ? 'bg-emerald-50 border-emerald-200' :
      isIpFallback ? 'bg-blue-50 border-blue-200' :
      isDenied ? 'bg-amber-50 border-amber-200' :
      'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full animate-pulse flex-shrink-0 ${
          isGPS ? 'bg-emerald-500' : isIpFallback ? 'bg-blue-500' : 'bg-amber-500'
        }`} />
        <Radio className={`w-3.5 h-3.5 flex-shrink-0 ${isGPS ? 'text-emerald-600' : isIpFallback ? 'text-blue-600' : 'text-amber-600'}`} />
        <span className={`font-semibold ${isGPS ? 'text-emerald-800' : isIpFallback ? 'text-blue-800' : 'text-amber-800'}`}>
          Safety beacon active
          {isGPS && ' · Precise GPS'}
          {isIpFallback && ' · Approximate network location'}
          {isDenied && ' · GPS permission denied'}
        </span>
      </div>

      {isDenied && (
        <div className="flex items-center gap-2 text-amber-700">
          <WifiOff className="w-3 h-3 flex-shrink-0" />
          <span>Precise GPS is off. Only approximate network location is being shared.</span>
          <button onClick={requestGPS} className="ml-1 underline font-semibold">Enable GPS</button>
        </div>
      )}

      {lastLocation && (
        <div className="flex items-center gap-1.5 text-slate-500">
          {isGPS ? <Navigation className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
          {lastLocation.latitude != null
            ? `${lastLocation.latitude.toFixed(5)}, ${lastLocation.longitude.toFixed(5)}`
            : lastLocation.place_label || 'Location detected'}
          {lastLocation.accuracy_meters != null && ` · ±${Math.round(lastLocation.accuracy_meters)}m`}
        </div>
      )}

      {lastLoggedAt && (
        <p className="text-slate-400">Last logged: {new Date(lastLoggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      )}
    </div>
  );
}