import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import BeatingHeartTracker from './BeatingHeartTracker';
import LiveTrackingMap from './LiveTrackingMap';
import { Zap, Radio, Map, Shield, RefreshCw, Bell, CheckCircle2, AlertTriangle } from 'lucide-react';

const TABS = [
  { id: 'handshakes', label: 'Handshakes', icon: Zap },
  { id: 'tracking',  label: 'Live Map',   icon: Map },
  { id: 'audit',     label: 'Audit Log',  icon: Shield },
];

const ROLE_COLORS = {
  taxi_service:  'bg-blue-100 text-blue-700',
  travel_agency: 'bg-violet-100 text-violet-700',
  doctor:        'bg-emerald-100 text-emerald-700',
  companion:     'bg-pink-100 text-pink-700',
  system:        'bg-slate-100 text-slate-600',
  all:           'bg-yellow-100 text-yellow-700',
};

export default function IQ200EnginePanel({ caseId, userRole }) {
  const [activeTab, setActiveTab] = useState('handshakes');
  const [statuses, setStatuses] = useState([]);
  const [completed, setCompleted] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const { toast } = useToast();

  const CASE_ID = caseId || 'demo_case_001';

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const res = await base44.functions.invoke('iq200HandshakeEngine', {
      action: 'get_status',
      case_id: CASE_ID,
    });
    if (res.data?.statuses) {
      setStatuses(res.data.statuses);
      setCompleted(res.data.completed || 0);
    }
    setLoading(false);
  }, [CASE_ID]);

  const fetchAuditLogs = useCallback(async () => {
    const res = await base44.entities.AuditLog.filter({ case_id: CASE_ID }, '-created_date', 20);
    setAuditLogs(Array.isArray(res) ? res.filter(l => l.event_type?.startsWith('iq200')) : []);
  }, [CASE_ID]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchAuditLogs]);

  const handleInitialize = async () => {
    setInitializing(true);
    await base44.functions.invoke('iq200HandshakeEngine', {
      action: 'create_touchpoints',
      case_id: CASE_ID,
    });
    await fetchStatus();
    setInitializing(false);
    toast({ title: 'iQ200 Engine Initialized', description: '8 touchpoint handshakes created for this case.' });
  };

  const handleConfirm = async (touchpointId, notes) => {
    const user = await base44.auth.me().catch(() => null);
    await base44.functions.invoke('iq200HandshakeEngine', {
      action: 'confirm_handshake',
      case_id: CASE_ID,
      touchpoint_id: touchpointId,
      partner_role: user?.role || userRole || 'user',
      partner_name: user?.full_name || 'Patient',
      notes,
    });
    await fetchStatus();
    toast({ title: 'Handshake Confirmed ✓', description: 'Touchpoint logged and cryptographically audited.' });
  };

  const handleCheckContingency = async () => {
    const res = await base44.functions.invoke('iq200HandshakeEngine', {
      action: 'check_contingency',
      case_id: CASE_ID,
    });
    if (res.data?.overdue_count > 0) {
      toast({
        title: `⚠️ ${res.data.overdue_count} overdue handshake(s)`,
        description: 'Contingency auto-rerouting triggered. Concierge alerted.',
        variant: 'destructive',
      });
      await fetchStatus();
    } else {
      toast({ title: 'All handshakes on schedule ✓' });
    }
  };

  const needsInit = !loading && statuses.length === 0;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-700 to-blue-800 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">iQ200 Coordination Engine</p>
            <p className="text-[10px] text-slate-400">Case · {CASE_ID.slice(0, 12)}…</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCheckContingency}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
          >
            <Bell className="w-3 h-3" /> Check Contingency
          </button>
          <button
            onClick={fetchStatus}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Handshakes */}
      {activeTab === 'handshakes' && (
        <div>
          {needsInit ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-10 bg-gradient-to-br from-slate-50 to-emerald-50 rounded-2xl border border-dashed border-emerald-200">
              <div className="text-4xl mb-3">💛</div>
              <p className="text-sm font-bold text-slate-700 mb-1">iQ200 Engine Not Yet Initialized</p>
              <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">Initialize the 8-touchpoint handshake sequence for this case to activate real-time coordination.</p>
              <button
                onClick={handleInitialize}
                disabled={initializing}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-700 to-blue-800 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {initializing ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Initializing…</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" />Initialize iQ200 Engine</>
                )}
              </button>
            </motion.div>
          ) : (
            <BeatingHeartTracker
              statuses={statuses}
              completed={completed}
              total={statuses.length}
              onConfirm={handleConfirm}
              loading={loading}
            />
          )}
        </div>
      )}

      {/* Tab: Live Tracking Map */}
      {activeTab === 'tracking' && (
        <LiveTrackingMap />
      )}

      {/* Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Immutable Cryptographic Audit Trail</p>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No iQ200 events logged yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {auditLogs.map(log => {
                const roleCls = ROLE_COLORS[log.actor_role] || ROLE_COLORS.system;
                const isConfirm = log.event_type === 'iq200_handshake_confirmed';
                const isContingency = log.event_type === 'iq200_contingency_triggered';
                return (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
                      isContingency ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                    {isContingency
                      ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700">
                        {log.event_type?.replace('iq200_', '').replace(/_/g, ' ')}
                        {log.details?.label && ` · ${log.details.label}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {log.actor_role && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${roleCls}`}>
                            {log.actor_role}
                          </span>
                        )}
                        {log.actor_name && <span className="text-[10px] text-slate-400">{log.actor_name}</span>}
                        <span className="text-[10px] text-slate-300 ml-auto">
                          {new Date(log.timestamp || log.created_date).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1">
            <Shield className="w-3 h-3" />
            All entries are write-once and tamper-evident per ISO 21101 compliance requirements.
          </p>
        </div>
      )}
    </div>
  );
}