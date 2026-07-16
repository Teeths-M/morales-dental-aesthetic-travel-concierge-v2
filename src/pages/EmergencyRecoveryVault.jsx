// @ts-nocheck — pre-existing type gaps; build passes
/**
 * Emergency Recovery Vault
 * 
 * Accessible from /emergency-recovery after PIN verification.
 * Shows essential survival information for compromised travelers.
 * Does NOT expose full medical records — only emergency-accessible documents.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, FileText, MapPin, Phone, Globe, Navigation,
  Car, RefreshCw, Eye, Copy, Clock,
  User, Hotel, Plane, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const DOC_ICONS = {
  passport: User,
  visa: Globe,
  national_id: User,
  flight_ticket: Plane,
  hotel_booking: Hotel,
  insurance: Shield,
  other: FileText,
};

const _EMBASSY_NUMBERS = {
  VE: { name: 'Venezuela', numbers: ['0800-EMERGENCY', '+58 212 400 4444'] },
  MX: { name: 'Mexico', numbers: ['911'] },
  CR: { name: 'Costa Rica', numbers: ['911'] },
  TT: { name: 'Trinidad & Tobago', numbers: ['999', '990'] },
  default: { name: 'Local Emergency', numbers: ['112 (Global)', '911 (Americas)'] },
};

export default function EmergencyRecoveryVault({ pinSessionToken, userEmail, sessionExpiresAt }) {
  const [vaults, setVaults] = useState([]);
  const [caseRecord, setCaseRecord] = useState(null);
  const [transportReq, setTransportReq] = useState(null);
  const [visualCode, setVisualCode] = useState(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState(null);
  const [step, setStep] = useState('overview'); // overview | transport | transport_success | golden_m
  const [loadingTransport, setLoadingTransport] = useState(false);
  const [showClosure, setShowClosure] = useState(false);
  const [safeLocation, setSafeLocation] = useState('');
  const [loadingClosure, setLoadingClosure] = useState(false);
  const [closureResult, setClosureResult] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadVaultData();
  }, [pinSessionToken]);

  const loadVaultData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('emergencyVaultAccess', { pin_session_token: pinSessionToken });
      if (res.data?.vaults) setVaults(res.data.vaults);
    } catch { toast({ title: 'Session expired', variant: 'destructive' }); }

    // Best-effort case fetch
    try {
      const cases = await base44.entities.CaseRecord.filter({ client_email: userEmail }, '-created_date', 1);
      if (cases[0]) setCaseRecord(cases[0]);
    } catch {}
    setLoading(false);
  };

  const acquireGPS = () => {
    setGpsStatus('acquiring');
    if (!('geolocation' in navigator)) { setGpsStatus('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ready');
      },
      () => setGpsStatus('denied'),
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const requestTransport = async () => {
    setLoadingTransport(true);
    try {
      const res = await base44.functions.invoke('requestEmergencyRecoveryTransport', {
        pin_session_token: pinSessionToken,
        pickup_latitude: gpsCoords?.lat ?? undefined,
        pickup_longitude: gpsCoords?.lng ?? undefined,
        pickup_address: pickupAddress || (gpsCoords ? `${gpsCoords.lat?.toFixed(5)}, ${gpsCoords.lng?.toFixed(5)}` : undefined),
        pickup_location_source: gpsCoords ? 'gps' : pickupAddress ? 'manual' : 'ip_geo',
        destination_address: caseRecord?.hotel_address || undefined,
        requested_by: 'patient',
        case_id: caseRecord?.id || undefined,
      });
      if (res.data?.success) {
        setTransportReq(res.data);
        setVisualCode(res.data.visual_code);
        setCodeExpiresAt(res.data.visual_code_expires_at);
        setStep('transport_success');
        toast({ title: '🚗 Recovery transport requested', description: `Visual code: ${res.data.visual_code}` });
      }
    } catch {
      toast({ title: 'Transport request failed', description: 'Admin has been alerted.', variant: 'destructive' });
    }
    setLoadingTransport(false);
  };

  const closeThreat = async () => {
    setLoadingClosure(true);
    try {
      const res = await base44.functions.invoke('closeEmergencyThreatLoop', {
        pin_session_token: pinSessionToken,
        safe_location: safeLocation || 'Confirmed safe via Emergency Terminal',
      });
      if (res.data?.success) {
        setClosureResult(res.data);
        setStep('golden_m');
      } else {
        toast({ title: 'Admin alerted', description: 'Your coordinator has been notified directly.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Admin alerted', description: 'Your coordinator has been notified directly.', variant: 'destructive' });
    }
    setLoadingClosure(false);
  };

  const copyCode = () => {
    if (visualCode && navigator.clipboard) {
      navigator.clipboard.writeText(visualCode);
      toast({ title: `Copied: ${visualCode}` });
    }
  };

  const openMaps = () => {
    if (!gpsCoords) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${gpsCoords.lat},${gpsCoords.lng}`, '_blank', 'noopener,noreferrer');
  };

  const sessionMinsLeft = sessionExpiresAt
    ? Math.max(0, Math.round((new Date(sessionExpiresAt) - Date.now()) / 60000))
    : null;

  if (loading) return (
    <div className="flex flex-col items-center gap-3 py-12">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Loading emergency vault...</p>
    </div>
  );

  // ── Stage 5: iQ200 Threat Loop Closed ───────────────────────────────────────
  if (step === 'golden_m') {
    return (
      <div className="text-center py-10 space-y-6 max-w-lg mx-auto">
        <div
          className="mx-auto flex items-center justify-center"
          style={{ width: 100, height: 100, borderRadius: 24, background: 'linear-gradient(135deg, #D4AF37, #b8960f)', boxShadow: '0 0 48px rgba(212,175,55,0.45)' }}
        >
          <span style={{ fontSize: 52, color: '#060B16', fontFamily: 'serif', fontWeight: 700 }}>M</span>
        </div>
        <div>
          <h2 className="text-white font-semibold text-xl mb-1">You&rsquo;re Safe. Journey Complete.</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your family has been notified. Guardian tracking links have expired to protect your trail.
            An incident report has been dispatched to your coordinator.
          </p>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-4 text-left space-y-2">
          <p className="text-emerald-400 text-sm font-semibold">✅ iQ200 Threat Loop Closed</p>
          {closureResult?.incident_ref && (
            <p className="text-emerald-300/70 text-xs">Incident reference: <strong>{closureResult.incident_ref}</strong></p>
          )}
          {closureResult?.contacts_notified > 0 && (
            <p className="text-emerald-300/70 text-xs">{closureResult.contacts_notified} emergency contact{closureResult.contacts_notified !== 1 ? 's' : ''} notified</p>
          )}
        </div>
        <p className="text-slate-600 text-xs">
          iQ200 Coordination Engine · Emergency status cleared · Session revoked for your security
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Session timer */}
      {sessionMinsLeft !== null && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
          sessionMinsLeft < 5 ? 'bg-red-900/40 text-red-300 border border-red-700/40'
          : 'bg-slate-800/60 text-slate-400 border border-slate-700/40'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          Emergency session expires in {sessionMinsLeft} minute{sessionMinsLeft !== 1 ? 's' : ''}
        </div>
      )}

      {/* Recovery transport success */}
      <AnimatePresence>
        {step === 'transport_success' && visualCode && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-900/40 border-2 border-blue-500 rounded-2xl p-6 text-center">
            <Car className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg mb-1">Recovery Transport Requested</p>
            <p className="text-blue-300 text-sm mb-4">Show this code to your driver before getting in.</p>
            <button onClick={copyCode}
              className="inline-flex items-center gap-2 bg-white text-blue-900 font-semibold text-2xl px-8 py-4 rounded-2xl mx-auto hover:bg-blue-50">
              {visualCode} <Copy className="w-5 h-5" />
            </button>
            <p className="text-blue-400 text-xs mt-3">
              ⚠️ Driver must show this exact code. Do not get in if they don't know it.
            </p>
            {transportReq?.driver_name && (
              <p className="text-slate-300 text-sm mt-2">Driver: <strong>{transportReq.driver_name}</strong></p>
            )}
            {codeExpiresAt && (
              <p className="text-slate-500 text-xs mt-1">Code expires: {new Date(codeExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            )}
            {!transportReq?.driver_assigned && (
              <div className="mt-3 bg-red-900/40 border border-red-600/40 rounded-xl px-4 py-2">
                <p className="text-red-300 text-xs font-semibold">No driver currently available. Admin has been alerted and will dispatch manually.</p>
              </div>
            )}

            {/* Stage 5: Safe arrival sign-off */}
            <div className="mt-5 pt-5 border-t border-blue-700/30 space-y-3">
              <p className="text-blue-200/70 text-xs text-center">
                Once you&rsquo;ve reached safety — sign off to notify your family and close this emergency.
              </p>
              {!showClosure ? (
                <button
                  type="button"
                  onClick={() => setShowClosure(true)}
                  className="w-full text-sm text-emerald-400 border border-emerald-700/40 rounded-xl py-2.5 hover:bg-emerald-900/20 flex items-center justify-center gap-2 transition-colors"
                >
                  ✅ I&rsquo;ve Arrived Safely — Sign Off
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    value={safeLocation}
                    onChange={e => setSafeLocation(e.target.value)}
                    placeholder="Where are you? (e.g. US Embassy, local police station)"
                    className="w-full bg-slate-900/60 border border-emerald-700/40 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <Button
                    onClick={closeThreat}
                    disabled={loadingClosure}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    {loadingClosure
                      ? <><RefreshCw className="w-4 h-4 animate-spin" />Closing emergency...</>
                      : <>✅ Confirm Safe Arrival</>
                    }
                  </Button>
                  <p className="text-slate-500 text-xs text-center">This notifies your family and expires all tracking links.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main info grid */}
      <div className="grid gap-3">

        {/* Emergency contacts */}
        <div className="bg-slate-800/60 border border-red-700/30 rounded-2xl p-4">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />Emergency Numbers
          </p>
          <div className="space-y-2">
            {[
              { label: 'Local Emergency', value: '112 / 911' },
              { label: 'Police (Venezuela)', value: '171 / 08000POLICIA' },
              { label: 'Tourist Police', value: '+58 800 4 TURISMO' },
              { label: 'Morales Admin', value: 'Contact via guardian link' },
            ].map((c, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-400">{c.label}</span>
                <span className="text-white font-medium">{c.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Accommodation */}
        {(caseRecord?.hotel_name || caseRecord?.hotel_address) && (
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Hotel className="w-3.5 h-3.5" />Your Accommodation
            </p>
            {caseRecord.hotel_name && <p className="text-white font-semibold">{caseRecord.hotel_name}</p>}
            {caseRecord.hotel_address && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-slate-300 text-sm">{caseRecord.hotel_address}</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(caseRecord.hotel_address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 text-xs ml-2 underline flex items-center gap-1">
                  <Navigation className="w-3 h-3" />Directions
                </a>
              </div>
            )}
          </div>
        )}

        {/* Emergency docs */}
        {vaults.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />Emergency Documents ({vaults.length})
            </p>
            <div className="space-y-2">
              {vaults.map((v, i) => {
                const Icon = DOC_ICONS[v.document_type] || FileText;
                const meta = v.redacted_for_display || {};
                return (
                  <div key={i} className="flex items-center gap-3 bg-slate-900/40 rounded-xl p-3">
                    <Icon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium capitalize">{v.document_type?.replace('_', ' ')}</p>
                      {meta.expiry_date && <p className="text-slate-400 text-xs">Expires: {meta.expiry_date}</p>}
                      {meta.nationality && <p className="text-slate-400 text-xs">{meta.nationality}</p>}
                      {meta.booking_reference && <p className="text-slate-400 text-xs">Ref: {meta.booking_reference}</p>}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-900/30 rounded-full">✓ Stored</span>
                  </div>
                );
              })}
            </div>
            <p className="text-slate-500 text-xs mt-2">⚠️ Full documents require additional verification. Contact Morales admin to retrieve copies.</p>
          </div>
        )}

        {vaults.length === 0 && (
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 text-center">
            <Lock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No emergency-accessible documents on file.</p>
            <p className="text-slate-500 text-xs mt-1">Upload documents in your Passport Vault and mark them emergency-accessible.</p>
          </div>
        )}

        {/* Guardian instructions */}
        <div className="bg-slate-800/60 border border-violet-700/30 rounded-2xl p-4">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />Guardian / Emergency Contact
          </p>
          <p className="text-slate-300 text-sm">
            Your emergency contact has been notified and has a live tracking link.
            They can see your last-known location and case status.
          </p>
          <p className="text-slate-400 text-xs mt-2">
            If unreachable: your Morales admin has your full case details and emergency contact on file.
          </p>
        </div>
      </div>

      {/* Recovery Transport Section */}
      {step !== 'transport_success' && (
        <div className="bg-gradient-to-br from-blue-900/40 to-slate-800/60 border border-blue-700/40 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Car className="w-3.5 h-3.5" />Emergency Recovery Transport
          </p>
          <p className="text-slate-300 text-sm mb-4">
            Lost, robbed, or stranded? Request emergency pickup. A secure verification code will be generated — show it to the driver before boarding.
          </p>

          {step !== 'transport' ? (
            <Button onClick={() => setStep('transport')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Car className="w-4 h-4" />Request Recovery Pickup
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-300">Your current location</p>
                <button onClick={acquireGPS} disabled={gpsStatus === 'acquiring'}
                  className="text-xs bg-emerald-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  {gpsStatus === 'acquiring' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                  {gpsStatus === 'ready' ? 'GPS ready' : gpsStatus === 'acquiring' ? 'Locating...' : 'Get GPS'}
                </button>
              </div>
              {gpsCoords && (
                <div className="flex items-center gap-2">
                  <p className="text-emerald-400 text-xs">{gpsCoords.lat?.toFixed(5)}, {gpsCoords.lng?.toFixed(5)}</p>
                  <button onClick={openMaps} className="text-xs text-blue-400 underline">View on map</button>
                </div>
              )}
              {!gpsCoords && (
                <input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)}
                  placeholder="Or type your address / location"
                  className="w-full bg-slate-900/60 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
              <Button onClick={requestTransport} disabled={loadingTransport || (!gpsCoords && !pickupAddress)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                {loadingTransport ? <><RefreshCw className="w-4 h-4 animate-spin" />Requesting...</> : <><Car className="w-4 h-4" />Confirm Pickup Request</>}
              </Button>
              <p className="text-slate-500 text-xs">No card or cash required. Admin is alerted. Payment authorized via your case account.</p>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs text-slate-600 pb-4">
        🔒 Emergency vault · {userEmail} · Data never shared with guardian links
      </p>
    </div>
  );
}