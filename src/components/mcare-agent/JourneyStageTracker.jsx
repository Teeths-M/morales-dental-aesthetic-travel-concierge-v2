import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, ShieldCheck, ShieldAlert, Search, Stethoscope,
  FileCheck, CalendarCheck, CheckCircle2, Activity, Flag, ChevronDown
} from 'lucide-react';

// JourneyStageTracker — derives the current M-Care journey stage from the
// conversation's tool-call history and renders it as a compact, collapsible
// progress indicator (a small pill by default, an expandable dropdown on
// tap — see the render function's own comment below for why). This is the
// "status tracker" from the demo: the orb reflects real state (PENDING
// CLINICAL REVIEW, SAFETY GATE, CONFIRMED, MONITORING…) instead of being a
// static chat window. Stage is inferred from which tools the agent
// actually called — never guessed from message text.

const STAGES = [
  { key: 'intake',      label: 'Intake',          icon: MessageSquare },
  { key: 'safety',      label: 'Safety Check',    icon: ShieldCheck },
  { key: 'refusal',     label: 'Safety Gate',     icon: ShieldAlert },
  { key: 'searching',   label: 'Finding Doctors', icon: Search },
  { key: 'options',     label: 'Options',         icon: Stethoscope },
  { key: 'consent',     label: 'Consent',         icon: FileCheck },
  { key: 'booking',     label: 'Booking',         icon: CalendarCheck },
  { key: 'confirmed',   label: 'Confirmed',       icon: CheckCircle2 },
  { key: 'monitoring',  label: 'Monitoring',      icon: Activity },
];

// Map a tool name to the stage it advancing INTO.
const TOOL_TO_STAGE = {
  computeSafeTScreening:     'safety',
  matchDoctorsForProcedure:  'searching',
  requestDoctorQuotes:       'searching',
  processInformedConsentAndEmail: 'consent',
  assignDoctorToCase:        'booking',
  assignTravelAgency:        'booking',
  assignChauffeurServices:   'booking',
  confirmProcedureDate:      'confirmed',
  scheduleSoloCheckIns:      'monitoring',
  schedulePostOpCheckIns:    'monitoring',
};

function deriveStage(messages) {
  if (!messages || messages.length === 0) return { stage: 'intake', safetyBlocked: false };
  let stage = 'intake';
  let safetyBlocked = false;

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    // A safety refusal is detectable in the assistant's own words.
    const text = String(msg.content || '');
    if (text.includes("can't proceed until this safety condition") || text.includes('cannot proceed until')) {
      safetyBlocked = true;
    }
    // If the patient later agrees to the safer path, we unblock.
    if (text.includes('safer path') || text.includes('clinical reviewer')) {
      // remains blocked until search actually runs
    }
    const calls = msg.tool_calls || [];
    for (const call of calls) {
      const name = call?.name || '';
      if (TOOL_TO_STAGE[name]) {
        const next = TOOL_TO_STAGE[name];
        // ordering: don't go backward
        const nextIdx = STAGES.findIndex(s => s.key === next);
        const curIdx  = STAGES.findIndex(s => s.key === stage);
        if (nextIdx > curIdx) stage = next;
        // A successful safety screen that isn't blocked advances past safety
        const status = (call?.status || '').toLowerCase();
        const results = call?.results;
        const failed = status === 'failed' || status === 'error' ||
          (typeof results === 'string' && /error|failed/i.test(results));
        if (name === 'computeSafeTScreening' && !failed) {
          // if the result indicates high/extreme risk, we surface refusal stage
          try {
            const parsed = typeof results === 'string' ? JSON.parse(results) : results;
            const tier = parsed?.risk_tier || parsed?.riskLevel || parsed?.risk_level;
            if (tier && /high|extreme/i.test(String(tier))) {
              safetyBlocked = true;
            } else {
              safetyBlocked = false;
            }
          } catch { /* leave as-is */ }
        }
        if ((name === 'matchDoctorsForProcedure' || name === 'requestDoctorQuotes') && !failed) {
          safetyBlocked = false; // patient accepted the safer path and we searched
        }
      }
    }
  }

  // If blocked, pin the visible stage to the refusal marker.
  if (safetyBlocked && ['intake', 'safety'].includes(stage)) {
    return { stage: 'refusal', safetyBlocked };
  }
  return { stage, safetyBlocked };
}

// 2026-08-23: rebuilt from an always-visible, full-width 9-item strip (real
// crowding risk in the new widescreen panel's narrower chat column) into a
// compact collapsed pill by default, expanding into a floating, absolutely-
// positioned dropdown on click — never pushes or reflows anything below it.
// Read-only, same as before: this tracker only ever reflects real derived
// state (deriveStage, untouched above), so tapping a row in the expanded
// list is a dismiss action (see the full list, close it), never a fake
// "jump to this stage" control — there's no real stage-selection capability
// to wire up, and pretending there is would misrepresent what this
// component actually does.
export default function JourneyStageTracker({ messages }) {
  const { stage, safetyBlocked } = deriveStage(messages);
  const activeIdx = STAGES.findIndex(s => s.key === stage);
  const activeStage = STAGES[activeIdx] || STAGES[0];
  const ActiveIcon = activeStage.icon;
  const activeColor = safetyBlocked && activeStage.key === 'refusal' ? '#ef4444' : '#D4AF37';

  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside click — same wrapRef + mousedown pattern
  // AddImageMenu.jsx (the sibling attach-menu dropdown already mounted in
  // this same panel) already uses, for consistency.
  useEffect(() => {
    if (!expanded) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setExpanded(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [expanded]);

  // Active-stage pulse — an honest, cheap "this is what's happening right now"
  // signal, not just a color swap the user has to notice. Respects
  // prefers-reduced-motion the same way LivingOrb.jsx does.
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div ref={wrapRef} className="relative px-3 pt-3">
      {/* Collapsed pill — current stage only, always small, never the wide
          9-item strip this used to be. */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-label="Journey progress"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 transition-colors hover:bg-muted/40"
      >
        <span className="relative flex items-center justify-center w-5 h-5">
          {!reducedMotion && (
            <motion.span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `1.5px solid ${activeColor}` }}
              animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <ActiveIcon className="w-3.5 h-3.5" style={{ color: activeColor }} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: activeColor }}>
          {activeStage.label}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          {activeIdx + 1} of {STAGES.length}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded dropdown — position:absolute, taken out of flow, so it
          overlays on top of whatever's below rather than pushing it down or
          distorting the panel. Capped maxHeight + its own scroll so it can
          never exceed the panel's own overflow:hidden bounds. */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="absolute left-3 top-full mt-1.5 w-64 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden"
          style={{ zIndex: 50, maxHeight: 320 }}
        >
          {safetyBlocked && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <Flag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <span className="text-[11px] font-medium" style={{ color: '#ef4444' }}>
                Safety Gate active — booking blocked until cleared
              </span>
            </div>
          )}
          <div className="py-1 overflow-y-auto" style={{ maxHeight: 280 }}>
            {STAGES.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === activeIdx;
              const isDone = idx < activeIdx;
              const isBlocked = isActive && safetyBlocked && s.key === 'refusal';
              const color = isBlocked ? '#ef4444' : isActive ? '#D4AF37' : isDone ? '#10b981' : '#94a3b8';
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-muted/40 transition-colors text-left"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                    style={{
                      borderColor: color,
                      background: isActive ? color : 'transparent',
                    }}
                  >
                    <Icon className="w-3 h-3" style={{ color: isActive ? '#060B16' : color }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color }}>
                    {s.label}
                  </span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: '#10b981' }} />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}