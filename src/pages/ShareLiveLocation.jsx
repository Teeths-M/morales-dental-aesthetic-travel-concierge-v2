import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield, MapPin, Loader2, CheckCircle2, AlertTriangle, StopCircle, RefreshCw } from 'lucide-react';

// ShareLiveLocation — public, token-gated page (/share-location/:token).
// M-Care sends this secure link to a patient who reported feeling unsafe.
// The patient opens it on their phone, consents once, and their device GPS
// streams into the LiveLocation record tied to their case. No login required.

export default function ShareLiveLocation() {
  const { token } = useParams();
  const [ctx, setCtx] = useState(null);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [linkError, setLinkError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [stopping, setStopping] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [batteryCriticalAlerted, setBatteryCriticalAlerted] = useState(false);
  const watchIdRef = useRef(null);
  const tickRef = useRef(null);

  // Battery warning (PRD §5): GPS streaming drains battery. Warn the driver at
  // <20% so they plug in, and silently alert the care team at <10% so they know
  // tracking may drop. navigator.getBattery is best-effort — not all browsers.
  useEffect(() => {
    let bat;
    const update = () => {
      if (bat?.level != null) setBatteryLevel(Math.round(bat.level * 100));
    };
    if ('getBattery' in navigator) {
      navigator.getBattery().then((b) => {
        bat = b;
        update();
        b.addEventListener('levelchange', update);
      }).catch(() => {});
    }
    return () => { if (bat) bat.removeEventListener('levelchange', update); };
  }, []);

  useEffect(() => {
    if (batteryLevel != null && batteryLevel <= 10 && !batteryCriticalAlerted && token) {
      setBatteryCriticalAlerted(true);
      try {
        base44.functions.invoke('storeSafetySignal', {
          signal_type: 'driver_battery_critical',
          context: { battery_level: batteryLevel, token },
        }).catch(() => {});
      } catch (_) {}
    }
  }, [batteryLevel, batteryCriticalAlerted, token]);

  const loadContext = async () => {
    setLoadingCtx(true);
    try {
      const res = await base44.functions.invoke('getLiveLocationRequest', { token });
      setCtx(res);
      if (res?.status === 'active') setSharing(true);
    } catch (e) {
      setLinkError(e?.message || 'This location-sharing link could not be loaded.');
    } finally {
      setLoadingCtx(false);
    }
  };

  useEffect(() => {
    if (token) loadContext();
    else { setLinkError('No token provided.'); setLoadingCtx(false); }
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [token]);

  const sendUpdate = async (coords) => {
    try {
      await base44.functions.invoke('storeLiveLocationUpdate', {
        token,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_meters: coords.accuracy,
        heading: coords.heading,
        speed: coords.speed,
        altitude: coords.altitude,
      });
      setLastUpdate(new Date());
      setGeoError('');
    } catch (e) {
      setGeoError(e?.message || 'Failed to send location update.');
    }
  };

  const startSharing = () => {
    if (!navigator.geolocation) { setGeoError('Your device does not support location sharing.'); return; }
    setGeoError('');
    setStopped(false);
    setSharing(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendUpdate(pos.coords),
      (err) => {
        const msg = err.code === err.PERMISSION_DENIED
          ? 'Location permission was denied. Please allow location access in your browser to share with M-Care.'
          : err.code === err.POSITION_UNAVAILABLE
          ? 'Your location is unavailable right now. M-Care will keep trying.'
          : 'Location is taking too long to read. M-Care will keep trying.';
        setGeoError(msg);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    // refresh "x sec ago" label
    tickRef.current = setInterval(() => setLastUpdate((d) => d), 1000);
  };

  const stopSharing = async () => {
    setStopping(true);
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    try {
      await base44.functions.invoke('storeLiveLocationUpdate', { token, action: 'revoke' });
    } catch (_) { /* best-effort */ }
    setSharing(false);
    setStopped(true);
    setStopping(false);
  };

  if (loadingCtx) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying your secure link…</p>
        </div>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-display font-semibold text-foreground mb-2">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">{linkError}</p>
          <p className="text-xs text-muted-foreground mt-4">If M-Care sent you this link, ask them to send a fresh one.</p>
        </div>
      </div>
    );
  }

  const firstName = (ctx?.patient_name || '').split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: '#D4AF37', color: '#060B16' }}>
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-display font-semibold text-foreground">
              {firstName ? `Hi ${firstName}` : 'Hello'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">M-Care is requesting your live location</p>
          </div>

          {/* Reason */}
          {ctx?.reason && (
            <div className="rounded-xl border border-border bg-card p-4 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Why</p>
              <p className="text-sm text-card-foreground">{ctx.reason}</p>
            </div>
          )}

          {/* Privacy notice */}
          <div className="rounded-xl border border-border bg-secondary/40 p-4 mb-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you tap <span className="font-medium text-foreground">Share my location</span>, your device will send your live GPS to Morales securely. We share it only with your care team so they can keep you safe. You can <span className="font-medium text-foreground">stop sharing at any time</span> — no one is watching unless you say so.
            </p>
          </div>

          {/* Battery warning (driver-side reliability) */}
          {batteryLevel != null && batteryLevel <= 20 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Your phone battery is at {batteryLevel}%. Plug it in to keep location sharing active for your passenger.
              </p>
            </div>
          )}

          {/* Not sharing yet */}
          {!sharing && !stopped && (
            <Button onClick={startSharing} className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <MapPin className="w-5 h-5" /> Share my live location
            </Button>
          )}

          {/* Actively sharing */}
          {sharing && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Sharing live location</p>
                  <p className="text-xs text-muted-foreground">
                    {lastUpdate ? `Updated ${secondsAgo(lastUpdate)} ago` : 'Sending first reading…'}
                  </p>
                </div>
                <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" style={{ animationDuration: '3s' }} />
              </div>

              {geoError && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-900 dark:text-amber-200">{geoError}</p>
                </div>
              )}

              <Button onClick={stopSharing} disabled={stopping} variant="outline" className="w-full h-11 border-destructive/40 text-destructive hover:bg-destructive/10">
                <StopCircle className="w-5 h-5" /> {stopping ? 'Stopping…' : 'Stop sharing'}
              </Button>
            </div>
          )}

          {/* Stopped */}
          {stopped && (
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground mb-1">Sharing stopped</p>
              <p className="text-xs text-muted-foreground mb-4">M-Care can no longer see your location.</p>
              <Button onClick={startSharing} variant="outline" className="w-full">
                <MapPin className="w-4 h-4" /> Share again
              </Button>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/80 text-center mt-6">
            Link expires {fmtExpiry(ctx?.expires_at)}. Your location is stored only while sharing is active.
          </p>
        </div>
      </div>
    </div>
  );
}

function secondsAgo(d) {
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function fmtExpiry(iso) {
  if (!iso) return 'soon';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'soon';
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return `in ${h}h`;
  const m = Math.floor(diff / 60000);
  return `in ${m}m`;
}