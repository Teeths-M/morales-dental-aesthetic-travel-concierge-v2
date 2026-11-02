import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import OfferCard from '@/components/partner-pricing/OfferCard';
import OfferEditor from '@/components/partner-pricing/OfferEditor';
import QuoteRequestsPanel from '@/components/partner-pricing/QuoteRequestsPanel';
import { GOLD, deriveStatus, daysUntil } from '@/lib/partnerPricing';

const TABS = [
  { key: 'pricing', label: 'Pricing' },
  { key: 'services', label: 'Services' },
  { key: 'packages', label: 'Packages' },
  { key: 'availability', label: 'Availability' },
  { key: 'requests', label: 'Quote requests' },
  { key: 'updates', label: 'Price updates' },
  { key: 'performance', label: 'Performance' },
];

export default function PartnerPricing() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pricing');
  const [services, setServices] = useState([]);
  const [cards, setCards] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);

  const load = useCallback(async () => {
    try {
      const [serviceRows, cardRows, requestRows, reminderRows] = await Promise.all([
        base44.entities.PartnerService.filter({}, '-created_date', 100).catch(() => []),
        base44.entities.PartnerRateCard.filter({}, '-created_date', 200).catch(() => []),
        base44.entities.PartnerQuoteRequest.filter({}, '-created_date', 100).catch(() => []),
        base44.entities.PartnerPricingReminder.filter({}, '-due_at', 50).catch(() => []),
      ]);
      setServices(serviceRows || []);
      setCards(cardRows || []);
      setRequests(requestRows || []);
      setReminders(reminderRows || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const merged = useMemo(() => cards.map((card) => {
    const service = services.find((s) => s.id === card.service_id);
    return {
      ...card,
      service_name: card.service_name || service?.name || 'Service',
      is_package: card.is_package ?? service?.is_package ?? false,
      service,
      pricing_status: deriveStatus(card),
    };
  }), [cards, services]);

  const serviceNames = useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s.name])),
    [services],
  );

  const counts = useMemo(() => ({
    current: merged.filter((o) => o.pricing_status === 'CURRENT_PARTNER_CONFIRMED').length,
    submitted: merged.filter((o) => o.pricing_status === 'PARTNER_SUBMITTED').length,
    needsAction: merged.filter((o) => ['STALE', 'EXPIRED'].includes(o.pricing_status)).length,
  }), [merged]);

  const runCardAction = async (action, card) => {
    setBusy(true);
    setNotice('');
    try {
      const result = await base44.functions.invoke('managePartnerRateCard', {
        action,
        rate_card_id: card.id,
      });
      if (result.data?.error) throw new Error(result.data.error);
      setNotice(action === 'confirm'
        ? 'Confirmed. That price now shows as current until its next review.'
        : 'Offer updated.');
      await load();
    } catch (e) {
      setNotice(e?.response?.data?.error || e?.message || 'That change could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const setAvailability = async (card, availability_status) => {
    setBusy(true);
    try {
      await base44.functions.invoke('managePartnerRateCard', {
        action: 'set_availability',
        rate_card_id: card.id,
        availability_status,
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleAction = (kind, offer) => {
    if (kind === 'confirm') return runCardAction('confirm', offer);
    if (kind === 'pause') return runCardAction(offer.status === 'paused' ? 'resume' : 'pause', offer);
    if (kind === 'edit') return setEditor({ service: offer.service, card: offer });
    return undefined;
  };

  const visible = useMemo(() => {
    if (tab === 'packages') return merged.filter((o) => o.is_package);
    if (tab === 'services') return [];
    if (tab === 'availability') return merged;
    return merged;
  }, [tab, merged]);

  const openReminders = reminders.filter((r) => ['queued', 'sent', 'failed'].includes(r.status));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#060B16' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: '#060B16' }}>
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
              My services &amp; pricing
            </p>
            <h1 className="mt-1 font-display text-[24px] leading-tight text-white sm:text-[28px]">
              What the Morales network already knows about you
            </h1>
            <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/50">
              Enter a price once. M-Care reuses it for every eligible traveller and only comes back
              when it needs a fresh confirmation.
            </p>
            {user?.email && <p className="mt-1 text-[11px] text-white/30">{user.email}</p>}
          </div>
          <button
            type="button"
            onClick={() => setEditor({})}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold"
            style={{ background: GOLD, color: '#060B16' }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: 'Confirmed', value: counts.current, tone: 'text-emerald-300' },
            { label: 'Submitted', value: counts.submitted, tone: 'text-sky-300' },
            { label: 'Needs attention', value: counts.needsAction, tone: 'text-amber-300' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border px-3 py-2.5" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className={`text-[18px] font-semibold leading-none ${stat.tone}`}>{stat.value}</p>
              <p className="mt-1 text-[10.5px] text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className="flex-shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-medium"
                style={{
                  background: active ? 'rgba(212,175,55,0.14)' : 'transparent',
                  borderColor: active ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.1)',
                  color: active ? GOLD : 'rgba(255,255,255,0.6)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {notice && (
          <p className="mt-3 rounded-xl border px-3 py-2 text-[11.5px] text-white/70" style={{ borderColor: 'rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.07)' }}>
            {notice}
          </p>
        )}

        <div className="mt-4">
          {tab === 'services' && (
            <div className="space-y-2">
              {services.map((service) => {
                const card = merged.find((c) => c.service_id === service.id);
                return (
                  <div key={service.id} className="flex items-center justify-between rounded-2xl border px-4 py-3" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">{service.name}</p>
                      <p className="text-[11px] capitalize text-white/40">
                        {String(service.category).replace(/_/g, ' ')} · {service.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditor({ service, card })}
                      className="rounded-lg border px-3 py-1.5 text-[11.5px] text-white/75"
                      style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
              {services.length === 0 && (
                <div className="rounded-2xl border px-4 py-8 text-center" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <p className="text-[13px] text-white/55">No services yet.</p>
                  <p className="mt-1 text-[11.5px] text-white/35">Add your first service and its price.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'requests' && (
            <QuoteRequestsPanel requests={requests} serviceNames={serviceNames} onChanged={load} />
          )}

          {tab === 'updates' && (
            <div className="space-y-2">
              {openReminders.map((reminder) => {
                const card = merged.find((c) => c.id === reminder.rate_card_id);
                return (
                  <div key={reminder.id} className="rounded-2xl border px-4 py-3" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <p className="text-[13px] font-semibold text-white">{card?.service_name || 'Price review'}</p>
                    <p className="mt-1 text-[11.5px] text-white/45">
                      {reminder.status === 'sent' ? 'Reminder sent' : reminder.status === 'failed' ? 'Reminder could not be delivered' : 'Reminder queued'}
                      {reminder.due_at ? ` · ${String(reminder.due_at).slice(0, 10)}` : ''}
                    </p>
                    {reminder.failure_detail && <p className="mt-1 text-[11px] text-rose-300">{reminder.failure_detail}</p>}
                    {card && (
                      <button
                        type="button"
                        onClick={() => runCardAction('confirm', card)}
                        disabled={busy}
                        className="mt-2 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold disabled:opacity-50"
                        style={{ background: GOLD, color: '#060B16' }}
                      >
                        Still accurate
                      </button>
                    )}
                  </div>
                );
              })}
              {openReminders.length === 0 && (
                <div className="rounded-2xl border px-4 py-8 text-center" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <p className="text-[13px] text-white/55">Nothing needs a price review right now.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'availability' && (
            <div className="space-y-2">
              {merged.map((card) => (
                <div key={card.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <p className="min-w-0 flex-1 truncate text-[13px] text-white">{card.service_name}</p>
                  <select
                    value={card.availability_status || 'unknown'}
                    onChange={(e) => setAvailability(card, e.target.value)}
                    disabled={busy}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11.5px] text-white outline-none"
                  >
                    <option value="unknown" className="bg-[#0C1A1D]">Unknown</option>
                    <option value="available" className="bg-[#0C1A1D]">Available</option>
                    <option value="limited" className="bg-[#0C1A1D]">Limited</option>
                    <option value="requires_confirmation" className="bg-[#0C1A1D]">Needs confirming</option>
                    <option value="unavailable" className="bg-[#0C1A1D]">Unavailable</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {tab === 'performance' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Quote requests received', value: requests.length },
                  { label: 'Quotes given', value: requests.filter((r) => r.quoted_amount_minor).length },
                  { label: 'Accepted by traveller', value: requests.filter((r) => r.traveler_decision === 'accepted').length },
                  { label: 'Awaiting your reply', value: requests.filter((r) => ['SENT', 'ACKNOWLEDGED'].includes(r.state)).length },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border px-3 py-3" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <p className="text-[18px] font-semibold text-white">{stat.value}</p>
                    <p className="mt-1 text-[10.5px] text-white/40">{stat.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-white/30">
                These are counted from real recorded events only. Response times and acceptance rates are
                shown once there is enough history to mean anything — a single request is not a rating.
              </p>
            </div>
          )}

          {(tab === 'pricing' || tab === 'packages') && (
            <div className="space-y-3">
              {tab === 'packages' && merged.some((o) => o.service?.missing_fields?.includes('package_components')) && (
                <p className="rounded-xl border px-3 py-2 text-[11px] text-amber-300" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.07)' }}>
                  A package with an unpriced component is never shown with a total. Add the missing price or mark it excluded.
                </p>
              )}
              {visible.map((offer) => (
                <div key={offer.id}>
                  <OfferCard offer={offer} onAction={handleAction} busy={busy} />
                  {offer.pricing_status === 'CURRENT_PARTNER_CONFIRMED' && daysUntil(offer.next_review_at) !== null && (
                    <p className="mt-1 px-1 text-[10.5px] text-white/30">
                      Next review in {Math.max(daysUntil(offer.next_review_at), 0)} day(s)
                    </p>
                  )}
                </div>
              ))}
              {visible.length === 0 && (
                <div className="rounded-2xl border px-4 py-8 text-center" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <p className="text-[13px] text-white/55">Nothing here yet.</p>
                  <p className="mt-1 text-[11.5px] text-white/35">Add a service and its price, and M-Care can start using it.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-white/30">
          A confirmed price never means the service is available, and a verified partner never means the
          price is current. Those are tracked separately, always.
        </p>
      </div>

      {editor && (
        <OfferEditor
          service={editor.service}
          card={editor.card}
          onClose={() => setEditor(null)}
          onSaved={async (result) => {
            await load();
            if (result?.missing_fields?.length) {
              setNotice(`Saved. Still missing: ${result.missing_fields.join(', ')}.`);
            }
          }}
        />
      )}
    </div>
  );
}