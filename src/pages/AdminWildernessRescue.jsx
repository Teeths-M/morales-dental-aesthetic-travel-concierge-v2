/**
 * AdminWildernessRescue — Search & Rescue Monitor
 * Route: /admin/wilderness-rescue
 */
import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Mountain, AlertTriangle, CheckCircle2, MapPin, Navigation,
  RefreshCw, Shield, Clock, Radio, Loader2, ChevronDown,
  ChevronUp, Siren, TreePine, Globe, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/layout/AdminLayout';
import { formatDate } from '@/lib/format';

const RESCUE_STATUSES = {
  triggered:   { label: 'SOS Received',           color: 'bg-red-100 text-red-800',    dot: 'bg-red-500 animate-pulse' },
  dispatched:  { label: 'Rescue Dispatched',       color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400' },
  acknowledged:{ label: 'Acknowledged',            color: 'bg-amber-100 text-amber-800',  dot: 'bg-amber-400' },
  resolved:    { label: 'Resolved / Patient Safe', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  false_alarm: { label: 'False Alarm',             color: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
};

function minsAgo(ts) {
  if (!ts) return null;
  return Math.round((Date.now() - new Date(ts).getTime()) / 60000);
}

function mapsUrl(lat, lng) { return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`; }
function directionsUrl(lat, lng) { return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`; }
function satelliteUrl(lat, lng) { return `https://www.google.com/maps/@?api=1&map_action=map&center=${lat},${lng}&zoom=18&basemap=satellite`; }

export default function AdminWildernessRescue() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [responderName, setResponderName] = useState({});
  const [responderEta, setResponderEta]   = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const [wilderness, all] = await Promise.allSettled([
      // Wilderness-specific: look for wilderness_injury trigger type
      base44.entities.SOSEvent.filter({}, '-triggered_at', 100),
      base44.entities.ActivitySession.filter({ status: 'sos_triggered' }, '-created_date', 50),
    ]);

    // Filter wilderness SOS events
    const sosAll = (wilderness.value || []).filter(e =>
      e.trigger_type === 'wilderness_injury' ||
      (e.latitude != null && ['triggered', 'dispatched', 'acknowledged'].includes(e.status))
    );

    setIncidents(sosAll);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markStatus = async (incident, status, notes = '') => {
    setActionLoading(l => ({ ...l, [incident.id]: status }));
    const update = {
      status,
      ...(status === 'dispatched' && {
        responder_name: responderName[incident.id] || 'Admin assigned',
        responder_eta_minutes: Number(responderEta[incident.id]) || null,
      }),
      ...(status === 'resolved' && {
        resolved_at: new Date().toISOString(),
        resolution_notes: notes || 'Resolved by admin',
      }),
    };
    await base44.entities.SOSEvent.update(incident.id, update).catch(() => {});

    // Log handshake for resolution
    if (status === 'resolved') {
      await base44.functions.invoke('logAuditEvent', {
        event_type: 'handshake_completed',
        actor_role: 'admin',
        resource_type: 'SOSEvent',
        resource_id: incident.id,
        case_id: incident.case_id || '',
        details: { action: 'wilderness_rescue_resolved', notes },
        sensitive: false,
      }).catch(() => {});
    }

    await load();
    setActionLoading(l => ({ ...l, [incident.id]: null }));
  };

  const generateIncidentReport = async (incident) => {
    setActionLoading(l => ({ ...l, [`report_${incident.id}`]: true }));
    try {
      const res = await base44.functions.invoke('generateSafetyIncidentReport', {
        sos_event_id: incident.id,
        case_id: incident.case_id || '',
        patient_email: incident.patient_email,
      });
      if (res?.data?.report_url) {
        window.open(res.data.report_url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Report generated. Check admin audit log for details.');
      }
    } catch (_) {
      alert('Report generation unavailable.');
    }
    setActionLoading(l => ({ ...l, [`report_${incident.id}`]: false }));
  };

  const stats = {
    total: incidents.length,
    active: incidents.filter(i => ['triggered', 'dispatched', 'acknowledged'].includes(i.status)).length,
    dispatched: incidents.filter(i => i.status === 'dispatched').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-700 to-red-700 flex items-center justify-center">
              <TreePine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Wilderness Search & Rescue</h1>
              <p className="text-sm text-slate-500">Canopy Collapse Protocol · Active wilderness SOS incidents</p>
            </div>
          </div>
          <Button onClick={load} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Incidents', val: stats.total,     color: 'bg-blue-50 border-blue-200',    icon: <Radio className="w-4 h-4 text-blue-600" /> },
            { label: 'Active / Open',   val: stats.active,    color: 'bg-red-50 border-red-300',      icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
            { label: 'Dispatched',      val: stats.dispatched,color: 'bg-orange-50 border-orange-200',icon: <Shield className="w-4 h-4 text-orange-600" /> },
            { label: 'Resolved',        val: stats.resolved,  color: 'bg-emerald-50 border-emerald-200',icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 flex items-center gap-2.5 ${s.color}`}>
              {s.icon}
              <div>
                <p className="text-xl font-semibold text-slate-900">{s.val}</p>
                <p className="text-[11px] text-slate-600">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Mountain className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No wilderness SOS incidents</p>
            <p className="text-sm text-slate-400 mt-1">Active wilderness rescue incidents will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map(incident => {
              const sc = RESCUE_STATUSES[incident.status] || RESCUE_STATUSES.triggered;
              const isExpanded = expanded[incident.id];
              const overdueMins = minsAgo(incident.triggered_at);
              const hasGPS = incident.latitude != null && incident.longitude != null;
              const isActive = ['triggered', 'dispatched', 'acknowledged'].includes(incident.status);

              return (
                <div key={incident.id} className={`bg-white rounded-2xl border shadow-sm ${
                  incident.status === 'triggered' ? 'border-red-400 shadow-red-100' :
                  incident.status === 'dispatched' ? 'border-orange-300' : 'border-slate-200'
                }`}>
                  {incident.status === 'triggered' && (
                    <div className="bg-red-600 text-white px-5 py-2.5 rounded-t-2xl flex items-center gap-2">
                      <Siren className="w-4 h-4 animate-pulse" />
                      <p className="text-sm font-semibold">WILDERNESS SOS — RESCUE REQUIRED</p>
                    </div>
                  )}

                  <div className="p-4 sm:p-5">
                    {/* Top row */}
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                          <p className="font-semibold text-slate-900">{incident.patient_name || incident.patient_email}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                        </div>
                        <div className="text-xs text-slate-500 space-x-3">
                          <span>{incident.patient_email}</span>
                          {incident.trigger_type && <span>· {incident.trigger_type.replace('_', ' ')}</span>}
                          {overdueMins != null && <span>· {overdueMins}m ago</span>}
                        </div>

                        {/* GPS coordinates */}
                        {hasGPS && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-emerald-700 font-mono text-xs bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                              {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
                            </span>
                            <a href={mapsUrl(incident.latitude, incident.longitude)} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />View
                            </a>
                            <a href={directionsUrl(incident.latitude, incident.longitude)} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-emerald-600 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-50 flex items-center gap-1">
                              <Navigation className="w-3 h-3" />Directions
                            </a>
                            <a href={satelliteUrl(incident.latitude, incident.longitude)} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-purple-600 border border-purple-200 px-2 py-1 rounded-lg hover:bg-purple-50 flex items-center gap-1">
                              <Globe className="w-3 h-3" />Satellite
                            </a>
                          </div>
                        )}
                        {!hasGPS && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> No GPS coordinates — check SMS payload or last breadcrumb
                          </p>
                        )}
                      </div>

                      <button onClick={() => setExpanded(e => ({ ...e, [incident.id]: !e[incident.id] }))}
                        className="text-slate-400 hover:text-slate-600 p-1" aria-label="Toggle details">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Admin action bar */}
                    {isActive && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {incident.status === 'triggered' && (
                          <>
                            <div className="flex gap-1.5 items-center">
                              <input
                                value={responderName[incident.id] || ''}
                                onChange={e => setResponderName(r => ({ ...r, [incident.id]: e.target.value }))}
                                placeholder="Responder name"
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-32 focus:outline-none focus:ring-1 focus:ring-orange-300"
                              />
                              <input
                                type="number"
                                value={responderEta[incident.id] || ''}
                                onChange={e => setResponderEta(r => ({ ...r, [incident.id]: e.target.value }))}
                                placeholder="ETA (min)"
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-20 focus:outline-none focus:ring-1 focus:ring-orange-300"
                              />
                            </div>
                            <button onClick={() => markStatus(incident, 'dispatched')}
                              disabled={!!actionLoading[incident.id]}
                              className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {actionLoading[incident.id] === 'dispatched' ? 'Dispatching…' : 'Mark Rescue Dispatched'}
                            </button>
                          </>
                        )}
                        <button onClick={() => markStatus(incident, 'acknowledged')}
                          disabled={!!actionLoading[incident.id]}
                          className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 disabled:opacity-50">
                          Acknowledge
                        </button>
                        <button onClick={() => {
                          const notes = window.prompt('Resolution notes (optional):') || '';
                          markStatus(incident, 'resolved', notes);
                        }}
                          disabled={!!actionLoading[incident.id]}
                          className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {actionLoading[incident.id] === 'resolved' ? 'Resolving…' : 'Mark Patient Safe / Resolved'}
                        </button>
                      </div>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3 text-xs">
                          {[
                            { label: 'SOS Event ID',  val: incident.id },
                            { label: 'Case ID',        val: incident.case_id || '—' },
                            { label: 'Patient Phone',  val: incident.patient_phone || '—' },
                            { label: 'Trigger Type',   val: incident.trigger_type },
                            { label: 'Triggered At',   val: incident.triggered_at ? new Date(incident.triggered_at).toLocaleString() : '—' },
                            { label: 'Responder',      val: incident.responder_name || '—' },
                            { label: 'ETA',            val: incident.responder_eta_minutes ? `${incident.responder_eta_minutes} min` : '—' },
                            { label: 'Notifications',  val: (incident.notifications_sent || []).join(', ') || '—' },
                            { label: 'Location Label', val: incident.location_label || '—' },
                            { label: 'Resolution',     val: incident.resolution_notes || '—' },
                          ].map(d => (
                            <div key={d.label} className="bg-slate-50 rounded-xl px-3 py-2">
                              <p className="text-slate-500 text-[10px] font-semibold uppercase">{d.label}</p>
                              <p className="text-slate-800 font-medium mt-0.5 break-all">{d.val}</p>
                            </div>
                          ))}
                        </div>

                        {/* Admin checklist for unresolved incidents */}
                        {isActive && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                              <Siren className="w-3.5 h-3.5" /> Rescue Checklist
                            </p>
                            <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
                              <li>Verify GPS coordinates using Map / Satellite buttons above</li>
                              <li>Call traveler: <strong>{incident.patient_phone || 'No phone on file'}</strong></li>
                              <li>Contact emergency contact from case record</li>
                              <li>Dispatch assigned rescue/security partner or local rescue services</li>
                              <li>Notify guardian — use Guardian Link Manager in admin portal</li>
                              <li>Log final handshake when patient is confirmed safe</li>
                            </ol>
                            <p className="text-[10px] text-red-500 mt-2">Emergency services (police/fire/rescue) must be contacted by admin where appropriate. This system does not auto-contact emergency services.</p>
                          </div>
                        )}

                        {/* Incident report */}
                        <button onClick={() => generateIncidentReport(incident)}
                          disabled={!!actionLoading[`report_${incident.id}`]}
                          className="text-xs border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                          {actionLoading[`report_${incident.id}`]
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Radio className="w-3.5 h-3.5" />}
                          Generate Incident Report
                        </button>
                      </div>
                    )}
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