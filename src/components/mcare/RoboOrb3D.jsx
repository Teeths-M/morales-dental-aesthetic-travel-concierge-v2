// @ts-nocheck
/**
 * RoboOrb3D — the 4D premium robotic presence for M-Safe's hero instances.
 *
 * A real Three.js scene: a satin pearl-metallic spherical shell with a deep
 * glossy black recessed visor framed by a specular gold bezel, two glowing
 * gold "eye" light-bars on the visor, a Morales gold "M" badge on the shell
 * itself (not inside the visor), five concentric glowing gold energy rings
 * rippling outward at the base, ambient amber atmospheric particles plus a
 * flowing comet-trail particle stream wrapping the lower shell, and
 * cinematic studio lighting — all on a deep charcoal-to-black gradient
 * background.
 *
 * 2026-08-23 fix, part 3: the two "eyes"/side "M" badge/comet trail above
 * are a deliberate reversal of this file's earlier "FACELESS by design: no
 * eyes, no visor, no mouth" stance. Portia supplied the actual target
 * reference image directly this round (rather than a text description of
 * one) — it unambiguously shows a two-eye visor face and a side M badge, so
 * that concrete, current reference takes priority over the earlier
 * text-only "faceless" interpretation of the same underlying design intent.
 *
 * Same { state, size, flashToken } props and 8-state model as LivingOrb:
 * idle / listening / thinking / tool_executing / speaking / acting / alert /
 * offline. Each state drives core-glow intensity, energy-ring speed,
 * particle speed, the glow tint, the proactive notification dot, and the
 * three amber "intelligent activity" pulses inside the dark core (thinking +
 * tool_executing only). Reduced motion → a single static render.
 *
 * Only mounted for hero-size instances (≥ 80px via LivingOrb, plus the
 * homepage hero via LivingMOrb) — the small 28/44px chat instances stay on
 * the CSS orb.
 *
 * 2026-08-23 fix, part 1: the pearl shell used to be a closed, un-cut sphere,
 * which silently occluded the entire recessed core/bezel/M/glow assembly (a
 * live render showed nothing but a bare gold ring around a plain pale disc —
 * the bezel ring was the only thing whose radius/z happened to poke past the
 * sphere's own front surface). The shell geometry now has a real cavity cut
 * facing the camera (a rotated polar cap, sized to the bezel's own radius),
 * plus a real procedural environment map (RoomEnvironment) so the
 * metalness:1.0 gold surfaces actually reflect instead of rendering flat.
 *
 * 2026-08-23 fix, part 2: the cavity fix immediately exposed a second,
 * equally real problem — a live screenshot showed the whole sphere as a
 * near-uniform glowing amber ball, four compounding causes: no OutputPass
 * terminating the composer (bloom's raw output was going straight to the
 * canvas with no final tonemap step — now added), a bloom threshold low
 * enough to catch ordinarily-lit geometry, not just genuinely emissive bits
 * (raised), the two core-area point lights illuminating the whole front
 * hemisphere rather than just the cavity (pulled back in both intensity and
 * falloff distance), and the panel-seam torus rings reading as a visible
 * grid once everything got brighter (removed — no counterpart in the
 * reference image's clean, seamless shell anyway).
 */
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const GOLD = 0xD4AF37;
const GOLD_BRIGHT = 0xFFD700;
const AMBER = 0xFFC107;

// 3D state config — each state tweaks core glow, ring speed, particle
// speed, sway, glow color, whether the three activity pulses show, and
// whether the proactive notification dot shows.
const STATE_3D = {
  idle:           { core: 1.4, ring: 0.18, particle: 0.10, sway: 0.06, glow: GOLD,        pulses: false, notify: false },
  listening:      { core: 2.2, ring: 1.10, particle: 0.45, sway: 0.04, glow: GOLD_BRIGHT, pulses: false, notify: false },
  thinking:       { core: 1.9, ring: 0.55, particle: 0.25, sway: 0.10, glow: GOLD,        pulses: true,  notify: false },
  tool_executing: { core: 2.4, ring: 0.95, particle: 0.40, sway: 0.08, glow: GOLD_BRIGHT, pulses: true,  notify: false },
  speaking:       { core: 2.6, ring: 1.40, particle: 0.50, sway: 0.05, glow: GOLD_BRIGHT, pulses: false, notify: false },
  acting:         { core: 1.8, ring: 0.45, particle: 0.30, sway: 0.07, glow: GOLD,        pulses: false, notify: true  },
  alert:          { core: 2.0, ring: 0.70, particle: 0.22, sway: 0.05, glow: AMBER,       pulses: false, notify: false },
  offline:        { core: 0.6, ring: 0.05, particle: 0.03, sway: 0.02, glow: GOLD,        pulses: false, notify: false },
};

// ── Procedural canvas textures (no external assets) ──────────────────────
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,193,7,1)');
  g.addColorStop(0.35, 'rgba(255,179,0,0.6)');
  g.addColorStop(1, 'rgba(255,179,0,0)');
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
  g.addColorStop(0, 'rgba(255,224,130,1)');
  g.addColorStop(0.4, 'rgba(255,193,7,0.65)');
  g.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Gold "M" emblem on a transparent background — rendered additively so it
// glows gold against the black core.
function makeMTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = 'rgba(255,215,0,0.95)';
  ctx.shadowBlur = 22;
  ctx.font = 'bold 175px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', 128, 134);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Deep charcoal-to-black radial gradient background.
function makeBackgroundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 110, 20, 128, 128, 180);
  g.addColorStop(0, '#1c1c20');
  g.addColorStop(0.5, '#101012');
  g.addColorStop(1, '#050506');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function RoboOrb3D({ state = 'idle', size = 104, flashToken = 0 }) {
  const mountRef = useRef(null);
  const stateRef = useRef(STATE_3D[state] || STATE_3D.idle);
  const flashRef = useRef({ active: 0 });
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

  useEffect(() => { stateRef.current = STATE_3D[state] || STATE_3D.idle; }, [state]);

  const lastFlashRef = useRef(flashToken);
  useEffect(() => {
    if (flashToken !== lastFlashRef.current) {
      lastFlashRef.current = flashToken;
      flashRef.current.active = 0.5;
    }
  }, [flashToken]);

  // parallax tilt — pointer (hover-capable) + best-effort deviceorientation.
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
        tiltRef.current.tx = py * -10;
        tiltRef.current.ty = px * 10;
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
      tiltRef.current.tx = clamp((beta - baseline.beta) * -0.4, 8);
      tiltRef.current.ty = clamp((gamma - baseline.gamma) * 0.4, 8);
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    // Real environment map — without one, metalness:1.0 materials (the gold
    // bezel/rim/rings) derive almost all their visible brightness from
    // reflected environment light, not direct lighting, and render dull/flat
    // under point/directional lights alone. RoomEnvironment is Three.js's own
    // standard procedural studio env for exactly this (showcase-quality
    // metal/clearcoat with no real HDRI asset available — no image-generation
    // tool exists in this environment either).
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    // Real bloom, replacing the additive-sprite-only "fake glow" every ring/
    // core-glow/particle currently relies on. Threshold raised well past the
    // first-pass 0.25 (which bloomed nearly the whole lit shell, not just the
    // genuinely emissive bits — confirmed against a live screenshot showing
    // the entire sphere as a uniform amber glow) so only real emissive/
    // additive elements catch it, not ordinarily-lit pearl. Strength/radius
    // pulled back to match. Still a tuning, not a final answer — needs
    // another real look on a real screen.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.4, 0.75);
    composer.addPass(bloomPass);
    // Terminates the composer chain with the renderer's own tonemapping/
    // color-space conversion applied exactly once. Without this, bloom writes
    // its raw (un-tonemapped) output straight to the canvas as the last step
    // — the actual root cause of the whole-sphere amber wash-out: never
    // properly tonemapped down before display.
    composer.addPass(new OutputPass());

    // ── dark gradient background (back plane) ──
    const bgTex = makeBackgroundTexture();
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, depthWrite: false });
    const bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), bgMat);
    bgPlane.position.set(0, 0, -3.5);
    scene.add(bgPlane);

    // ── lights (high-contrast studio) ──
    scene.add(new THREE.AmbientLight(0x3a3a44, 0.5));
    const key = new THREE.DirectionalLight(0xfff4d6, 1.5);
    key.position.set(2.4, 2.8, 3.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4af37, 1.2);
    rim.position.set(-3.2, 1.6, -3);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0x7788aa, 0.28);
    fill.position.set(-2, -1, 2);
    scene.add(fill);
    const topSpot = new THREE.DirectionalLight(0xffffff, 0.85);
    topSpot.position.set(0, 4, 2);
    scene.add(topSpot);
    // Both point lights pulled back from lighting the whole front hemisphere
    // (their old distance/intensity flooded the pearl shell around the
    // cavity, not just the cavity itself — the actual reason the "dark"
    // core material never read as dark) to a contained, local accent.
    const coreGlow = new THREE.PointLight(0xffb300, 0.55, 2.5);
    coreGlow.position.set(0, 0.05, 1.5);
    scene.add(coreGlow);
    const baseGlow = new THREE.PointLight(0xd4af37, 0.65, 2.5);
    baseGlow.position.set(0, -1.25, 0.3);
    scene.add(baseGlow);

    // ── head group (tilts as one) ──
    const head = new THREE.Group();
    scene.add(head);

    // Satin pearl-white shell (#F0F0F0) — a REAL cavity is cut facing the
    // camera, not a closed sphere. The camera looks down -z; a full sphere's
    // own front surface at radius r sits at z = sqrt(1 - r^2), which is
    // >=0.751 for every r <= 0.66 (the core disc's own radius) — in front of
    // every "recessed" element below (all placed at flat z 0.74-0.9). A
    // closed sphere there was silently hiding the entire core/bezel/M/glow
    // assembly behind solid geometry — the bezel ring (radius 0.7, z=0.82)
    // was the only thing that happened to poke past the sphere's local
    // surface, which is exactly why a live render showed nothing but a gold
    // ring around a plain pale disc. Cutting a real polar cap (capAngle =
    // asin(0.7), matching the bezel's own radius) and rotating it to face +z
    // instead of the sphere's default +y pole opens a genuine hole for the
    // whole recessed assembly to actually be visible through.
    const capAngle = Math.asin(0.7);
    const pearlGeo = new THREE.SphereGeometry(1, 64, 64, 0, Math.PI * 2, capAngle, Math.PI - capAngle);
    pearlGeo.rotateX(Math.PI / 2);
    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: 0xEFEFEF, metalness: 0.0, roughness: 0.42,
      clearcoat: 0.5, clearcoatRoughness: 0.35, sheen: 0.5, sheenColor: 0xffffff,
    });
    const pearl = new THREE.Mesh(pearlGeo, pearlMat);
    head.add(pearl);
    // Panel-line seams (three thin torus rings wrapping the shell) removed —
    // they read as a barely-visible accent in isolation, but once real
    // lighting/bloom brightened the scene they showed up as a distinct
    // crossing grid the reference image's clean, seamless shell doesn't have.

    // ── recessed dark glass visor (the eye capsules mount on this face below) ──
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x06070a, metalness: 0.35, roughness: 0.05,
      clearcoat: 1.0, clearcoatRoughness: 0.0,
    });
    const coreDisc = new THREE.Mesh(new THREE.CircleGeometry(0.66, 56), coreMat);
    coreDisc.position.set(0, 0.02, 0.74);
    head.add(coreDisc);

    // Subtle inner-depth ring at the core's edge (a thin dark trough)
    const coreTrough = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.012, 14, 56), new THREE.MeshStandardMaterial({ color: 0x040506, metalness: 0.6, roughness: 0.4 }));
    coreTrough.position.set(0, 0.02, 0.75);
    head.add(coreTrough);

    // Gold bezel framing the core (raised specular rim)
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xD4AF37, metalness: 1.0, roughness: 0.22,
      clearcoat: 0.8, clearcoatRoughness: 0.12,
      emissive: 0x5a4300, emissiveIntensity: 0.18,
      specularIntensity: 1.0,
    });
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 20, 72), goldMat);
    bezel.position.set(0, 0.02, 0.82);
    head.add(bezel);
    const bezelInner = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.018, 14, 56), goldMat);
    bezelInner.position.set(0, 0.02, 0.84);
    head.add(bezelInner);

    // Core backlight glow sprite (state-tinted, replaces the old eye glow)
    const glowTex = makeGlowTexture();
    const coreGlowSpriteMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffb300, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const coreGlowSprite = new THREE.Sprite(coreGlowSpriteMat);
    // Shrunk from 1.5x1.5 — it was tuned back when this sprite was the ONLY
    // visible detail in the cavity; now that the cavity actually shows real
    // recessed geometry (core disc, bezel, M), a sprite that large just
    // floods the whole opening instead of reading as a subtle ambient glow.
    coreGlowSprite.scale.set(0.9, 0.9, 1);
    coreGlowSprite.position.set(0, 0.02, 0.9);
    head.add(coreGlowSprite);

    // Two glowing horizontal "eye" capsules on the visor — a friendly
    // closed-eye/light-bar look, matching the reference image directly (see
    // the top-of-file doc comment for the reversal note). Both eyes share
    // one material (always identical), each gets its own backing glow
    // sprite (reusing the same makeGlowTexture() billboard technique the
    // core glow already uses) so bloom actually picks them up individually.
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFFC107, emissive: 0xFFB300, emissiveIntensity: 2.2, roughness: 0.25 });
    const eyeGeo = new THREE.CapsuleGeometry(0.07, 0.22, 4, 12);
    eyeGeo.rotateZ(Math.PI / 2);
    const eyeGlowTex = makeGlowTexture();
    const eyes = [-0.16, 0.16].map((x) => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, -0.03, 0.78);
      head.add(eye);
      const glowMat = new THREE.SpriteMaterial({ map: eyeGlowTex, color: 0xffb300, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 });
      const glow = new THREE.Sprite(glowMat);
      glow.scale.set(0.4, 0.28, 1);
      glow.position.set(x, -0.03, 0.82);
      head.add(glow);
      return { glowMat };
    });

    // Side "M" badge on the pearl shell itself (not inside the visor) — a
    // small gold-ringed disc, positioned and oriented flush against the
    // shell's own curvature. PlaneGeometry/CircleGeometry face local +Z by
    // default; Object3D.lookAt() points local -Z at its target, so aiming
    // the badge back at the origin makes local +Z (the mesh-facing side)
    // point outward along this point's own sphere normal — it reads as
    // embedded in the shell rather than a decal floating in front of it.
    const mTex = makeMTexture();
    const mMat = new THREE.MeshBasicMaterial({ map: mTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const badge = new THREE.Group();
    const badgePos = new THREE.Vector3(-0.62, 0.05, 0.42);
    badge.position.copy(badgePos);
    badge.lookAt(0, 0, 0);
    const badgeBackMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0b0d, metalness: 0.3, roughness: 0.15, clearcoat: 1.0 });
    const badgeBack = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), badgeBackMat);
    badge.add(badgeBack);
    const badgeRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 12, 40), goldMat);
    badge.add(badgeRing);
    const mBadgePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), mMat);
    mBadgePlane.position.set(0, 0, 0.005);
    badge.add(mBadgePlane);
    head.add(badge);

    // Three amber "intelligent activity" pulses inside the core — shown only
    // for thinking / tool_executing (never faked). Positioned in the lower
    // third of the visor, beneath the eye capsules.
    const pulseMat = new THREE.MeshStandardMaterial({ color: 0xFFC107, emissive: 0xFFB300, emissiveIntensity: 3.0, roughness: 0.25 });
    const pulseGeo = new THREE.SphereGeometry(0.028, 16, 16);
    const pulses = [];
    [-0.13, 0, 0.13].forEach((x, i) => {
      const p = new THREE.Mesh(pulseGeo, pulseMat);
      p.position.set(x, -0.26, 0.8);
      p.visible = false;
      p.userData.phase = i * 0.35;
      head.add(p);
      pulses.push(p);
    });

    // Proactive notification dot (acting state only)
    const notifyMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 2.5, roughness: 0.3 });
    const notifyDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), notifyMat);
    notifyDot.position.set(0.62, 0.62, 0.6);
    notifyDot.visible = false;
    head.add(notifyDot);

    // ── base (does not tilt — sits under the head) ──
    const baseGroup = new THREE.Group();
    scene.add(baseGroup);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x121418, metalness: 0.85, roughness: 0.45 });
    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.18, 56), baseMat);
    baseDisc.position.set(0, -1.25, 0);
    baseGroup.add(baseDisc);
    const baseRim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.04, 18, 64), goldMat);
    baseRim.position.set(0, -1.18, 0);
    baseRim.rotation.x = Math.PI / 2;
    baseGroup.add(baseRim);

    // Concentric golden glowing energy rings rippling outward at the base
    const ringMatBase = new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xFFC107, emissiveIntensity: 2.0, metalness: 0.5, roughness: 0.28, transparent: true, opacity: 0.92 });
    const lightRings = [];
    [0.3, 0.48, 0.66, 0.84, 1.0].forEach((r, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.013, 12, 72), ringMatBase.clone());
      ring.position.set(0, -1.155, 0);
      ring.rotation.x = Math.PI / 2;
      ring.userData.phase = i * 0.5;
      baseGroup.add(ring);
      lightRings.push(ring);
    });

    // ── atmospheric particles (amber gold sparks, upper periphery) ──
    const PARTICLE_COUNT = 48;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(PARTICLE_COUNT * 3);
    const pSpeed = new Float32Array(PARTICLE_COUNT);
    const pPhase = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.7 + Math.random() * 0.8;
      pPos[i * 3] = Math.cos(ang) * rad;
      pPos[i * 3 + 1] = 0.1 + Math.random() * 1.6;
      pPos[i * 3 + 2] = Math.sin(ang) * rad;
      pSpeed[i] = 0.2 + Math.random() * 0.5;
      pPhase[i] = Math.random() * Math.PI * 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pTex = makeParticleTexture();
    const pMat = new THREE.PointsMaterial({
      map: pTex, size: 0.1, sizeAttenuation: true, transparent: true,
      color: 0xFFC107, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── comet-trail particle stream (wraps the lower-left of the shell) ──
    // A second, independent particle group riding a fixed arc — not the
    // ambient upward drift above — matching the reference image's flowing
    // gold streak. Freshness (near the "head" of the arc) reads brightest;
    // the tail fades. PointsMaterial has no per-point opacity, so per-vertex
    // color intensity stands in for it under additive blending (a dimmer
    // color contributes less, reading as more transparent).
    const TRAIL_COUNT = 30;
    const trailPoint = (tt) => {
      // Sweeps ~207° around the lower-left of the shell, dipping toward
      // the base at the midpoint of the arc.
      const ang = Math.PI * 0.55 + tt * Math.PI * 1.15;
      const rx = 1.05, rz = 0.85;
      return [Math.cos(ang) * rx, -0.35 - Math.sin(tt * Math.PI) * 0.75, Math.sin(ang) * rz];
    };
    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(TRAIL_COUNT * 3);
    const trailCol = new Float32Array(TRAIL_COUNT * 3);
    const trailT = new Float32Array(TRAIL_COUNT);
    for (let i = 0; i < TRAIL_COUNT; i++) {
      trailT[i] = i / TRAIL_COUNT;
      const [x, y, z] = trailPoint(trailT[i]);
      trailPos[i * 3] = x; trailPos[i * 3 + 1] = y; trailPos[i * 3 + 2] = z;
      const fade = (1 - trailT[i]) * 0.9 + 0.05;
      trailCol[i * 3] = fade; trailCol[i * 3 + 1] = fade * 0.76; trailCol[i * 3 + 2] = fade * 0.2;
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    const trailTex = makeParticleTexture();
    const trailMat = new THREE.PointsMaterial({
      map: trailTex, size: 0.1, sizeAttenuation: true, transparent: true,
      vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    });
    const trailParticles = new THREE.Points(trailGeo, trailMat);
    scene.add(trailParticles);
    let trailPhase = 0;

    // ── flash ring (barge-in) ──
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffc107, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const flashRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.03, 16, 64), flashMat);
    scene.add(flashRing);

    // ── render loop ──
    let raf = 0;
    const clock = new THREE.Clock();

    const render3D = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const cfg = stateRef.current;

      // parallax tilt (lerped)
      const tr = tiltRef.current;
      tr.cx += (tr.tx - tr.cx) * 0.08;
      tr.cy += (tr.ty - tr.cy) * 0.08;
      head.rotation.x = tr.cx * Math.PI / 180;
      head.rotation.y = tr.cy * Math.PI / 180 + Math.sin(t * 0.5) * cfg.sway;

      // core glow + backlight tint
      const glowColor = new THREE.Color(cfg.glow);
      coreGlow.color = glowColor;
      baseGlow.color = glowColor;
      // Scaled down to match the contained constructor-time intensity above
      // (this line overwrites it every frame — the old 0.5 + cfg.core*0.3
      // formula alone was enough to flood the shell regardless of the
      // constructor value).
      coreGlow.intensity = 0.2 + cfg.core * 0.12;
      const corePulse = 0.5 + Math.sin(t * (1.5 + cfg.core)) * 0.18;
      coreGlowSpriteMat.opacity = Math.min(0.55, 0.2 + cfg.core * 0.1) * corePulse;
      coreGlowSpriteMat.color = glowColor;
      // eye glow follows core state color/intensity (shared material —
      // both eyes always match; each glow sprite still gets its own tint/
      // opacity so bloom picks up both individually)
      eyeMat.emissiveIntensity = 1.6 + cfg.core * 0.5 + Math.sin(t * 2.2) * 0.4;
      eyes.forEach(({ glowMat }) => {
        glowMat.color = glowColor;
        glowMat.opacity = Math.min(0.7, 0.3 + cfg.core * 0.12) * corePulse;
      });
      // side M badge brightness follows core glow gently (same formula the
      // old centered emblem used, now applied to the side badge instead)
      mMat.opacity = 0.7 + Math.sin(t * 1.2) * 0.08 + (cfg.core > 2 ? 0.12 : 0);
      // bezel shimmer
      bezel.material.emissiveIntensity = 0.14 + Math.sin(t * 1.8) * 0.07;

      // three activity pulses — thinking / tool_executing only
      const showPulses = cfg.pulses;
      pulses.forEach((p) => {
        p.visible = showPulses;
        if (showPulses) {
          const ph = p.userData.phase;
          const s = 0.6 + Math.sin(t * (cfg.ring > 0.8 ? 4 : 2.8) + ph) * 0.5;
          p.scale.setScalar(Math.max(0.2, s));
          pulseMat.emissiveIntensity = 2.2 + Math.sin(t * (cfg.ring > 0.8 ? 4 : 2.8) + ph) * 1.6;
        }
      });

      // proactive notification dot
      notifyDot.visible = cfg.notify;
      if (cfg.notify) {
        notifyMat.emissiveIntensity = 2.0 + Math.sin(t * 2.5) * 1.2;
      }

      // energy rings ripple
      lightRings.forEach((ring) => {
        const ph = ring.userData.phase;
        ring.material.emissiveIntensity = 1.4 + Math.sin(t * (1.5 + cfg.ring) + ph) * 0.9;
        ring.scale.setScalar(1 + Math.sin(t * (1.2 + cfg.ring) + ph) * 0.06);
        ring.rotation.z += cfg.ring * dt;
      });
      baseRim.rotation.z += cfg.ring * 0.5 * dt;

      // particles drift
      const arr = pGeo.attributes.position.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        arr[i * 3 + 1] += pSpeed[i] * cfg.particle * dt * 3;
        arr[i * 3] += Math.sin(t * 0.7 + pPhase[i]) * 0.0015;
        if (arr[i * 3 + 1] > 1.7) {
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.7 + Math.random() * 0.8;
          arr[i * 3] = Math.cos(ang) * rad;
          arr[i * 3 + 1] = 0.1;
          arr[i * 3 + 2] = Math.sin(ang) * rad;
        }
      }
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity = 0.45 + Math.sin(t * 1.5) * 0.15 + 0.3;

      // comet trail sweeps along its fixed arc
      trailPhase = (trailPhase + dt * (0.12 + cfg.particle * 0.25)) % 1;
      const trPosArr = trailGeo.attributes.position.array;
      const trColArr = trailGeo.attributes.color.array;
      for (let i = 0; i < TRAIL_COUNT; i++) {
        const tt = (trailT[i] + trailPhase) % 1;
        const [x, y, z] = trailPoint(tt);
        trPosArr[i * 3] = x; trPosArr[i * 3 + 1] = y; trPosArr[i * 3 + 2] = z;
        const fade = (1 - tt) * 0.9 + 0.05;
        trColArr[i * 3] = fade; trColArr[i * 3 + 1] = fade * 0.76; trColArr[i * 3 + 2] = fade * 0.2;
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.color.needsUpdate = true;

      // flash pulse (barge-in)
      if (flashRef.current.active > 0) {
        flashRef.current.active = Math.max(0, flashRef.current.active - dt);
        const p = 1 - flashRef.current.active / 0.5;
        flashMat.opacity = (1 - p) * 0.9;
        flashRing.scale.setScalar(1 + p * 0.9);
        flashRing.rotation.z += dt * 3;
      } else {
        flashMat.opacity = 0;
      }

      composer.render();
      raf = requestAnimationFrame(render3D);
    };

    if (reducedMotion) {
      coreGlowSpriteMat.opacity = 0.4;
      composer.render();
    } else {
      raf = requestAnimationFrame(render3D);
    }

    // ── cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      composer.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      pGeo.dispose(); pMat.dispose(); pTex.dispose();
      trailGeo.dispose(); trailMat.dispose(); trailTex.dispose();
      glowTex.dispose(); coreGlowSpriteMat.dispose();
      mMat.dispose(); mTex.dispose(); mBadgePlane.geometry.dispose();
      badgeBackMat.dispose(); badgeBack.geometry.dispose(); badgeRing.geometry.dispose();
      eyeGeo.dispose(); eyeMat.dispose(); eyeGlowTex.dispose();
      eyes.forEach(({ glowMat }) => glowMat.dispose());
      pulseGeo.dispose(); pulseMat.dispose();
      notifyMat.dispose(); notifyDot.geometry.dispose();
      pearlMat.dispose(); pearl.geometry.dispose();
      coreMat.dispose(); coreDisc.geometry.dispose();
      coreTrough.geometry.dispose(); coreTrough.material.dispose();
      goldMat.dispose();
      bezel.geometry.dispose(); bezelInner.geometry.dispose();
      baseMat.dispose(); baseDisc.geometry.dispose(); baseRim.geometry.dispose();
      lightRings.forEach(r => { r.material.dispose(); r.geometry.dispose(); });
      flashMat.dispose(); flashRing.geometry.dispose();
      bgMat.dispose(); bgTex.dispose(); bgPlane.geometry.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, reducedMotion]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ width: size, height: size, flexShrink: 0, position: 'relative', borderRadius: '50%', overflow: 'hidden' }}
    />
  );
}