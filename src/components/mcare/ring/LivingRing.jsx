import React, { useEffect, useRef } from 'react';

/**
 * LivingRing — M-Care's golden ring, drawn live on a canvas (Portia's "Jarvis X" vision, Nov 6).
 *
 * Nine fine gold strands loop around one circle, each moving on its own slow wave, with a soft bloom outside and a
 * glassy edge inside, so it reads as one living ring of light rather than a picture. Its state changes how it moves:
 *   idle      slow breathing          listening  ripples spread out
 *   thinking  quicker swirl           tool_executing  quickest swirl, brighter
 *   speaking  swells with M-Care's real voice level when there is one (amplitude), else a gentle pulse
 *   acting    a little livelier       alert      amber      offline   dim and still     sos   red, urgent
 * It also has a heartbeat: a slow lub-dub at rest (the ring grows up to 5% and its glow brightens in step), quicker
 * while M-Care works, fast and strong during an SOS, none offline.
 * Changes glide rather than jump. Anything in `children` (the task icon, the SOS countdown) sits in the centre.
 * With reduced motion it is drawn once per state and never animates.
 */

const GOLD_CORE = [248, 213, 140];
const GOLD_EDGE = [212, 168, 96];

// pulse is how strongly the ring's heartbeat shows (scale up to 1.05 with the glow in step); bpm is its rate.
const PALETTES = {
  idle:           { core: GOLD_CORE, edge: GOLD_EDGE, energy: 0.35, speed: 0.7, glow: 0.85, ripple: 0, pulse: 1, bpm: 54 },
  listening:      { core: GOLD_CORE, edge: GOLD_EDGE, energy: 0.55, speed: 1.1, glow: 1, ripple: 1, pulse: 0.5, bpm: 66 },
  thinking:       { core: GOLD_CORE, edge: GOLD_EDGE, energy: 0.6, speed: 1.8, glow: 1, ripple: 0, pulse: 0.6, bpm: 72 },
  tool_executing: { core: GOLD_CORE, edge: GOLD_EDGE, energy: 0.7, speed: 2.3, glow: 1.05, ripple: 0, pulse: 0.6, bpm: 80 },
  speaking:       { core: GOLD_CORE, edge: GOLD_EDGE, energy: 0.7, speed: 1.3, glow: 1.1, ripple: 0.4, pulse: 0.35, bpm: 66 },
  acting:         { core: GOLD_CORE, edge: GOLD_EDGE, energy: 0.45, speed: 0.9, glow: 0.95, ripple: 0, pulse: 0.9, bpm: 60 },
  alert:          { core: [255, 200, 110], edge: [217, 119, 6], energy: 0.6, speed: 1.4, glow: 1, ripple: 0, pulse: 0.8, bpm: 76 },
  offline:        { core: [150, 145, 135], edge: [100, 96, 90], energy: 0.15, speed: 0.4, glow: 0.55, ripple: 0, pulse: 0, bpm: 40 },
  sos:            { core: [255, 130, 120], edge: [220, 38, 38], energy: 0.9, speed: 2.4, glow: 1.15, ripple: 0.8, pulse: 1, bpm: 110 },
};

// A heartbeat over one beat (f from 0 to 1): a strong first beat, a softer second one, then rest. Peaks near 1.
function heartbeat(f) {
  const a = (f - 0.06) / 0.05;
  const b = (f - 0.28) / 0.06;
  return Math.exp(-a * a) + 0.55 * Math.exp(-b * b);
}

const STRANDS = 9;
const STEPS = 140;
const TAU = Math.PI * 2;

const rgba = ([r, g, b], a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const paletteFor = (state) => PALETTES[state] || PALETTES.idle;
const copyPalette = (p) => ({ ...p, core: [...p.core], edge: [...p.edge] });

function easeToward(cur, target, k) {
  for (const key of ['energy', 'speed', 'glow', 'ripple', 'pulse', 'bpm']) cur[key] += (target[key] - cur[key]) * k;
  for (let i = 0; i < 3; i++) {
    cur.core[i] += (target.core[i] - cur.core[i]) * k;
    cur.edge[i] += (target.edge[i] - cur.edge[i]) * k;
  }
}

function drawRing(ctx, px, t, p, amplitude, beat = 0) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, px, px);
  const c = px / 2;
  const R = px * 0.34;
  // The heartbeat: the whole ring grows up to 5% on each beat and its glow brightens in step.
  const pulse = Math.max(0, beat) * p.pulse;
  const scale = 1 + 0.05 * pulse;
  ctx.setTransform(scale, 0, 0, scale, c * (1 - scale), c * (1 - scale));
  const glow = p.glow * (1 + 0.3 * pulse);

  // Soft bloom outside the ring.
  let g = ctx.createRadialGradient(c, c, R * 0.7, c, c, R * 1.45);
  g.addColorStop(0, rgba(p.edge, 0));
  g.addColorStop(0.35, rgba(p.edge, 0.11 * glow));
  g.addColorStop(1, rgba(p.edge, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, px);

  // The glass: clear in the middle, a faint gold edge just inside the ring.
  g = ctx.createRadialGradient(c, c, R * 0.5, c, c, R * 1.02);
  g.addColorStop(0, 'rgba(6,12,26,0)');
  g.addColorStop(0.78, rgba(p.edge, 0.05 * glow));
  g.addColorStop(1, rgba(p.core, 0.12 * glow));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, R * 1.02, 0, TAU);
  ctx.fill();

  ctx.globalCompositeOperation = 'lighter';
  const live = Math.max(0, Math.min(1, Number(amplitude) || 0));
  const energy = p.energy + live * 0.6;
  const spin = t * 0.12 * p.speed;

  for (let i = 0; i < STRANDS; i++) {
    const ph = i * 1.618;
    const wave = R * (0.018 + energy * 0.045) * (0.6 + 0.4 * Math.sin(ph * 2.3));
    const squash = 0.05 * Math.sin(t * 0.35 * p.speed + ph);
    const tilt = ph + t * 0.05 * p.speed;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    ctx.beginPath();
    for (let k = 0; k <= STEPS; k++) {
      const th = (k / STEPS) * TAU;
      const r = R * (1 + 0.012 * Math.sin(t * 0.9 + ph))
        + wave * (Math.sin(3 * th + t * 0.8 * p.speed + ph)
          + 0.6 * Math.sin(5 * th - t * 1.1 * p.speed + ph * 1.7)
          + 0.35 * Math.sin(2 * th + t * 0.4 * p.speed));
      const x0 = r * Math.cos(th);
      const y0 = r * Math.sin(th) * (1 - squash);
      const x = c + x0 * cosT - y0 * sinT;
      const y = c + x0 * sinT + y0 * cosT;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Bright arcs travel round the ring (the way light catches a glass ring), dimmer in between.
    let style = rgba(p.core, 0.9);
    if (typeof ctx.createConicGradient === 'function') {
      const cg = ctx.createConicGradient(spin + ph * 0.4, c, c);
      cg.addColorStop(0, rgba(p.core, 1));
      cg.addColorStop(0.22, rgba(p.edge, 0.25));
      cg.addColorStop(0.5, rgba(p.core, 0.85));
      cg.addColorStop(0.75, rgba(p.edge, 0.2));
      cg.addColorStop(1, rgba(p.core, 1));
      style = cg;
    }
    ctx.strokeStyle = style;
    // A wide faint pass for glow, then the fine strand itself.
    ctx.lineWidth = px * 0.022 * (0.6 + 0.2 * (i % 3));
    ctx.globalAlpha = Math.min(1, 0.07 * glow);
    ctx.stroke();
    ctx.lineWidth = px * (0.0025 + 0.0035 * (((i * 7) % 5) / 4));
    ctx.globalAlpha = Math.min(1, (0.35 + 0.4 * (((i * 3) % 4) / 3)) * glow);
    ctx.stroke();
  }

  // Listening (and SOS): rings of light spreading outward.
  if (p.ripple > 0.01) {
    ctx.lineWidth = px * 0.004;
    for (let j = 0; j < 3; j++) {
      const phase = (t * 0.6 + j / 3) % 1;
      ctx.globalAlpha = (1 - phase) * 0.35 * p.ripple;
      ctx.strokeStyle = rgba(p.core, 1);
      ctx.beginPath();
      ctx.arc(c, c, R * (1.04 + phase * 0.35), 0, TAU);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export default function LivingRing({ state = 'idle', size = 300, amplitude = null, reduced = false, label = 'M-Care', children = null }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(state);
  const amplitudeRef = useRef(amplitude);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { amplitudeRef.current = amplitude; }, [amplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(1, Math.round(size * dpr));
    canvas.width = px;
    canvas.height = px;

    if (reduced) {
      drawRing(ctx, px, 2, copyPalette(paletteFor(stateRef.current)), null);
      return undefined;
    }

    const current = copyPalette(paletteFor(stateRef.current));
    const startedAt = performance.now();
    let last = startedAt;
    // The heartbeat's position within one beat (0 to 1). Kept as a running total rather than time × rate, so a change
    // of rate (a new state) speeds the beat up or slows it down instead of jumping to another point in it.
    let beatPhase = 0;
    let frame = 0;
    const tick = (now) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      easeToward(current, paletteFor(stateRef.current), 0.06);
      beatPhase = (beatPhase + dt * (current.bpm / 60)) % 1;
      drawRing(ctx, px, (now - startedAt) / 1000, current, amplitudeRef.current, heartbeat(beatPhase));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // With reduced motion the ring is redrawn once whenever its state changes; otherwise the loop follows stateRef.
  }, [size, reduced, reduced ? state : null]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div role="img" aria-label={label} data-ring-state={state} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <canvas ref={canvasRef} aria-hidden="true" style={{ width: size, height: size, display: 'block' }} />
      {children && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {children}
        </div>
      )}
    </div>
  );
}
