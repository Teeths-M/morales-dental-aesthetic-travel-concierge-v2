import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Globe2, AlertTriangle, ShieldAlert, Heart, Loader2, RefreshCw, Phone, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RISK_CONFIG = {
  low: { label: 'Low', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', width: '15%' },
  moderate: { label: 'Moderate', color: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-500', width: '40%' },
  elevated: { label: 'Elevated', color: 'bg-orange-100 text-orange-700 border-orange-200', bar: 'bg-orange-500', width: '60%' },
  high: { label: 'High', color: 'bg-red-100 text-red-700 border-red-200', bar: 'bg-red-500', width: '80%' },
  critical: { label: 'Critical', color: 'bg-red-200 text-red-900 border-red-400', bar: 'bg-red-700', width: '100%' },
};

export default function SpaceIntelPanel({ defaultCountry, defaultCity }) {
  const [country, setCountry] = useState(defaultCountry || '');
  const [city, setCity] = useState(defaultCity || '');
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBriefing = async (forceRefresh = false) => {
    if (!country) return;
    setLoading(true);
    const res = await base44.functions.invoke('getSpaceIntelBriefing', {
      destination_country: country,
      destination_city: city,
      force_refresh: forceRefresh
    });
    if (res.data?.briefing) setBriefing(res.data.briefing);
    setLoading(false);
  };

  const geoRisk = briefing ? RISK_CONFIG[briefing.geopolitical_risk] : null;
  const crimeRisk = briefing ? RISK_CONFIG[briefing.crime_risk] : null;

  return (
    <div className="space-y-4">
      {/* Search header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <input value={country} onChange={e => setCountry(e.target.value)}
            placeholder="Country (e.g. Venezuela)" onKeyDown={e => e.key === 'Enter' && fetchBriefing()}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <input value={city} onChange={e => setCity(e.target.value)}
            placeholder="City (optional)" onKeyDown={e => e.key === 'Enter' && fetchBriefing()}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <Button onClick={() => fetchBriefing(false)} disabled={!country || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm flex-shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Get Briefing'}
        </Button>
      </div>

      <AnimatePresence>
        {briefing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary Banner */}
            <div className={`rounded-2xl border p-4 ${crimeRisk?.color}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-sm flex items-center gap-2">
                    <Globe2 className="w-4 h-4" />
                    {briefing.destination_city ? `${briefing.destination_city}, ` : ''}{briefing.destination_country}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{briefing.briefing_summary}</p>
                </div>
                <button onClick={() => fetchBriefing(true)} disabled={loading} className="opacity-60 hover:opacity-100 flex-shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Risk Bars */}
            <div className="grid sm:grid-cols-2 gap-3">
              {[{ label: 'Geopolitical Risk', config: geoRisk }, { label: 'Crime Risk', config: crimeRisk }].map(r => (
                <div key={r.label} className="bg-white border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700">{r.label}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.config?.color}`}>{r.config?.label}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${r.config?.bar}`} style={{ width: r.config?.width }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Emergency Numbers */}
            {briefing.emergency_numbers && Object.keys(briefing.emergency_numbers).length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3"><Phone className="w-3.5 h-3.5 text-red-600" /> Emergency Numbers</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(briefing.emergency_numbers).map(([key, val]) => val && (
                    <a key={key} href={`tel:${val}`}
                      className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-3 py-2 hover:bg-red-100 transition-colors">
                      <span className="text-[11px] text-red-700 capitalize font-semibold">{key.replace(/_/g, ' ')}</span>
                      <span className="text-[11px] font-black text-red-800">{val}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Health Alerts */}
            {briefing.health_alerts?.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3"><Heart className="w-3.5 h-3.5 text-rose-500" /> Health Alerts</p>
                <div className="space-y-1.5">
                  {briefing.health_alerts.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scam Warnings */}
            {briefing.scam_warnings?.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3"><ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Tourist Scam Warnings</p>
                <div className="space-y-1.5">
                  {briefing.scam_warnings.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safe Zones / Avoid Areas */}
            <div className="grid sm:grid-cols-2 gap-3">
              {briefing.safe_zones?.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-4">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-2 mb-3"><MapPin className="w-3.5 h-3.5" /> Safe Zones</p>
                  {briefing.safe_zones.map((z, i) => (
                    <p key={i} className="text-xs text-emerald-800 flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{z}
                    </p>
                  ))}
                </div>
              )}
              {briefing.avoid_areas?.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-4">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-2 mb-3"><AlertTriangle className="w-3.5 h-3.5" /> Avoid Areas</p>
                  {briefing.avoid_areas.map((z, i) => (
                    <p key={i} className="text-xs text-red-800 flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />{z}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 text-center">AI-generated · Internet-sourced · Refreshed every 6 hours · Not a substitute for official travel advisories</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}