import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandHeart, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AssistanceStatusBar from '@/components/tripAssistance/AssistanceStatusBar';
import DisclosureConsentCard from '@/components/tripAssistance/DisclosureConsentCard';
import ModuleOffNote from '@/components/tripAssistance/ModuleOffNote';
import PacketPanel from '@/components/tripAssistance/PacketPanel';
import RequestComposer from '@/components/tripAssistance/RequestComposer';
import RequestList from '@/components/tripAssistance/RequestList';
import ShowCardStrip from '@/components/tripAssistance/ShowCardStrip';
import TierCategoryGrid from '@/components/tripAssistance/TierCategoryGrid';
import { categoryByKey } from '@/lib/tripAssistance';
import { downloadPacketPdf } from '@/lib/tripPacketPdf';

/**
 * TripAssistance — the traveller's own screen for asking for help.
 *
 * Order is deliberate: what is left and when it may be used, then the list that
 * governs what may be said if they cannot answer, then what they can ask for,
 * then what has already happened. A traveller who is out of allowance or inside
 * quiet hours learns that before writing a request they cannot send.
 */
export default function TripAssistance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getTripAssistance', {});
      setData(res?.data || res);
    } catch (e) {
      setError(e?.message || 'Could not load trip assistance.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-[13px] text-muted-foreground">
        Loading trip assistance…
      </div>
    );
  }

  if (!data?.enabled) return <ModuleOffNote />;

  const handlePreview = async (payload) => {
    const res = await base44.functions.invoke('createTripAssistanceRequest', { ...payload, preview: true });
    const out = res?.data || res;
    if (out?.error) throw new Error(out.error);
    return out.script;
  };

  const handleApprove = async (script) => {
    const res = await base44.functions.invoke('createTripAssistanceRequest', {
      category_key: script.category_key,
      mode: script.mode,
      values: script.values,
      attachment: script.attachment,
      approved_script_text: script.approved_script_text,
      preview_token: script.preview_token,
    });
    const out = res?.data || res;
    if (out?.error) throw new Error(out.error);
    setCategory(null);
    await load();
  };

  const approveDisclosure = async () => {
    setError('');
    setBusy('disclosure');
    try {
      const res = await base44.functions.invoke('approveTripDisclosureList', {
        trip_id: data.trip?.trip_id,
        version: data.disclosure?.version,
      });
      const out = res?.data || res;
      if (out?.error) throw new Error(out.error);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not save that.');
    } finally {
      setBusy('');
    }
  };

  const sendPacket = async (recipientKey, channel) => {
    setError('');
    setBusy('packet');
    try {
      const res = await base44.functions.invoke('sendTripEmergencyPacket', {
        packet_id: data.packet?.id,
        recipient_type: recipientKey.replace('_whatsapp', ''),
        channel,
      });
      const out = res?.data || res;
      if (out?.error) throw new Error(out.error);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'The packet did not go out.');
    } finally {
      setBusy('');
    }
  };

  const requestPdf = async () => {
    setError('');
    setBusy('pdf');
    try {
      const res = await base44.functions.invoke('sendTripEmergencyPacket', {
        packet_id: data.packet?.id,
        recipient_type: 'hospital_handover',
        channel: 'pdf',
      });
      const out = res?.data || res;
      if (out?.error) throw new Error(out.error);
      // The PDF is rendered from the same stored version the message body came
      // from, so the sheet and the text can never disagree about an address.
      downloadPacketPdf({ version: data.packet.version }, data.packet.fields);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not prepare the PDF.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-5 sm:px-6">
        <Link
          to="/trip-overview"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Trip
        </Link>

        <header className="mt-4">
          <h1 className="flex items-center gap-2 font-serif text-[26px] leading-tight text-foreground">
            <HandHeart className="h-5 w-5 text-[#B08D2E]" />
            Trip assistance
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {data.trip?.country_name || 'Your trip'} · {String(data.policy?.trip_language || 'en').toUpperCase()}
            {' · '}no automated voice in this release
          </p>
        </header>

        <div className="mt-5 space-y-5">
          <AssistanceStatusBar policy={data.policy} usage={data.usage} quiet={data.quiet} />

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
              {error}
            </p>
          )}

          <DisclosureConsentCard
            disclosure={data.disclosure}
            onApprove={approveDisclosure}
            busy={busy === 'disclosure'}
            error={busy === 'disclosure' ? error : ''}
          />

          {category ? (
            <RequestComposer
              category={category}
              onPreview={handlePreview}
              onApprove={handleApprove}
              onClose={() => setCategory(null)}
            />
          ) : (
            <TierCategoryGrid onSelect={(c) => setCategory(categoryByKey(c.key))} />
          )}

          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              What you have asked for
            </h2>
            <RequestList requests={data.requests} />
          </section>

          <ShowCardStrip cards={data.cards} cached={data.cards_cached} />

          <PacketPanel
            packet={data.packet}
            deliveries={data.packet_deliveries}
            onSend={sendPacket}
            onRequestPdf={requestPdf}
            busy={busy === 'packet' || busy === 'pdf'}
            error={busy === 'packet' || busy === 'pdf' ? error : ''}
          />
        </div>
      </div>
    </div>
  );
}