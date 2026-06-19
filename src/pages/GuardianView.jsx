import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Eye, Shield, CheckCircle2, Clock, AlertTriangle,
  MapPin, Loader2, Navigation, Copy, ExternalLink,
} from 'lucide-react';

const STAGE_STEPS = ['consultation', 'planning', 'booking', 'travel', 'procedure', 'recovery', 'aftercare'];
const EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY || '';

function mapsViewUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}
function mapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving`;
}
function mapsEmbedUrl(lat, lng, key) {
  return `https://www.google.com/maps/embed/v1/view?key=${key}&center=${lat},${lng}&zoom=17&maptype=satellite`;
}
function openMap(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function GuardianView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await base44.functions.invoke('getGuardianViewData', { token });
      const d = res?.data;
      if (!d || d.status === 'invalid' || d.status === 'revoked' || d.status === 'error') {
        setError(d?.error || 'This guardian link does not exist or has been revoked.');
      } else if (d.status === 'expired') {
        setExpired(true);
      } else {
        setData(d);
      }
      setLoading(false);
    };
    if (token) load();
  }, [token]);

  const copyLocationLink = (lat, lng) => {
    navigator.clipboard.writeText(mapsViewUrl(lat, lng)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );

  if (expired) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Guardian Link Expired</h2>
        <p className="text-slate-400 text-sm">This tracking link has expired. Ask the traveler to generate a new one.</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Link Unavailable</h2>
        <p className="text-slate-400 text-sm">{error || 'This guardian link does not exist or has been revoked.'}</p>
      </div>
    </div>
  );

  const { session, case: caseData, latest_location: loc } = data;
  const hasGPS = loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
  const currentStageIndex = STAGE_STEPS.indexOf(caseData?.journey_stage || 'consultation');
  const expiresIn = Math.round((new Date(session.expires_at) - new Date()) / (1000 * 60 * 60));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950">
      {/* Header */}
      <div className="border-b border-blue-900/50">
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="w-16 h-16 bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-700/50">
            <Eye className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Guardian View — Read Only</p>
          <h1 className="text-2xl font-bold text-white">{session.patient_name}'s Journey</h1>
          <p className="text-slate-400 text-sm mt-1">Shared with {session.guardian_name}</p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {expiresIn > 0 ? `Expires in ${expiresIn}h` : 'Expiring soon'} · Look only — no actions available
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* Safety status */}
        <div className={`rounded-2xl border p-5 text-center ${
          caseData?.safe_t_result === 'PASSED' ? 'bg-emerald-900/30 border-emerald-700/50' :
          caseData?.safe_t_result === 'BLOCKED' ? 'bg-red-900/30 border-red-700/50' :
          'bg-slate-800/50 border-slate-700/50'
        }`}>
          {caseData?.safe_t_result === 'PASSED'
            ? <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            : <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2" />}
          <p className="font-bold text-white text-lg">{session.patient_name}</p>
          <p className="text-slate-400 text-sm mt-1">
            Status: <span className="font-semibold text-white">{caseData?.status || 'Active Journey'}</span>
          </p>
          {caseData?.safe_t_result && (
            <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${
              caseData.safe_t_result === 'PASSED' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-700 text-slate-300'
            }`}>Safe-T: {caseData.safe_t_result}</span>
          )}
        </div>

        {/* Journey stage */}
        {caseData && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-4">Journey Stage</p>
            <div className="flex gap-1 flex-wrap">
              {STAGE_STEPS.map((step, i) => (
                <div key={step} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${
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

        {/* Live GPS Location */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-blue-400" />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Last Known GPS Location</p>
              {hasGPS && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            </div>

            {hasGPS ? (
              <>
                {/* Coordinates + metadata */}
                <div className="bg-slate-900/60 rounded-xl px-4 py-3 mb-3">
                  <p className="text-white font-mono text-sm font-bold">
                    {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </p>
                  <div className="flex flex-wrap gap-x-3 mt-1.5 text-[11px] text-slate-400">
                    {loc.logged_at && (
                      <span>Updated {new Date(loc.logged_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    )}
                    {loc.source && <span>· {loc.source.toUpperCase()}</span>}
                    {loc.accuracy_meters != null && <span>· Within {Math.round(loc.accuracy_meters)}m</span>}
                    {loc.place_label && <span>· {loc.place_label}</span>}
                  </div>
                </div>

                {/* Satellite map embed or clickable fallback */}
                {EMBED_KEY ? (
                  <div className="rounded-xl overflow-hidden mb-3 border border-slate-700/50" style={{ height: 220 }}>
                    <iframe
                      title="Satellite location map"
                      width="100%"
                      height="220"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={mapsEmbedUrl(loc.latitude, loc.longitude, EMBED_KEY)}
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => openMap(mapsViewUrl(loc.latitude, loc.longitude))}
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-900/40 hover:bg-slate-900/70 flex flex-col items-center justify-center mb-3 transition-colors"
                    style={{ height: 100 }}
                    title="Open satellite view in Google Maps"
                  >
                    <MapPin className="w-7 h-7 text-blue-400 mb-1" />
                    <p className="text-xs text-slate-400 font-medium">Open satellite view in Google Maps</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                    </p>
                  </button>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openMap(mapsViewUrl(loc.latitude, loc.longitude))}
                    className="flex flex-col items-center gap-1.5 bg-blue-700/20 hover:bg-blue-700/40 border border-blue-700/40 rounded-xl px-2 py-3 text-blue-300 text-[11px] font-semibold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Map
                  </button>
                  <button
                    onClick={() => openMap(mapsDirectionsUrl(loc.latitude, loc.longitude))}
                    className="flex flex-col items-center gap-1.5 bg-emerald-700/20 hover:bg-emerald-700/40 border border-emerald-700/40 rounded-xl px-2 py-3 text-emerald-300 text-[11px] font-semibold transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    Directions
                  </button>
                  <button
                    onClick={() => copyLocationLink(loc.latitude, loc.longitude)}
                    className="flex flex-col items-center gap-1.5 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/40 rounded-xl px-2 py-3 text-slate-300 text-[11px] font-semibold transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-medium">No live GPS location has been shared yet.</p>
                <p className="text-slate-500 text-xs mt-1">The traveler hasn't logged a GPS location from the app.</p>
              </div>
            )}
          </div>
        </div>

        {/* Procedure details */}
        {caseData && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-3">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Procedure Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Destination', val: caseData.procedure_country },
                { label: 'Procedure', val: caseData.procedures?.[0] || 'Medical Procedure' },
                { label: 'Case Priority', val: caseData.case_priority },
                { label: 'Risk Level', val: caseData.risk_score },
              ].filter(i => i.val).map(item => (
                <div key={item.label} className="bg-slate-900/50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 font-semibold">{item.label}</p>
                  <p className="text-sm font-bold text-white mt-0.5 capitalize">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watermark */}
        <div className="flex items-center gap-2 justify-center text-xs text-slate-600 pb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>Morales Medical Safe-T Guardian View · Look-only · No PII exposed</span>
        </div>
      </div>
    </div>
  );
}