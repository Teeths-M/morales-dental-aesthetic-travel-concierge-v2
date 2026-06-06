import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = '#c9a84c';

const LOCATIONS = [
  { name: 'Mexico',      lat: 23.6,  lng: -102.5 },
  { name: 'Brazil',      lat: -14.2, lng: -51.9  },
  { name: 'Colombia',    lat:   4.7, lng:  -74.1 },
  { name: 'Costa Rica',  lat:   9.7, lng:  -83.8 },
  { name: 'Venezuela',   lat:   6.4, lng:  -66.6 },
  { name: 'Turkey',      lat:  38.9, lng:   35.2 },
  { name: 'Thailand',    lat:  15.9, lng:  100.9 },
  { name: 'South Korea', lat:  35.9, lng:  127.8 },
];

const ARCS = [
  [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [2, 4],
  [0, 5], [5, 6], [5, 7], [6, 7], [1, 5],
];

const LABEL_POSITIONS = [
  { name: 'Mexico',      x: -38, y: -25, side: 'left'  },
  { name: 'Brazil',      x:  38, y:  30, side: 'right' },
  { name: 'Colombia',    x: -42, y:   5, side: 'left'  },
  { name: 'Costa Rica',  x: -46, y:  10, side: 'left'  },
  { name: 'Venezuela',   x:  40, y:  -5, side: 'right' },
  { name: 'Turkey',      x:  42, y: -28, side: 'right' },
  { name: 'Thailand',    x:  44, y:   0, side: 'right' },
  { name: 'South Korea', x:  46, y: -20, side: 'right' },
];

export const SHIELD_STATES = [
  {
    key: 'green',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.9)',
    title: "You're Protected",
    sub: 'Your care journey appears compatible.',
    badge: 'Scan complete • All systems safe',
  },
  {
    key: 'yellow',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.9)',
    title: 'Enhanced Review',
    sub: 'Recovery compatibility may require provider review.',
    badge: 'Advisory active • Review recommended',
  },
  {
    key: 'red',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.9)',
    title: 'Attention Required',
    sub: 'Please consult with our care team before proceeding.',
    badge: 'Consultation required • Care team notified',
  },
];

// Random duration between 8-15 seconds
function randDuration() {
  return 8000 + Math.random() * 7000;
}

function HeartHandsIcon({ color }) {
  return (
    <svg width="52" height="52" viewBox="0 0 48 48" fill="none">
      <path
        d="M24 4L6 11v11c0 10.5 7.5 20.3 18 22.5C34.5 42.3 42 32.5 42 22V11L24 4Z"
        fill={`${color}22`}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16 28c0 0 1-2 3-2s2.5 1 3 2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M26 28c0 0 1-2 3-2s2.5 1 3 2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M24 32s-6-4-6-8.5C18 21 19.5 20 21 20c1 0 2 .7 3 1.5C25 20.7 26 20 27 20c1.5 0 3 1 3 3.5C30 28 24 32 24 32z"
        fill={color}
        opacity="0.92"
      />
    </svg>
  );
}

export default function GlobeVisualization({ onStateChange }) {
  const containerRef = useRef(null);
  const mountRef = useRef(null);
  const rootRef = useRef(null);
  const [stateIdx, setStateIdx] = useState(0);
  const [scanning, setScanning] = useState(false);
  const timerRef = useRef(null);

  const advanceState = useCallback(() => {
    setScanning(true);
    setTimeout(() => {
      setStateIdx(i => {
        const next = (i + 1) % SHIELD_STATES.length;
        onStateChange && onStateChange(SHIELD_STATES[next]);
        return next;
      });
      setScanning(false);
    }, 900);
  }, [onStateChange]);

  useEffect(() => {
    onStateChange && onStateChange(SHIELD_STATES[0]);
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        advanceState();
        schedule();
      }, randDuration());
    };
    schedule();
    return () => clearTimeout(timerRef.current);
  }, [advanceState, onStateChange]);

  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      const GlobeGL = (await import('react-globe.gl')).default;
      const ReactDOM = await import('react-dom/client');
      const ReactLib = await import('react');

      if (destroyed || !containerRef.current) return;

      const mount = document.createElement('div');
      mount.style.cssText = 'width:100%;height:100%;';
      containerRef.current.appendChild(mount);
      mountRef.current = mount;

      const arcsData = ARCS.map(([i, j]) => ({
        startLat: LOCATIONS[i].lat,
        startLng: LOCATIONS[i].lng,
        endLat:   LOCATIONS[j].lat,
        endLng:   LOCATIONS[j].lng,
      }));

      const w = containerRef.current.offsetWidth  || 718;
      const h = containerRef.current.offsetHeight || 718;

      const root = ReactDOM.createRoot(mount);
      rootRef.current = root;

      const globeEl = ReactLib.createElement(GlobeGL, {
        width: w,
        height: h,
        backgroundColor: 'rgba(0,0,0,0)',
        globeImageUrl: 'https://unpkg.com/three-globe@2.31.2/example/img/earth-night.jpg',
        bumpImageUrl:  'https://unpkg.com/three-globe@2.31.2/example/img/earth-topology.png',
        atmosphereColor: GOLD,
        atmosphereAltitude: 0.35,
        pointOfView: { lat: 5, lng: -60, altitude: 1.8 },

        pointsData: LOCATIONS,
        pointLat: 'lat',
        pointLng: 'lng',
        pointColor: () => GOLD,
        pointAltitude: 0.04,
        pointRadius: 1.5,
        pointsMerge: false,
        pointResolution: 24,

        arcsData,
        arcColor: () => GOLD,
        arcAltitude: 0.25,
        arcStroke: 0.65,
        arcDashLength: 0.55,
        arcDashGap: 0.2,
        arcDashAnimateTime: 2800,

        labelsData: LOCATIONS,
        labelLat: 'lat',
        labelLng: 'lng',
        labelText: 'name',
        labelSize: 1.6,
        labelColor: () => 'rgba(255,255,255,0.7)',
        labelAltitude: 0.06,
        labelDotRadius: 0.5,
        labelDotOrientation: () => 'bottom',
        labelResolution: 4,

        autoRotate: true,
        autoRotateSpeed: 0.35,
        enablePointerInteraction: false,
      });

      root.render(globeEl);
    };

    init();

    return () => {
      destroyed = true;
      if (rootRef.current) {
        setTimeout(() => { try { rootRef.current.unmount(); } catch (_) {} }, 0);
      }
      if (mountRef.current && containerRef.current) {
        try { containerRef.current.removeChild(mountRef.current); } catch (_) {}
      }
    };
  }, []);

  const state = SHIELD_STATES[stateIdx];

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* Gold radial glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.06) 45%, transparent 70%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Cinematic scan sweep on transition */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            key="scan"
            initial={{ top: '-5%', opacity: 0.9 }}
            animate={{ top: '105%', opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeInOut' }}
            style={{
              position: 'absolute', left: 0, right: 0, height: '12%',
              background: `linear-gradient(to bottom, transparent, ${state.color}30, transparent)`,
              pointerEvents: 'none', zIndex: 15,
              boxShadow: `0 0 40px 10px ${state.color}25`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating country labels with pointer lines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 12 }}>
        {LABEL_POSITIONS.map(({ name, x, y, side }) => (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: `${50 + x}%`,
              top: `${50 + y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <svg style={{ position: 'absolute', overflow: 'visible', left: 0, top: 0, pointerEvents: 'none' }} width="0" height="0">
              <line
                x1="0" y1="0"
                x2={side === 'left' ? '-28' : '28'} y2="0"
                stroke={GOLD} strokeWidth="1" strokeDasharray="3,2" opacity="0.6"
              />
              <circle cx="0" cy="0" r="3" fill={GOLD} opacity="0.8" />
            </svg>
            <div style={{
              position: 'absolute',
              left: side === 'right' ? '100%' : 'auto',
              right: side === 'left' ? '100%' : 'auto',
              top: '50%',
              transform: 'translateY(-50%)',
              marginLeft: side === 'right' ? 8 : 0,
              marginRight: side === 'left' ? 8 : 0,
              whiteSpace: 'nowrap',
              background: 'rgba(10,10,10,0.75)',
              border: `1px solid ${GOLD}55`,
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.08em',
            }}>
              {name}
            </div>
          </div>
        ))}
      </div>

      {/* Animated shield overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <motion.div
          animate={{
            filter: [
              `drop-shadow(0 0 18px ${state.glow}) drop-shadow(0 0 40px ${state.color}55)`,
              `drop-shadow(0 0 30px ${state.glow}) drop-shadow(0 0 64px ${state.color}80)`,
              `drop-shadow(0 0 18px ${state.glow}) drop-shadow(0 0 40px ${state.color}55)`,
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'relative', width: 140, height: 140,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Pulsing color ring */}
          <motion.div
            key={state.key}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: `radial-gradient(circle, ${state.color}28 0%, transparent 70%)`,
            }}
          />
          {/* Icon — gold shield, outer glow color changes */}
          <motion.div
            key={`icon-${state.key}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <HeartHandsIcon color={GOLD} />
          </motion.div>
          {/* Status micro-label */}
          <motion.div
            key={`label-${state.key}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              position: 'absolute', bottom: 10,
              fontSize: 8, fontWeight: 800, letterSpacing: '0.2em',
              color: state.color,
            }}
          >
            {state.key.toUpperCase()}
          </motion.div>
        </motion.div>
      </div>

      {/* SAFE-T4LIFE header */}
      <div style={{
        position: 'absolute', top: 14, left: 0, right: 0,
        textAlign: 'center', zIndex: 11, pointerEvents: 'none',
      }}>
        <p style={{ color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: '0.25em', margin: 0 }}>
          SAFE‑T4LIFE™
        </p>
        <p style={{ color: 'rgba(201,168,76,0.5)', fontSize: 9, letterSpacing: '0.2em', margin: '2px 0 0' }}>
          SAFETY INTELLIGENCE ENGINE
        </p>
      </div>
    </div>
  );
}