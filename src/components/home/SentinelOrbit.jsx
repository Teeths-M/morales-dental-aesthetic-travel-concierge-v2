import React, { useRef, useEffect } from 'react';

const SIZE = 370;
const GOLD = '#C9A84C';

// Destinations with approximate lat/lon
const DESTINATIONS = [
  { name: 'Mexico',      lat: 23.6,   lon: -102.5 },
  { name: 'Colombia',    lat:  4.7,   lon:  -74.1 },
  { name: 'Brazil',      lat: -14.2,  lon:  -51.9 },
  { name: 'Costa Rica',  lat:   9.7,  lon:  -83.8 },
  { name: 'Venezuela',   lat:   6.4,  lon:  -66.6 },
  { name: 'Turkey',      lat:  38.9,  lon:   35.2 },
  { name: 'Thailand',    lat:  15.9,  lon:  100.9 },
  { name: 'South Korea', lat:  35.9,  lon:  127.7 },
];

// Convert lat/lon to 3D unit sphere
function latLonToVec3(lat, lon, r = 1) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x:  r * Math.sin(phi) * Math.cos(theta),
    y:  r * Math.cos(phi),
    z:  r * Math.sin(phi) * Math.sin(theta),
  };
}

// Rotate a point around Y axis
function rotateY(p, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: p.x * cos + p.z * sin,
    y: p.y,
    z: -p.x * sin + p.z * cos,
  };
}

// Project 3D → 2D canvas coords
function project(p, cx, cy, radius) {
  const persp = 2.8;
  const scale = (persp * radius) / (persp + p.z + 1);
  return {
    x:   cx + p.x * scale,
    y:   cy - p.y * scale,
    vis: p.z > -0.35,          // visible hemisphere + soft edge
    depth: (p.z + 2) / 3,      // 0..1 for alpha / size
  };
}

// Draw a great-circle arc between two 3D points (Slerp)
function drawArc(ctx, a, b, steps = 40) {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const omega = Math.acos(Math.min(1, Math.max(-1, dot)));
  if (omega < 0.001) return;
  const sinO = Math.sin(omega);
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sa = Math.sin((1 - t) * omega) / sinO;
    const sb = Math.sin(t * omega) / sinO;
    const p = { x: sa * a.x + sb * b.x, y: sa * a.y + sb * b.y, z: sa * a.z + sb * b.z };
    if (p.z < -0.55) { started = false; continue; }
    const proj = project(p, 0, 0, 1);
    if (!started) { ctx.moveTo(proj.x, proj.y); started = true; }
    else ctx.lineTo(proj.x, proj.y);
  }
}

export default function SentinelOrbit() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const angleRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const R  = 128;           // globe radius px

    // Dot-grid for globe surface
    const DOTS = [];
    for (let la = -80; la <= 80; la += 10) {
      const rowR = Math.cos(la * Math.PI / 180);
      const count = Math.max(4, Math.round(36 * rowR));
      for (let i = 0; i < count; i++) {
        const lo = -180 + (360 / count) * i;
        DOTS.push(latLonToVec3(la, lo, 1));
      }
    }

    // Pre-compute base destination 3D positions
    const DEST_BASE = DESTINATIONS.map(d => ({
      ...d,
      v: latLonToVec3(d.lat, d.lon, 1),
    }));

    // Hub = center of globe (0,0,0) projected = cx, cy always
    // Arcs go from each destination to 'hub' on surface — use (0,0.12,0.99) approx front-center
    const HUB = latLonToVec3(5, -10, 1); // slight bias toward viewer

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const angle = angleRef.current;

      // --- Globe atmosphere glow ---
      const grad = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.18);
      grad.addColorStop(0,   'rgba(201,168,76,0.04)');
      grad.addColorStop(0.7, 'rgba(10,22,50,0.18)');
      grad.addColorStop(1,   'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
      ctx.fill();

      // --- Globe dark base ---
      const globeGrad = ctx.createRadialGradient(cx - 24, cy - 28, R * 0.08, cx, cy, R);
      globeGrad.addColorStop(0,   'rgba(14,28,64,0.96)');
      globeGrad.addColorStop(0.6, 'rgba(5,12,35,0.98)');
      globeGrad.addColorStop(1,   'rgba(2,6,22,0.99)');
      ctx.fillStyle = globeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // --- Dot grid ---
      DOTS.forEach(v => {
        const rv = rotateY(v, angle);
        if (rv.z < -0.08) return;
        const proj = project(rv, cx, cy, R);
        const alpha = Math.max(0, rv.z) * 0.55 + 0.08;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,76,${alpha.toFixed(2)})`;
        ctx.fill();
      });

      // --- Latitude grid lines (very subtle) ---
      [-30, 0, 30].forEach(lat => {
        ctx.beginPath();
        let started = false;
        for (let lo = -180; lo <= 180; lo += 4) {
          const v = rotateY(latLonToVec3(lat, lo, 1), angle);
          if (v.z < -0.15) { started = false; continue; }
          const p = project(v, cx, cy, R);
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(201,168,76,0.06)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // --- Rotate destinations ---
      const rotDests = DEST_BASE.map(d => ({
        ...d,
        rv: rotateY(d.v, angle),
      }));

      const hubR = rotateY(HUB, angle);

      // --- Gold arc lines ---
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(R, R);
      rotDests.forEach(d => {
        if (d.rv.z < -0.3) return;
        const alpha = Math.max(0, d.rv.z) * 0.7 + 0.15;
        ctx.strokeStyle = `rgba(201,168,76,${(alpha * 0.55).toFixed(2)})`;
        ctx.lineWidth = 1.2 / R;
        drawArc(ctx, d.rv, hubR);
        ctx.stroke();
      });
      ctx.restore();

      // --- Rim glow ---
      const rimGrad = ctx.createRadialGradient(cx, cy, R * 0.78, cx, cy, R * 1.04);
      rimGrad.addColorStop(0,   'transparent');
      rimGrad.addColorStop(0.7, 'rgba(201,168,76,0.06)');
      rimGrad.addColorStop(1,   'rgba(201,168,76,0.16)');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.04, 0, Math.PI * 2);
      ctx.fill();

      // Globe edge stroke
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(201,168,76,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // --- Destination dots & labels ---
      rotDests.forEach(d => {
        const vis = d.rv.z > -0.1;
        if (!vis) return;
        const proj = project(d.rv, cx, cy, R);
        const alpha = Math.max(0, d.rv.z) * 0.85 + 0.12;

        // Outer glow ring
        const dotGlow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 10);
        dotGlow.addColorStop(0,   `rgba(201,168,76,${(alpha * 0.45).toFixed(2)})`);
        dotGlow.addColorStop(1,   'transparent');
        ctx.fillStyle = dotGlow;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,120,${alpha.toFixed(2)})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = GOLD;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        if (d.rv.z > 0.05) {
          ctx.font = `bold 9px sans-serif`;
          ctx.fillStyle = `rgba(255,215,100,${(alpha * 0.9).toFixed(2)})`;
          ctx.letterSpacing = '0.08em';
          const labelX = proj.x + (d.rv.x > 0 ? 9 : -9);
          const labelY = proj.y - 6;
          ctx.textAlign = d.rv.x > 0 ? 'left' : 'right';
          ctx.fillText(d.name.toUpperCase(), labelX, labelY);
        }
      });

      // --- Center shield emblem ---
      const shield = { x: cx, y: cy };
      // Outer glow
      const cg = ctx.createRadialGradient(shield.x, shield.y, 4, shield.x, shield.y, 38);
      cg.addColorStop(0,   'rgba(201,168,76,0.22)');
      cg.addColorStop(1,   'transparent');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(shield.x, shield.y, 38, 0, Math.PI * 2);
      ctx.fill();

      // Shield shape via path
      const sw = 32, sh = 38;
      const sx = shield.x - sw / 2;
      const sy = shield.y - sh / 2;
      ctx.beginPath();
      ctx.moveTo(sx + sw * 0.5, sy);
      ctx.lineTo(sx + sw, sy + sh * 0.14);
      ctx.lineTo(sx + sw, sy + sh * 0.62);
      ctx.bezierCurveTo(sx + sw, sy + sh * 0.82, sx + sw * 0.5, sy + sh, sx + sw * 0.5, sy + sh);
      ctx.bezierCurveTo(sx + sw * 0.5, sy + sh, sx, sy + sh * 0.82, sx, sy + sh * 0.62);
      ctx.lineTo(sx, sy + sh * 0.14);
      ctx.closePath();
      ctx.fillStyle = 'rgba(8,16,48,0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,168,76,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Checkmark
      ctx.beginPath();
      ctx.moveTo(shield.x - 7, shield.y + 2);
      ctx.lineTo(shield.x - 2, shield.y + 8);
      ctx.lineTo(shield.x + 9, shield.y - 5);
      ctx.strokeStyle = 'rgba(201,168,76,0.95)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // --- Bottom label ---
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = 'rgba(201,168,76,0.65)';
      ctx.textAlign = 'center';
      ctx.fillText('SAFE‑T 4LIFE™', cx, cy + R + 18);
    }

    let last = 0;
    const FPS = 60;
    const interval = 1000 / FPS;

    function loop(ts) {
      if (ts - last >= interval) {
        angleRef.current += 0.003;
        draw();
        last = ts;
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: SIZE,
        height: SIZE,
        display: 'block',
        borderRadius: '50%',
        filter: 'drop-shadow(0 0 32px rgba(201,168,76,0.18))',
      }}
      aria-hidden="true"
    />
  );
}