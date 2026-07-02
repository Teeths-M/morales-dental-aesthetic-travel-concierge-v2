// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import AdminLayout from '@/components/layout/AdminLayout';

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
    <AdminLayout>
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">SOS Sync Monitor</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Tracks offline-cached SOS events that synced once connectivity was restored.
          </p>
        </div>
        <button
          onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, border: '1px solid #2A3F4A', color: 'rgba(255,255,255,0.7)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Last refresh */}
      {lastRefresh && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })} · Auto-refreshes every 15s
        </p>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>{events.length}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Total SOS Events</p>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b', margin: 0 }}>{syncedEvents.length}</p>
          <p style={{ fontSize: 11, color: 'rgba(245,158,11,0.7)', marginTop: 4 }}>Synced from Offline Cache</p>
        </div>
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 28, fontWeight: 900, color: '#22c55e', margin: 0 }}>{liveEvents.length}</p>
          <p style={{ fontSize: 11, color: 'rgba(34,197,94,0.7)', marginTop: 4 }}>Dispatched Live</p>
        </div>
      </div>

      {/* Offline-synced events — highlighted section */}
      {syncedEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-500" />
            <h2 style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Synced from Offline Cache</h2>
          </div>
          {syncedEvents.map(ev => (
            <SosEventRow key={ev.id} ev={ev} isSynced={true} />
          ))}
        </div>
      )}

      {/* Live events */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <h2 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Live Dispatches</h2>
        </div>
        {loading && liveEvents.length === 0 ? (
          <div className="flex justify-center py-12">
            <div style={{ width: 28, height: 28, border: '2px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
          </div>
        ) : liveEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No live SOS events recorded.</div>
        ) : liveEvents.map(ev => (
          <SosEventRow key={ev.id} ev={ev} isSynced={false} />
        ))}
      </div>
    </div>
    </AdminLayout>
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
            <p className="text-sm font-semibold text-slate-800">
              {ev.patient_name || ev.patient_email || 'Unknown traveler'}
            </p>
            <p className="text-xs text-slate-500 capitalize">{ev.trigger_type?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusMeta.color}`}>
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
          <span className="font-semibold text-amber-600">
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