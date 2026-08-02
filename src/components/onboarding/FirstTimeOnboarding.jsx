import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, Circle, X, Star, Shield, Heart, Plane, Home, KeyRound, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PROTECTION_TYPES, PROTECTION_OPTIONS, setProtectionTypeLocally } from '@/lib/protectionType';

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

const STORAGE_KEY = 'morales_onboarding_complete';

const ICON_FOR_TYPE = {
  [PROTECTION_TYPES.TRAVELER]: Plane,
  [PROTECTION_TYPES.NON_TRAVELER]: Home,
};

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
          { icon: <Shield className="w-5 h-5 text-emerald-400" />, label: 'Protected' },
          { icon: <Star   className="w-5 h-5 text-[#D4AF37]"  />, label: 'Verified Doctors' },
          { icon: <Heart  className="w-5 h-5 text-rose-400"   />, label: '24/7 Care' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 bg-white/5 rounded-2xl py-3 px-2">
            {icon}
            <span className="text-xs text-slate-300 font-semibold text-center leading-tight">{label}</span>
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

/**
 * The first real question, and the one that stops the platform assuming a trip
 * exists. The shield is the point: whichever card you pick, you end up inside
 * the same protection. Both options are given equal visual weight on purpose —
 * nudging people toward "traveler" because it is the revenue path would be
 * exactly the kind of thing the M Principle exists to prevent.
 */
function StepProtectionType({ protectionType, setProtectionType, onNext, onBack }) {
  return (
    <div className="space-y-5">
      {/* Shield — the promise, stated once, above both choices */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl" aria-hidden="true" />
          <Shield className="w-14 h-14 text-[#D4AF37] relative" strokeWidth={1.25} />
          <Shield className="w-6 h-6 text-emerald-400 absolute" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Who are we protecting?</h2>
          <p className="text-slate-400 text-sm">
            We protect both. Your answer just decides what we set up first.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {PROTECTION_OPTIONS.map((option) => {
          const Icon = ICON_FOR_TYPE[option.type];
          const selected = protectionType === option.type;
          return (
            <button
              key={option.type}
              onClick={() => setProtectionType(option.type)}
              aria-pressed={selected}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                selected
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selected ? 'bg-[#D4AF37]/20' : 'bg-white/5'
                }`}>
                  <Icon className={`w-4 h-4 ${selected ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${selected ? 'text-[#D4AF37]' : 'text-white'}`}>
                    {option.title}
                  </p>
                  <p className="text-xs text-slate-400">{option.subtitle}</p>
                </div>
                {selected && <CheckCircle2 className="w-5 h-5 text-[#D4AF37] ml-auto shrink-0" />}
              </div>

              {/* Only expand the picked card — two open lists at once is noise */}
              <AnimatePresence initial={false}>
                {selected && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden pl-1 space-y-1.5"
                  >
                    {option.covers.map((line) => (
                      <li key={line} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                        <Shield className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        {line}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 text-center">
        You can change this later — it doesn't lock anything.
      </p>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!protectionType} />
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
                  className={`w-full flex items-center gap-2.5 text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    procedure === p.value
                      ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37]'
                      : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {procedure === p.value
                    ? <CheckCircle2 className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                    : <Circle className="w-4 h-4 shrink-0 text-slate-600" />}
                  {p.label}
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

/**
 * The Emergency PIN hand-off.
 *
 * This step used to collect a 4-digit PIN inline and throw it away — it wrote
 * `morales_onboarding_pin_set: 'true'` and nothing else, under copy promising
 * the PIN "unlocks emergency features when you're offline or in a crisis".
 * It did not: the real PIN is 6 digits, PBKDF2-SHA256 at 600k, and lives in
 * EmergencyPINSetup. A person who typed 4 digits here walked away believing
 * they had emergency access they did not have.
 *
 * So this step no longer takes input it cannot honour. It explains what the
 * PIN is and hands off to the flow that actually sets one.
 */
function StepPIN({ onFinish, onFinishAndSetPIN, onBack }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">One last thing: your Emergency PIN</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your PIN opens your protection vault and your emergency contacts when you have no signal
            and no time to log in. Setting one takes about a minute.
          </p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
        {[
          'Six digits, chosen by you.',
          'Scrambled on your device before it is stored — we never hold the PIN itself.',
          'Locks after repeated wrong attempts, so a stolen phone stays shut.',
        ].map(line => (
          <p key={line} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
            <Shield className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
            {line}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          onClick={onFinishAndSetPIN}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-[#060B16] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          Set up my PIN now <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onFinish}
          className="w-full py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          <Clock className="w-4 h-4" /> I'll do this later
        </button>
        <button
          onClick={onBack}
          className="self-center flex items-center gap-1.5 px-4 py-2 text-slate-500 hover:text-slate-300 text-xs font-semibold transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <p className="text-xs text-slate-500 text-center">
        You can set this any time from the Emergency page.
      </p>
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
function ProgressBar({ step, total }) {
  return (
    // pr-14 keeps the "Step n of m" label clear of the absolutely-positioned
    // Skip button in the corner — they overlapped at narrow widths.
    <div className="flex items-center gap-2 mb-6 pr-14">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i + 1 <= step ? 'bg-[#D4AF37]' : 'bg-white/10'
          }`}
        />
      ))}
      <span className="text-xs text-slate-500 font-semibold whitespace-nowrap ml-1">
        Step {step} of {total}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FirstTimeOnboarding({ onComplete, userDisplayName = '' }) {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(userDisplayName);
  const [protectionType, setProtectionTypeState] = useState('');
  const [procedure, setProcedure] = useState('');

  // The procedure question only exists for someone who is actually travelling
  // for a procedure. Asking a non-traveller which surgery they want is the
  // exact assumption this step was added to remove.
  const steps = ['welcome', 'protection', 'name'];
  if (protectionType !== PROTECTION_TYPES.NON_TRAVELER) steps.push('procedure');
  steps.push('pin');

  const current = steps[Math.min(stepIndex, steps.length - 1)];
  const next = () => setStepIndex(i => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex(i => Math.max(i - 1, 0));

  const chooseProtectionType = (type) => {
    setProtectionTypeState(type);
    // Local first so the choice survives a failed write and is readable offline.
    setProtectionTypeLocally(type);
    // Durable copy, best effort. Never block onboarding on our persistence —
    // and never let a rejected write (e.g. the field not yet published to
    // Base44) surface as an unhandled rejection in the console.
    base44.auth
      .updateMe({ protection_type: type, protection_type_set_at: new Date().toISOString() })
      .catch(e => console.warn('[onboarding] protection_type not persisted server-side:', e?.message));
  };

  const finish = (opts = {}) => {
    markOnboardingComplete();
    onComplete?.({ name, protectionType, procedure, ...opts });
  };

  const finishAndSetPIN = () => {
    finish({ goingToPINSetup: true });
    navigate('/emergency');
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
        className="w-full max-w-md bg-gradient-to-br from-slate-900 to-[#060B16] border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/60 relative max-h-[92dvh] overflow-y-auto"
      >
        {/* Skip link — visible on every step so users (and automated
            tests) can dismiss the wizard without completing all steps */}
        <button
          onClick={skip}
          className="absolute top-5 right-5 text-slate-600 hover:text-slate-400 text-xs font-medium transition-colors flex items-center gap-1 z-10"
          aria-label="Skip setup"
        >
          Skip <X className="w-3 h-3" />
        </button>

        {/* Progress (hidden on welcome) */}
        {stepIndex > 0 && <ProgressBar step={stepIndex + 1} total={steps.length} />}

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            {current === 'welcome' && <StepWelcome onNext={next} />}
            {current === 'protection' && (
              <StepProtectionType
                protectionType={protectionType}
                setProtectionType={chooseProtectionType}
                onNext={next}
                onBack={back}
              />
            )}
            {current === 'name' && <StepName name={name} setName={setName} onNext={next} onBack={back} />}
            {current === 'procedure' && (
              <StepProcedure procedure={procedure} setProcedure={setProcedure} onNext={next} onBack={back} />
            )}
            {current === 'pin' && (
              <StepPIN onFinish={finish} onFinishAndSetPIN={finishAndSetPIN} onBack={back} />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
