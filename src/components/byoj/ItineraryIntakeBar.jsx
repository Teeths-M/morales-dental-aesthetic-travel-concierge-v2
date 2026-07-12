import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Stethoscope, Building2, Sparkles, Calendar, Loader2, ChevronDown, Search } from 'lucide-react';
import cityData from '@/lib/cityData.json';
import { procedureCategories } from '@/components/procedures/ProcedureData';
import { fuzzyMatches } from '@/lib/fuzzyMatch';
import SearchSelect from './SearchSelect';

// Canonical procedure names — the FULL platform catalog (every category), grouped,
// so a patient can pick anything they actually booked and the safety engine can
// score the combination. Titles come from the shared ProcedureData source.

const COUNTRIES = Object.keys(cityData).sort((a, b) => a.localeCompare(b));
function citiesFor(country) {
  if (!country) return [];
  const key = COUNTRIES.find((k) => k.toLowerCase() === country.toLowerCase());
  return key ? cityData[key] : [];
}

const textInput =
  'w-full bg-transparent outline-none text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal';

function Field({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-[#0E8A7D]/50 transition-colors">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
        <Icon className="w-3 h-3" /> {label}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/**
 * Clean, white itinerary-intake card for Bring Your Own Journey. Manual entry only
 * (document parsing is a later phase). Country + City are searchable dropdowns with
 * fuzzy autocomplete; City auto-populates from the chosen Country.
 */
export default function ItineraryIntakeBar({ form, update, onVerify, loading, needsSignIn }) {
  const [procOpen, setProcOpen] = useState(false);
  const [procSearch, setProcSearch] = useState('');
  const procRef = useRef(null);
  // Close the multi-select on an outside click (it stays open while you pick several).
  useEffect(() => {
    const h = (e) => { if (procRef.current && !procRef.current.contains(e.target)) setProcOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const procs = form.procedures || [];
  const canVerify = form.doctor_name?.trim() && form.clinic_name?.trim() && form.destination_country?.trim();

  const q = procSearch.trim();
  // Substring match first; fuzzy only as a strict typo-tolerance fallback (a low
  // threshold matches "hair" to "Tooth Extraction" on a partial-subsequence — noise).
  const matchTitle = (t) => !q || t.toLowerCase().includes(q.toLowerCase()) || fuzzyMatches(q, t, 72);
  const groupedProcedures = procedureCategories
    .map((cat) => [cat.label, cat.procedures.map((p) => p.title).filter(matchTitle)])
    .filter(([, items]) => items.length > 0);

  const toggleProc = (p) =>
    update('procedures', procs.includes(p) ? procs.filter((x) => x !== p) : [...procs, p]);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_28px_64px_-28px_rgba(0,0,0,0.6)] p-5 sm:p-6">
      {/* Tabs — manual is live; document upload is a later phase */}
      <div className="flex items-center gap-6 mb-5 border-b border-slate-100">
        <span className="text-[14px] font-bold text-[#0E8A7D] border-b-2 border-[#0E8A7D] pb-2 -mb-px">My booked journey</span>
        <span className="text-[14px] font-semibold text-slate-300 pb-2 inline-flex items-center gap-2 cursor-not-allowed">
          Upload confirmation
          <span className="text-[9px] font-bold uppercase tracking-wide text-[#0E8A7D] bg-[#0E8A7D]/10 rounded-full px-2 py-0.5">Soon</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field icon={MapPin} label="Country">
          <SearchSelect
            value={form.destination_country || ''}
            onChange={(v) => { update('destination_country', v); update('destination_city', ''); }}
            options={COUNTRIES}
            placeholder="Select or type a country"
          />
        </Field>

        <Field icon={MapPin} label="City">
          <SearchSelect
            value={form.destination_city || ''}
            onChange={(v) => update('destination_city', v)}
            options={citiesFor(form.destination_country)}
            placeholder={form.destination_country ? 'Select or type a city' : 'Pick a country first'}
            disabled={!form.destination_country}
          />
        </Field>

        <Field icon={Stethoscope} label="Doctor">
          <input className={textInput} placeholder="Doctor’s name" value={form.doctor_name || ''}
            onChange={(e) => update('doctor_name', e.target.value)} />
        </Field>

        <Field icon={Building2} label="Clinic">
          <input className={textInput} placeholder="Clinic name" value={form.clinic_name || ''}
            onChange={(e) => update('clinic_name', e.target.value)} />
        </Field>

        <Field icon={Sparkles} label="Procedure(s)">
          <div className="relative" ref={procRef}>
            <button type="button" onClick={() => setProcOpen((o) => !o)}
              className="w-full flex items-center justify-between text-left text-[15px] font-semibold text-slate-900">
              <span className={procs.length ? '' : 'text-slate-400 font-normal'}>
                {procs.length ? `${procs.length} selected` : 'Add procedures'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
            {procOpen && (
              <div className="absolute z-40 left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input autoFocus value={procSearch} onChange={(e) => setProcSearch(e.target.value)}
                    placeholder="Search all procedures…"
                    className="w-full text-[13px] bg-transparent outline-none text-slate-900 placeholder:text-slate-400" />
                </div>
                <div className="max-h-64 overflow-y-auto p-1.5">
                  {groupedProcedures.map(([label, items]) => (
                    <div key={label}>
                      <p className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-slate-400 font-bold">{label}</p>
                      {items.map((p) => (
                        <button key={p} type="button" onClick={() => toggleProc(p)}
                          className={`w-full text-left text-[13px] px-3 py-1.5 rounded-lg transition-colors ${procs.includes(p) ? 'bg-[#0E8A7D]/10 text-[#0E8A7D] font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                          {procs.includes(p) ? '✓ ' : ''}{p}
                        </button>
                      ))}
                    </div>
                  ))}
                  {groupedProcedures.length === 0 && (
                    <p className="px-3 py-4 text-[13px] text-slate-400">No procedures match “{procSearch}”.</p>
                  )}
                </div>
                <div className="p-2 border-t border-slate-100">
                  <button type="button" onClick={() => setProcOpen(false)}
                    className="w-full text-[13px] font-semibold text-[#0E8A7D] py-1.5 rounded-lg hover:bg-[#0E8A7D]/8 transition-colors">
                    Done{procs.length ? ` · ${procs.length} selected` : ''}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Field>

        <Field icon={Calendar} label="Surgery date">
          <input type="date" className={textInput} value={form.surgery_date || ''}
            onChange={(e) => update('surgery_date', e.target.value)} />
        </Field>
      </div>

      {procs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {procs.map((p) => (
            <span key={p} className="text-[11px] text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">{p}</span>
          ))}
        </div>
      )}

      <button onClick={onVerify} disabled={!canVerify || loading}
        className={`mt-4 w-full rounded-xl py-3.5 font-semibold text-[15px] flex items-center justify-center gap-2 transition-all
          ${canVerify && !loading ? 'bg-[#0E8A7D] text-white hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : needsSignIn ? 'Sign in to verify' : 'Verify my journey →'}
      </button>
    </div>
  );
}
