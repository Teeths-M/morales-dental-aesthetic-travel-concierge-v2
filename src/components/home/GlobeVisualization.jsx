import React, { useRef, useEffect } from 'react';

const GOLD = '#c9a84c';
const GOLD_ARC = '#c9a84c';

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

export default function GlobeVisualization() {
  const containerRef = useRef(null);
  const mountRef = useRef(null);
  const rootRef = useRef(null);

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

      const w = containerRef.current.offsetWidth  || 520;
      const h = containerRef.current.offsetHeight || 520;

      const root = ReactDOM.createRoot(mount);
      rootRef.current = root;

      root.render(
        ReactLib.createElement(GlobeGL, {
          width: w,
          height: h,
          backgroundColor: 'rgba(0,0,0,0)',
          globeImageUrl: 'https://unpkg.com/three-globe@2.31.2/example/img/earth-night.jpg',
          bumpImageUrl:  'https://unpkg.com/three-globe@2.31.2/example/img/earth-topology.png',
          atmosphereColor: GOLD,
          atmosphereAltitude: 0.20,
          // Points (glowing dots)
          pointsData: LOCATIONS,
          pointLat: 'lat',
          pointLng: 'lng',
          pointColor: () => GOLD,
          pointAltitude: 0.02,
          pointRadius: 0.7,
          pointsMerge: false,
          // Arcs (gold lines)
          arcsData,
          arcColor: () => GOLD_ARC,
          arcAltitude: 0.25,
          arcStroke: 0.55,
          arcDashLength: 0.55,
          arcDashGap: 0.2,
          arcDashAnimateTime: 2800,
          // Labels
          labelsData: LOCATIONS,
          labelLat: 'lat',
          labelLng: 'lng',
          labelText: 'name',
          labelSize: 1.3,
          labelColor: () => GOLD,
          labelAltitude: 0.035,
          labelDotRadius: 0.45,
          labelDotOrientation: () => 'bottom',
          // Rotation
          autoRotate: true,
          autoRotateSpeed: 0.35,
          enablePointerInteraction: false,
        })
      );
    };

    init();

    return () => {
      destroyed = true;
      if (rootRef.current) {
        setTimeout(() => {
          try { rootRef.current.unmount(); } catch (_) {}
        }, 0);
      }
      if (mountRef.current && containerRef.current) {
        try { containerRef.current.removeChild(mountRef.current); } catch (_) {}
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Gold shield overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.22) 0%, transparent 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: 'drop-shadow(0 0 32px rgba(201,168,76,0.85))',
        }}>
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2Z"
              fill="rgba(201,168,76,0.18)"
              stroke={GOLD}
              strokeWidth="1.3"
            />
            <path
              d="M12 16s-4-2.5-4-5.5C8 9 9 8 10.5 8c.83 0 1.5.5 1.5.5S12.67 8 13.5 8C15 8 16 9 16 10.5c0 3-4 5.5-4 5.5z"
              fill={GOLD}
              opacity="0.9"
            />
          </svg>
        </div>
      </div>

      {/* SAFE-T4LIFE top label */}
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