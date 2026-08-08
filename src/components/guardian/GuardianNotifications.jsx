import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Bell, CheckCircle2, AlertTriangle, Plane, Hotel, Stethoscope,
  PlaneTakeoff, Home, Activity,
} from 'lucide-react';

const POLL_MS = 30000;

function iconFor(kind, title) {
  if (kind === 'milestone') {
    if (/landed/i.test(title)) return <Plane className="w-4 h-4 text-blue-400" />;
    if (/hotel/i.test(title)) return <Hotel className="w-4 h-4 text-indigo-400" />;
    if (/pre-procedure/i.test(title)) return <Stethoscope className="w-4 h-4 text-amber-400" />;
    if (/procedure complete|post/i.test(title)) return <Activity className="w-4 h-4 text-emerald-400" />;
    if (/departure/i.test(title)) return <PlaneTakeoff className="w-4 h-4 text-cyan-400" />;
    if (/home safe/i.test(title)) return <Home className="w-4 h-4 text-emerald-400" />;
    return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
  }
  if (kind === 'escalation') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  if (kind === 'status') return <Activity className="w-4 h-4 text-slate-400" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
}

function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function GuardianNotifications({ token }) {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getGuardianFeed', { token });
      const d = res?.data ?? res;
      if (d?.status === 'ok') setItems(d.notifications || []);
    } catch (_) {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, POLL_MS);
    return () => clearInterval(id);
  }, [fetchFeed]);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Journey Notifications</p>
        </div>
        <span className="text-[10px] text-slate-600">Updates every 30s</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-900/40 animate-pulse" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="text-center py-6">
          <Bell className="w-7 h-7 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No updates yet.</p>
          <p className="text-slate-600 text-xs mt-1">M-Care will post journey milestones here as they happen.</p>
        </div>
      ) : (
        <ol className="space-y-2.5">
          {items.map((n, i) => (
            <li key={(n.time || '') + i} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-slate-900/60 border border-slate-700/50 flex items-center justify-center">
                {iconFor(n.kind, n.title)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{n.title}</p>
                {n.detail && <p className="text-xs text-slate-400 mt-0.5">{n.detail}</p>}
                <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo(n.time)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}