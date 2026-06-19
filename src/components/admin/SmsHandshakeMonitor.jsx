/**
 * SmsHandshakeMonitor (admin)
 *
 * Shows inbound SMS handshake activity: last received SMS, sender phone,
 * checkpoint ID, role, status, and escalation state. Admins can refresh
 * and manually trigger the missed-driver escalation run.
 *
 * Read-only over OfflineHandshake (channel='sms'); escalation goes through
 * the secure backend function — no direct record mutation from the client.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, Radio, ShieldAlert } from 'lucide-react';
import {
  StatusBadge,
  LoadingState,
  ErrorState,
  EmptyState,
  SectionHeader,
} from '@/components/ui-system';
import { formatDateTime, displayField } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ROLE_LABELS = { driver: 'Driver', patient: 'Patient', checkin: 'Check-in', sos: 'SOS', unknown: 'Unknown' };

export default function SmsHandshakeMonitor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await base44.entities.OfflineHandshake.filter({ channel: 'sms' }, '-received_at', 100);
      setItems(data || []);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runEscalation = async () => {
    setEscalating(true);
    try {
      const res = await base44.functions.invoke('escalateMissedDriverHandshake', {});
      const count = res?.data?.escalated_count ?? 0;
      toast({ title: 'Escalation complete', description: `${count} missed handshake(s) escalated.` });
      await load();
    } catch (e) {
      toast({ title: 'Escalation failed', description: 'Could not run escalation. Please try again.', variant: 'destructive' });
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="SMS Handshake Monitor"
        subtitle="Inbound offline check-ins received by SMS and driver escalation state."
        icon={Radio}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} aria-label="Refresh handshake list">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button size="sm" onClick={runEscalation} disabled={escalating} aria-label="Run missed driver escalation now">
              <ShieldAlert className="w-3.5 h-3.5" /> {escalating ? 'Escalating…' : 'Run escalation'}
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingState rows={5} variant="table" />
      ) : error ? (
        <ErrorState message="Couldn’t load SMS handshakes." onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState title="No SMS handshakes yet" message="Inbound SMS check-ins will appear here as they arrive." icon={Radio} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-white/30 border-b border-white/[0.06]">
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">Checkpoint</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white/60 whitespace-nowrap">{formatDateTime(h.received_at || h.created_date)}</td>
                  <td className="px-4 py-3 text-white/60 whitespace-nowrap">{displayField(h.from_phone)}</td>
                  <td className="px-4 py-3 text-white/50 font-mono text-xs break-all">{displayField(h.checkpoint_id)}</td>
                  <td className="px-4 py-3 text-white/60">{ROLE_LABELS[h.handshake_role] || displayField(h.parsed_action)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={h.status || (h.executed ? 'completed' : 'pending')} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}