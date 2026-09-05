import React from 'react';
import { motion } from 'framer-motion';

const STAGES = ['SOURCE', 'SCAN', 'VALIDATE', 'M-CARE', 'ROUTE', 'UPDATE'];
const GOLD = '#D4AF37';
const GREEN = '#22C55E'; // matches SystemHealth.jsx's own existing "healthy" color

/**
 * PipelineFlow — a minimal, illustrative representation of the real shape
 * every one of this platform's scheduled checks actually takes (read a real
 * source, scan it, validate the result, hand it to M-Care, route it to the
 * right place, update the record). This never carries real per-record data
 * — no fake IDs, counts, or database-looking detail flowing through it, per
 * the feature's own explicit "kept minimal, no fake database graphics"
 * instruction. It only ever shows which conceptual stage the current scan
 * cycle is illustrating.
 *
 * The active node lights up, completed nodes dim down, and a connecting
 * line fills between them — plus a genuinely traveling routing dot riding
 * a track above the nodes, gliding to each stage's evenly-spaced percentage
 * position rather than a per-node DOM measurement — stays correct at any
 * width with no resize listener, while still reading as a real dot moving
 * through the pipeline, not just nodes taking turns lighting up.
 *
 * EDGE_INSET_PCT: the node dots don't sit flush with the container's own
 * edges — each is centered inside its own label column (e.g. "SOURCE"'s
 * dot sits roughly half that label's width in from the left edge). Measured
 * directly against the real rendered layout at the container's max width
 * (560px): the SOURCE dot center sits ~3.8% in from the left, UPDATE's
 * ~3.6% in from the right. 3.75% (their average) keeps the traveling dot's
 * start/end genuinely aligned with the actual node dots instead of the
 * bare container edges, without needing a resize-sensitive DOM measurement.
 */
const EDGE_INSET_PCT = 3.75;

export default function PipelineFlow({ activeStage = 0, highlightSignal = false, compact = false, reducedMotion = false }) {
  const travelPct = EDGE_INSET_PCT + (activeStage / (STAGES.length - 1)) * (100 - EDGE_INSET_PCT * 2);
  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {STAGES.map((_, i) => {
            const isActive = i === activeStage;
            const isPast = i < activeStage;
            return (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  width: isActive ? 8 : 6, height: isActive ? 8 : 6, borderRadius: '50%',
                  background: isActive ? (highlightSignal ? GREEN : GOLD) : (isPast ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.15)'),
                  transition: reducedMotion ? 'none' : 'all 0.3s ease',
                }}
              />
            );
          })}
        </div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: highlightSignal ? GREEN : 'rgba(255,255,255,0.6)' }}>
          {STAGES[activeStage]}
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 560, margin: '0 auto', paddingTop: 16 }} aria-hidden="true">
      {/* The traveling routing dot — a real element gliding along a fixed
          track, not just a per-node color change. Positioned by percentage
          so it stays correct at any container width. */}
      {reducedMotion ? (
        <div
          style={{
            position: 'absolute', top: 0, left: `${travelPct}%`, transform: 'translateX(-50%)',
            width: 9, height: 9, borderRadius: '50%',
            background: highlightSignal ? GREEN : GOLD,
            boxShadow: `0 0 8px ${highlightSignal ? GREEN : GOLD}`,
          }}
        />
      ) : (
        <motion.div
          style={{
            position: 'absolute', top: 0, transform: 'translateX(-50%)',
            width: 9, height: 9, borderRadius: '50%',
            background: highlightSignal ? GREEN : GOLD,
            boxShadow: `0 0 8px ${highlightSignal ? GREEN : GOLD}`,
          }}
          animate={{ left: `${travelPct}%`, scale: [1, 1.3, 1] }}
          transition={{
            left: { duration: 0.8, ease: 'easeInOut' },
            scale: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      )}
      {/* A faint fixed rail the dot rides along, spanning between the first
          and last node's actual (measured) centers — see EDGE_INSET_PCT. */}
      <div style={{ position: 'absolute', top: 4.5, left: `${EDGE_INSET_PCT}%`, right: `${EDGE_INSET_PCT}%`, height: 1, background: 'rgba(255,255,255,0.08)' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      {STAGES.map((label, i) => {
        const isActive = i === activeStage;
        const isPast = i < activeStage;
        const color = isActive ? (highlightSignal ? GREEN : GOLD) : (isPast ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.2)');
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                style={{
                  flex: 1, height: 1.5, minWidth: 12,
                  background: (isActive || isPast) ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.12)',
                  transition: reducedMotion ? 'none' : 'background 0.4s ease',
                }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              {reducedMotion ? (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              ) : (
                <motion.span
                  style={{ width: 8, height: 8, borderRadius: '50%', background: color }}
                  animate={isActive ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                  transition={{ duration: 1.4, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
                />
              )}
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, color, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
      </div>
    </div>
  );
}
