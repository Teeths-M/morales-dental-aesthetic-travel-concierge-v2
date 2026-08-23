import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, CheckCircle2, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { classifySafetyToolCall } from '@/lib/safetyGateStatus';

// The Safety Gate — the moment M-Care proves it is not just a chatbot.
// Renders inline in the chat when computeSafeTScreening OR safeT4LifeScan runs.
// Loading → red refusal (CRITICAL/HIGH/BLOCKED) → amber caution (MEDIUM/review) → green (cleared).
export default function SafetyGateCard({ toolCall, onRespond }) {
  const [responded, setResponded] = useState(false);

  // A judge glancing at a live demo shouldn't have to notice a card that just
  // silently appeared — the caution/critical states below get a brief entrance
  // and, for a genuine block, a sustained glow. Respects prefers-reduced-motion
  // the same way LivingOrb.jsx / JourneyStageTracker.jsx do — falls back to a
  // fully static card with zero animation.
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const { pending, failed, blockRefusal, cleared, caution, flags, reason } = classifySafetyToolCall(toolCall);

  if (pending) {
    return (
      <div className="mt-2 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
        <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Running your Safe-T4life screening…</p>
          <p className="text-xs text-muted-foreground mt-0.5">This takes about 30 seconds. I'm checking your procedure against your medical profile before we go any further.</p>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="mt-2 rounded-xl border border-border bg-secondary/40 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">I couldn't complete the safety screening.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Something went wrong on my end. I'll escalate this to a human reviewer rather than guess — say the word and I'll arrange it.</p>
        </div>
      </div>
    );
  }

  if (cleared) {
    return (
      <div className="mt-2 rounded-xl border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Safe-T4life screening complete — no blocking concerns.</p>
          <p className="text-xs text-muted-foreground mt-0.5">{flags.length ? flags.join(' · ') : "You're cleared to proceed to finding verified providers."}</p>
        </div>
      </div>
    );
  }

  if (caution) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.97, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="mt-2 rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 overflow-hidden"
      >
        <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-semibold text-sm tracking-tight">Safety Note</span>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-foreground">Your screening passed, but I flagged a few items for your care team to review:</p>
          {flags.length > 0 && (
            <ul className="space-y-1">
              {flags.slice(0, 5).map((f, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-bold leading-none mt-0.5">⚠</span>
                  <span>{typeof f === 'string' ? f : (f?.reason || f?.flag || f?.message || JSON.stringify(f))}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">A licensed provider makes all clinical decisions — I'll carry these notes forward to your consultation.</p>
        </div>
      </motion.div>
    );
  }

  // CRITICAL / HIGH / BLOCKED — the refusal (the killer demo moment). Gets a
  // brief entrance plus a sustained soft red glow while it's actually blocking
  // — a judge should register this without having to spot it in a scrolling
  // chat. The glow loops independently of the one-time entrance (per-property
  // transition overrides below), and both drop out entirely under
  // prefers-reduced-motion.
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 6 }}
      animate={reducedMotion ? { opacity: 1, scale: 1, y: 0 } : {
        opacity: 1, scale: 1, y: 0,
        boxShadow: [
          '0 0 0 0px rgba(239,68,68,0)',
          '0 0 0 6px rgba(239,68,68,0.22)',
          '0 0 0 0px rgba(239,68,68,0)',
        ],
      }}
      transition={reducedMotion ? { duration: 0 } : {
        opacity: { duration: 0.25, ease: 'easeOut' },
        scale: { duration: 0.25, ease: 'easeOut' },
        y: { duration: 0.25, ease: 'easeOut' },
        boxShadow: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.25 },
      }}
      className="mt-2 rounded-xl border-2 border-red-500/50 bg-red-50 dark:bg-red-950/30 overflow-hidden"
    >
      <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5" />
        <span className="font-semibold tracking-tight">Safety Alert — I can't proceed</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-foreground">
          I've reviewed your procedure with your medical profile. I need to pause here.
        </p>
        <p className="text-sm text-muted-foreground">
          Our Safe-T4life engine has flagged a potential concern:
        </p>

        {reason && (
          <p className="text-sm text-foreground font-medium">{reason}</p>
        )}

        {flags.length > 0 && (
          <ul className="space-y-1.5">
            {flags.slice(0, 5).map((f, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-red-600 dark:text-red-400 font-bold leading-none mt-0.5">⚠</span>
                <span>{typeof f === 'string' ? f : (f?.reason || f?.flag || f?.message || JSON.stringify(f))}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-sm text-foreground font-medium">
          I can't proceed to find providers or make arrangements until we clear this step.
        </p>

        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300/40 p-3">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
            Here's the safer path I recommend:
          </p>
          <ul className="space-y-1 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
              <span>We find a surgeon who specializes in patients with your condition.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
              <span>We request a clinical review of your case before any bookings are made.</span>
            </li>
          </ul>
        </div>

        {!responded && onRespond ? (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              onClick={() => { setResponded(true); onRespond('proceed'); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Proceed with Safer Path <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => { setResponded(true); onRespond('wait'); }}
            >
              <Clock className="w-4 h-4" /> I need more time
            </Button>
          </div>
        ) : responded ? (
          <p className="text-xs text-muted-foreground">Thanks — I'll continue from here.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Reply in the chat to let me know how you'd like to proceed.</p>
        )}
      </div>
    </motion.div>
  );
}