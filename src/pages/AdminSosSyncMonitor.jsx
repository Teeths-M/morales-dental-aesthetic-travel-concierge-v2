import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Clock, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_META = {
  triggered:    { label: 'Dispatched Live',  color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  dispatched:   { label: 'Dispatched',        color: 'bg-blue-100 text-blue-800 border-blue-200' },
  acknowledged: { label: 'Acknowledged',      color: 'bg-violet-100 text-violet-800 border-violet-200' },
  resolved:     { label: 'Resolved',          color: 'bg-slate-100 text-slate-700 border-slate-200' },
  false_alarm:  { label: 'False Alarm',       color: 'bg-amber-100 text-amber-800 border-amber-200' },
};

export default function AdminSosSyncMonitor() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = async () => {
    setLoading(true);
    const results = await base44.entities.SOSEvent.list('-triggered_at', 100);
    setEvents(results || []);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Auto-refresh every 15 seconds to catch newly synced offline events
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time new SOS events
  useEffect(() => {
    const unsub = base44.entities.SOSEvent.subscribe((event) => {
      if (event.type === 'create') {
        setEvents(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setEvents(prev => prev.map(e => e.id === event.data.id ? event.data : e));
      }
    });
    return unsub;
  }, []);

  // Heuristic: an event is likely "synced from offline cache" if triggered_at is >30s
  // before created_date (meaning the device cached it and sent it later)
  const isCachedSync = (ev) => {
    if (!ev.triggered_at || !ev.created_date) return false;
    const lag = new Date(ev.created_date) - new Date(ev.triggered_at);
    return lag > 30000; // >30s lag = likely was offline-queued
  };

  const syncedEvents = events.filter(isCachedSync);
  const liveEvents   = events.filter(e => !isCachedSync(e));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SOS Sync Monitor</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tracks offline-cached SOS events that synced once connectivity was restored.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Last refresh */}
      {lastRefresh && (
        <p className="text-xs text-slate-400">
          Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })} · Auto-refreshes every 15s
        </p>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-slate-800">{events.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total SOS Events</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-700">{syncedEvents.length}</p>
          <p className="text-xs text-amber-600 mt-1">Synced from Offline Cache</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-700">{liveEvents.length}</p>
          <p className="text-xs text-emerald-600 mt-1">Dispatched Live</p>
        </div>
      </div>

      {/* Offline-synced events — highlighted section */}
      {syncedEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider">Synced from Offline Cache</h2>
          </div>
          {syncedEvents.map(ev => (
            <SosEventRow key={ev.id} ev={ev} isSynced={true} />
          ))}
        </div>
      )}

      {/* Live events */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Live Dispatches</h2>
        </div>
        {loading && liveEvents.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-t-transparent border-slate-300 rounded-full animate-spin" />
          </div>
        ) : liveEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No live SOS events recorded.</div>
        ) : liveEvents.map(ev => (
          <SosEventRow key={ev.id} ev={ev} isSynced={false} />
        ))}
      </div>
    </div>
  );
}

function SosEventRow({ ev, isSynced }) {
  const statusMeta = STATUS_META[ev.status] || { label: ev.status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
  const lagSeconds = isSynced
    ? Math.round((new Date(ev.created_date) - new Date(ev.triggered_at)) / 1000)
    : null;

  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-2 ${isSynced ? 'border-amber-300 shadow-amber-100 shadow-sm' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isSynced
            ? <WifiOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          <div>
            <p className="text-sm font-bold text-slate-800">
              {ev.patient_name || ev.patient_email || 'Unknown traveler'}
            </p>
            <p className="text-xs text-slate-500 capitalize">{ev.trigger_type?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusMeta.color}`}>
          {statusMeta.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span>
          <span className="font-medium text-slate-700">Triggered: </span>
          {ev.triggered_at ? format(new Date(ev.triggered_at), 'MMM d, h:mm:ss a') : '—'}
        </span>
        <span>
          <span className="font-medium text-slate-700">Received: </span>
          {ev.created_date ? format(new Date(ev.created_date), 'MMM d, h:mm:ss a') : '—'}
        </span>
        {isSynced && lagSeconds !== null && (
          <span className="font-bold text-amber-600">
            ⚡ Synced {lagSeconds}s after trigger
          </span>
        )}
        {ev.location_label && (
          <span>
            <span className="font-medium text-slate-700">Location: </span>
            {ev.location_label}
          </span>
        )}
      </div>
    </div>
  );
}