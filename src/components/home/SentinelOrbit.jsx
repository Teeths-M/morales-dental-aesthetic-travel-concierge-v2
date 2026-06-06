import React from 'react';

const GOLD = '#d4a843';

const CONTINENT_DOTS = [
  // North America
  [82,148],[88,140],[95,133],[100,142],[108,135],[115,128],[122,132],[130,126],[138,120],[142,130],
  [88,158],[95,152],[102,160],[110,155],[118,148],[125,155],[132,162],[140,158],[128,168],[118,172],
  [95,178],[105,175],[115,182],[125,178],[135,185],[142,190],[108,188],[98,195],[90,202],[100,208],
  [110,200],[122,205],[132,198],[140,205],[148,212],[138,220],

  // South America
  [122,238],[130,232],[138,240],[128,250],[135,258],[125,265],[132,272],[122,278],[128,285],
  [135,292],[128,300],[133,310],[128,318],[122,310],[118,298],[115,285],[118,272],[120,260],

  // Europe
  [218,118],[225,112],[232,108],[240,112],[248,108],[218,128],[226,122],[234,118],[242,122],
  [220,138],[228,132],[236,128],[244,132],[252,128],[222,148],[230,142],[238,138],[246,142],[254,136],
  [226,158],[234,152],[242,148],[250,152],[220,168],[228,162],[236,158],[244,162],

  // Africa
  [222,192],[230,188],[238,185],[246,188],[254,185],[228,202],[236,198],[244,195],[252,198],[260,195],
  [224,215],[232,210],[240,208],[248,212],[256,208],[264,210],[228,228],[236,222],[244,218],[252,222],
  [260,218],[268,222],[232,242],[240,238],[248,235],[256,238],[264,235],[238,255],[246,252],[254,248],
  [262,252],[242,268],[250,265],[258,262],[246,280],[254,278],

  // Asia
  [262,115],[270,110],[278,108],[286,112],[294,108],[302,112],[310,108],[318,112],[326,108],[334,112],
  [268,128],[276,122],[284,118],[292,122],[300,118],[308,122],[316,118],[324,122],[332,118],[340,122],
  [348,118],[356,122],[364,118],[372,122],[378,128],[270,142],[278,138],[286,135],[294,138],[302,135],
  [310,138],[318,135],[326,138],[334,135],[342,138],[350,135],[358,138],[366,135],[374,138],[380,142],
  [272,158],[280,152],[288,148],[296,152],[304,148],[312,152],[320,148],[328,152],[336,148],[344,152],
  [352,148],[360,152],[368,148],[376,152],[274,172],[282,168],[290,165],[298,168],[306,165],[314,168],
  [322,165],[330,168],[338,165],[346,168],[354,165],[362,168],[370,165],[278,185],[286,182],[294,178],
  [302,182],[310,178],[318,182],[326,178],[334,182],[342,178],[350,182],[358,178],[364,185],[370,192],
  [280,198],[288,195],[296,192],[304,195],[312,192],[320,195],[328,192],[336,195],[344,192],[352,195],
  [358,200],[362,208],[280,212],[288,208],[296,205],[304,208],[312,205],[320,208],[328,205],[335,210],
  [285,225],[292,220],[300,218],[308,222],[316,218],[322,225],[330,220],[336,228],

  // Australia
  [342,275],[350,270],[358,268],[366,272],[374,270],[348,285],[356,282],[364,278],[372,282],[380,278],
  [352,295],[360,292],[368,288],[376,292],[358,305],[366,302],[374,298],
];

const MARKERS = [
  { name: 'TURKEY',      left: '32%', top: '20%' },
  { name: 'SOUTH KOREA', left: '70%', top: '18%' },
  { name: 'THAILAND',    left: '68%', top: '34%' },
  { name: 'COLOMBIA',    left: '74%', top: '44%' },
  { name: 'BRAZIL',      left: '64%', top: '62%' },
  { name: 'COSTA RICA',  left: '22%', top: '56%' },
  { name: 'MEXICO',      left: '18%', top: '38%' },
];

function insideGlobe(x, y) {
  return Math.sqrt((x - 250) ** 2 + (y - 250) ** 2) < 190;
}

export default function SentinelOrbit({ size = 370 }) {
  const visibleDots = CONTINENT_DOTS.filter(([x, y]) => insideGlobe(x, y));

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* SVG Globe */}
      <svg
        viewBox="0 0 500 500"
        width={size}
        height={size}
        style={{ display: 'block' }}
      >
        <defs>
          <radialGradient id="globeGrad" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#1e3a70" />
            <stop offset="55%" stopColor="#0b1635" />
            <stop offset="100%" stopColor="#030b18" />
          </radialGradient>
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
            <stop offset="70%" stopColor={GOLD} stopOpacity="0" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.08" />
          </radialGradient>
          <radialGradient id="atmosphereGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="80%" stopColor="transparent" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.12" />
          </radialGradient>
          <clipPath id="globeClip">
            <circle cx="250" cy="250" r="195" />
          </clipPath>
          <style>{`
            @keyframes rotateLon {
              from { transform: rotateY(0deg); }
              to   { transform: rotateY(360deg); }
            }
            @keyframes markerPulse {
              0%, 100% { transform: scale(1); opacity: 0.7; }
              50%       { transform: scale(2.2); opacity: 0; }
            }
            @keyframes globeSpin {
              from { transform-origin: 250px 250px; transform: rotate(0deg); }
              to   { transform-origin: 250px 250px; transform: rotate(360deg); }
            }
            .lon-group {
              transform-box: fill-box;
              transform-origin: center;
              animation: globeSpin 24s linear infinite;
            }
          `}</style>
        </defs>

        {/* Atmosphere outer glow */}
        <circle cx="250" cy="250" r="210" fill="none" stroke={GOLD} strokeWidth="1" strokeOpacity="0.08" />
        <circle cx="250" cy="250" r="202" fill="none" stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.06" />

        {/* Globe base sphere */}
        <circle cx="250" cy="250" r="195"
          fill="url(#globeGrad)"
          stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.3"
        />

        {/* Latitude lines */}
        {[30, 70, 110, 150, 110, 70, 30].map((ry, i) => (
          <ellipse key={`lat-${i}`}
            cx="250" cy="250" rx="195" ry={ry}
            stroke={GOLD} strokeOpacity="0.12" strokeWidth="0.6" fill="none"
          />
        ))}

        {/* Longitude lines (rotating group) */}
        <g className="lon-group">
          {[40, 90, 140, 195, 140, 90].map((rx, i) => (
            <ellipse key={`lon-${i}`}
              cx="250" cy="250" rx={rx} ry="195"
              stroke={GOLD} strokeOpacity="0.12" strokeWidth="0.6" fill="none"
            />
          ))}
        </g>

        {/* Continent dot matrix */}
        <g clipPath="url(#globeClip)">
          {visibleDots.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill={GOLD} opacity="0.55" />
          ))}
        </g>

        {/* Ambient glow overlay */}
        <circle cx="250" cy="250" r="195" fill="url(#glowGrad)" />

        {/* Globe rim */}
        <circle cx="250" cy="250" r="195"
          fill="none" stroke={GOLD} strokeWidth="1" strokeOpacity="0.35"
        />

        {/* Center label */}
        <text x="250" y="478" textAnchor="middle"
          fontSize="9" fontFamily="system-ui,sans-serif" fontWeight="bold"
          fill={GOLD} fillOpacity="0.65" letterSpacing="2">
          SAFE‑T 4LIFE™
        </text>
      </svg>

      {/* Country Markers */}
      {MARKERS.map(({ name, left, top }) => (
        <div
          key={name}
          style={{
            position: 'absolute',
            left,
            top,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* Pulsing ring */}
          <div style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: `1.5px solid ${GOLD}`,
            animation: 'markerPulse 2.2s ease-out infinite',
          }} />
          {/* Core dot */}
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: GOLD,
            boxShadow: `0 0 8px 3px rgba(212,168,67,0.6)`,
            position: 'relative',
            zIndex: 1,
          }} />
          {/* Label */}
          <span style={{
            marginTop: 5,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.82)',
            fontFamily: 'system-ui,sans-serif',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}