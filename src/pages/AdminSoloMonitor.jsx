import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, CheckCircle2, MapPin, Clock, RefreshCw, Navigation, UserCheck, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layout/AdminLayout';

const STATUS_CONFIG = {
  pending:       { label: 'Awaiting',    color: 'bg-amber-100 text-amber-800' },
  acknowledged:  { label: 'Safe ✓',      color: 'bg-emerald-100 text-emerald-800' },
  escalated_2h:  { label: '2h Overdue',  color: 'bg-orange-100 text-orange-800' },
  escalated_3h:  { label: '3h Escalated', color: 'bg-red-100 text-red-800' },
  escalated_5h:  { label: '5h CRITICAL', color: 'bg-red-200 text-red-900 font-bold' },
  resolved:      { label: 'Resolved',    color: 'bg-slate-100 text-slate-600' },
};

export default function AdminSoloMonitor() {
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch all non-resolved solo check-ins across all statuses
    const [pending, e2h, e3h, e5h] = await Promise.allSettled([
      base44.entities.SoloCheckIn.filter({ status: 'pending' }, '-scheduled_time', 50),
      base44.entities.SoloCheckIn.filter({ status: 'escalated_2h' }, '-scheduled_time', 50),
      base44.entities.SoloCheckIn.filter({ status: 'escalated_3h' }, '-scheduled_time', 50),
      base44.entities.SoloCheckIn.filter({ status: 'escalated_5h' }, '-scheduled_time', 50),
    ]);
    const all = [
      ...(pending.value || []),
      ...(e2h.value || []),
      ...(e3h.value || []),
      ...(e5h.value || []),
    ].sort((a, b) => {
      const order = { escalated_5h: 0, escalated_3h: 1, escalated_2h: 2, pending: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    });
    setCheckIns(all);

    // Load latest locations for each unique case
    const caseIds = [...new Set(all.map(c => c.case_id))];
    const locMap = {};
    await Promise.allSettled(caseIds.map(async (cid) => {
      const crumbs = await base44.entities.LocationBreadcrumb
        .filter({ case_id: cid, is_purged: false }, '-logged_at', 1)
        .catch(() => []);
      if (crumbs?.[0]) locMap[cid] = crumbs[0];
    }));
    setLocations(locMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markSafe = async (checkIn) => {
    setActionLoading(l => ({ ...l, [checkIn.id]: 'safe' }));
    await base44.entities.SoloCheckIn.update(checkIn.id, {
      status: 'resolved',
      acknowledged_at: new Date().toISOString(),
      response_method: 'app',
    }).catch(() => {});
    await load();
    setActionLoading(l => ({ ...l, [checkIn.id]: null }));
  };

  const manualEscalate = async (checkIn) => {
    setActionLoading(l => ({ ...l, [checkIn.id]: 'escalate' }));
    await base44.functions.invoke('escalateSoloCheckIn', {}).catch(() => {});
    await load();
    setActionLoading(l => ({ ...l, [checkIn.id]: null }));
  };

  const pauseCheckIn = async (checkIn) => {
    setActionLoading(l => ({ ...l, [checkIn.id]: 'pause' }));
    const pauseUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.entities.SoloCheckIn.update(checkIn.id, {
      is_paused_medical: true,
      pause_until: pauseUntil,
      status: 'resolved',
    }).catch(() => {});
    await load();
    setActionLoading(l => ({ ...l, [checkIn.id]: null }));
  };

  const openMap = (loc) => {
    if (!loc) return;
    const url = loc.latitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc.city, loc.country].filter(Boolean).join(', '))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const stats = {
    total: checkIns.length,
    critical: checkIns.filter(c => c.status === 'escalated_5h').length,
    escalated: checkIns.filter(c => ['escalated_3h', 'escalated_2h'].includes(c.status)).length,
    pending: checkIns.filter(c => c.status === 'pending').length,
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Solo Traveler Safety Monitor</h1>
              <p className="text-sm text-slate-500">Live beacon status · Escalation management · Last known locations</p>
            </div>
          </div>
          <Button onClick={load} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Solo Travelers', val: stats.total, color: 'bg-blue-50 border-blue-200', icon: <Shield className="w-5 h-5 text-blue-600" /> },
            { label: 'Critical (5h+)', val: stats.critical, color: 'bg-red-50 border-red-300', icon: <AlertTriangle className="w-5 h-5 text-red-600" /> },
            { label: 'Escalated', val: stats.escalated, color: 'bg-orange-50 border-orange-200', icon: <Clock className="w-5 h-5 text-orange-600" /> },
            { label: 'Pending Check-Ins', val: stats.pending, color: 'bg-amber-50 border-amber-200', icon: <CheckCircle2 className="w-5 h-5 text-amber-600" /> },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${s.color}`}>
              {s.icon}
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.val}</p>
                <p className="text-xs text-slate-600">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
        ) : checkIns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">All solo travelers are safe</p>
            <p className="text-sm text-slate-500 mt-1">No pending or escalated check-ins</p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkIns.map(ci => {
              const loc = locations[ci.case_id];
              const isCritical = ci.status === 'escalated_5h';
              const sc = STATUS_CONFIG[ci.status] || STATUS_CONFIG.pending;
              const hasGPS = loc?.latitude != null;
              const locStr = hasGPS
                ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
                : loc ? [loc.city, loc.country].filter(Boolean).join(', ') || loc.place_label
                : 'No location';

              return (
                <div key={ci.id} className={`bg-white rounded-2xl border p-4 sm:p-5 ${isCritical ? 'border-red-400 shadow-red-100 shadow-lg' : 'border-slate-200'}`}>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-sm">{ci.user_name || ci.user_email}</p>
                        <Badge className={sc.color}>{sc.label}</Badge>
                        {isCritical && <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">DISPATCH REQUIRED</span>}
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                          Round {ci.check_in_round} · {new Date(ci.scheduled_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        <span className="flex items-center gap-1">
                          {hasGPS ? <Navigation className="w-3 h-3 text-emerald-600" /> : <MapPin className="w-3 h-3 text-blue-500" />}
                          {locStr}
                          {loc?.accuracy_meters != null && ` ±${Math.round(loc.accuracy_meters)}m`}
                        </span>
                        <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />
                          Guardian: {ci.guardian_link_sent ? '✓ Notified' : 'Not sent'}
                          {ci.security_dispatched_at ? ' · Security: ✓' : ''}
                        </span>
                      </div>
                      {loc?.logged_at && (
                        <p className="text-[10px] text-slate-400">Location updated: {new Date(loc.logged_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} · {loc.source || 'gps'}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap items-start">
                      {loc && (
                        <button onClick={() => openMap(loc)}
                          className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                          <MapPin className="w-3.5 h-3.5" /> Directions
                        </button>
                      )}
                      <button onClick={() => markSafe(ci)} disabled={!!actionLoading[ci.id]}
                        className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {actionLoading[ci.id] === 'safe' ? 'Marking...' : 'Mark Safe'}
                      </button>
                      {isCritical && (
                        <button onClick={() => manualEscalate(ci)} disabled={!!actionLoading[ci.id]}
                          className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {actionLoading[ci.id] === 'escalate' ? 'Escalating...' : 'Re-Escalate'}
                        </button>
                      )}
                      <button onClick={() => pauseCheckIn(ci)} disabled={!!actionLoading[ci.id]}
                        className="flex items-center gap-1.5 text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                        {actionLoading[ci.id] === 'pause' ? 'Pausing...' : 'Pause 24h'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}