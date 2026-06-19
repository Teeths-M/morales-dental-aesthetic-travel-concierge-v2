import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Shield, AlertTriangle, CheckCircle2, MapPin, Clock, RefreshCw,
  Navigation, UserCheck, Radio, MessageSquare, Phone, Globe,
  AlertCircle, ExternalLink, ChevronDown, ChevronUp, Siren,
  Moon, Car, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layout/AdminLayout';

const STATUS_CONFIG = {
  pending:       { label: 'Awaiting',    color: 'bg-amber-100 text-amber-800', priority: 3 },
  acknowledged:  { label: 'Safe ✓',      color: 'bg-emerald-100 text-emerald-800', priority: 4 },
  escalated_2h:  { label: 'SMS/Voice Sent', color: 'bg-orange-100 text-orange-800', priority: 2 },
  escalated_3h:  { label: 'Guardian Alerted', color: 'bg-red-100 text-red-800', priority: 1 },
  escalated_5h:  { label: '🚨 SECURITY DISPATCH', color: 'bg-red-200 text-red-900 font-bold', priority: 0 },
  resolved:      { label: 'Resolved',    color: 'bg-slate-100 text-slate-600', priority: 5 },
};

const ESC_STEPS = [
  { key: 'traveler_sms_sent_at',           label: 'SMS Sent',         icon: MessageSquare, color: 'text-amber-600' },
  { key: 'traveler_voice_call_at',         label: 'Voice Called',     icon: Phone,         color: 'text-orange-600' },
  { key: 'guardian_alerted_at',            label: 'Guardian Alerted', icon: UserCheck,     color: 'text-red-600' },
  { key: 'security_dispatched_at',         label: 'Security Dispatched', icon: Shield,     color: 'text-red-700' },
  { key: 'police_escalation_required_at',  label: 'Police Task Created', icon: Siren,      color: 'text-purple-700' },
];

function minsAgo(ts) {
  if (!ts) return null;
  return Math.round((Date.now() - new Date(ts).getTime()) / 60000);
}

export default function AdminSoloMonitor() {
  const [checkIns, setCheckIns] = useState([]);
  const [locations, setLocations] = useState({});
  const [notifLogs, setNotifLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [expanded, setExpanded] = useState({});
  const [runningEscalation, setRunningEscalation] = useState(false);
  const [activeTab, setActiveTab] = useState('incidents'); // incidents | nightlife | transport
  const [nightlifeSessions, setNightlifeSessions] = useState([]);
  const [transportRequests, setTransportRequests] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
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
    ].sort((a, b) => (STATUS_CONFIG[a.status]?.priority ?? 9) - (STATUS_CONFIG[b.status]?.priority ?? 9));
    setCheckIns(all);

    // Load latest locations (LiveLocation first, then breadcrumb)
    const caseIds = [...new Set(all.map(c => c.case_id))];
    const locMap = {};
    await Promise.allSettled(caseIds.map(async (cid) => {
      const [liveLocs, crumbs] = await Promise.allSettled([
        base44.entities.LiveLocation?.filter?.({ case_id: cid, is_active: true }, '-updated_at', 1).catch(() => []) || Promise.resolve([]),
        base44.entities.LocationBreadcrumb.filter({ case_id: cid, is_purged: false }, '-logged_at', 1).catch(() => []),
      ]);
      const live = liveLocs.value?.[0];
      const crumb = crumbs.value?.[0];
      locMap[cid] = live || crumb || null;
    }));
    setLocations(locMap);

    // Load nightlife sessions + transport requests
    const [nlSessions, transports] = await Promise.allSettled([
      base44.entities.NightlifeSafetySession.filter({ status: 'active' }, '-created_at', 50).catch(() => []),
      base44.entities.RecoveryTransportRequest.filter({}, '-created_at', 50).catch(() => []),
    ]);
    setNightlifeSessions(nlSessions.value || []);
    setTransportRequests(transports.value || []);

    // Load notification logs per case
    const notifMap = {};
    await Promise.allSettled(caseIds.map(async (cid) => {
      const logs = await base44.entities.NotificationLog
        .filter({ case_id: cid }, '-created_at', 10)
        .catch(() => []);
      notifMap[cid] = logs || [];
    }));
    setNotifLogs(notifMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markSafe = async (checkIn) => {
    setActionLoading(l => ({ ...l, [checkIn.id]: 'safe' }));
    await base44.entities.SoloCheckIn.update(checkIn.id, {
      status: 'resolved',
      acknowledged_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
      response_method: 'app',
    }).catch(() => {});
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

  const runEscalation = async () => {
    setRunningEscalation(true);
    await base44.functions.invoke('runSilentSafetyEscalation', {}).catch(() => {});
    await load();
    setRunningEscalation(false);
  };

  const openMap = (loc) => {
    if (!loc) return;
    const url = loc.latitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc.city, loc.country].filter(Boolean).join(', '))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openGuardianLink = async (ci) => {
    const res = await base44.functions.invoke('generateGuardianLink', {
      case_id: ci.case_id,
      guardian_name: 'Admin View',
      expires_hours: 24,
    }).catch(() => null);
    if (res?.data?.guardian_url) window.open(res.data.guardian_url, '_blank', 'noopener,noreferrer');
  };

  const stats = {
    total: checkIns.length,
    police: checkIns.filter(c => c.police_escalation_required_at).length,
    security: checkIns.filter(c => c.status === 'escalated_5h' && !c.police_escalation_required_at).length,
    guardian: checkIns.filter(c => c.status === 'escalated_3h').length,
    pending: checkIns.filter(c => c.status === 'pending' || c.status === 'escalated_2h').length,
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 border border-slate-200">
          {[
            { id: 'incidents', label: 'Active Incidents', icon: Shield },
            { id: 'nightlife', label: `Nightlife Modes (${nightlifeSessions.length})`, icon: Moon },
            { id: 'transport', label: `Recovery Transport (${transportRequests.length})`, icon: Car },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-1 justify-center ${activeTab === tab.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Silent Safety Escalation Monitor</h1>
              <p className="text-sm text-slate-500">SMS → Voice → Guardian → Security → Police · Auto-escalation state machine</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={runEscalation} disabled={runningEscalation}
              variant="outline" size="sm" className="gap-2 border-red-300 text-red-700 hover:bg-red-50">
              {runningEscalation
                ? <><div className="w-3.5 h-3.5 border border-red-500 border-t-transparent rounded-full animate-spin" />Running...</>
                : <><Siren className="w-4 h-4" />Run Escalation Now</>}
            </Button>
            <Button onClick={load} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </div>

        {/* Nightlife Sessions Panel */}
        {activeTab === 'nightlife' && (
          <div className="space-y-3">
            {nightlifeSessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <Moon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No active nightlife safety sessions</p>
              </div>
            ) : nightlifeSessions.map(ns => (
              <div key={ns.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${ns.is_demo ? 'border-yellow-300' : 'border-purple-200'}`}>
                {ns.is_demo && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mb-2 inline-block">DEMO</span>}
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-purple-500" />
                      <p className="font-bold text-slate-900">{ns.user_name || ns.user_email}</p>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">{ns.activity_type?.replace('_', ' ')}</span>
                    </div>
                    {ns.venue_name && <p className="text-sm text-slate-600 mt-0.5">{ns.venue_name}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                      <span>Started: {ns.start_time ? new Date(ns.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      <span>Expected back: {ns.expected_return_time ? new Date(ns.expected_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      {ns.missed_checkin_count > 0 && <span className="text-red-600 font-semibold">{ns.missed_checkin_count} missed check-ins</span>}
                    </div>
                    {ns.start_latitude && (
                      <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />Start GPS: {Number(ns.start_latitude).toFixed(5)}, {Number(ns.start_longitude).toFixed(5)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {ns.guardian_url && (
                      <a href={ns.guardian_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                        <Eye className="w-3.5 h-3.5" />Guardian Link
                      </a>
                    )}
                    <button onClick={() => base44.entities.NightlifeSafetySession.update(ns.id, { status: 'completed', completed_at: new Date().toISOString() }).then(load)}
                      className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">
                      Mark Safe
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recovery Transport Panel */}
        {activeTab === 'transport' && (
          <div className="space-y-3">
            {transportRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No recovery transport requests</p>
              </div>
            ) : transportRequests.map(tr => (
              <div key={tr.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${tr.status === 'no_driver' ? 'border-red-300' : 'border-blue-200'}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Car className="w-4 h-4 text-blue-500" />
                      <p className="font-bold text-slate-900">{tr.user_name || tr.user_email}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tr.status === 'no_driver' ? 'bg-red-100 text-red-700' :
                        tr.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-blue-100 text-blue-700'
                      } capitalize`}>{tr.status?.replace('_', ' ')}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                      <p>Pickup: {tr.pickup_address || `${tr.pickup_latitude?.toFixed(5)}, ${tr.pickup_longitude?.toFixed(5)}`}</p>
                      <p>Destination: {tr.destination_address || 'N/A'}</p>
                      {tr.driver_name && <p>Driver: {tr.driver_name} {tr.driver_phone ? `— ${tr.driver_phone}` : ''}</p>}
                      <p>Requested by: {tr.requested_by} · {tr.created_at ? new Date(tr.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {tr.pickup_latitude && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${tr.pickup_latitude},${tr.pickup_longitude}&travelmode=driving`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                        <Navigation className="w-3.5 h-3.5" />Navigate
                      </a>
                    )}
                    {tr.status !== 'completed' && (
                      <button onClick={() => base44.entities.RecoveryTransportRequest.update(tr.id, { status: 'completed', completed_at: new Date().toISOString() }).then(load)}
                        className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'incidents' && <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700">Automatic escalation thresholds (from missed check-in time):</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>📱 T+15min → SMS reminder</span>
            <span>📞 T+30min → Voice call</span>
            <span>👁 T+60min → Guardian alert + tracking link</span>
            <span>🛡 T+120min → Security dispatch</span>
            <span>🚔 T+180min → Admin police-escalation task</span>
          </div>
          <p className="text-slate-400">Runs automatically every 15 minutes via scheduler. You can also trigger manually above.</p>
        </div>}

        {activeTab === 'incidents' && <>
        {/* Stats */}
        <div className="grid sm:grid-cols-5 gap-3">
          {[
            { label: 'Active Solo', val: stats.total, color: 'bg-blue-50 border-blue-200', icon: <Shield className="w-4 h-4 text-blue-600" /> },
            { label: 'Pending/SMS', val: stats.pending, color: 'bg-amber-50 border-amber-200', icon: <Clock className="w-4 h-4 text-amber-600" /> },
            { label: 'Guardian Active', val: stats.guardian, color: 'bg-orange-50 border-orange-200', icon: <UserCheck className="w-4 h-4 text-orange-600" /> },
            { label: 'Security Dispatched', val: stats.security, color: 'bg-red-50 border-red-300', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
            { label: 'Police Task', val: stats.police, color: 'bg-purple-50 border-purple-300', icon: <Siren className="w-4 h-4 text-purple-600" /> },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 flex items-center gap-2.5 ${s.color}`}>
              {s.icon}
              <div>
                <p className="text-xl font-bold text-slate-900">{s.val}</p>
                <p className="text-[11px] text-slate-600">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
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
              const logs = notifLogs[ci.case_id] || [];
              const sc = STATUS_CONFIG[ci.status] || STATUS_CONFIG.pending;
              const isExpanded = expanded[ci.id];
              const hasGPS = loc?.latitude != null;
              const locStr = hasGPS
                ? `${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)}`
                : loc ? [loc.city, loc.country].filter(Boolean).join(', ') || loc.place_label || 'Approx location'
                : 'No location data';
              const overdueMins = minsAgo(ci.scheduled_time);
              const isPolicePending = !!ci.police_escalation_required_at;
              const isSecurityPending = ci.status === 'escalated_5h';
              const locUpdatedAt = loc?.updated_at || loc?.logged_at;
              const locAgeMins = locUpdatedAt ? minsAgo(locUpdatedAt) : null;

              return (
                <div key={ci.id} className={`bg-white rounded-2xl border shadow-sm ${
                  isPolicePending ? 'border-purple-400 shadow-purple-100' :
                  isSecurityPending ? 'border-red-400 shadow-red-100' :
                  ci.status === 'escalated_3h' ? 'border-orange-300' : 'border-slate-200'
                }`}>
                  {/* Police escalation banner */}
                  {isPolicePending && (
                    <div className="bg-purple-600 text-white px-5 py-2.5 rounded-t-2xl flex items-center gap-2">
                      <Siren className="w-4 h-4 animate-pulse" />
                      <p className="text-sm font-bold">POLICE/ADMIN ESCALATION TASK — Human intervention required</p>
                    </div>
                  )}

                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Top row */}
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900">{ci.user_name || ci.user_email}</p>
                          <Badge className={sc.color}>{sc.label}</Badge>
                          {ci.missed_round_count > 0 && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              {ci.missed_round_count} missed rounds
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{ci.user_email}</span>
                          {ci.user_phone && <span>{ci.user_phone}</span>}
                          <span>Round {ci.check_in_round}</span>
                          {overdueMins != null && overdueMins > 0 && (
                            <span className="text-red-600 font-semibold">Overdue {overdueMins}min</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap items-center">
                        {loc && (
                          <button onClick={() => openMap(loc)}
                            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                            <Navigation className="w-3.5 h-3.5" /> Maps
                          </button>
                        )}
                        <button onClick={() => openGuardianLink(ci)}
                          className="flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                          <Globe className="w-3.5 h-3.5" /> Guardian Link
                        </button>
                        <button onClick={() => markSafe(ci)} disabled={!!actionLoading[ci.id]}
                          className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {actionLoading[ci.id] === 'safe' ? 'Marking...' : 'Mark Safe'}
                        </button>
                        <button onClick={() => pauseCheckIn(ci)} disabled={!!actionLoading[ci.id]}
                          className="flex items-center gap-1.5 text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                          {actionLoading[ci.id] === 'pause' ? 'Pausing...' : 'Pause 24h'}
                        </button>
                        <button onClick={() => setExpanded(e => ({ ...e, [ci.id]: !e[ci.id] }))}
                          className="flex items-center gap-1 text-xs text-slate-500 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          Details
                        </button>
                      </div>
                    </div>

                    {/* Escalation timeline */}
                    <div className="flex flex-wrap gap-2">
                      {ESC_STEPS.map(step => {
                        const done = !!ci[step.key];
                        const Icon = step.icon;
                        return (
                          <div key={step.key} className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-semibold ${
                            done
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}>
                            <Icon className={`w-3 h-3 ${done ? step.color : 'text-slate-300'}`} />
                            {step.label}
                            {done && ci[step.key] && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                · {minsAgo(ci[step.key])}m ago
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Location row */}
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      {hasGPS ? <Navigation className="w-3.5 h-3.5 text-emerald-600" /> : <MapPin className="w-3.5 h-3.5 text-blue-500" />}
                      <span className="font-medium">{locStr}</span>
                      {loc?.accuracy_meters != null && <span className="text-slate-400">±{Math.round(loc.accuracy_meters)}m</span>}
                      {locAgeMins != null && (
                        <span className={`ml-1 ${locAgeMins > 30 ? 'text-red-500 font-semibold' : locAgeMins > 15 ? 'text-amber-600' : 'text-slate-400'}`}>
                          · {locAgeMins === 0 ? 'just now' : `${locAgeMins}m ago`}
                          {locAgeMins > 30 ? ' ⚠️ STALE' : ''}
                        </span>
                      )}
                      {loc?.source === 'ip_geo' && <span className="text-amber-500">≈ approx</span>}
                    </div>

                    {/* Police checklist */}
                    {isPolicePending && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-purple-800 mb-2 flex items-center gap-1.5">
                          <Siren className="w-3.5 h-3.5" /> Admin Checklist — Complete In Order:
                        </p>
                        <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside">
                          <li>Verify last known location in Guardian tracking link above</li>
                          <li>Call traveler: <span className="font-bold">{ci.user_phone || 'No phone on file'}</span></li>
                          <li>Call emergency contact (on file in case record)</li>
                          <li>Contact assigned private security partner</li>
                          <li>Contact local emergency services / police using regional protocol</li>
                        </ol>
                        <p className="text-[10px] text-purple-500 mt-2">⚠️ Police have NOT been automatically contacted. Admin must initiate as appropriate per local jurisdiction.</p>
                      </div>
                    )}

                    {/* Expanded: notification log */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 pt-4 space-y-2">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notification Log</p>
                        {logs.length === 0 ? (
                          <p className="text-xs text-slate-400">No notifications logged for this case.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {logs.map((log, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  log.status === 'sent' || log.status === 'safe_acknowledged' ? 'bg-emerald-100 text-emerald-700' :
                                  log.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  log.status === 'provider_not_configured' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{log.status}</span>
                                <span className="text-slate-500">{log.channel?.toUpperCase()}</span>
                                <span>{log.message_type}</span>
                                {log.notes && <span className="text-slate-400">— {log.notes}</span>}
                                <span className="ml-auto text-slate-300 shrink-0">
                                  {log.created_at ? new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Safety copy footer */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-600">System behavior:</p>
          <p>• Phone shares live GPS location <strong>while the app is open</strong>. When closed, last-known location is preserved.</p>
          <p>• If signal stops, Morales uses last-known location and escalation protocols automatically.</p>
          <p>• Guardians receive a secure tracking link — no login required, no medical/vault data exposed.</p>
          <p>• Police are <strong>never</strong> automatically contacted. Admin must initiate via the checklist above.</p>
        </div>
        </>}
      </div>
    </AdminLayout>
  );
}