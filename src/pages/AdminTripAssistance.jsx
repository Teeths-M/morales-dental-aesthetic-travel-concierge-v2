import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { HandHeart, Radio } from 'lucide-react';
import AdminRequestCard from '@/components/tripAssistance/AdminRequestCard';
import ModuleOffNote from '@/components/tripAssistance/ModuleOffNote';
import PacketPanel from '@/components/tripAssistance/PacketPanel';
import LoadingState from '@/components/ui-system/LoadingState';
import { packetPairsFromRow } from '@/lib/tripAssistance';
import { downloadPacketPdf } from '@/lib/tripPacketPdf';

/**
 * AdminTripAssistance — the care team's queue.
 *
 * Requests first, because they are the thing with a person waiting at the end of
 * it. Packets second, because sending one is a single action and the log of what
 * actually went out matters more than the button.
 */
export default function AdminTripAssistance() {
  const [enabled, setEnabled] = useState(null);
  const [requests, setRequests] = useState([]);
  const [packets, setPackets] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError('');
    try {
      const flagRows = await base44.entities.FeatureFlag.filter({ key: 'trip_assistance' }, '-updated_date', 1);
      const on = (Array.isArray(flagRows) ? flagRows[0] : null)?.enabled === true;
      setEnabled(on);
      if (!on) return;

      const [reqs, pkts, dels] = await Promise.all([
        base44.entities.TripAssistanceRequest.filter({}, '-created_date', 50),
        base44.entities.TripEmergencyPacket.filter({ status: { $ne: 'superseded' } }, '-created_date', 30),
        base44.entities.TripPacketDelivery.filter({}, '-sent_at', 60),
      ]);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setPackets(Array.isArray(pkts) ? pkts : []);
      setDeliveries(Array.isArray(dels) ? dels : []);
      setSelected((prev) => prev || (Array.isArray(pkts) ? pkts[0]?.id : null) || null);
    } catch (e) {
      setEnabled(false);
      setError(e?.message || 'Could not load the queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    base44.auth.me().then((u) => setUserEmail(u?.email || '')).catch(() => {});
    load();
  }, []);

  const packet = useMemo(
    () => packets.find((p) => p.id === selected) || null,
    [packets, selected],
  );

  const packetDeliveries = useMemo(
    () => deliveries.filter((d) => d.packet_id === selected),
    [deliveries, selected],
  );

  const send = async (recipientKey, channel) => {
    setError('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('sendTripEmergencyPacket', {
        packet_id: packet.id,
        recipient_type: recipientKey.replace('_whatsapp', ''),
        channel,
      });
      const out = res?.data || res;
      if (out?.error) throw new Error(out.error);
      if (out?.fallback_required) setError(out.message);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'The packet did not go out.');
    } finally {
      setBusy(false);
    }
  };

  const requestPdf = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('sendTripEmergencyPacket', {
        packet_id: packet.id,
        recipient_type: 'hospital_handover',
        channel: 'pdf',
      });
      const out = res?.data || res;
      if (out?.error) throw new Error(out.error);
      downloadPacketPdf(packet, packetPairsFromRow(packet));
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not prepare the PDF.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState dark={false} rows={4} label="Loading assistance queue" />;
  if (enabled === false) return <ModuleOffNote />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="flex items-center gap-2 font-serif text-2xl text-foreground">
        <HandHeart className="h-5 w-5 text-[#B08D2E]" />
        Trip assistance
      </h1>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        {requests.filter((r) => ['approved', 'written_sent', 'in_progress', 'escalated'].includes(r.status)).length} open ·{' '}
        {requests.length} on record · no automated voice in this release
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      <section className="mt-5">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
          Requests
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            Nothing has been asked for yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {requests.map((r) => (
              <AdminRequestCard key={r.id} request={r} onSaved={load} userEmail={userEmail} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
          <Radio className="h-3.5 w-3.5" />
          Packets
        </h2>

        {packets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            No packet has been assembled yet. One is built at booking.
          </p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {packets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${
                    p.id === selected
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  {p.patient_email} · v{p.version}
                </button>
              ))}
            </div>
            {packet && (
              <PacketPanel
                packet={{ ...packet, fields: packetPairsFromRow(packet) }}
                deliveries={packetDeliveries}
                onSend={send}
                onRequestPdf={requestPdf}
                busy={busy}
                error={error}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}