import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Car, CheckCircle2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

// DriverMapWidget — renders inline inside the M-Care chat conversation right
// after a ride is dispatched. Polls getDriverLocationStatus every 10 seconds
// with the RecoveryTransportRequest id the M-Care dispatch reply named, and
// shows the matched driver's live approaching GPS as a compact SVG map with:
//   (a) the driver's moving blue dot (labelled with first name)
//   (b) the traveler's own violet dot ('You') at the pickup point
//   (c) a dashed route line between them
//   (d) the visual safety code as a gold badge below the map (always visible)
// Drives the full state machine: waiting → on the way → arrived → ended, with
// stale-data handling (gray dot + 'signal lost' after 60s) and a 5-minute
// fallback that shows the safety code if the driver never shares. Stops
// polling once the ride is arrived / completed / cancelled or the driver link
// is revoked / expired — never polls indefinitely.

const POLL_MS = 10_000;
const STALE_MS = 60_000;
const FALLBACK_MS = 5 * 60_000;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function secondsAgo(d) {
  if (!d) return null;
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export default function DriverMapWidget({ transportId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispatchedAt, setDispatchedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef(null);
  const stoppedRef = useRef(false);

  const poll = async () => {
    try {
      const res = await base44.functions.invoke('getDriverLocationStatus', { transport_request_id: transportId });
      if (stoppedRef.current) return;
      setData(res);
      setError('');
      // Capture dispatch time for the 5-min fallback clock (derive from the
      // first successful poll — close enough; the real dispatched_at is on the
      // transport record but isn't returned, so we start the clock on first load).
      if (!dispatchedAt) setDispatchedAt(Date.now());
      // Stop polling once the ride reached a terminal state.
      const terminal = ['arrived', 'completed', 'cancelled'].includes(res?.transport_status)
        || ['revoked', 'expired'].includes(res?.driver_request_status);
      if (terminal) {
        stoppedRef.current = true;
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (e) {
      if (stoppedRef.current) return;
      setError(e?.message || 'Could not load driver location.');
    } finally {
      if (!stoppedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stoppedRef.current = true;
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transportId]);

  if (loading && !data) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Locating your driver…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const transportStatus = data?.transport_status;
  const driverReqStatus = data?.driver_request_status;
  const driverAssigned = data?.driver_assigned;
  const driverName = data?.driver_name || 'Your driver';
  const driverFirst = driverName.split(' ')[0];
  const visualCode = data?.visual_code || '';
  const driverLoc = data?.driver_location;
  const pickupLat = data?.pickup_latitude;
  const pickupLng = data?.pickup_longitude;
  const isStale = data?.is_stale || (driverLoc && driverLoc.updated_at && (now - new Date(driverLoc.updated_at).getTime()) > STALE_MS);
  const isArrived = transportStatus === 'arrived';
  const isEnded = ['completed', 'cancelled'].includes(transportStatus) || ['revoked', 'expired'].includes(driverReqStatus);
  const minutesSinceDispatch = dispatchedAt ? (now - dispatchedAt) / 60000 : 0;
  const noShareFallback = !driverLoc && minutesSinceDispatch >= 5;

  // ── Render states ──────────────────────────────────────────────────────────
  let statusLabel = 'Waiting for driver to share location';
  let statusColor = 'amber';
  if (isEnded) { statusLabel = 'Location sharing ended'; statusColor = 'muted'; }
  else if (isArrived) { statusLabel = 'Driver has arrived'; statusColor = 'emerald'; }
  else if (driverLoc && isStale) { statusLabel = `Driver signal lost — last seen ${secondsAgo(driverLoc.updated_at)} ago`; statusColor = 'amber'; }
  else if (driverLoc) { statusLabel = `${driverFirst} is on the way${data?.eta_minutes != null ? ` · ~${data.eta_minutes} min` : ''}`; statusColor = 'emerald'; }
  else if (!driverAssigned) { statusLabel = 'No driver assigned yet'; statusColor = 'amber'; }

  const showLive = driverLoc && !isStale && !isArrived && !isEnded;

  // ── SVG map ────────────────────────────────────────────────────────────────
  const W = 300, H = 150;
  const renderMap = driverLoc && pickupLat != null && pickupLng != null;
  let driverX = W * 0.25, driverY = H * 0.7, youX = W * 0.75, youY = H * 0.3;
  if (renderMap) {
    const lats = [driverLoc.latitude, pickupLat];
    const lngs = [driverLoc.longitude, pickupLng];
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const padLat = (maxLat - minLat) * 0.2 + 0.0005;
    const padLng = (maxLng - minLng) * 0.2 + 0.0005;
    const loLat = minLat - padLat, hiLat = maxLat + padLat;
    const loLng = minLng - padLng, hiLng = maxLng + padLng;
    const toX = (lng) => ((lng - loLng) / (hiLng - loLng)) * (W - 40) + 20;
    const toY = (lat) => (1 - (lat - loLat) / (hiLat - loLat)) * (H - 40) + 20;
    driverX = toX(driverLoc.longitude); driverY = toY(driverLoc.latitude);
    youX = toX(pickupLng); youY = toY(pickupLat);
  }

  const dotColor = isStale ? '#9ca3af' : '#3b82f6';

  return (
    <div className="mt-2 max-w-[300px]">
      <div className="relative rounded-xl overflow-hidden border border-border" style={{ background: '#0f172a' }}>
        {/* Live indicator */}
        {showLive && (
          <div className="absolute top-2 left-2.5 flex items-center gap-1.5 z-10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[8px] text-emerald-400 font-semibold uppercase tracking-widest">Live · 10s</span>
          </div>
        )}
        {isStale && !isEnded && (
          <div className="absolute top-2 left-2.5 flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
            <span className="text-[8px] text-amber-400 font-semibold uppercase tracking-widest">Signal lost</span>
          </div>
        )}

        {/* SVG map (or placeholder) */}
        {renderMap ? (
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ height: 150 }}>
            {[0.25, 0.5, 0.75].map((f) => (
              <React.Fragment key={f}>
                <line x1={f * W} y1="0" x2={f * W} y2={H} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" y1={f * H} x2={W} y2={f * H} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              </React.Fragment>
            ))}
            {/* Route line driver → you */}
            <line x1={driverX} y1={driverY} x2={youX} y2={youY} stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" strokeDasharray="4,3" />
            {/* Driver dot */}
            <circle cx={driverX} cy={driverY} r="9" fill={dotColor} opacity="0.2" />
            <circle cx={driverX} cy={driverY} r="5" fill={dotColor} />
            <text x={driverX} y={driverY - 11} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.8)">{driverFirst}</text>
            {/* You dot */}
            <circle cx={youX} cy={youY} r="8" fill="#8b5cf6" opacity="0.2" />
            <circle cx={youX} cy={youY} r="4.5" fill="#8b5cf6" />
            <text x={youX} y={youY - 11} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.8)">You</text>
          </svg>
        ) : (
          <div className="flex flex-col items-center justify-center text-center px-4" style={{ height: 150 }}>
            {isArrived ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mb-1.5" />
            ) : isEnded ? (
              <WifiOff className="w-6 h-6 text-slate-400 mb-1.5" />
            ) : (
              <Car className="w-6 h-6 text-slate-400 mb-1.5" />
            )}
            <p className="text-[11px] text-slate-300 font-medium">{statusLabel}</p>
            {!driverLoc && !isEnded && !isArrived && (
              <p className="text-[9px] text-slate-500 mt-0.5">Waiting for {driverFirst} to tap their share link…</p>
            )}
          </div>
        )}
      </div>

      {/* Status line */}
      <div className="flex items-center justify-between mt-1.5 px-0.5">
        <span className={`text-[11px] font-medium ${
          statusColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
          : statusColor === 'amber' ? 'text-amber-600 dark:text-amber-400'
          : 'text-muted-foreground'
        }`}>{statusLabel}</span>
        {driverLoc?.updated_at && !isEnded && (
          <span className="text-[9px] text-muted-foreground">Updated {secondsAgo(driverLoc.updated_at)} ago</span>
        )}
      </div>

      {/* 5-minute fallback: safety code always visible */}
      {noShareFallback && (
        <div className="mt-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-900 dark:text-amber-200">
          Driver location not shared yet — your safety code is below. Show it to your driver when they arrive.
        </div>
      )}

      {/* Visual safety code — always visible alongside the map (PRD) */}
      {visualCode && (
        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)' }}>
          <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Safety code</span>
          <span className="text-xs font-bold" style={{ color: '#D4AF37' }}>{visualCode}</span>
        </div>
      )}

      {/* Arrived confirmation affordance — lets the traveler mark arrived if the
          geofence didn't fire (GPS jitter) so the widget stops cleanly. */}
      {driverLoc && !isArrived && !isEnded && (
        <button
          type="button"
          onClick={async () => {
            try { await base44.functions.invoke('markTransportArrived', { transport_request_id: transportId }); poll(); } catch (_) {}
          }}
          className="mt-1.5 text-[10px] text-muted-foreground underline hover:text-foreground"
        >
          My driver is here
        </button>
      )}
    </div>
  );
}