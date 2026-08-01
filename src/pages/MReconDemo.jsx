import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, MapPin, Calendar, Building2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import cityData from '@/lib/cityData.json';
import { SERVED_COUNTRIES } from '@/lib/countryCity';
import SearchSelect from '@/components/ui-system/SearchSelect';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const GOLD = '#D4AF37';
const COUNTRIES = [...SERVED_COUNTRIES].sort((a, b) => a.localeCompare(b));
function citiesFor(country) {
  if (!country) return [];
  const key = COUNTRIES.find((k) => k.toLowerCase() === country.toLowerCase());
  return key ? cityData[key] : [];
}

// Small, representative demo list — deliberately includes one known RED pair
// (Full Mouth Implants + Facelift) so the live demo can actually show the
// deterministic RED engine catch something real, not just a happy path.
const DEMO_PROCEDURES = [
  'Dental Cleaning', 'Tooth Extraction', 'Full Mouth Implants',
  'Facelift', 'Rhinoplasty', 'Botox', 'Tummy Tuck', 'Brazilian Butt Lift',
];

const TOOL_LABELS = {
  checkRedViolations: 'Checking procedure combination safety',
  checkVisaRequirement: 'Checking visa requirements',
  checkClinicStatus: 'Checking clinic operating status',
  checkWeatherAlert: 'Checking weather alerts',
  checkDestinationSafety: 'Checking destination safety index',
};

function Field({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl border border-[#2A3F4A] bg-[#0C1A1D] px-3.5 py-2.5 focus-within:border-[#D4AF37]/50 transition-colors">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#7E939C] font-semibold">
        <Icon className="w-3 h-3" /> {label}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function TraceStep({ step }) {
  if (step.skipped) return null;
  const isViolation = step.tool === 'checkRedViolations' && step.result?.isBlocked;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-xl border p-4 ${isViolation ? 'border-red-500/40 bg-red-500/10' : 'border-[#2A3F4A] bg-[#0C1A1D]'}`}
    >
      <p className="flex items-center gap-2 text-[13px] font-semibold m-0" style={{ color: isViolation ? '#f87171' : '#EAF2F4' }}>
        {isViolation ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0E8A7D]" />}
        {TOOL_LABELS[step.tool] || step.tool}
      </p>
      {step.reasoning && (
        <p className="text-[12px] text-[#7E939C] italic m-0 mt-1">"{step.reasoning}"</p>
      )}
      <ResultSummary tool={step.tool} result={step.result} />
    </motion.div>
  );
}

function ResultSummary({ tool, result }) {
  if (!result) return null;
  if (tool === 'checkRedViolations') {
    if (result.isBlocked) {
      return <p className="text-[12.5px] text-red-300 m-0 mt-2">{result.violations[0]?.pairLabel}: {result.violations[0]?.reason}</p>;
    }
    return <p className="text-[12.5px] text-[#B7C6CC] m-0 mt-2">No dangerous combinations detected.</p>;
  }
  if (tool === 'checkVisaRequirement') return <p className="text-[12.5px] text-[#B7C6CC] m-0 mt-2">{result.notes}</p>;
  if (tool === 'checkClinicStatus') return <p className="text-[12.5px] text-[#B7C6CC] m-0 mt-2">{result.summary}</p>;
  if (tool === 'checkWeatherAlert') return <p className="text-[12.5px] text-[#B7C6CC] m-0 mt-2">{result.summary}</p>;
  if (tool === 'checkDestinationSafety') return <p className="text-[12.5px] text-[#B7C6CC] m-0 mt-2">Safety index {result.safety_index}/100 — {result.label}.</p>;
  return null;
}

export default function MReconDemo() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    journey_type: 'medical',
    destination_country: '', destination_city: '',
    procedures: [], clinic_name: '', travel_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { trace, final_briefing, error }
  const [visibleCount, setVisibleCount] = useState(0);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const isMedical = form.journey_type === 'medical';
  const canRun = form.destination_country?.trim() && (!isMedical || form.procedures.length > 0 || true);

  // Reveal trace steps one at a time once a result comes back — same honest
  // "scripted reveal of real data" pattern as /demo/mesh-beacon, except every
  // step here reflects an actual decision the agent made this run.
  useEffect(() => {
    if (!result?.trace?.length) return;
    setVisibleCount(0);
    const visibleSteps = result.trace.filter((s) => !s.skipped);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= visibleSteps.length) clearInterval(interval);
    }, 900);
    return () => clearInterval(interval);
  }, [result]);

  const visibleSteps = useMemo(() => (result?.trace || []).filter((s) => !s.skipped), [result]);
  const briefingRevealed = result && visibleCount >= visibleSteps.length;

  const toggleProc = (p) =>
    update('procedures', form.procedures.includes(p) ? form.procedures.filter((x) => x !== p) : [...form.procedures, p]);

  const handleRun = async () => {
    if (!user) { toast.error('Sign in to run M Recon.'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('runMReconAgent', {
        journey_type: form.journey_type,
        destination_country: form.destination_country,
        destination_city: form.destination_city,
        procedures: isMedical ? form.procedures : [],
        clinic_name: isMedical ? form.clinic_name : '',
        travel_date: form.travel_date,
      });
      const payload = res?.data ?? res ?? {};
      if (payload.error && !payload.trace) {
        toast.error(payload.error);
        setResult(null);
      } else {
        setResult(payload);
      }
    } catch (_) {
      toast.error('M Recon could not complete its reasoning. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B16] text-white px-4 sm:px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/demo" className="inline-flex items-center gap-1.5 text-[13px] text-[#7E939C] hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to demos
        </Link>

        <div className="mb-8">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#D4AF37] font-bold">
            <Compass className="w-3.5 h-3.5" /> M Recon
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 mb-2">
            Agentic <span className="text-[#D4AF37]">travel-readiness briefing</span>
          </h1>
          <p className="text-[#B7C6CC] text-[15px] max-w-xl">
            Tell M Recon about a trip. It decides for itself which checks actually matter for
            this trip and runs them — it doesn't run a fixed checklist. The procedure-safety
            check is real and live; the rest are demo data.
          </p>
        </div>

        {!result && !loading && (
          <div className="rounded-2xl bg-[#0C1A1D] border border-[#2A3F4A] p-5 sm:p-6">
            <div className="flex items-center gap-1 bg-[#060B16] rounded-full p-1 w-fit mb-5">
              <button type="button" onClick={() => update('journey_type', 'medical')}
                className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-all ${isMedical ? 'bg-[#D4AF37] text-[#060B16]' : 'text-[#7E939C]'}`}>
                Medical trip
              </button>
              <button type="button" onClick={() => update('journey_type', 'non_medical')}
                className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-all ${!isMedical ? 'bg-[#D4AF37] text-[#060B16]' : 'text-[#7E939C]'}`}>
                Non-medical trip
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field icon={MapPin} label="Country">
                <SearchSelect
                  value={form.destination_country}
                  onChange={(v) => { update('destination_country', v); update('destination_city', ''); }}
                  options={COUNTRIES}
                  placeholder="Select or type a country"
                  dark
                  testId="m-recon-country"
                />
              </Field>
              <Field icon={MapPin} label="City">
                <SearchSelect
                  value={form.destination_city}
                  onChange={(v) => update('destination_city', v)}
                  options={citiesFor(form.destination_country)}
                  placeholder={form.destination_country ? 'Select or type a city' : 'Pick a country first'}
                  disabled={!form.destination_country}
                  dark
                  testId="m-recon-city"
                />
              </Field>
              {isMedical && (
                <Field icon={Building2} label="Clinic (optional)">
                  <input
                    className="w-full bg-transparent outline-none text-[15px] font-semibold text-white placeholder:text-[#54666E] placeholder:font-normal"
                    placeholder="Clinic name"
                    value={form.clinic_name}
                    onChange={(e) => update('clinic_name', e.target.value)}
                  />
                </Field>
              )}
              <Field icon={Calendar} label="Travel date">
                <input type="date"
                  className="w-full bg-transparent outline-none text-[15px] font-semibold text-white placeholder:text-[#54666E]"
                  value={form.travel_date}
                  onChange={(e) => update('travel_date', e.target.value)} />
              </Field>
            </div>

            {isMedical && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wide text-[#7E939C] font-semibold mb-2">Procedures (optional — pick 2 to see the safety check run)</p>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_PROCEDURES.map((p) => (
                    <button key={p} type="button" onClick={() => toggleProc(p)}
                      className={`text-[12px] rounded-full px-3 py-1.5 border transition-colors ${form.procedures.includes(p)
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#D4AF37]'
                        : 'bg-[#060B16] border-[#2A3F4A] text-[#B7C6CC] hover:border-[#D4AF37]/30'}`}>
                      {form.procedures.includes(p) ? '✓ ' : ''}{p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleRun} disabled={!canRun}
              className={`mt-5 w-full rounded-xl py-3.5 font-semibold text-[15px] transition-all
                ${canRun ? 'bg-gradient-to-br from-[#D4AF37] to-[#b8912b] text-[#060B16] hover:opacity-90' : 'bg-[#14242b] text-[#54666E] cursor-not-allowed'}`}>
              {user ? 'Run M Recon →' : 'Sign in to run M Recon'}
            </button>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl bg-[#0C1A1D] border border-[#2A3F4A] p-8 text-center">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto mb-3" />
            <p className="text-[#B7C6CC] text-[14px] m-0">M Recon is deciding which checks this trip needs...</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <AnimatePresence>
              {visibleSteps.slice(0, visibleCount).map((step) => (
                <TraceStep key={step.step} step={step} />
              ))}
            </AnimatePresence>

            {briefingRevealed && result.final_briefing && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/8 p-5">
                <p className="text-[11px] uppercase tracking-widest text-[#D4AF37] font-bold m-0 mb-2">Travel-readiness briefing</p>
                <p className="text-[14px] text-white leading-relaxed m-0">{result.final_briefing}</p>
              </motion.div>
            )}

            {briefingRevealed && result.error && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-red-300 m-0">
                  <AlertTriangle className="w-4 h-4" /> Reasoning incomplete
                </p>
                <p className="text-[12.5px] text-red-200/80 m-0 mt-1">{result.error}</p>
              </motion.div>
            )}

            {briefingRevealed && (
              <button onClick={() => { setResult(null); setVisibleCount(0); }}
                className="w-full rounded-xl py-3 font-semibold text-[13px] text-[#7E939C] border border-[#2A3F4A] hover:text-white hover:border-[#D4AF37]/30 transition-colors">
                Run another trip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
