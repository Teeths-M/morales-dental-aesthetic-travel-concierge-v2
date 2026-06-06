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
  { name: 'Mexico',      x: -40, y: -26, side: 'left'  },
  { name: 'Brazil',      x:  40, y:  32, side: 'right' },
  { name: 'Colombia',    x: -44, y:   5, side: 'left'  },
  { name: 'Costa Rica',  x: -48, y:  12, side: 'left'  },
  { name: 'Venezuela',   x:  42, y:  -4, side: 'right' },
  { name: 'Turkey',      x:  44, y: -30, side: 'right' },
  { name: 'Thailand',    x:  46, y:   2, side: 'right' },
  { name: 'South Korea', x:  48, y: -22, side: 'right' },
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

function randDuration() {
  return 8000 + Math.random() * 7000;
}

function HeartHandsIcon({ color, size = 90 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M24 4L6 11v11c0 10.5 7.5 20.3 18 22.5C34.5 42.3 42 32.5 42 22V11L24 4Z"
        fill={`${color}1a`}
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 28c0 0 1-2 3-2s2.5 1 3 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M26 28c0 0 1-2 3-2s2.5 1 3 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M24 32s-6-4-6-8.5C18 21 19.5 20 21 20c1 0 2 .7 3 1.5C25 20.7 26 20 27 20c1.5 0 3 1 3 3.5C30 28 24 32 24 32z"
        fill={color}
        opacity="0.95"
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

      const w = containerRef.current.offsetWidth  || 860;
      const h = containerRef.current.offsetHeight || 860;

      const root = ReactDOM.createRoot(mount);
      rootRef.current = root;

      const globeEl = ReactLib.createElement(GlobeGL, {
        width: w,
        height: h,
        backgroundColor: 'rgba(0,0,0,0)',
        globeImageUrl: 'https://unpkg.com/three-globe@2.31.2/example/img/earth-night.jpg',
        bumpImageUrl:  'https://unpkg.com/three-globe@2.31.2/example/img/earth-topology.png',
        atmosphereColor: GOLD,
        atmosphereAltitude: 0.38,
        pointOfView: { lat: 5, lng: -60, altitude: 1.7 },

        pointsData: [
          ...LOCATIONS,
          { lat: 51.5,  lng: -0.1   },
          { lat: 48.8,  lng:  2.3   },
          { lat: 40.7,  lng: -74.0  },
          { lat: 34.0,  lng: -118.2 },
          { lat: -33.9, lng:  18.4  },
          { lat: 28.6,  lng:  77.2  },
          { lat: 35.7,  lng: 139.7  },
          { lat: -23.5, lng: -46.6  },
          { lat: 19.4,  lng: -99.1  },
          { lat: 25.2,  lng:  55.3  },
          { lat: 55.7,  lng:  37.6  },
          { lat: -34.6, lng: -58.4  },
          { lat: 37.6,  lng: 126.9  },
          { lat: 13.8,  lng: 100.5  },
          { lat: 41.0,  lng:  28.9  },
        ],
        pointLat: 'lat',
        pointLng: 'lng',
        pointColor: () => GOLD,
        pointAltitude: 0.05,
        pointRadius: 1.8,
        pointsMerge: false,
        pointResolution: 24,

        arcsData,
        arcColor: () => GOLD,
        arcAltitude: 0.25,
        arcStroke: 0.7,
        arcDashLength: 0.55,
        arcDashGap: 0.2,
        arcDashAnimateTime: 2800,

        // Gold labels on globe itself
        labelsData: LOCATIONS,
        labelLat: 'lat',
        labelLng: 'lng',
        labelText: 'name',
        labelSize: 1.8,
        labelColor: () => GOLD,
        labelAltitude: 0.07,
        labelDotRadius: 0.7,
        labelDotOrientation: () => 'bottom',
        labelResolution: 4,

        autoRotate: true,
        autoRotateSpeed: 0.32,
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

      {/* Dynamic globe glow — changes with state */}
      <motion.div
        key={`glow-${state.key}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${state.color}18 0%, ${state.color}06 40%, transparent 70%)`,
        }}
      />

      {/* Cinematic scan sweep */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            key="scan"
            initial={{ top: '-5%', opacity: 1 }}
            animate={{ top: '108%', opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            style={{
              position: 'absolute', left: 0, right: 0, height: '14%',
              background: `linear-gradient(to bottom, transparent, ${state.color}40, ${state.color}20, transparent)`,
              pointerEvents: 'none', zIndex: 15,
              boxShadow: `0 0 60px 16px ${state.color}30`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating country labels with gold dot + pointer lines */}
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
                x2={side === 'left' ? '-32' : '32'} y2="0"
                stroke={GOLD} strokeWidth="1.2" strokeDasharray="4,2.5" opacity="0.7"
              />
              {/* Gold dot indicator */}
              <circle cx="0" cy="0" r="3.5" fill={GOLD} opacity="0.9" />
              <circle cx="0" cy="0" r="6" fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.4" />
            </svg>
            <div style={{
              position: 'absolute',
              left: side === 'right' ? '100%' : 'auto',
              right: side === 'left' ? '100%' : 'auto',
              top: '50%',
              transform: 'translateY(-50%)',
              marginLeft: side === 'right' ? 10 : 0,
              marginRight: side === 'left' ? 10 : 0,
              whiteSpace: 'nowrap',
              background: 'rgba(8,8,10,0.82)',
              border: `1px solid ${GOLD}66`,
              borderRadius: 5,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 700,
              color: GOLD,
              letterSpacing: '0.1em',
            }}>
              {name}
            </div>
          </div>
        ))}
      </div>

      {/* 3x Larger Shield overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          {/* Outer pulsing ring 1 */}
          <motion.div
            key={`ring1-${state.key}`}
            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid ${state.color}`,
              boxShadow: `0 0 32px 8px ${state.color}50`,
            }}
          />

          {/* Outer pulsing ring 2 — offset timing */}
          <motion.div
            key={`ring2-${state.key}`}
            animate={{ scale: [1, 1.32, 1], opacity: [0.3, 0.05, 0.3] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `1px solid ${state.color}`,
              boxShadow: `0 0 50px 12px ${state.color}30`,
            }}
          />

          {/* Core glow disc */}
          <motion.div
            key={`disc-${state.key}`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.6, 1, 0.6],
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: '15%', borderRadius: '50%',
              background: `radial-gradient(circle, ${state.color}35 0%, ${state.color}10 50%, transparent 75%)`,
              filter: `blur(6px)`,
            }}
          />

          {/* Shield icon — large, gold */}
          <motion.div
            key={`icon-${state.key}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 20px ${state.glow}) drop-shadow(0 0 48px ${state.color}70)`,
              zIndex: 2,
            }}
          >
            <HeartHandsIcon color={GOLD} size={110} />
          </motion.div>

          {/* Pulsing dot indicator only — no text label */}
          <motion.div
            key={`dot-${state.key}`}
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', bottom: 18,
              width: 10, height: 10, borderRadius: '50%',
              background: state.color,
              boxShadow: `0 0 14px 4px ${state.color}`,
            }}
          />
        </div>
      </div>

      {/* SAFE-T4LIFE header */}
      <div style={{
        position: 'absolute', top: 16, left: 0, right: 0,
        textAlign: 'center', zIndex: 11, pointerEvents: 'none',
      }}>
        <p style={{ color: GOLD, fontSize: 14, fontWeight: 900, letterSpacing: '0.28em', margin: 0, textShadow: `0 0 20px ${GOLD}80` }}>
          SAFE‑T4LIFE™
        </p>
        <p style={{ color: 'rgba(201,168,76,0.55)', fontSize: 9, letterSpacing: '0.22em', margin: '3px 0 0' }}>
          SAFETY INTELLIGENCE ENGINE
        </p>
      </div>
    </div>
  );
}