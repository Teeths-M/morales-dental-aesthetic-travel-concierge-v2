import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, X, Star, Shield, Heart, Globe } from 'lucide-react';

const PROCEDURES = [
  { group: '🦷 Dental',    label: 'Dental Implants',          value: 'dental_implants' },
  { group: '🦷 Dental',    label: 'All-on-4 / All-on-6',      value: 'all_on_4' },
  { group: '🦷 Dental',    label: 'Porcelain Veneers',         value: 'porcelain_veneers' },
  { group: '🦷 Dental',    label: 'Smile Makeover',            value: 'smile_makeover' },
  { group: '🦷 Dental',    label: 'Teeth Whitening',           value: 'teeth_whitening' },
  { group: '✨ Cosmetic',   label: 'Rhinoplasty (Nose)',        value: 'rhinoplasty' },
  { group: '✨ Cosmetic',   label: 'Breast Surgery',            value: 'breast_surgery' },
  { group: '✨ Cosmetic',   label: 'Liposuction',               value: 'liposuction' },
  { group: '✨ Cosmetic',   label: 'Tummy Tuck',                value: 'tummy_tuck' },
  { group: '✨ Cosmetic',   label: 'Facelift',                  value: 'facelift' },
  { group: '⚖️ Bariatric',  label: 'Gastric Sleeve',            value: 'gastric_sleeve' },
  { group: '⚖️ Bariatric',  label: 'Gastric Bypass',            value: 'gastric_bypass' },
  { group: '🌸 Fertility',  label: 'IVF (In Vitro)',            value: 'ivf' },
  { group: '🌸 Fertility',  label: 'Egg Freezing',              value: 'egg_freezing' },
  { group: '🦴 Orthopedic', label: 'Joint Replacement',         value: 'joint_replacement' },
  { group: '🦴 Orthopedic', label: 'Spine Surgery',             value: 'spine_surgery' },
  { group: '🔬 Other',      label: "I'm not sure yet",           value: 'unknown' },
];

const TOTAL_STEPS = 4;

const STORAGE_KEY = 'morales_onboarding_complete';

export function markOnboardingComplete() {
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (_) {}
}

export function isOnboardingComplete() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch (_) { return true; }
}

// ── Step components ───────────────────────────────────────────────────────────

function StepWelcome({ onNext }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center">
        <img src="/morales-m-mark.png" alt="Morales" className="w-10 h-10 object-contain" />
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Morales</h2>
        <p className="text-slate-400 text-base leading-relaxed max-w-xs mx-auto">
          Your personal medical travel concierge. We'll guide you every step of the way — from choosing a procedure to recovering safely at home.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {[
          { icon: <Shield className="w-5 h-5 text-emerald-400" />, label: '100% Safe' },
          { icon: <Star   className="w-5 h-5 text-[#D4AF37]"  />, label: 'Top Doctors' },
          { icon: <Heart  className="w-5 h-5 text-rose-400"   />, label: '24/7 Care' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 bg-white/5 rounded-2xl py-3 px-2">
            {icon}
            <span className="text-xs text-slate-300 font-semibold">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-[#060B16] font-semibold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30"
      >
        Start Your Journey <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function StepName({ name, setName, onNext, onBack }) {
  const valid = name.trim().length >= 2;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">What's your name?</h2>
        <p className="text-slate-400 text-sm">We'll use this to personalise your experience.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-300 block">Your full name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Maria González"
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all text-base"
        />
        {name.length > 0 && !valid && (
          <p className="text-xs text-amber-400">Please enter your first and last name.</p>
        )}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!valid} />
    </div>
  );
}

function StepProcedure({ procedure, setProcedure, onNext, onBack }) {
  const groups = [...new Set(PROCEDURES.map(p => p.group))];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">What procedure interests you?</h2>
        <p className="text-slate-400 text-sm">Tap one to select. You can always change this later.</p>
      </div>

      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
        {groups.map(group => (
          <div key={group}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{group}</p>
            <div className="space-y-1.5">
              {PROCEDURES.filter(p => p.group === group).map(p => (
                <button
                  key={p.value}
                  onClick={() => setProcedure(p.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    procedure === p.value
                      ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37]'
                      : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {p.label}
                  {procedure === p.value && <CheckCircle2 className="w-4 h-4 inline-block ml-2 text-[#D4AF37]" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!procedure} />
    </div>
  );
}

function StepPIN({ pin, setPin, pinConfirm, setPinConfirm, onNext, onBack }) {
  const [error, setError] = useState('');

  const handleNext = () => {
    if (pin.length !== 4) { setError('Please enter exactly 4 numbers.'); return; }
    if (pin !== pinConfirm) { setError("The PINs don't match. Please try again."); return; }
    setError('');
    try {
      localStorage.setItem('morales_onboarding_pin_set', 'true');
    } catch (_) {}
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Set your Emergency PIN</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          This 4-digit PIN unlocks emergency features when you're offline or in a crisis. Choose something you'll remember easily.
        </p>
      </div>

      <div className="space-y-4">
        <PINField label="Choose a 4-digit PIN" value={pin} onChange={v => { setPin(v); setError(''); }} />
        <PINField label="Confirm your PIN" value={pinConfirm} onChange={v => { setPinConfirm(v); setError(''); }} />
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>

      <p className="text-xs text-slate-500">
        🔒 Your PIN is stored only on this device and is never sent to our servers.
      </p>

      <NavButtons onBack={onBack} onNext={handleNext} nextLabel="Finish Setup" />
    </div>
  );
}

function PINField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-300 block">{label}</label>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="• • • •"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-center text-2xl tracking-[0.6em] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all"
      />
    </div>
  );
}

function NavButtons({ onBack, onNext, nextDisabled = false, nextLabel = 'Continue' }) {
  return (
    <div className="flex gap-3 pt-2">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm font-semibold transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-[#060B16] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {nextLabel} <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i + 1 <= step ? 'bg-[#D4AF37]' : 'bg-white/10'
          }`}
        />
      ))}
      <span className="text-xs text-slate-500 font-semibold whitespace-nowrap ml-1">
        Step {step} of {TOTAL_STEPS}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FirstTimeOnboarding({ onComplete, userDisplayName = '' }) {
  const [step, setStep]           = useState(1);
  const [name, setName]           = useState(userDisplayName);
  const [procedure, setProcedure] = useState('');
  const [pin, setPin]             = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const finish = () => {
    markOnboardingComplete();
    onComplete?.({ name, procedure, pinSet: pin.length === 4 });
  };

  const skip = () => {
    markOnboardingComplete();
    onComplete?.({ skipped: true });
  };

  return (
    // Full-screen overlay
    <div className="fixed inset-0 z-[9999] bg-[#060B16]/95 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-gradient-to-br from-slate-900 to-[#060B16] border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/60 relative"
      >
        {/* Skip link — not shown on step 1 */}
        {step > 1 && (
          <button
            onClick={skip}
            className="absolute top-5 right-5 text-slate-600 hover:text-slate-400 text-xs font-medium transition-colors flex items-center gap-1"
            aria-label="Skip setup"
          >
            Skip <X className="w-3 h-3" />
          </button>
        )}

        {/* Progress (hidden on welcome) */}
        {step > 1 && <ProgressBar step={step} />}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && <StepWelcome onNext={next} />}
            {step === 2 && <StepName   name={name} setName={setName} onNext={next} onBack={back} />}
            {step === 3 && <StepProcedure procedure={procedure} setProcedure={setProcedure} onNext={next} onBack={back} />}
            {step === 4 && <StepPIN pin={pin} setPin={setPin} pinConfirm={pinConfirm} setPinConfirm={setPinConfirm} onNext={finish} onBack={back} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
