import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const WAIVER_STATUS_CONFIG = {
  not_required: { color: 'bg-gray-100 text-gray-600', icon: CheckCircle, label: 'Not Required' },
  required: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Required' },
  sent: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Sent to Patient' },
  signed: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Signed' },
  refused: { color: 'bg-red-100 text-red-700', icon: XCircle, label: '⚠️ Refused — Coordination Paused' },
  expired: { color: 'bg-gray-100 text-gray-600', icon: AlertCircle, label: 'Expired' },
  admin_reissued: { color: 'bg-purple-100 text-purple-700', icon: RefreshCw, label: 'Admin Reissued' },
};

export default function WaiverAdminPanel({ caseRecord }) {
  const queryClient = useQueryClient();
  const [_reissuing, _setReissuing] = useState(false);

  const { data: waivers = [], isLoading } = useQuery({
    queryKey: ['waivers', caseRecord?.id],
    queryFn: () => base44.asServiceRole.entities.WaiverRequest.filter({ case_id: caseRecord.id }),
    enabled: !!caseRecord?.id,
  });

  const reissueMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('handleWaiverRequest', {
        action: 'reissue',
        case_id: caseRecord.id,
      });
    },
    onSuccess: () => {
      toast.success('Waiver reissued. Patient will need to re-sign.');
      queryClient.invalidateQueries({ queryKey: ['waivers', caseRecord.id] });
      queryClient.invalidateQueries({ queryKey: ['admin_all_cases'] });
    },
    onError: () => toast.error('Failed to reissue waiver.'),
  });

  if (isLoading) return <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm"><Loader2 className="w-3 h-3 animate-spin" />Loading waivers...</div>;

  const hasRefused = caseRecord?.waiver_status === 'refused';
  const latestWaiver = waivers[0];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Waiver & Acknowledgements</p>

      {/* Overall waiver status */}
      {caseRecord?.waiver_status && caseRecord.waiver_status !== 'not_required' && (() => {
        const cfg = WAIVER_STATUS_CONFIG[caseRecord.waiver_status] || WAIVER_STATUS_CONFIG.required;
        const Icon = cfg.icon;
        return (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.color}`}>
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-medium">{cfg.label}</span>
          </div>
        );
      })()}

      {/* Refused — show full details */}
      {hasRefused && latestWaiver && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-800">TRAVEL COORDINATION PAUSED</p>
              <p className="text-xs text-red-700 mt-1">Patient refused required waiver. Case cannot progress until waiver is reissued and signed.</p>
            </div>
          </div>
          {latestWaiver.declined_by && (
            <div className="text-xs text-red-700 space-y-1 border-t border-red-200 pt-2">
              <p><strong>Declined by:</strong> {latestWaiver.declined_by} ({latestWaiver.declined_relationship || 'self'})</p>
              {latestWaiver.declined_reason && <p><strong>Reason:</strong> {latestWaiver.declined_reason}</p>}
              {latestWaiver.refused_at && <p><strong>At:</strong> {new Date(latestWaiver.refused_at).toLocaleString()}</p>}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => reissueMutation.mutate()}
            disabled={reissueMutation.isPending}
          >
            {reissueMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Reissue Waiver Request
          </Button>
        </div>
      )}

      {/* Companion requirement */}
      {caseRecord?.requires_companion && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
          <p><strong>Companion Required:</strong> Yes ({caseRecord.companion_requirement_reason?.replace(/_/g, ' ')})</p>
          <p><strong>Status:</strong> {caseRecord.companion_requirement_status?.replace(/_/g, ' ')}</p>
        </div>
      )}

      {/* Clinical boundary */}
      <div className="text-xs text-slate-600 flex items-center gap-2">
        {caseRecord?.clinical_boundary_acknowledged
          ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Clinical boundary acknowledged</>
          : <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Clinical boundary NOT acknowledged</>}
      </div>
    </div>
  );
}