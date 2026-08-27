import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// LivenessOverlay — the reference neon look: a high-contrast neon-green
// (~#39FF14) circular face-alignment guide over the live camera feed,
// with a white bottom overlay card showing the rotating active-liveness
// status ('Turn left', 'Turn right', 'Blink', 'Look at the dot', 'Stay
// still'). No social-feed chrome. This wraps the Persona embedded flow:
// the neon ring is a branded alignment frame (pointer-events-none so it
// never blocks Persona's capture), and the status card surfaces the
// current challenge. Persona runs the actual liveness detection — M-Care
// does not build document forensics from scratch.

const NEON = '#39FF14';

const CHALLENGES = [
  { key: 'align', text: 'Align your face in the circle' },
  { key: 'stay_still', text: 'Stay still' },
  { key: 'turn_left', text: 'Turn left' },
  { key: 'turn_right', text: 'Turn right' },
  { key: 'blink', text: 'Blink' },
  { key: 'look_at_dot', text: 'Look at the dot' },
  { key: 'stay_still_2', text: 'Stay still' },
];

export default function LivenessOverlay({ active = true, challengeKey = null, capturedFrameRef = null }) {
  // Cycle the preview status text so the user sees the sequence of
  // challenges they'll be asked to perform. When the caller passes a real
  // challengeKey (from Persona's onEvent), that wins.
  const [previewIdx, setPreviewIdx] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setPreviewIdx((i) => (i + 1) % CHALLENGES.length), 2600);
    return () => clearInterval(t);
  }, [active]);

  const current = challengeKey
    ? CHALLENGES.find((c) => c.key === challengeKey) || CHALLENGES[previewIdx]
    : CHALLENGES[previewIdx];

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Neon circular face-alignment guide — centered in the upper
          two-thirds, over whatever camera feed / Persona iframe sits
          behind it. pointer-events-none so it never intercepts taps. */}
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="rounded-full"
          style={{
            width: 'min(78vw, 320px)',
            height: 'min(78vw, 320px)',
            border: `3px solid ${NEON}`,
            boxShadow: `0 0 24px ${NEON}66, inset 0 0 24px ${NEON}33`,
            background: 'transparent',
          }}
          animate={{ boxShadow: [`0 0 24px ${NEON}66, inset 0 0 24px ${NEON}33`, `0 0 40px ${NEON}aa, inset 0 0 32px ${NEON}55`, `0 0 24px ${NEON}66, inset 0 0 24px ${NEON}33`] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Four corner ticks for precise alignment */}
        {['top-0 left-1/2 -translate-x-1/2', 'bottom-0 left-1/2 -translate-x-1/2', 'left-1/2 top-1/2 -translate-y-1/2', 'right-1/2 top-1/2 -translate-y-1/2'].map((pos, i) => (
          <span key={i} className={`absolute ${pos} rounded-full`} style={{ width: 8, height: 8, background: NEON, boxShadow: `0 0 8px ${NEON}` }} />
        ))}
      </div>

      {/* White bottom overlay card — the 'Stay still' / rotating status. */}
      <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pt-5 pb-7 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <motion.span
              className="block h-5 w-5 rounded-sm"
              style={{ background: NEON, boxShadow: `0 0 10px ${NEON}` }}
              animate={{ scale: [1, 0.85, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-base font-bold text-gray-900">{current.text}</p>
          <p className="mt-1 text-xs text-gray-500">M-Care TrustScan · active liveness</p>
        </div>
      </div>
    </div>
  );
}