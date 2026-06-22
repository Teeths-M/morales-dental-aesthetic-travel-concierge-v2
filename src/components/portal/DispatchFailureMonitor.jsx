import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_LABELS = {
  patient: { label: 'Patient', color: 'bg-blue-100 text-blue-800' },
  travel_agency: { label: 'Travel Agency', color: 'bg-amber-100 text-amber-800' },
  chauffeur: { label: 'Chauffeur', color: 'bg-orange-100 text-orange-800' },
  chauffeur_origin: { label: 'Chauffeur (Origin)', color: 'bg-orange-100 text-orange-800' },
  chauffeur_destination: { label: 'Chauffeur (Dest.)', color: 'bg-orange-100 text-orange-800' },
  doctor: { label: 'Doctor Portal', color: 'bg-purple-100 text-purple-800' },
  admin: { label: 'Admin', color: 'bg-slate-100 text-slate-800' },
  hotel: { label: 'Hotel', color: 'bg-teal-100 text-teal-800' },
};

export default function DispatchFailureMonitor() {
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const fetchFailures = async () => {
    setLoading(true);
    const all = await base44.entities.DispatchFailureLog.filter(
      { status: 'pending_intervention' },
      '-logged_at',
      100
    );
    setFailures(all);
    setLoading(false);
  };

  useEffect(() => { fetchFailures(); }, []);

  const handleRetry = async (failure) => {
    setRetryingId(failure.id);
    try {
      await base44.functions.invoke('portalHubWorkflow', {
        consultation_id: failure.consultation_id,
      });
      await base44.entities.DispatchFailureLog.update(failure.id, {
        status: 'retried',
        retried_at: new Date().toISOString(),
      });
      setFailures(prev => prev.filter(f => f.id !== failure.id));
      toast.success('Dispatch retried for ' + failure.case_name);
    } catch (err) {
      toast.error('Retry failed: ' + err.message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleResolve = async (failure) => {
    setResolvingId(failure.id);
    await base44.entities.DispatchFailureLog.update(failure.id, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    });
    setFailures(prev => prev.filter(f => f.id !== failure.id));
    setResolvingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 animate-spin text-slate-400 mr-2" />
        <span className="text-sm text-slate-500">Loading dispatch failures...</span>
      </div>
    );
  }

  if (failures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        <p className="text-sm font-semibold text-slate-700">All dispatch systems nominal</p>
        <p className="text-xs text-slate-400">No pending manual interventions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-red-700">{failures.length} dispatch failure{failures.length !== 1 ? 's' : ''} require manual intervention</span>
        </div>
        <Button size="sm" variant="outline" onClick={fetchFailures} className="gap-1.5 h-7 text-xs">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      <div className="divide-y divide-slate-100 border border-red-200 rounded-xl overflow-hidden">
        {failures.map((f) => {
          const typeInfo = TYPE_LABELS[f.provider_type] || { label: f.provider_type, color: 'bg-slate-100 text-slate-800' };
          return (
            <div key={f.id} className="flex items-start gap-4 px-4 py-3 bg-white hover:bg-red-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>
                  <span className="text-xs text-slate-500 font-mono">{f.pipeline_stage}</span>
                </div>
                <p className="text-sm font-semibold text-red-800 truncate">{f.error_message}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  {f.case_name && <span>Case: <span className="font-medium text-slate-600">{f.case_name}</span></span>}
                  {f.provider_email && <span>→ {f.provider_email}</span>}
                  {f.logged_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(f.logged_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline"
                className="h-7 text-xs shrink-0 border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={retryingId === f.id}
                onClick={() => handleRetry(f)}>
                {retryingId === f.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Retry'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                disabled={resolvingId === f.id}
                onClick={() => handleResolve(f)}
              >
                {resolvingId === f.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : '✓ Resolved'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}