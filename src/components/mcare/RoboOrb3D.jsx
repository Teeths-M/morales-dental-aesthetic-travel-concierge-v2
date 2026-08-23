// @ts-nocheck
/**
 * RoboOrb3D — the 4D robotic-head presence for M-Safe's hero instances.
 *
 * A real Three.js scene: a pearl sphere with a polished gold bezel framing a
 * glossy black visor, two amber-glowing pill eyes, a gold M-emblem on the
 * side ear, a layered dark base with concentric golden light rings, and
 * fine vertical golden particle streaks — lit by specular directional +
 * point lights, with parallax pointer/device tilt.
 *
 * Same { state, size, flashToken } props as LivingOrb.jsx, and the same
 * 8-state model (idle/listening/thinking/tool_executing/speaking/acting/
 * alert/offline) — each state drives eye-brightness, ring-speed, particle
 * speed, and the glow color, so the 3D head reflects the real chat state
 * exactly as the CSS orb did. Reduced motion → a single static render
 * (no rings/particles/tilt animation). Only mounted for hero-size
 * instances (>= 80px in LivingOrb, plus the homepage hero) — the small
 * 28/44px chat instances stay on the lightweight CSS orb.
 */
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const GOLD = 0xD4AF37;
const GOLD_BRIGHT = 0xFFD700;
const AMBER = 0xD97706;

// 3D state config — mirrors LivingOrb's STATE_CONFIG intent: each state tweaks
// eye intensity, ring rotation speed, particle speed, and the glow color.
const STATE_3D = {
  idle:           { eye: 1.6, ring: 0.18, particle: 0.10, sway: 0.06, glow: GOLD },
  listening:      { eye: 2.6, ring: 1.10, particle: 0.45, sway: 0.04, glow: GOLD_BRIGHT },
  thinking:       { eye: 1.9, ring: 0.55, particle: 0.25, sway: 0.10, glow: GOLD },
  tool_executing: { eye: 2.4, ring: 0.95, particle: 0.40, sway: 0.08, glow: GOLD_BRIGHT },
  speaking:       { eye: 2.8, ring: 1.40, particle: 0.50, sway: 0.05, glow: GOLD_BRIGHT },
  acting:         { eye: 1.8, ring: 0.45, particle: 0.30, sway: 0.07, glow: GOLD },
  alert:          { eye: 2.0, ring: 0.70, particle: 0.22, sway: 0.05, glow: AMBER },
  offline:        { eye: 0.5, ring: 0.05, particle: 0.03, sway: 0.02, glow: GOLD },
};

// ── Procedural canvas textures (no external assets) ──────────────────────
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0,    'rgba(255,215,0,1)');
  g.addColorStop(0.35, 'rgba(255,215,0,0.55)');
  g.addColorStop(1,    'rgba(255,215,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeParticleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0,   'rgba(255,224,130,1)');
  g.addColorStop(0.4, 'rgba(212,175,55,0.6)');
  g.addColorStop(1,   'rgba(212,175,55,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  // gold disc
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, '#F5D77A');
  g.addColorStop(0.6, '#D4AF37');
  g.addColorStop(1, '#9C7A1E');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  // amber M
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = 'rgba(255,215,0,0.9)';
  ctx.shadowBlur = 12;
  ctx.font = 'bold 84px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', 64, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function RoboOrb3D({ state = 'idle', size = 104, flashToken = 0 }) {
  const mountRef = useRef(null);
  const stateRef = useRef(STATE_3D[state] || STATE_3D.idle);
  const flashRef = useRef({ active: 0 }); // remaining seconds of flash
  const tiltRef = useRef({ tx: 0, ty: 0, cx: 0, cy: 0 });

  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // keep latest state config available to the animation loop without
  // rebuilding the scene
  useEffect(() => { stateRef.current = STATE_3D[state] || STATE_3D.idle; }, [state]);

  // flash trigger
  const lastFlashRef = useRef(flashToken);
  useEffect(() => {
    if (flashToken !== lastFlashRef.current) {
      lastFlashRef.current = flashToken;
      flashRef.current.active = 0.5; // 500ms pulse
    }
  }, [flashToken]);

  // parallax tilt — pointer (hover-capable) + best-effort deviceorientation,
  // same gates/behavior as LivingOrb.jsx (skip iOS permission prompt, calibrate
  // baseline, clamp to a few degrees).
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (canHover && !reducedMotion) {
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tiltRef.current.tx = py * -12;
        tiltRef.current.ty = px * 12;
      };
      const onLeave = () => { tiltRef.current.tx = 0; tiltRef.current.ty = 0; };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      return () => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      };
    }
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined' || !window.DeviceOrientationEvent) return;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') return; // iOS 13+ gate
    const baseline = { beta: null, gamma: null };
    const clamp = (v, max) => Math.max(-max, Math.min(max, v));
    const onOrient = (e) => {
      const beta = typeof e.beta === 'number' ? e.beta : null;
      const gamma = typeof e.gamma === 'number' ? e.gamma : null;
      if (beta === null || gamma === null) return;
      if (baseline.beta === null) { baseline.beta = beta; baseline.gamma = gamma; return; }
      tiltRef.current.tx = clamp((beta - baseline.beta) * -0.5, 10);
      tiltRef.current.ty = clamp((gamma - baseline.gamma) * 0.5, 10);
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [reducedMotion]);

  // ── scene setup (once) ─────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = size, H = size;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
    camera.position.set(0, 0.15, 3.4);
    camera.lookAt(0, -0.05, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ── lights ──
    scene.add(new THREE.AmbientLight(0x4a4a55, 0.7));
    const key = new THREE.DirectionalLight(0xfff2cc, 1.3);
    key.position.set(2.2, 2.6, 3.4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4af37, 1.0);
    rim.position.set(-3, 1.5, -3);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0x8899bb, 0.35);
    fill.position.set(-2, -1, 2);
    scene.add(fill);
    const faceGlow = new THREE.PointLight(0xffd700, 0.7, 6);
    faceGlow.position.set(0, 0.1, 1.6);
    scene.add(faceGlow);
    const baseGlow = new THREE.PointLight(0xd4af37, 1.1, 5);
    baseGlow.position.set(0, -1.25, 0.3);
    scene.add(baseGlow);

    // ── head group (tilts as one) ──
    const head = new THREE.Group();
    scene.add(head);

    // Pearl sphere
    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: 0xEAEAEA, metalness: 0.0, roughness: 0.38,
      clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.4,
    });
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), pearlMat);
    head.add(pearl);

    // Subtle panel-line seams (thin rings suggesting modular construction)
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a0, metalness: 0.4, roughness: 0.5, transparent: true, opacity: 0.5 });
    const seamA = new THREE.Mesh(new THREE.TorusGeometry(1.001, 0.006, 8, 80), seamMat);
    seamA.rotation.x = Math.PI / 2;
    head.add(seamA);
    const seamB = new THREE.Mesh(new THREE.TorusGeometry(1.001, 0.005, 8, 80), seamMat);
    seamB.rotation.x = Math.PI / 2.4;
    head.add(seamB);

    // Black glossy visor (flattened sphere, front-facing)
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0a0a, metalness: 0.2, roughness: 0.04,
      clearcoat: 1.0, clearcoatRoughness: 0.0,
    });
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.66, 48, 48), visorMat);
    visor.position.set(0, 0.02, 0.62);
    visor.scale.set(1, 1, 0.42);
    head.add(visor);

    // Gold bezel framing the visor (front-facing torus)
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37, metalness: 0.95, roughness: 0.28,
      emissive: 0x5a4300, emissiveIntensity: 0.18,
    });
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 20, 64), goldMat);
    bezel.position.set(0, 0.02, 0.95);
    head.add(bezel);

    // Inner gold ring (thinner, slightly forward) for layered depth
    const bezelInner = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.018, 16, 64), goldMat);
    bezelInner.position.set(0, 0.02, 1.06);
    head.add(bezelInner);

    // Eyes — two horizontal amber-glowing pills on the visor
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 2.4, roughness: 0.3, metalness: 0.0,
    });
    const eyeGeo = new THREE.SphereGeometry(0.1, 24, 24);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.scale.set(1.6, 0.5, 0.4);
    eyeL.position.set(-0.2, 0.06, 1.08);
    head.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.scale.set(1.6, 0.5, 0.4);
    eyeR.position.set(0.2, 0.06, 1.08);
    head.add(eyeR);

    // Eye glow sprites (additive halos)
    const glowTex = makeGlowTexture();
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffd700, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const glowL = new THREE.Sprite(glowMat.clone());
    glowL.scale.set(0.55, 0.55, 1);
    glowL.position.set(-0.2, 0.06, 1.14);
    head.add(glowL);
    const glowR = new THREE.Sprite(glowMat.clone());
    glowR.scale.set(0.55, 0.55, 1);
    glowR.position.set(0.2, 0.06, 1.14);
    head.add(glowR);

    // Gold M-emblem on the left side ear (screen-left = world -x)
    const mTex = makeMTexture();
    const earMat = new THREE.MeshStandardMaterial({ map: mTex, metalness: 0.85, roughness: 0.3, emissive: 0xffd700, emissiveIntensity: 0.25, emissiveMap: mTex });
    const earL = new THREE.Mesh(new THREE.CircleGeometry(0.26, 40), earMat);
    earL.position.set(-0.96, 0.02, 0);
    earL.rotation.y = Math.PI / 2; // face -x
    head.add(earL);
    // plain gold ear on the right
    const earR = new THREE.Mesh(new THREE.CircleGeometry(0.26, 40), goldMat);
    earR.position.set(0.96, 0.02, 0);
    earR.rotation.y = -Math.PI / 2; // face +x
    head.add(earR);

    // ── base (does not tilt — sits under the head) ──
    const baseGroup = new THREE.Group();
    scene.add(baseGroup);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x14171c, metalness: 0.85, roughness: 0.42 });
    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.18, 56), baseMat);
    baseDisc.position.set(0, -1.25, 0);
    baseGroup.add(baseDisc);
    const baseRim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.04, 18, 64), goldMat);
    baseRim.position.set(0, -1.18, 0);
    baseRim.rotation.x = Math.PI / 2;
    baseGroup.add(baseRim);

    // Concentric golden light rings on the base surface
    const ringMatBase = new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 1.6, metalness: 0.5, roughness: 0.3, transparent: true, opacity: 0.9 });
    const lightRings = [];
    [0.45, 0.68, 0.9].forEach((r, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 12, 64), ringMatBase.clone());
      ring.position.set(0, -1.155, 0);
      ring.rotation.x = Math.PI / 2;
      ring.userData.phase = i * 0.6;
      baseGroup.add(ring);
      lightRings.push(ring);
    });

    // ── particles ──
    const PARTICLE_COUNT = 46;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(PARTICLE_COUNT * 3);
    const pSpeed = new Float32Array(PARTICLE_COUNT);
    const pPhase = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.6 + Math.random() * 0.8;
      pPos[i * 3]     = Math.cos(ang) * rad;
      pPos[i * 3 + 1] = -1.1 + Math.random() * 2.2;
      pPos[i * 3 + 2] = Math.sin(ang) * rad;
      pSpeed[i] = 0.2 + Math.random() * 0.5;
      pPhase[i] = Math.random() * Math.PI * 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pTex = makeParticleTexture();
    const pMat = new THREE.PointsMaterial({
      map: pTex, size: 0.09, sizeAttenuation: true, transparent: true,
      color: 0xffd700, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── flash ring (barge-in) ──
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const flashRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.03, 16, 64), flashMat);
    scene.add(flashRing);

    // ── render loop ──
    let raf = 0;
    const clock = new THREE.Clock();
    let blinkUntil = 0;
    let nextBlink = 2 + Math.random() * 4;

    const render3D = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const cfg = stateRef.current;

      // parallax tilt (lerped)
      const tr = tiltRef.current;
      tr.cx += (tr.tx - tr.cx) * 0.08;
      tr.cy += (tr.ty - tr.cy) * 0.08;
      head.rotation.x = tr.cx * Math.PI / 180;
      head.rotation.y = tr.cy * Math.PI / 180 + Math.sin(t * 0.5) * cfg.sway; // gentle idle sway

      // eyes blink
      let blinkScale = 1;
      if (t > nextBlink && t < blinkUntil) {
        blinkScale = 0.12;
      } else if (t > blinkUntil) {
        nextBlink = t + 2.5 + Math.random() * 4.5;
        blinkUntil = nextBlink + 0.13;
      }
      eyeL.scale.y = 0.5 * blinkScale;
      eyeR.scale.y = 0.5 * blinkScale;
      eyeMat.emissiveIntensity = cfg.eye;
      glowL.material.opacity = 0.5 + Math.sin(t * 3) * 0.1;
      glowR.material.opacity = glowL.material.opacity;
      const glowColor = new THREE.Color(cfg.glow);
      faceGlow.color = glowColor;
      baseGlow.color = glowColor;
      faceGlow.intensity = 0.4 + cfg.eye * 0.18;

      // light rings
      lightRings.forEach((ring) => {
        const ph = ring.userData.phase;
        ring.material.emissiveIntensity = 1.0 + Math.sin(t * (1.5 + cfg.ring) + ph) * 0.7;
        ring.scale.setScalar(1 + Math.sin(t * (1.2 + cfg.ring) + ph) * 0.06);
        ring.rotation.z += cfg.ring * dt;
      });
      baseRim.rotation.z += cfg.ring * 0.5 * dt;

      // particles rise
      const arr = pGeo.attributes.position.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        arr[i * 3 + 1] += pSpeed[i] * cfg.particle * dt * 3;
        arr[i * 3] += Math.sin(t * 0.7 + pPhase[i]) * 0.0015;
        if (arr[i * 3 + 1] > 1.3) {
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.6 + Math.random() * 0.8;
          arr[i * 3]     = Math.cos(ang) * rad;
          arr[i * 3 + 1] = -1.1;
          arr[i * 3 + 2] = Math.sin(ang) * rad;
        }
      }
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity = 0.4 + Math.sin(t * 1.5) * 0.15 + 0.3;

      // bezel subtle shimmer
      bezel.material.emissiveIntensity = 0.12 + Math.sin(t * 1.8) * 0.08;

      // flash pulse
      if (flashRef.current.active > 0) {
        flashRef.current.active = Math.max(0, flashRef.current.active - dt);
        const p = 1 - flashRef.current.active / 0.5; // 0→1
        flashMat.opacity = (1 - p) * 0.9;
        flashRing.scale.setScalar(1 + p * 0.9);
        flashRing.rotation.z += dt * 3;
      } else {
        flashMat.opacity = 0;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render3D);
    };

    if (reducedMotion) {
      // single static frame — eyes open, no animation
      eyeMat.emissiveIntensity = STATE_3D[state]?.eye ?? 1.6;
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(render3D);
    }

    // ── cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      pGeo.dispose(); pMat.dispose(); pTex.dispose();
      glowTex.dispose();
      eyeGeo.dispose(); eyeMat.dispose();
      pearlMat.dispose(); pearl.geometry.dispose();
      visorMat.dispose(); visor.geometry.dispose();
      goldMat.dispose();
      bezel.geometry.dispose(); bezelInner.geometry.dispose();
      seamMat.dispose(); seamA.geometry.dispose(); seamB.geometry.dispose();
      earMat.dispose(); mTex.dispose(); earL.geometry.dispose(); earR.geometry.dispose();
      glowL.material.dispose(); glowR.material.dispose();
      baseMat.dispose(); baseDisc.geometry.dispose(); baseRim.geometry.dispose();
      lightRings.forEach(r => { r.material.dispose(); r.geometry.dispose(); });
      flashMat.dispose(); flashRing.geometry.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, reducedMotion]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}
    />
  );
}