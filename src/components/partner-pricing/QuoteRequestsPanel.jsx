import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { GOLD, formatMinor } from '@/lib/partnerPricing';

const STATE_LABEL = {
  PREPARED: 'Prepared',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  ACKNOWLEDGED: 'You responded',
  QUOTE_RECEIVED: 'Quote received',
  QUOTE_CONFIRMED: 'Quote given',
  DECLINED: 'Declined',
  FAILED: 'Not delivered',
  HUMAN_ESCALATION: 'With the care team',
  EXPIRED: 'Expired',
};

/**
 * QuoteRequestsPanel — the partner's queue of individual traveller requests.
 *
 * The state wording is literal on purpose. "Sent" means a message left the
 * platform; it does not mean the traveller read it, and it certainly is not a
 * quote. Only a response that carries a price shows one.
 */
export default function QuoteRequestsPanel({ requests, serviceNames = {}, onChanged }) {
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({ response_type: 'quoted', amount: '', valid_until: '', notes: '', info_requested: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const respond = async (request) => {
    setError('');
    setBusy(true);
    try {
      const result = await base44.functions.invoke('respondPartnerQuote', {
        request_id: request.id,
        response_type: form.response_type,
        amount: form.response_type === 'quoted' ? form.amount : undefined,
        currency: request.quoted_currency || 'USD',
        valid_until: form.response_type === 'quoted' ? form.valid_until : undefined,
        notes: form.notes,
        info_requested: form.response_type === 'info_needed' ? form.info_requested : undefined,
      });
      if (result.data?.error) throw new Error(result.data.error);
      setOpenId(null);
      setForm({ response_type: 'quoted', amount: '', valid_until: '', notes: '', info_requested: '' });
      onChanged?.();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'That response could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  if (!requests?.length) {
    return (
      <div className="rounded-2xl border px-4 py-8 text-center" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.07)' }}>
        <p className="text-[13px] text-white/55">No quote requests yet.</p>
        <p className="mt-1 text-[11.5px] text-white/35">
          When a traveller asks for a firm price, it appears here and by email.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const details = request.details_shared || {};
        const isOpen = openId === request.id;
        return (
          <div key={request.id} className="rounded-2xl border p-4" style={{ background: '#0C1A1D', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13.5px] font-semibold text-white">
                  {serviceNames[request.service_id] || 'Quote request'} · {request.request_ref}
                </p>
                <p className="mt-1 text-[11.5px] text-white/45">
                  {details.destination || '—'} · {details.travelers || 1} traveller(s)
                  {details.nights ? ` · ${details.nights} nights` : ''}
                </p>
              </div>
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold text-white/60" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
                {STATE_LABEL[request.state] || request.state}
              </span>
            </div>

            {request.quoted_amount_minor && (
              <p className="mt-2 text-[12.5px] text-emerald-300">
                You quoted {formatMinor(request.quoted_amount_minor, request.quoted_currency)}
                {request.quoted_valid_until ? ` · valid until ${request.quoted_valid_until}` : ''}
              </p>
            )}

            {(details.note || details.requested_services?.length > 0) && (
              <div className="mt-2 space-y-1 text-[11.5px] text-white/50">
                {details.requested_services?.length > 0 && <p>Asked for: {details.requested_services.join(', ')}</p>}
                {details.note && <p>Note: {details.note}</p>}
              </div>
            )}

            {!['DECLINED', 'EXPIRED', 'QUOTE_CONFIRMED'].includes(request.state) && (
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : request.id)}
                className="mt-3 rounded-lg border px-3 py-1.5 text-[11.5px] font-semibold text-white/80"
                style={{ borderColor: 'rgba(212,175,55,0.35)', color: GOLD }}
              >
                {isOpen ? 'Close' : 'Respond'}
              </button>
            )}

            {isOpen && (
              <div className="mt-3 space-y-2">
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12.5px] text-white outline-none"
                  value={form.response_type}
                  onChange={(e) => setForm((f) => ({ ...f, response_type: e.target.value }))}
                >
                  <option value="quoted" className="bg-[#0C1A1D]">Give a firm price</option>
                  <option value="acknowledged" className="bg-[#0C1A1D]">Acknowledge only</option>
                  <option value="info_needed" className="bg-[#0C1A1D]">Ask for more information</option>
                  <option value="declined" className="bg-[#0C1A1D]">Decline</option>
                </select>

                {form.response_type === 'quoted' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12.5px] text-white outline-none"
                      placeholder="Amount"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12.5px] text-white outline-none"
                      value={form.valid_until}
                      onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    />
                  </div>
                )}

                {form.response_type === 'info_needed' && (
                  <input
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12.5px] text-white outline-none"
                    placeholder="What do you need to know?"
                    value={form.info_requested}
                    onChange={(e) => setForm((f) => ({ ...f, info_requested: e.target.value }))}
                  />
                )}

                <input
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12.5px] text-white outline-none"
                  placeholder="Note to the traveller (optional)"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />

                {error && <p className="text-[11px] text-rose-300">{error}</p>}

                <button
                  type="button"
                  onClick={() => respond(request)}
                  disabled={busy}
                  className="w-full rounded-lg py-2 text-[12px] font-semibold disabled:opacity-50"
                  style={{ background: GOLD, color: '#060B16' }}
                >
                  {busy ? 'Saving…' : 'Send response'}
                </button>
                <p className="text-[10px] text-white/30">
                  Only what you write here reaches the traveller. An acknowledgement is never shown as a price.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}