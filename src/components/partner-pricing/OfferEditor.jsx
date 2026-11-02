import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CATEGORY_OPTIONS, GOLD, minorToInput, unitsForCategory } from '@/lib/partnerPricing';

/**
 * OfferEditor — one screen that creates or edits a service AND its price.
 *
 * Partners think in "a service with a price", not in two tables, so the form
 * asks for both and the server splits them. A price the partner edits is saved
 * as partner-submitted; there is a separate, explicit "this is still accurate"
 * control for confirming it, because those are different statements.
 */

const FIELD = 'w-full rounded-lg px-3 py-2 text-[13px] bg-white/5 border border-white/10 text-white placeholder:text-white/25 outline-none';

export default function OfferEditor({ service, card, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: service?.name || '',
    category: service?.category || 'package',
    description: service?.description || '',
    location_label: service?.location_label || '',
    country: service?.country || '',
    city: service?.city || '',
    is_package: service?.is_package ?? false,
    currency: card?.currency || 'USD',
    amount: minorToInput(card?.amount_minor, card?.currency || 'USD'),
    pricing_unit: card?.pricing_unit || 'per_package',
    valid_until: card?.valid_until || '',
    inclusions: (card?.inclusions || []).join(', '),
    exclusions: (card?.exclusions || []).join(', '),
    cancellation_terms: card?.cancellation_terms || service?.cancellation_terms || '',
    availability_status: card?.availability_status || 'unknown',
    review_interval_days: card?.review_interval_days || 30,
    reminder_cadence: card?.reminder_cadence || 'weekly',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Keep the unit valid when the category changes — a "per night" hotel rate on
  // a flight makes no sense and the server would reject it anyway.
  useEffect(() => {
    const allowed = unitsForCategory(form.category);
    if (!allowed.includes(form.pricing_unit)) {
      setForm((prev) => ({ ...prev, pricing_unit: allowed[0] }));
    }
  }, [form.category, form.pricing_unit]);

  const save = async () => {
    setError('');
    if (!form.name.trim()) return setError('Give the service a name.');
    if (!form.amount && form.pricing_unit !== 'quote_required') return setError('Enter a price, or choose “quote required”.');

    setBusy(true);
    try {
      const serviceResult = await base44.functions.invoke('managePartnerService', {
        action: service ? 'update' : 'create',
        service_id: service?.id,
        name: form.name,
        category: form.category,
        description: form.description,
        location_label: form.location_label,
        country: form.country,
        city: form.city,
        is_package: form.is_package,
        cancellation_terms: form.cancellation_terms,
        publish: true,
      });
      const savedService = serviceResult.data?.service;
      if (!savedService?.id) throw new Error(serviceResult.data?.error || 'The service could not be saved.');

      const priceResult = await base44.functions.invoke('managePartnerRateCard', {
        action: 'save',
        rate_card_id: card?.id,
        service_id: savedService.id,
        currency: form.currency,
        amount: form.pricing_unit === 'quote_required' ? undefined : form.amount,
        pricing_unit: form.pricing_unit,
        price_kind: form.pricing_unit === 'quote_required' ? 'quote_required'
          : form.pricing_unit === 'starting_from' ? 'starting_from' : 'firm',
        valid_until: form.valid_until || undefined,
        inclusions: form.inclusions.split(',').map((v) => v.trim()).filter(Boolean),
        exclusions: form.exclusions.split(',').map((v) => v.trim()).filter(Boolean),
        cancellation_terms: form.cancellation_terms,
        availability_status: form.availability_status,
        review_interval_days: Number(form.review_interval_days) || 30,
        reminder_cadence: form.reminder_cadence,
      });
      if (priceResult.data?.error) throw new Error(priceResult.data.error);

      onSaved?.(priceResult.data);
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'That could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border p-5 sm:rounded-2xl"
        style={{ background: '#0C1A1D', borderColor: 'rgba(212,175,55,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
              {service ? 'Update offer' : 'New offer'}
            </p>
            <h2 className="mt-1 text-[17px] font-semibold text-white">
              {service ? service.name : 'What do you offer?'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input className={FIELD} placeholder="Service name, e.g. New York travel package" value={form.name} onChange={set('name')} />

          <div className="grid grid-cols-2 gap-2">
            <select className={FIELD} value={form.category} onChange={set('category')}>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#0C1A1D]">{option.label}</option>
              ))}
            </select>
            <select className={FIELD} value={form.pricing_unit} onChange={set('pricing_unit')}>
              {unitsForCategory(form.category).map((unit) => (
                <option key={unit} value={unit} className="bg-[#0C1A1D]">{unit.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input className={FIELD} placeholder="Amount" inputMode="decimal" value={form.amount} onChange={set('amount')} />
            <input className={FIELD} placeholder="USD" value={form.currency} onChange={set('currency')} maxLength={3} />
            <input className={FIELD} type="date" value={form.valid_until} onChange={set('valid_until')} />
          </div>

          <input className={FIELD} placeholder="Where, e.g. Port of Spain → New York" value={form.location_label} onChange={set('location_label')} />
          <div className="grid grid-cols-2 gap-2">
            <input className={FIELD} placeholder="Country" value={form.country} onChange={set('country')} />
            <input className={FIELD} placeholder="City" value={form.city} onChange={set('city')} />
          </div>

          <input className={FIELD} placeholder="Included (comma separated)" value={form.inclusions} onChange={set('inclusions')} />
          <input className={FIELD} placeholder="Not included (comma separated)" value={form.exclusions} onChange={set('exclusions')} />
          <input className={FIELD} placeholder="Cancellation terms" value={form.cancellation_terms} onChange={set('cancellation_terms')} />

          <div className="grid grid-cols-2 gap-2">
            <select className={FIELD} value={form.availability_status} onChange={set('availability_status')}>
              <option value="unknown" className="bg-[#0C1A1D]">Availability unknown</option>
              <option value="available" className="bg-[#0C1A1D]">Available</option>
              <option value="limited" className="bg-[#0C1A1D]">Limited</option>
              <option value="requires_confirmation" className="bg-[#0C1A1D]">Needs confirming</option>
              <option value="unavailable" className="bg-[#0C1A1D]">Unavailable</option>
            </select>
            <select className={FIELD} value={form.reminder_cadence} onChange={set('reminder_cadence')}>
              <option value="weekly" className="bg-[#0C1A1D]">Check weekly</option>
              <option value="daily" className="bg-[#0C1A1D]">Check daily</option>
              <option value="custom" className="bg-[#0C1A1D]">Custom interval</option>
              <option value="none" className="bg-[#0C1A1D]">No reminders</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-[12px] text-white/60">
            <input type="checkbox" checked={form.is_package} onChange={set('is_package')} />
            This offer bundles several components (flight, hotel, transfers)
          </label>

          {error && (
            <p className="rounded-lg border px-3 py-2 text-[11.5px] text-rose-300" style={{ borderColor: 'rgba(244,63,94,0.35)', background: 'rgba(244,63,94,0.08)' }}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="w-full rounded-xl py-2.5 text-[13px] font-semibold disabled:opacity-50"
            style={{ background: GOLD, color: '#060B16' }}
          >
            {busy ? 'Saving…' : 'Save offer'}
          </button>
          <p className="text-center text-[10.5px] text-white/30">
            Saving records this as your submitted price. Confirming it separately tells M-Care it is current.
          </p>
        </div>
      </div>
    </div>
  );
}