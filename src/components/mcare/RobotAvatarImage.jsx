/**
 * RobotAvatarImage — the real robot avatar, rebuilt 2026-08-23 to move
 * for real instead of bouncing one flat image. Portia's own explicit
 * instruction: stop simulating life on a static PNG. Checked this repo's
 * real state first (no Rive package/.riv file, no Three.js/GLB anywhere,
 * no sprite-frame assets — see CLAUDE.md) — Rive needs a compiled .riv
 * authored in Rive's own tool (can't be generated from code), and a true
 * photographic sprite sequence needs image *generation*, which doesn't
 * exist in this environment either. What's real and buildable: her own
 * approved photo, cut into independently-movable layers via the same
 * real image-editing technique already proven for the alpha cutout.
 *
 * `src/assets/m-safe-robot-body-patched.webp` is the same real photo with
 * the original eye region *inpainted* (sampled + coarse-to-fine diffusion
 * from the real surrounding visor pixels — no generative fill) so it reads
 * as a blank visor once the eye layers are hidden or moved. The two eye
 * layers (`m-safe-robot-eye-left.webp` / `-eye-right.webp`) are real,
 * tightly-cropped, alpha-cut sprites of just the glowing eye capsules,
 * isolated via the same flood-fill/connected-components technique as the
 * body's own original cutout, scoped to each eye. All three assets are
 * 349x301 — the same native frame — and their real positions were measured
 * directly against the actual pixels (a programmatic bright+warm
 * color-cluster search, refined by viewing the crops), not eyeballed from
 * RobotAvatar.jsx's older, more abstract SVG geometry.
 *
 * `EYE_BOX` below is real pixel geometry, in percent of that native frame.
 * A caller-independent aspect-ratio box (`robotImageBox`, aspectRatio:
 * 349/301) wraps the image + eye layers so those percentages line up
 * correctly in BOTH render modes: `naturalAspect` (width 100%, height
 * auto — no letterbox) and the small square UI-chrome mode (`size x size`,
 * objectFit:contain). The square mode previously had no such box, so an
 * `objectFit:contain` image inside it actually rendered letterboxed
 * (vertically centered, not filling the full square) while the OLD
 * overlays were positioned as if it filled the square — a real, previously
 * unnoticed misalignment at the 104px header size specifically (the 320px
 * hero was always `naturalAspect` and unaffected). Fixed as a side effect
 * of this rebuild, not a separate pass.
 *
 * Eyes move for real, not a second drawn shape: each is its own small
 * `<img>`, transformed with `translate()` for gaze and `scaleY()` for
 * blink — real pixels of the real photo, not a fabricated icon.
 * `useGazeAndBlink` (below) is a small, self-contained state machine:
 *
 * - idle: a real randomized blink every ~3-7s (occasional double-blink),
 *   plus an occasional brief look-around glance left or right and back.
 * - listening: eyes settle toward a fixed "toward the input" offset — an
 *   honest, representative direction, not a literal live-tracked position
 *   (this component renders at several different sizes/layouts, and
 *   precisely computing where the input field actually sits on screen in
 *   every one of them isn't reliable, so a small, plausible downward
 *   glance is what's actually built, not a claim of precision it doesn't
 *   have).
 * - thinking: a restless glance cycling up/left/right while the agent is
 *   composing — the existing visor-dot/tilt overlay continues alongside it.
 *   (An earlier version also had 3 particles "orbiting the shell" —
 *   `inset: -10%`, genuinely circling outside the whole sphere. Portia
 *   flagged this directly from a screenshot: those 3 dots read as floating
 *   outside the head, not "inside the fish tank / bowl." Removed —
 *   `robotDotRow` below was already correctly confined to the visor and is
 *   now the one real "3 talking dots" indicator.
 *
 *   2026-08-23, same-day follow-up: her NEXT screenshot showed `robotDotRow`
 *   itself still reading as outside the visor — because its position
 *   (`top:57%, left:34%, width:32%, height:11%`) was an eyeballed guess, not
 *   measured against the real photo. Pixel-sampled the actual asset
 *   (`m-safe-robot-body-patched.webp`) directly: a luminance scan plus a
 *   manual BFS connected-components pass (no scipy available) found the
 *   visor's real dark-glass region is roughly x:43-78%, y:22-62% — its real
 *   lower edge (~60-62%) is well above where the old box's bottom (68%)
 *   reached, and its horizontal center sits further right than the old
 *   box's. Replaced with a pixel-verified box, `top:51%, left:50%,
 *   width:24%, height:7%` — sampled a dense grid inside it and got mean
 *   luminance 6.9/255 (the visor reads ~5-15 throughout; the pearl shell
 *   reads 100+), with clean clearance below the real eye boxes (bottom
 *   ≈48.5-49.2%) and above the real shell edge.
 *
 *   Same round: her separate "some of the bots are missing eyes" report
 *   was real and much bigger than one dot row — a repo-wide grep of every
 *   `<LivingOrb>`/`<McareAvatar>` call site found only 2 of ~15 real
 *   renders ever cleared the old single `size >= 80` gate that hid BOTH the
 *   eyes and the busy overlays together; every message-bubble avatar,
 *   launcher button, and header instance (all well under 80px) showed a
 *   bare glowing shell. Split into two independent thresholds — see
 *   `showEyes`/`showActivityOverlays` below.
 *
 *   2026-08-23, a third same-day round: even correctly placed inside the
 *   visor, Portia found the 3 dots themselves "creepy" and asked for the
 *   thinking signal moved somewhere else — the gold "M" earpiece badge on
 *   the side of the head lighting up red instead. `robotDotRow`/
 *   `.robotDot`/`robotDotWave` were removed outright (a repo-wide grep
 *   confirmed nothing else referenced them). The badge's real position was
 *   located the same evidence-based way as everything else in this file —
 *   an ASCII luminance/hue classification map of the actual asset (see
 *   `M_BADGE_BOX`'s own comment) found a real, compact dark+gold cluster
 *   distinct from the visor's own bezel. The replacement uses the exact
 *   same additive-glow technique already proven for the speaking eye-glow
 *   pulse — a radial gradient, `mixBlendMode: 'screen'` — just red instead
 *   of gold and centered on the badge instead of the eyes.
 *
 *   2026-08-23, a fourth same-day round: Portia asked to stop the ring
 *   halo's pulse (LivingOrb.jsx's `STATE_CONFIG` rings — grow+fade in
 *   place) in favor of them genuinely orbiting around him, and to replace
 *   the small idle/thinking head wobble with a real roll. The ring-orbit
 *   change lives in LivingOrb.jsx (see its own history comment). Here:
 *   `robotIdleFloatTilt`/`robotThinkTilt` (a small vertical bob + ±2-3°
 *   rotate) were replaced with one shared `robotHeadRoll` keyframe
 *   (±12° rotate + a gentle vertical bob), idle and thinking just running
 *   it at different speeds. Deliberately ±12°, not a full continuous
 *   spin — a literal 360° roll would carry the eyes/visor/M badge through
 *   sideways and upside-down orientations, reading as broken rather than
 *   alive; ±12° is a clearly bigger, more visible motion than the old
 *   wobble without ever inverting anything.
 *
 *   2026-08-24, a fifth round: two real asks together — a genuine
 *   "thinking/deep analysis" hologram state, and a real R2-D2-style
 *   `rotateY` head turn replacing the round-4 `rotateZ` roll entirely.
 *
 *   For the head turn: `robotHeadRoll`'s CSS `@keyframes` loop is gone —
 *   Portia's spec was explicitly *not* a continuous loop (discrete,
 *   randomly-timed single turns with real holds), so `headAngle` is now a
 *   real JS state value (`useGazeAndBlink`, extended — one state machine
 *   still owns "how the head+eyes move," now including the head-turn
 *   angle) driving an inline `transform: perspective(...) rotateY(...)
 *   translateX(...) scale(...)` on `.robotAvatarFloat`, `transform-origin:
 *   50% 88%` (her own spec). Her fuller ask described a literal separate
 *   `.robot-head` layer with the hologram platform AND a lower body both
 *   staying still while only a head piece turns — this photo is one
 *   continuous sphere with no natural seam between "head" and "body,"
 *   and manufacturing one (even via a CSS clip-path split, no new asset
 *   needed) risked a visible crack right at the cut once the head turned
 *   and a cropped body didn't. Asked her directly rather than guessing;
 *   she chose turning the whole sphere — the hologram platform (already
 *   a separate, always-untouched layer, `LivingOrb.jsx`'s `Atmosphere`)
 *   stays still regardless, and the core ask (rotateY motion instead of
 *   rotateZ rocking) is satisfied exactly, with zero seam risk.
 *
 *   For the thinking hologram: the M badge is now a REAL separate cutout
 *   layer (`m-safe-robot-mbadge.webp`, alpha-cut the same way the eyes
 *   were, with the hole inpainted out of `bodySrc` — now
 *   `m-safe-robot-body-nombadge.webp`) instead of last round's glow-only
 *   overlay — her spec wanted the *entire* M symbol solid red, not a
 *   glow near it, which genuinely needs a real isolated layer to recolor
 *   cleanly. Recolored via a CSS `mask-image` using that same cutout as
 *   a stencil (a flat, saturated red fill reads as real lit hardware — an
 *   LED under a cover — more convincingly than pushing a color filter
 *   over already-bright gold pixels would), crossfaded against the gold
 *   `<img>` by a plain opacity transition, with a pulse plus a periodic
 *   brightness flicker layered on top. A new floating `BrainCircuit`
 *   (lucide-react, already a project dependency) hologram — glow, a
 *   breathing ring, staggered fading sparks, an "ANALYZING" label —
 *   animates in/out via framer-motion's `AnimatePresence` (the one
 *   framer-motion usage in this file; needed for a real exit transition
 *   before unmount, which plain conditional rendering can't do). Both are
 *   driven by the same `activityState === 'thinking'` the M-badge glow
 *   already used — no new state-timing logic needed, `MCareOrb.jsx`'s
 *   existing `orbState` derivation already makes "thinking starts
 *   immediately on submit, ends when speaking starts" true today.
 * - speaking: eyes settle to an attentive, forward, center look.
 *
 * `gazeOverride`/`blinkTrigger` (both optional) let a caller force a gaze
 * direction or fire an immediate blink on demand, regardless of
 * `activityState` — MCareOrb.jsx's dev-only test panel uses these so every
 * behavior can be verified without needing to catch a narrow live window.
 *
 * `amplitude` (0-1, default null) drives real audio-reactive intensity on
 * the speaking eye-glow/waveform and the listening equalizer WHEN a real
 * signal is actually available (wired in MCareOrb.jsx from neuralSpeech.js
 * during TTS playback, and voiceMessageAudio.js's real recorder level
 * meter while actively recording a voice note) — `null` (every path with
 * no real signal: the browser-speechSynthesis TTS fallback, Conversational
 * Mode's continuous mic listening, plain input-focus "listening") keeps
 * the exact same honest fixed-keyframe animation this file already had.
 * Never a fabricated "real audio" claim where no real signal exists.
 *
 * Overlay hard constraints, unchanged from the prior "loud rebuild" round:
 * z-index 10, opacity never below 0.8 mid-animation, no dark/black overlay
 * anywhere (a blink is real eyelid-closing via the eye layer's own
 * scaleY — not a second dark shape covering anything).
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import RobotAvatar from './RobotAvatar';
import bodySrc from '@/assets/m-safe-robot-body-nombadge.webp';
import eyeLeftSrc from '@/assets/m-safe-robot-eye-left.webp';
import eyeRightSrc from '@/assets/m-safe-robot-eye-right.webp';
import mBadgeSrc from '@/assets/m-safe-robot-mbadge.webp';

const BRIGHT_GOLD = '#FFD24A';
const CYAN = '#22D3EE';
const THINKING_RED = '#FF2D3D';

// The real, shared native frame every layered asset was cut from.
const NATURAL_W = 349;
const NATURAL_H = 301;

// Real per-eye boxes (percent of the native frame), measured directly
// against the source photo's own pixels (see extract script referenced in
// CLAUDE.md): left eye px (170,108) 53x38, right eye px (241,108) 43x40.
const EYE_BOX = {
  left: { left: (170 / NATURAL_W) * 100, top: (108 / NATURAL_H) * 100, width: (53 / NATURAL_W) * 100, height: (38 / NATURAL_H) * 100 },
  right: { left: (241 / NATURAL_W) * 100, top: (108 / NATURAL_H) * 100, width: (43 / NATURAL_W) * 100, height: (40 / NATURAL_H) * 100 },
};

// The M badge, now a REAL separate cutout layer (m-safe-robot-mbadge.webp,
// alpha-cut from the same source photo, with the hole inpainted out of
// bodySrc — same technique as the eyes) rather than the earlier
// approximate glow-only overlay. Real pixel crop box, measured this round
// via three independent techniques (an ASCII luminance/hue map, a BFS
// connected-component pass, and a per-column vertical gold scan) that all
// converged on the same real, genuinely vertically-elongated "earpiece"
// shape — px x[70-128] y[70-190] of the 349x301 frame, not a simple
// circle. Positions the cutout <img> (gold, default) and its red
// (thinking-state) mask counterpart at the exact same real spot.
const MBADGE_BOX = {
  left: (70 / NATURAL_W) * 100, top: (70 / NATURAL_H) * 100,
  width: (58 / NATURAL_W) * 100, height: (120 / NATURAL_H) * 100,
};

// Gaze offsets, in percent of an eye box's own width/height — small,
// representative nudges (see doc comment above), not literal geometry.
const GAZE_OFFSET = {
  center: { x: 0, y: 0 },
  left: { x: -30, y: 0 },
  right: { x: 30, y: 0 },
  down: { x: 0, y: 32 },
  up: { x: 0, y: -28 },
};

/**
 * Self-contained gaze/blink state machine. Pure timers driving small React
 * state — no DOM/canvas coupling, so this is straightforward to reason
 * about and (unlike the AudioContext-dependent pieces elsewhere in this
 * app) genuinely unit-testable if ever pulled out on its own; kept inline
 * here since it's tightly coupled to the two props (activityState,
 * animated) that already live on this component.
 */
function useGazeAndBlink({ activityState, animated, gazeOverride, blinkTrigger }) {
  const [blinking, setBlinking] = useState(false);
  const [autoGaze, setAutoGaze] = useState('center');
  const [headAngle, setHeadAngle] = useState(0);
  const timersRef = useRef([]);
  const headTimersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  const after = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };
  const clearHeadTimers = () => {
    headTimersRef.current.forEach(clearTimeout);
    headTimersRef.current = [];
  };
  const afterHead = (fn, ms) => {
    const id = setTimeout(fn, ms);
    headTimersRef.current.push(id);
    return id;
  };

  // Idle: a real randomized blink (3-7s), ~22% chance of a quick
  // double-blink, plus an independent, rarer look-around glance.
  useEffect(() => {
    clearTimers();
    if (!animated || activityState !== 'idle') {
      setAutoGaze('center');
      return () => clearTimers();
    }
    let cancelled = false;

    const doBlink = () => {
      setBlinking(true);
      after(() => !cancelled && setBlinking(false), 160);
    };
    const scheduleBlink = () => {
      after(() => {
        if (cancelled) return;
        doBlink();
        if (Math.random() < 0.22) after(() => !cancelled && doBlink(), 260);
        scheduleBlink();
      }, 3000 + Math.random() * 4000);
    };
    const scheduleGlance = () => {
      after(() => {
        if (cancelled) return;
        setAutoGaze(Math.random() < 0.5 ? 'left' : 'right');
        after(() => !cancelled && setAutoGaze('center'), 850);
        scheduleGlance();
      }, 4500 + Math.random() * 5000);
    };
    scheduleBlink();
    scheduleGlance();

    return () => { cancelled = true; clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, activityState]);

  // Thinking: a restless glance cycling up / sideways — distinct cadence
  // from idle's rarer look-around, reads as "actively considering."
  useEffect(() => {
    if (activityState !== 'thinking' || !animated) return undefined;
    let cancelled = false;
    const sequence = ['up', 'left', 'up', 'right'];
    let i = 0;
    const step = () => {
      if (cancelled) return;
      setAutoGaze(sequence[i % sequence.length]);
      i += 1;
      after(() => !cancelled && step(), 1200 + Math.random() * 500);
    };
    step();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityState, animated]);

  // A forced blink (dev-only test button) works in any state, at any time.
  useEffect(() => {
    if (!blinkTrigger) return;
    setBlinking(true);
    const id = setTimeout(() => setBlinking(false), 160);
    return () => clearTimeout(id);
  }, [blinkTrigger]);

  // R2-D2-style head turn — a real angle (degrees, signed), not a CSS
  // keyframe loop. One consolidated effect (not four independent ones) so
  // there's a single source of truth writing `headAngle`, since her spec
  // is explicitly a discrete, per-state behavior, not a continuous cycle:
  // - idle: waits a random 6-12s, turns 8-12° to a random side, holds
  //   ~1.6-2.2s, returns to center, reschedules with a fresh random wait.
  //   Not a fixed-period loop — each cycle re-rolls its own timing.
  // - thinking: turns 10-15° to a random side the moment thinking starts
  //   and HOLDS there for as long as it continues — tied to the real
  //   `activityState`, not a fixed timer, same discipline as every other
  //   thinking-visual in this file. Returns to center via this effect's
  //   own cleanup once thinking actually ends (not before).
  // - listening: a small fixed lean — same honesty caveat as the existing
  //   gaze `'listening'` → `'down'` case (a representative direction
  //   toward "the input," not literal tracking).
  // - speaking: small, slow random micro-turns (±2.5°) — "natural
  //   adjustments," not stillness.
  useEffect(() => {
    clearHeadTimers();
    if (!animated) { setHeadAngle(0); return () => clearHeadTimers(); }
    let cancelled = false;

    if (activityState === 'idle') {
      const scheduleTurn = () => {
        afterHead(() => {
          if (cancelled) return;
          const dir = Math.random() < 0.5 ? -1 : 1;
          setHeadAngle(dir * (8 + Math.random() * 4));
          afterHead(() => !cancelled && setHeadAngle(0), 1600 + Math.random() * 600);
          scheduleTurn();
        }, 6000 + Math.random() * 6000);
      };
      scheduleTurn();
    } else if (activityState === 'thinking') {
      const dir = Math.random() < 0.5 ? -1 : 1;
      setHeadAngle(dir * (10 + Math.random() * 5));
    } else if (activityState === 'listening') {
      setHeadAngle(-7);
    } else if (activityState === 'speaking') {
      const microTurn = () => {
        afterHead(() => {
          if (cancelled) return;
          setHeadAngle((Math.random() - 0.5) * 5);
          microTurn();
        }, 1500 + Math.random() * 1200);
      };
      microTurn();
    } else {
      setHeadAngle(0);
    }

    return () => { cancelled = true; clearHeadTimers(); setHeadAngle(0); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, activityState]);

  const gaze = gazeOverride
    || (activityState === 'listening' ? 'down'
      : activityState === 'speaking' ? 'center'
        : autoGaze);

  return { blinking, gaze, headAngle };
}

function EyeLayer({ src, box, gaze, blinking }) {
  // CSS `translate(X%, Y%)` on an element is already relative to the
  // element's OWN rendered size, so GAZE_OFFSET's values (already meant as
  // "percent of the eye's own width/height") are used directly here — an
  // earlier version multiplied by `box.width`/`box.height` too, which are
  // themselves already percentages (of the parent image), silently
  // shrinking every gaze nudge down to ~1/8th its intended size and making
  // it visually imperceptible. Caught via a real screenshot (Look L/R
  // showed no visible eye movement) during self-verification, not assumed.
  const offset = GAZE_OFFSET[gaze] || GAZE_OFFSET.center;
  const dx = offset.x;
  const dy = offset.y;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
        transformOrigin: 'center',
        transform: `translate(${dx}%, ${dy}%) scaleY(${blinking ? 0.08 : 1})`,
        transition: 'transform 220ms ease-out',
        pointerEvents: 'none',
      }}
    />
  );
}

export default function RobotAvatarImage({
  size = 104, color = '#D4AF37', glowAlpha = '45', activityState = 'idle', animated = true,
  naturalAspect = false, amplitude = null, gazeOverride = null, blinkTrigger = 0,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const { blinking, gaze, headAngle } = useGazeAndBlink({ activityState, animated, gazeOverride, blinkTrigger });

  if (imgFailed) {
    return <RobotAvatar size={size} color={color} glowAlpha={glowAlpha} dots={activityState === 'thinking' ? 3 : 0} animated={animated} />;
  }

  const glowFilter = `drop-shadow(0 0 ${Math.round(size * 0.22)}px ${color}${glowAlpha}) drop-shadow(0 8px 16px rgba(0,0,0,0.45))`;
  // Two independent thresholds, not one — a real gap found 2026-08-23: the
  // old single `size >= 80` flag gated the eyes themselves behind the same
  // bar as the busy multi-element overlays, so every real avatar-context
  // render in the app (message bubbles, the launcher button, headers —
  // McareAvatar's own default size is 28) showed a bare glowing shell with
  // no eyes at all; only the two size>=80 hero instances in MCareOrb.jsx
  // ever cleared it. `showEyes` also now gates the gold M-badge cutout —
  // it's the same category as the eyes (a simple, always-shown structural
  // layer, not an "activity" indicator) since `bodySrc` no longer bakes
  // the badge in at all. `showActivityOverlays` (the red M-badge mask +
  // brain-icon hologram while thinking, speaking glow/waveform, listening
  // equalizer, plus the head turn via data-activity-state below) stays at
  // the original, unverified-at-small-sizes size>=80 bar, unchanged.
  const showEyes = size >= 24;
  const showActivityOverlays = size >= 80;
  const cssActivityState = animated ? activityState : 'static';

  // Real amplitude (0-1) drives these directly via inline style when
  // provided; otherwise the CSS keyframes below own the animation exactly
  // as before — see this file's doc comment on `amplitude`.
  const ampScale = amplitude != null ? 0.5 + Math.min(1, amplitude) * 0.9 : null;
  const ampOpacity = amplitude != null ? 0.55 + Math.min(1, amplitude) * 0.45 : null;

  return (
    <div
      aria-hidden="true"
      className="robotAvatarWrap robot-wrapper"
      data-activity-state={showActivityOverlays ? cssActivityState : 'static'}
      data-testid="robot-avatar"
      style={naturalAspect
        ? { position: 'relative', width: `min(${size}px, 100%)`, flexShrink: 0 }
        : { width: size, height: size, position: 'relative', flexShrink: 0 }}
    >
      <div
        className="robotAvatarFloat"
        style={{
          transform: `perspective(800px) rotateY(${headAngle}deg) translateX(${(headAngle * 0.3).toFixed(2)}px) scale(${(1 - Math.abs(headAngle) * 0.001).toFixed(4)})`,
          transformOrigin: '50% 88%',
          transition: 'transform 900ms ease-in-out',
        }}
      >
        {/* Real aspect-ratio box — keeps every overlay's percentage math
            correct whether the outer wrapper is a natural-width column
            (hero) or a square UI slot (header/launcher/typing), where an
            objectFit:contain image would otherwise letterbox unnoticed. */}
        <div className="robotImageBox" style={{ position: 'relative', width: '100%', aspectRatio: `${NATURAL_W} / ${NATURAL_H}` }}>
          <img
            src={bodySrc}
            alt=""
            draggable={false}
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: glowFilter }}
          />

          {showEyes && (
            <>
              <EyeLayer src={eyeLeftSrc} box={EYE_BOX.left} gaze={gaze} blinking={blinking} />
              <EyeLayer src={eyeRightSrc} box={EYE_BOX.right} gaze={gaze} blinking={blinking} />

              {/* M badge — a real cutout layer (like the eyes), gold by
                  default. Always rendered here (not activity-gated) since
                  bodySrc no longer bakes the badge in at all — without
                  this, every non-thinking state at 24-79px would show a
                  blank hole where the badge used to be. */}
              <img
                src={mBadgeSrc}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: `${MBADGE_BOX.left}%`, top: `${MBADGE_BOX.top}%`,
                  width: `${MBADGE_BOX.width}%`, height: `${MBADGE_BOX.height}%`,
                  opacity: showActivityOverlays && activityState === 'thinking' ? 0 : 1,
                  transition: 'opacity 260ms ease-in-out',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          {showActivityOverlays && (
            <>
              {/* Thinking: the M badge recolors to vivid red — a real solid
                  fill of the exact badge shape (not just a nearby glow),
                  via a CSS mask using the same cutout as a stencil. Never
                  tints the rest of the robot. Crossfades against the gold
                  <img> above via a plain opacity transition. */}
              {activityState === 'thinking' && (
                <>
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${MBADGE_BOX.left + MBADGE_BOX.width / 2}%`,
                      top: `${MBADGE_BOX.top + MBADGE_BOX.height / 2}%`,
                      width: `${MBADGE_BOX.width * 1.8}%`, height: `${MBADGE_BOX.height * 1.35}%`,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%', pointerEvents: 'none', zIndex: 9,
                      background: `radial-gradient(circle, ${THINKING_RED}99 0%, ${THINKING_RED}00 72%)`,
                    }}
                  />
                  <span
                    className="robotMBadgeRed"
                    data-testid="robot-mbadge-red"
                    style={{
                      position: 'absolute',
                      left: `${MBADGE_BOX.left}%`, top: `${MBADGE_BOX.top}%`,
                      width: `${MBADGE_BOX.width}%`, height: `${MBADGE_BOX.height}%`,
                      backgroundColor: THINKING_RED,
                      WebkitMaskImage: `url(${mBadgeSrc})`, maskImage: `url(${mBadgeSrc})`,
                      WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
                      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center', maskPosition: 'center',
                      pointerEvents: 'none', zIndex: 10,
                    }}
                  />
                </>
              )}

              {/* Speaking: eyes pulse brighter (additive glow, never a cover)
                  — real amplitude-scaled when a real TTS signal exists. */}
              {activityState === 'speaking' && (
                <div data-testid="robot-eyeglow">
                  {[EYE_BOX.left, EYE_BOX.right].map((box, i) => (
                    <span
                      key={i}
                      className={amplitude == null ? 'robotEyeGlow' : ''}
                      style={{
                        position: 'absolute',
                        left: `${box.left + box.width / 2}%`, top: `${box.top + box.height / 2}%`,
                        width: `${box.width * 1.5}%`, height: `${box.height * 1.9}%`,
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%', pointerEvents: 'none', zIndex: 10,
                        background: 'radial-gradient(circle, rgba(255,210,74,0.95) 0%, rgba(255,210,74,0) 72%)',
                        mixBlendMode: 'screen',
                        ...(amplitude != null ? { opacity: ampOpacity, transform: `translate(-50%, -50%) scale(${ampScale})`, transition: 'opacity 80ms linear, transform 80ms linear' } : {}),
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Speaking: a 5-bar waveform beneath the visor — real
                  amplitude-scaled when available */}
              {activityState === 'speaking' && (
                <div className="robotWaveRow" data-testid="robot-wave">
                  {[0, 1, 2, 3, 4].map(i => (
                    <span
                      key={i}
                      className={amplitude == null ? 'robotWaveBar' : ''}
                      style={amplitude == null
                        ? { animationDelay: `${i * 90}ms` }
                        : {
                          flex: 1, borderRadius: 2, opacity: 1, background: BRIGHT_GOLD,
                          boxShadow: '0 0 8px 2px rgba(255,210,74,0.85)',
                          height: `${18 + Math.min(1, amplitude) * 82 * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.3)))}%`,
                          transition: 'height 80ms linear',
                        }}
                    />
                  ))}
                </div>
              )}

              {/* Listening: a gold/cyan equalizer near the left earpiece/
                  M-badge — real amplitude-scaled during an active voice-
                  message recording, honest fixed pulse everywhere else
                  (Conversational Mode's mic and plain input-focus have no
                  raw stream available to meter — see doc comment). */}
              {activityState === 'listening' && (
                <div className="robotListenRow" data-testid="robot-listen">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className={amplitude == null ? `robotListenBar ${i % 2 === 0 ? 'robotListenBarGold' : 'robotListenBarCyan'}` : ''}
                      style={amplitude == null
                        ? { animationDelay: `${i * 120}ms` }
                        : {
                          flex: 1, borderRadius: 2, opacity: 1,
                          background: i % 2 === 0 ? BRIGHT_GOLD : CYAN,
                          boxShadow: i % 2 === 0 ? '0 0 8px 2px rgba(255,210,74,0.85)' : '0 0 8px 2px rgba(34,211,238,0.85)',
                          height: `${18 + Math.min(1, amplitude) * 82 * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7)))}%`,
                          transition: 'height 80ms linear',
                        }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Thinking: a small floating "brain" hologram above the head — a
          real animate-in/animate-out (framer-motion's AnimatePresence,
          the one usage of it in this file — everything else here is
          plain CSS, but a genuine "animate out cleanly, unmount after"
          needs it). Deliberately a sibling of .robotAvatarFloat, not a
          child of it — floats in a fixed spot regardless of the head-turn
          angle, rather than turning along with the head. */}
      {showActivityOverlays && (
        <AnimatePresence>
          {activityState === 'thinking' && (
            <motion.div
              key="brain"
              data-testid="robot-brain-icon"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: animated ? 0.35 : 0, ease: 'easeOut' }}
              style={{
                position: 'absolute', top: -26, left: '50%', x: '-50%',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                zIndex: 15, pointerEvents: 'none',
              }}
            >
              <div className="robotBrainGlowWrap" data-activity-state={cssActivityState}>
                <span className="robotBrainGlow" />
                <span className="robotBrainRing" />
                <span className="robotBrainSpark robotBrainSpark0" />
                <span className="robotBrainSpark robotBrainSpark1" />
                <span className="robotBrainSpark robotBrainSpark2" />
                <BrainCircuit
                  size={`${Math.max(16, Math.round(size * 0.14))}`}
                  color={THINKING_RED}
                  strokeWidth={2}
                  style={{ position: 'relative', zIndex: 2, filter: `drop-shadow(0 0 6px ${THINKING_RED}e6)` }}
                />
              </div>
              <span className="robotBrainLabel">ANALYZING</span>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <style>{`
        .robotAvatarFloat { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

        /* Thinking: the M badge's solid red fill pulses like lit hardware,
           plus a brief scan/flicker dip a couple of times per longer
           cycle — two independent, stacked animations on the same
           element. Scoped to [data-activity-state="thinking"] (which the
           component forces to "static" when animated is false) rather
           than an unconditional selector, so reduced-motion genuinely
           turns this off instead of just being ignored. */
        [data-activity-state="thinking"] .robotMBadgeRed {
          animation: robotMBadgePulse 1.1s ease-in-out infinite, robotMBadgeFlicker 4.5s linear infinite;
        }
        @keyframes robotMBadgePulse {
          0%, 100% { opacity: 0.82; }
          50% { opacity: 1; }
        }
        @keyframes robotMBadgeFlicker {
          0%, 78%, 100% { filter: brightness(1); }
          80% { filter: brightness(0.55); }
          82% { filter: brightness(1.25); }
          84% { filter: brightness(0.7); }
          86% { filter: brightness(1); }
        }

        /* Thinking: the floating brain hologram — a soft glow, a thin
           breathing "processing" ring, and 3 staggered fading sparks, all
           behind the real lucide BrainCircuit icon. Scoped to
           [data-activity-state="thinking"] the same way as the M-badge
           pulse above, so reduced-motion renders the icon+label statically
           with no animation. */
        .robotBrainGlowWrap { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
        .robotBrainGlow {
          position: absolute; inset: -8px; border-radius: 50%; z-index: 0;
          background: radial-gradient(circle, ${THINKING_RED}66 0%, ${THINKING_RED}00 70%);
        }
        [data-activity-state="thinking"] .robotBrainGlow { animation: robotBrainGlowPulse 2.2s ease-in-out infinite; }
        @keyframes robotBrainGlowPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .robotBrainRing {
          position: absolute; inset: 3px; border-radius: 50%; z-index: 1;
          border: 1px solid ${THINKING_RED}99;
        }
        [data-activity-state="thinking"] .robotBrainRing { animation: robotBrainRingPulse 2.2s ease-in-out infinite; }
        @keyframes robotBrainRingPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 0.85; transform: scale(1.2); }
        }
        .robotBrainSpark {
          position: absolute; width: 3px; height: 3px; border-radius: 50%; z-index: 1;
          background: #FF6B78; box-shadow: 0 0 4px 1px ${THINKING_RED}cc; opacity: 0;
        }
        .robotBrainSpark0 { top: 0; left: 8px; }
        .robotBrainSpark1 { top: 14px; right: -4px; }
        .robotBrainSpark2 { bottom: 2px; left: 0; }
        [data-activity-state="thinking"] .robotBrainSpark0 { animation: robotBrainSparkFade 1.8s ease-in-out infinite; }
        [data-activity-state="thinking"] .robotBrainSpark1 { animation: robotBrainSparkFade 1.8s ease-in-out infinite 0.5s; }
        [data-activity-state="thinking"] .robotBrainSpark2 { animation: robotBrainSparkFade 1.8s ease-in-out infinite 1s; }
        @keyframes robotBrainSparkFade {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .robotBrainLabel {
          margin-top: 3px; font-size: 9px; font-weight: 600; letter-spacing: 0.09em;
          color: #FF6B78; text-shadow: 0 0 6px ${THINKING_RED}b3; white-space: nowrap;
        }

        /* Speaking: an ADDITIVE glow over each real eye — never a cover */
        .robotEyeGlow { animation: robotEyePulse 0.9s ease-in-out infinite; }
        @keyframes robotEyePulse {
          0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.35); }
        }

        /* Speaking: a 5-bar waveform beneath the visor (on the chin/lower shell) */
        .robotWaveRow {
          position: absolute; top: 79%; left: 34%; width: 32%; height: 9%;
          display: flex; align-items: flex-end; justify-content: space-between; gap: 6%;
          pointer-events: none; z-index: 10;
        }
        .robotWaveBar {
          flex: 1; height: 35%; border-radius: 2px; opacity: 1;
          background: ${BRIGHT_GOLD};
          box-shadow: 0 0 8px 2px rgba(255,210,74,0.85);
        }
        [data-activity-state="speaking"] .robotWaveBar { animation: robotBarBounce 0.5s ease-in-out infinite; }
        @keyframes robotBarBounce {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }

        /* Listening: a gold/cyan equalizer near the left earpiece/M-badge */
        .robotListenRow {
          position: absolute; top: 57%; left: 4%; width: 17%; height: 11%;
          display: flex; align-items: flex-end; justify-content: space-between; gap: 14%;
          pointer-events: none; z-index: 10;
        }
        .robotListenBar {
          flex: 1; height: 35%; border-radius: 2px; opacity: 1;
        }
        .robotListenBarGold { background: ${BRIGHT_GOLD}; box-shadow: 0 0 8px 2px rgba(255,210,74,0.85); }
        .robotListenBarCyan { background: ${CYAN}; box-shadow: 0 0 8px 2px rgba(34,211,238,0.85); }
        [data-activity-state="listening"] .robotListenBar { animation: robotBarBounce 0.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
