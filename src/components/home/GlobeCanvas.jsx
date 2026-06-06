import React, { useRef, useEffect } from 'react';

const R2D = Math.PI / 180;
const C_LAT = 15;   // globe center latitude
const C_LON = -20;  // globe center longitude

// Land bounding boxes [latMin, latMax, lonMin, lonMax]
const LAND_BOXES = [
  [18, 32, -118, -86],   // Mexico
  [8,  18,  -93,  -77],  // Central America
  [9,  24,  -88,  -62],  // Caribbean
  [-5, 12,  -82,  -59],  // N South America
  [-35, 5,  -75,  -33],  // Brazil / S America E
  [-55,-33, -76,  -53],  // Southern Cone
  [35, 62,  -10,   30],  // W/C Europe
  [45, 68,   18,   58],  // E Europe
  [36, 43,   26,   47],  // Turkey / Caucasus
  [8,  38,  -18,   16],  // W Africa
  [-35, 8,   10,   52],  // E/S Africa
  [12, 36,   36,   62],  // Middle East / Arabian
  [8,  37,   68,   90],  // India
  [-5, 25,   97,  122],  // SE Asia
  [26, 46,  119,  148],  // Korea / Japan
  [18, 52,   99,  123],  // China
  [50, 72,   58,  140],  // Siberia
  [55, 72,  -25,   30],  // UK / Scandinavia
  [-45,-10, -80,  -68],  // Chile / W Argentina
  [32, 38,  -10,    2],  // Iberian Peninsula
  [36, 42,   14,   18],  // Italy / Balkans
];

// Country glow nodes
const NODES = [
  { lat: 23.6,  lon: -102.5, label: ['MEXICO'],        side: 'left'  },
  { lat:  9.7,  lon:  -83.8, label: ['COSTA', 'RICA'], side: 'left'  },
  { lat:  4.7,  lon:  -74.1, label: ['COLOMBIA'],      side: 'right' },
  { lat: -14.2, lon:  -51.9, label: ['BRAZIL'],        side: 'right' },
  { lat: 38.9,  lon:   35.2, label: ['TURKEY'],        side: 'left'  },
  { lat: 15.9,  lon:  100.9, label: ['THAILAND'],      side: 'right' },
  { lat: 35.9,  lon:  127.7, label: ['SOUTH', 'KOREA'],side: 'right' },
];

// Generate dense land dots with jitter — runs once at module load
function genDots(step) {
  const pts = [];
  const j = step * 0.38;
  for (const [la0, la1, lo0, lo1] of LAND_BOXES) {
    for (let la = la0; la <= la1; la += step)
      for (let lo = lo0; lo <= lo1; lo += step)
        pts.push([la + (Math.random() - 0.5) * j, lo + (Math.random() - 0.5) * j]);
  }
  return pts;
}
const LAND_DOTS = genDots(2.2);

// Orthographic projection → screen coords or null if behind globe
function orth(lat, lon, cosφ0, sinφ0, λ0, R, cx, cy) {
  const φ = lat * R2D, λ = lon * R2D, dλ = λ - λ0;
  const c = sinφ0 * Math.sin(φ) + cosφ0 * Math.cos(φ) * Math.cos(dλ);
  if (c < 0.03) return null;
  return {
    x: cx + R * Math.cos(φ) * Math.sin(dλ),
    y: cy - R * (cosφ0 * Math.sin(φ) - sinφ0 * Math.cos(φ) * Math.cos(dλ)),
    d: c,
  };
}

function hexToRgb(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}

export default function GlobeCanvas({ shieldState, size = 480 }) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const stateRef   = useRef(shieldState);

  // Keep stateRef current without restarting animation
  useEffect(() => { stateRef.current = shieldState; }, [shieldState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const S = size;
    canvas.width  = S * dpr;
    canvas.height = S * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cx = S / 2, cy = S / 2;
    const R  = S * 0.42;
    const φ0    = C_LAT * R2D;
    const cosφ0 = Math.cos(φ0), sinφ0 = Math.sin(φ0);

    let startTs = null;

    function frame(ts) {
      if (!startTs) startTs = ts;
      const el = ts - startTs;

      // Very slow rotation: ~1°/s
      const λ0 = C_LON * R2D + el * 0.000017;
      // Shield pulse
      const sPulse = 1 + Math.sin(el * 0.00258) * 0.046;
      // Shield color (reactive via ref)
      const sColor = stateRef.current?.shieldColor || '#C9A84C';
      const [sr, sg, sb] = hexToRgb(sColor);

      ctx.clearRect(0, 0, S, S);

      // ── Globe dark base ──
      const globeGrad = ctx.createRadialGradient(cx - R*0.18, cy - R*0.22, R*0.04, cx, cy, R);
      globeGrad.addColorStop(0, 'rgba(12,24,58,0.98)');
      globeGrad.addColorStop(0.55, 'rgba(5,13,36,1)');
      globeGrad.addColorStop(1, 'rgba(1,5,16,1)');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.fillStyle = globeGrad; ctx.fill();

      // ── Clip all land rendering inside globe circle ──
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI*2); ctx.clip();

      // Project land dots
      const vis = [];
      for (const [la, lo] of LAND_DOTS) {
        const p = orth(la, lo, cosφ0, sinφ0, λ0, R, cx, cy);
        if (p) vis.push(p);
      }

      // Sort by x for efficient O(n·k) mesh line pass
      vis.sort((a, b) => a.x - b.x);

      // ── Mesh / network lines ──
      ctx.lineWidth = 0.38;
      for (let i = 0; i < vis.length; i++) {
        const a = vis[i]; let cnt = 0;
        for (let j = i + 1; j < vis.length && cnt < 5; j++) {
          const b = vis[j];
          const dx = b.x - a.x;
          if (dx > 28) break;
          const dy = b.y - a.y;
          if (Math.abs(dy) > 28) continue;
          const d2 = dx*dx + dy*dy;
          if (d2 < 784) { // within 28px
            const alpha = Math.max(0.012, (0.14 - d2 / 5600) * Math.min(a.d, b.d) * 1.4);
            ctx.strokeStyle = `rgba(201,168,76,${alpha.toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            cnt++;
          }
        }
      }

      // ── Land dots ──
      for (const p of vis) {
        const alpha = 0.10 + p.d * 0.68;
        // Soft halo
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.8, 0, Math.PI*2);
        ctx.fillStyle = `rgba(201,168,76,${(alpha * 0.28).toFixed(2)})`; ctx.fill();
        // Core dot
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, Math.PI*2);
        ctx.fillStyle = `rgba(218,182,88,${alpha.toFixed(2)})`; ctx.fill();
      }

      ctx.restore(); // end globe clip

      // ── Globe edge rim glow ──
      const rimGrad = ctx.createRadialGradient(cx, cy, R*0.78, cx, cy, R*1.06);
      rimGrad.addColorStop(0, 'transparent');
      rimGrad.addColorStop(0.82, 'rgba(201,168,76,0.05)');
      rimGrad.addColorStop(1, 'rgba(201,168,76,0.24)');
      ctx.fillStyle = rimGrad;
      ctx.beginPath(); ctx.arc(cx, cy, R*1.06, 0, Math.PI*2); ctx.fill();

      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(201,168,76,0.52)'; ctx.lineWidth = 1.5; ctx.stroke();

      // Atmosphere rings
      ctx.beginPath(); ctx.arc(cx, cy, R + 11, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(201,168,76,0.12)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R + 23, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(201,168,76,0.05)'; ctx.lineWidth = 0.5; ctx.stroke();

      // ── Project country nodes ──
      const nodes = NODES.map(n => ({
        ...n, p: orth(n.lat, n.lon, cosφ0, sinφ0, λ0, R, cx, cy)
      })).filter(n => n.p && n.p.d > 0.10);

      // Arc lines from nodes to center shield
      const dashOff = (el / 22) % 22;
      for (const n of nodes) {
        const { x, y, d } = n.p;
        const cpx = (x + cx) / 2 + (y - cy) * 0.18;
        const cpy = (y + cy) / 2 - (x - cx) * 0.18;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.quadraticCurveTo(cpx, cpy, cx, cy - 4);
        ctx.strokeStyle = `rgba(201,168,76,${(d * 0.54).toFixed(2)})`;
        ctx.lineWidth = 0.9;
        ctx.setLineDash([7, 14]); ctx.lineDashOffset = -dashOff; ctx.stroke();
        ctx.setLineDash([]);
      }

      // Node glows + labels
      for (const n of nodes) {
        const { x, y, d } = n.p;
        // Outer halo
        const ng = ctx.createRadialGradient(x, y, 1, x, y, 20);
        ng.addColorStop(0, `rgba(201,168,76,${(d*0.54).toFixed(2)})`);
        ng.addColorStop(1, 'transparent');
        ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI*2); ctx.fill();
        // Ring
        ctx.beginPath(); ctx.arc(x, y, 8.5, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(201,168,76,${(d*0.38).toFixed(2)})`;
        ctx.lineWidth = 0.9; ctx.stroke();
        // Core dot
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,225,125,${d.toFixed(2)})`; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,252,210,0.97)'; ctx.fill();
        // Label
        if (d > 0.18) {
          ctx.font = 'bold 8px -apple-system,BlinkMacSystemFont,sans-serif';
          ctx.fillStyle = `rgba(255,220,115,${(d * 0.92).toFixed(2)})`;
          const isLeft = n.side === 'left';
          ctx.textAlign = isLeft ? 'right' : 'left';
          const lx = isLeft ? x - 13 : x + 13;
          for (let i = 0; i < n.label.length; i++)
            ctx.fillText(n.label[i], lx, y - (n.label.length - 1) * 5 + i * 10);
        }
      }

      // ── Central Shield ──
      const sx = cx, sy = cy - 5;
      const sw = 68, sh = 80;
      const sTop = sy - sh * 0.50;

      // Shield aura
      const aura = ctx.createRadialGradient(sx, sy, 4, sx, sy, 76);
      aura.addColorStop(0, `rgba(${sr},${sg},${sb},0.34)`);
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(sx, sy, 76, 0, Math.PI*2); ctx.fill();

      // Subtle ring halos
      ctx.beginPath(); ctx.arc(sx, sy, 56, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.14)`; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 68, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.07)`; ctx.lineWidth = 0.5; ctx.stroke();

      // Pulsing shield body
      ctx.save();
      ctx.translate(sx, sy); ctx.scale(sPulse, sPulse); ctx.translate(-sx, -sy);
      ctx.shadowBlur = 30; ctx.shadowColor = sColor;

      ctx.beginPath();
      ctx.moveTo(sx, sTop);
      ctx.lineTo(sx + sw/2, sTop + sh*0.16);
      ctx.lineTo(sx + sw/2, sTop + sh*0.62);
      ctx.bezierCurveTo(sx+sw/2, sTop+sh*0.83, sx, sTop+sh, sx, sTop+sh);
      ctx.bezierCurveTo(sx, sTop+sh, sx-sw/2, sTop+sh*0.83, sx-sw/2, sTop+sh*0.62);
      ctx.lineTo(sx - sw/2, sTop + sh*0.16);
      ctx.closePath();

      const shieldFill = ctx.createLinearGradient(sx, sTop, sx, sTop + sh);
      shieldFill.addColorStop(0, `rgba(${sr},${sg},${sb},0.96)`);
      shieldFill.addColorStop(0.45, `rgba(${sr},${sg},${sb},0.80)`);
      shieldFill.addColorStop(1, `rgba(${sr},${sg},${sb},0.55)`);
      ctx.fillStyle = shieldFill; ctx.fill();
      ctx.strokeStyle = sColor; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner dark depth tint
      const iw = sw * 0.80, ih = sh * 0.80, itop = sTop + sh * 0.10;
      ctx.beginPath();
      ctx.moveTo(sx, itop);
      ctx.lineTo(sx+iw/2, itop+ih*0.16); ctx.lineTo(sx+iw/2, itop+ih*0.62);
      ctx.bezierCurveTo(sx+iw/2, itop+ih*0.83, sx, itop+ih, sx, itop+ih);
      ctx.bezierCurveTo(sx, itop+ih, sx-iw/2, itop+ih*0.83, sx-iw/2, itop+ih*0.62);
      ctx.lineTo(sx-iw/2, itop+ih*0.16); ctx.closePath();
      ctx.fillStyle = 'rgba(3,10,28,0.38)'; ctx.fill();

      // ── Hands + Heart emblem ──
      const ex = sx, ey = sy + 14;
      ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.94)';

      // Left hand
      ctx.beginPath();
      ctx.moveTo(ex-19, ey+5);
      ctx.bezierCurveTo(ex-23, ey-1, ex-23, ey-11, ex-17, ey-15);
      ctx.bezierCurveTo(ex-13, ey-18, ex-9, ey-15, ex-8, ey-9);
      ctx.stroke();
      // Right hand
      ctx.beginPath();
      ctx.moveTo(ex+19, ey+5);
      ctx.bezierCurveTo(ex+23, ey-1, ex+23, ey-11, ex+17, ey-15);
      ctx.bezierCurveTo(ex+13, ey-18, ex+9, ey-15, ex+8, ey-9);
      ctx.stroke();
      // Cupped palms
      ctx.beginPath();
      ctx.moveTo(ex-19, ey+5);
      ctx.bezierCurveTo(ex-17, ey+17, ex, ey+21, ex, ey+21);
      ctx.bezierCurveTo(ex, ey+21, ex+17, ey+17, ex+19, ey+5);
      ctx.stroke();

      // Heart
      const hx = ex, hy = ey - 13;
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.beginPath();
      ctx.moveTo(hx, hy+12);
      ctx.bezierCurveTo(hx, hy+12, hx-14, hy+5, hx-14, hy-2);
      ctx.bezierCurveTo(hx-14, hy-9, hx-7, hy-14, hx, hy-6);
      ctx.bezierCurveTo(hx+7, hy-14, hx+14, hy-9, hx+14, hy-2);
      ctx.bezierCurveTo(hx+14, hy+5, hx, hy+12, hx, hy+12);
      ctx.fill();

      // Heart highlight
      ctx.beginPath();
      ctx.moveTo(hx-7, hy-6); ctx.bezierCurveTo(hx-10, hy-3, hx-10, hy+1, hx-7, hy+3);
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.62)`;
      ctx.lineWidth = 1.6; ctx.stroke();

      ctx.restore(); // end shield pulse scale

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [size]); // only restart if size changes

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        maxWidth: size,
        display: 'block',
        borderRadius: '50%',
        filter: 'drop-shadow(0 0 40px rgba(201,168,76,0.16))',
      }}
      aria-hidden="true"
    />
  );
}