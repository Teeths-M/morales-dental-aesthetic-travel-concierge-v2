import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { MapPin, Trash2, Bookmark, Loader2, Navigation } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LocationBreadcrumbTracker({ caseId }) {
  const [crumbs, setCrumbs] = useState([]);
  const [logging, setLogging] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('logLocationBreadcrumb', { action: 'list', case_id: caseId });
    if (res.data?.crumbs) setCrumbs(res.data.crumbs.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at)));
    setLoading(false);
  };

  useEffect(() => { if (caseId) load(); }, [caseId]);

  const logCurrent = async () => {
    setLogging(true);
    let lat = null, lng = null, label = 'Manual log';
    try {
      await new Promise(resolve => navigator.geolocation.getCurrentPosition(
        pos => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
        () => resolve(), { timeout: 8000 }
      ));
      if (lat) label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (_) {}

    const res = await base44.functions.invoke('logLocationBreadcrumb', {
      action: 'log', case_id: caseId, latitude: lat, longitude: lng, place_label: label, source: lat ? 'gps' : 'manual'
    });
    if (res.data?.logged) { toast({ title: '📍 Location logged', duration: 3000 }); load(); }
    setLogging(false);
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

  const shareCrumb = (crumb) => {
    const text = crumb.latitude
      ? `https://maps.google.com/?q=${crumb.latitude},${crumb.longitude}`
      : crumb.place_label;
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Location coordinates copied', duration: 3000 }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Navigation className="w-4 h-4 text-emerald-600" /> Last Known Locations</p>
          <p className="text-xs text-slate-500 mt-0.5">Auto-purged on journey completion · Save to keep permanently</p>
        </div>
        <div className="flex gap-2">
          <button onClick={logCurrent} disabled={logging}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl">
            {logging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            Log Now
          </button>
          {crumbs.some(c => !c.is_saved) && (
            <button onClick={purgeAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" /> Purge Unsaved
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : crumbs.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No location breadcrumbs yet</p>
          <p className="text-xs text-slate-400 mt-1">Tap "Log Now" to record your current location</p>
        </div>
      ) : (
        <div className="space-y-2">
          {crumbs.map((crumb, i) => (
            <motion.div key={crumb.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${crumb.is_saved ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{crumb.place_label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  {new Date(crumb.logged_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  · {crumb.source}
                  {crumb.is_saved && <span className="text-emerald-600 font-semibold">· Saved</span>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => shareCrumb(crumb)} className="text-slate-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50">
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