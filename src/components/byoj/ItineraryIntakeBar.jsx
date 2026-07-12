import React, { useState } from 'react';
import { MapPin, Stethoscope, Building2, Sparkles, Calendar, Loader2, ChevronDown } from 'lucide-react';

// Canonical procedure names — these match the safety engine's RED rules so the
// combination check is meaningful (never a free-text that can't be scored).
const PROCEDURES = [
  'Rhinoplasty', 'Facelift', 'Liposuction', 'Tummy Tuck', 'Brazilian Butt Lift',
  'Breast Augmentation', 'Breast Lift', 'Breast Reduction', 'Mommy Makeover',
  'Full Mouth Implants', 'All-on-4 Implants', 'Single Dental Implant',
  'Porcelain Veneers', 'Hollywood Smile', 'Gastric Sleeve',
];

const fieldCls = 'flex-1 min-w-[150px] rounded-xl border border-[#2A3F4A] bg-[#0C1A1D] px-3.5 py-2.5 focus-within:border-[#D4AF37]/60 transition-colors';
const lblCls = 'flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#7E939C] font-medium';
const inputCls = 'mt-1 w-full bg-transparent text-[15px] font-semibold text-white placeholder:text-[#54666E] placeholder:font-normal outline-none';

/**
 * Flight-search-style itinerary bar for Bring Your Own Journey — a fast horizontal
 * entry, not a 12-step medical form. Manual entry only (document parsing is a
 * later phase).
 */
export default function ItineraryIntakeBar({ form, update, onVerify, loading, needsSignIn }) {
  const [procOpen, setProcOpen] = useState(false);
  const procs = form.procedures || [];
  const canVerify = form.doctor_name?.trim() && form.clinic_name?.trim() && form.destination_country?.trim();

  const toggleProc = (p) =>
    update('procedures', procs.includes(p) ? procs.filter((x) => x !== p) : [...procs, p]);

  return (
    <div className="rounded-2xl border border-[#2A3F4A] bg-gradient-to-b from-[#0C1A1D] to-[#0A1220] p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row gap-2.5 lg:items-stretch">
        <div className={fieldCls}>
          <span className={lblCls}><MapPin className="w-3 h-3" /> Country · City</span>
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Country" value={form.destination_country || ''}
              onChange={(e) => update('destination_country', e.target.value)} />
            <input className={`${inputCls} max-w-[45%]`} placeholder="City" value={form.destination_city || ''}
              onChange={(e) => update('destination_city', e.target.value)} />
          </div>
        </div>

        <div className={fieldCls}>
          <span className={lblCls}><Stethoscope className="w-3 h-3" /> Doctor</span>
          <input className={inputCls} placeholder="Doctor’s name" value={form.doctor_name || ''}
            onChange={(e) => update('doctor_name', e.target.value)} />
        </div>

        <div className={fieldCls}>
          <span className={lblCls}><Building2 className="w-3 h-3" /> Clinic</span>
          <input className={inputCls} placeholder="Clinic name" value={form.clinic_name || ''}
            onChange={(e) => update('clinic_name', e.target.value)} />
        </div>

        <div className={`${fieldCls} relative`}>
          <span className={lblCls}><Sparkles className="w-3 h-3" /> Procedure(s)</span>
          <button type="button" onClick={() => setProcOpen((o) => !o)}
            className="mt-1 w-full flex items-center justify-between text-left text-[15px] font-semibold text-white">
            <span className={procs.length ? '' : 'text-[#54666E] font-normal'}>
              {procs.length ? `${procs.length} selected` : 'Add procedures'}
            </span>
            <ChevronDown className="w-4 h-4 text-[#7E939C] shrink-0" />
          </button>
          {procOpen && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#2A3F4A] bg-[#0C1A1D] p-1.5 shadow-2xl">
              {PROCEDURES.map((p) => (
                <button key={p} type="button" onClick={() => toggleProc(p)}
                  className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors ${procs.includes(p) ? 'bg-[#D4AF37]/12 text-[#D4AF37]' : 'text-[#B7C6CC] hover:bg-white/5'}`}>
                  {procs.includes(p) ? '✓ ' : ''}{p}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={fieldCls}>
          <span className={lblCls}><Calendar className="w-3 h-3" /> Surgery date</span>
          <input type="date" className={`${inputCls} [color-scheme:dark]`} value={form.surgery_date || ''}
            onChange={(e) => update('surgery_date', e.target.value)} />
        </div>

        <button onClick={onVerify} disabled={!canVerify || loading}
          className={`shrink-0 rounded-xl px-6 py-3 lg:py-0 font-semibold text-[15px] flex items-center justify-center gap-2 transition-all
            ${canVerify && !loading ? 'bg-gradient-to-br from-[#0E8A7D] to-[#0b6f64] text-white hover:opacity-90' : 'bg-[#14242b] text-[#54666E] cursor-not-allowed'}`}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : needsSignIn ? 'Sign in to verify' : 'Verify my journey'}
        </button>
      </div>

      {procs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {procs.map((p) => (
            <span key={p} className="text-[11px] text-[#B7C6CC] bg-white/5 border border-[#2A3F4A] rounded-full px-2.5 py-1">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}
