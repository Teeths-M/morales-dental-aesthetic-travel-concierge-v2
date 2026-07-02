import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const CHECKPOINT_LABELS = {
  dietary_restrictions_received: '🍽️ Dietary Restrictions Received & Understood',
  companion_departure_airport_confirmed: '✈️ Departure Airport — Companion Confirmed',
  companion_arrival_airport_confirmed: '🛬 Arrival Airport — Companion Confirmed',
  companion_clinic_arrival_confirmed: '🏥 Clinic Arrival — Companion Confirmed',
  companion_hotel_arrival_confirmed: '🏨 Hotel Arrival — Companion Confirmed',
  companion_recovery_instructions_received: '💊 Recovery Instructions Received',
  airport_translation_ready: '🌐 Airport Translation Ready',
  clinic_translation_ready: '🌐 Clinic Translation Ready',
  hotel_translation_ready: '🌐 Hotel Translation Ready',
  emergency_translation_plan_confirmed: '🚨 Emergency Translation Plan Confirmed',
};

function HandshakeCard({ handshake, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const isPending = handshake.status === 'pending';
  const isCompleted = handshake.status === 'completed';
  const isExpired = handshake.status === 'expired';

  const handleComplete = async () => {
    setLoading(true);
    try {
      await onComplete(handshake.id, notes);
      toast.success('Handshake confirmed');
    } catch (e) {
      toast.error('Failed to confirm. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 transition-all ${isCompleted ? 'border-emerald-200 bg-emerald-50' : isPending ? 'border-amber-200 bg-amber-50' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
          {isPending && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
          {isExpired && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          <span className={`text-sm font-medium truncate ${isCompleted ? 'text-emerald-800' : isPending ? 'text-amber-800' : 'text-foreground'}`}>
            {CHECKPOINT_LABELS[handshake.checkpoint_type] || handshake.checkpoint_label || handshake.checkpoint_type}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <Badge variant="outline" className={`text-xs ${isCompleted ? 'text-emerald-700 border-emerald-300' : isPending ? 'text-amber-700 border-amber-300' : 'text-red-700 border-red-300'}`}>
            {handshake.status}
          </Badge>
          {isPending && (
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {isCompleted && (
        <p className="text-xs text-emerald-600 mt-1">
          Confirmed {handshake.completed_at ? new Date(handshake.completed_at).toLocaleString() : ''}
          {handshake.notes && ` · "${handshake.notes}"`}
        </p>
      )}

      {isPending && expanded && (
        <div className="mt-3 space-y-3 border-t border-amber-200 pt-3">
          <p className="text-xs text-amber-700">Add an optional note before confirming:</p>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional note..."
            className="h-16 text-xs"
          />
          <Button size="sm" onClick={handleComplete} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
            Confirm Acknowledgement
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CompanionHandshakePanel({ caseId }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['companion_handshakes', caseId],
    queryFn: async () => {
      const res = await base44.functions.invoke('createHandshake', { action: 'list', case_id: caseId });
      return res.data?.handshakes || [];
    },
    enabled: !!caseId,
  });

  const completeMutation = useMutation({
    mutationFn: async ({ handshakeId, notes }) => {
      await base44.functions.invoke('createHandshake', { action: 'complete', handshake_id: handshakeId, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companion_handshakes', caseId] });
    },
  });

  const handshakes = data || [];
  const pending = handshakes.filter(h => h.status === 'pending');
  const completed = handshakes.filter(h => h.status === 'completed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!handshakes.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No handshakes assigned yet for this journey.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
            Awaiting Your Confirmation ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map(h => (
              <HandshakeCard
                key={h.id}
                handshake={h}
                onComplete={(id, notes) => completeMutation.mutateAsync({ handshakeId: id, notes })}
              />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
            Completed ({completed.length})
          </p>
          <div className="space-y-2">
            {completed.map(h => (
              <HandshakeCard
                key={h.id}
                handshake={h}
                onComplete={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}