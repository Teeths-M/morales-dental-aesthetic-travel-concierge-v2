import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

const STATUS_CFG = {
  completed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  expired: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  skipped: { icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' },
};

export default function HandshakeTimelinePanel({ caseId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['handshakes_admin', caseId],
    queryFn: async () => {
      const res = await base44.functions.invoke('createHandshake', { action: 'list', case_id: caseId });
      return res.data?.handshakes || [];
    },
    enabled: !!caseId,
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs"><Loader2 className="w-3 h-3 animate-spin" />Loading handshakes...</div>;
  }

  const handshakes = data || [];
  if (!handshakes.length) {
    return <p className="text-xs text-muted-foreground py-2">No handshake checkpoints recorded yet.</p>;
  }

  const pendingCount = handshakes.filter(h => h.status === 'pending').length;
  const completedCount = handshakes.filter(h => h.status === 'completed').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Digital Handshakes</p>
        <div className="flex gap-1.5">
          <Badge className="bg-emerald-100 text-emerald-700 text-xs">{completedCount} done</Badge>
          {pendingCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{pendingCount} pending</Badge>}
        </div>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {handshakes.map(h => {
          const cfg = STATUS_CFG[h.status] || STATUS_CFG.pending;
          const Icon = cfg.icon;
          return (
            <div key={h.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${cfg.bg}`}>
              <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{h.checkpoint_label || h.checkpoint_type?.replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground capitalize">{h.actor_role}</span>
                  {h.completed_at && <span className="text-[10px] text-muted-foreground">{new Date(h.completed_at).toLocaleDateString()}</span>}
                </div>
                {h.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">&ldquo;{h.notes}&rdquo;</p>}
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{h.status}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}