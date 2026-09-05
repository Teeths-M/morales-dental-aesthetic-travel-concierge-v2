import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Pause } from 'lucide-react';
import LivingOrb from '@/components/mcare/LivingOrb';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import useSignalDelta from '@/hooks/useSignalDelta';
import CategoryRotator from './CategoryRotator';
import PipelineFlow from './PipelineFlow';
import { DEMO_AUTOMATION_CATEGORIES, getDemoSnapshot, getDemoActivityLog } from './demoHealthData';

const GOLD = '#D4AF37';
const GREEN = '#22C55E'; // matches SystemHealth.jsx's own existing "healthy" color — no new brand hex introduced

const TICK_MS = 4000;

// Portia's own pitch narration for this exact moment ("This is real! the
// system running Morales today...") — a real audio file she generated and
// downloaded, copied into public/audio/system-health-demo/narration.mp3
// (public/ is served as-is by Vite, so a plain root-relative path is all
// that's needed, no import). Demo-mode only — the real (non-demo) page
// never plays audio.
const NARRATION_SRC = '/audio/system-health-demo/narration.mp3';

/**
 * SystemHealthHero — "M-Care is still working even when nobody is
 * interacting with it," built entirely from real data (or, when `isDemo`,
 * an honestly-labeled client-side simulation of the same real category
 * names). Owns the one shared `tickIndex` clock driving both the rotating
 * category status and the illustrative pipeline visualization, so the two
 * stay perfectly in sync off a single timer rather than two independently
 * drifting ones.
 *
 * Real props in live mode: `incidents` ({total, unresolved_critical_or_high})
 * and `automation` (the 8-category array), both straight from
 * getSystemHealthSummary — this component never invents either. `generatedAt`
 * feeds useSignalDelta so a real poll can be told apart from a stale render.
 *
 * In demo mode (`isDemo`), the real `incidents`/`automation`/`generatedAt`
 * props are ignored in favor of DEMO_AUTOMATION_CATEGORIES + getDemoSnapshot
 * — a fully offline, deterministic, clearly-badged simulation that never
 * calls the real backend and never mixes real numbers into the same view.
 */
export default function SystemHealthHero({ incidents, automation, generatedAt, isLoading, isDemo = false }) {
  const reducedMotion = usePrefersReducedMotion();

  const [tabVisible, setTabVisible] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'visible'
  );
  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // The one shared clock. Never created at all under reduced motion — the
  // rotator/pipeline freeze on tick 0 rather than "rotating slower," the
  // same "fully static, not just gentler" doctrine LivingOrb itself already
  // applies to its own reduced-motion branch. Paused (not reset) whenever
  // the tab is hidden, so coming back resumes where it left off instead of
  // replaying from stage 0.
  const [tickIndex, setTickIndex] = useState(0);
  useEffect(() => {
    if (reducedMotion || !tabVisible) return;
    const id = setInterval(() => setTickIndex((i) => i + 1), TICK_MS);
    return () => clearInterval(id);
  }, [reducedMotion, tabVisible]);

  const liveSignal = useSignalDelta(incidents?.total, incidents?.unresolved_critical_or_high, generatedAt);
  const demoSnapshotRef = useRef(getDemoSnapshot(0));
  demoSnapshotRef.current = isDemo ? getDemoSnapshot(tickIndex) : demoSnapshotRef.current;
  const activityLog = isDemo ? getDemoActivityLog(tickIndex) : [];

  const categories = isDemo ? DEMO_AUTOMATION_CATEGORIES : (automation || []);
  const activeCategory = categories.length ? categories[tickIndex % categories.length] : null;
  const activePipelineStage = tickIndex % 6;

  // Narration audio — demo mode only, a real file Portia recorded/downloaded
  // for presenting this exact page to judges. Deliberately NO autoplay —
  // audio starting on its own the moment demo mode loads is exactly the
  // kind of surprise a live pitch can't risk. The "Play Narration" button
  // below is the only way this ever starts. This effect exists purely to
  // clean up: if demo mode is turned off or the component unmounts while
  // playing, stop and rewind so it never keeps playing into the real,
  // non-demo page.
  const audioRef = useRef(null);
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  useEffect(() => {
    if (!isDemo) return;
    const el = audioRef.current;
    return () => {
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
      setNarrationPlaying(false);
    };
  }, [isDemo]);

  const toggleNarration = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  const signalStatus = isDemo ? demoSnapshotRef.current.signalStatus : liveSignal.status;
  const unresolvedCount = isDemo
    ? demoSnapshotRef.current.incidents.unresolved_critical_or_high
    : incidents?.unresolved_critical_or_high;
  // Optimistic (healthy) while real data hasn't loaded yet — an alarming
  // amber ring flashing before the first real answer even arrives would be
  // its own kind of misleading, the opposite direction from fabrication.
  const healthy = typeof unresolvedCount === 'number' ? unresolvedCount === 0 : true;

  const endingLine = signalStatus === 'signal'
    ? '+1 SIGNAL LOGGED'
    : signalStatus === 'quiet'
      ? 'NO NEW SIGNALS'
      : 'ESTABLISHING BASELINE';

  const highlightSignal = activePipelineStage === 5 && signalStatus === 'signal';
  const orbSize = isMobile ? 96 : 160;

  // Maps each real pipeline stage onto one of LivingOrb's own already-real,
  // already-tuned states — reusing their existing ring speed/brightness
  // rather than inventing new numbers: idle's slow orbit for SOURCE,
  // tool_executing's faster orbit for the actual SCAN/VALIDATE work,
  // thinking for M-CARE's own reasoning step, acting (background-work
  // semantics) for ROUTE. UPDATE stays idle-ish and gets a one-shot
  // flashToken pulse instead of a persistent state — a real completion is a
  // moment, not an ongoing state. An unhealthy reading always overrides the
  // pipeline-stage animation with 'alert' (amber), matching "WARNING/
  // CRITICAL = amber pulse."
  const orbState = !healthy
    ? 'alert'
    : activePipelineStage === 1 || activePipelineStage === 2
      ? 'tool_executing'
      : activePipelineStage === 3
        ? 'thinking'
        : activePipelineStage === 4
          ? 'acting'
          : 'idle';

  // One-shot success flash (LivingOrb's flashToken — "a brief gold ring
  // pulse confirming X just happened") fires exactly once, right when the
  // cycle actually lands on UPDATE with a real signal to report — never on
  // every render while stage===5, since tickIndex only advances once per
  // TICK_MS regardless of how many times React re-renders in between.
  const [flashToken, setFlashToken] = useState(0);
  const prevHighlightRef = useRef(false);
  useEffect(() => {
    if (highlightSignal && !prevHighlightRef.current) {
      setFlashToken((n) => n + 1);
    }
    prevHighlightRef.current = highlightSignal;
  }, [highlightSignal]);

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 16 : 22,
        padding: isMobile ? '20px 12px 28px' : '32px 20px 36px',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.06), transparent 60%)',
        border: '1px solid #2A3F4A', borderRadius: 20, marginBottom: 28, position: 'relative',
      }}
    >
      {isDemo && (
        <>
          <audio
            ref={audioRef}
            src={NARRATION_SRC}
            onPlay={() => setNarrationPlaying(true)}
            onPause={() => setNarrationPlaying(false)}
            onEnded={() => setNarrationPlaying(false)}
          />
          <div
            style={{
              position: 'absolute', top: isMobile ? 10 : 16, right: isMobile ? 10 : 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <button
              type="button"
              onClick={toggleNarration}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 800,
                letterSpacing: 0.6, color: GOLD, background: 'rgba(212,175,55,0.15)',
                border: `1px solid ${GOLD}50`, borderRadius: 999, padding: '4px 10px',
                whiteSpace: 'nowrap', cursor: 'pointer',
              }}
            >
              {narrationPlaying ? <Pause size={`11`} /> : <Volume2 size={`11`} />}
              {narrationPlaying ? 'PAUSE NARRATION' : 'PLAY NARRATION'}
            </button>
            <span
              style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: 1.2, color: GOLD,
                background: 'rgba(212,175,55,0.15)', border: `1px solid ${GOLD}50`,
                borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap',
              }}
            >
              DEMO MODE
            </span>
          </div>
        </>
      )}

      <LivingOrb
        state={orbState}
        size={orbSize}
        showRingHalo
        ringColorOverride={healthy ? GREEN : null}
        flashToken={flashToken}
      />

      {isLoading && !isDemo ? (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Loading real status…</p>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: 2, color: healthy ? GREEN : '#D97706' }}>
            AUTONOMOUS MONITORING ACTIVE
          </p>

          <CategoryRotator category={activeCategory} compact={isMobile} reducedMotion={reducedMotion} />

          <PipelineFlow
            activeStage={activePipelineStage}
            highlightSignal={highlightSignal}
            compact={isMobile}
            reducedMotion={reducedMotion}
          />

          {isDemo && activityLog.length > 0 && (
            <div
              style={{
                width: '100%', maxWidth: 420, background: 'rgba(0,0,0,0.25)',
                border: '1px solid #2A3F4A', borderRadius: 10, padding: '8px 12px',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              {activityLog.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.7)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.label}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {entry.when}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, fontWeight: 800, letterSpacing: 1, color: signalStatus === 'signal' ? GREEN : 'rgba(255,255,255,0.75)' }}>
              {endingLine}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 }}>
              M-CARE CONTINUES WATCHING
            </p>
            {!isDemo && generatedAt && (
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.32)', letterSpacing: 0.4, fontVariantNumeric: 'tabular-nums' }}>
                LAST CHECKED · {new Date(generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>

          <p style={{ margin: '2px 0 0', fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.35)' }}>
            Care shouldn't stop at the border.
          </p>
        </>
      )}
    </div>
  );
}
