import React from 'react';
import { motion } from 'framer-motion';

const GOLD = '#d4a843';

const ALL_DOTS = [
  // North America
  [88,145],[95,155],[105,148],[112,158],[98,165],[108,172],[118,165],[125,158],[132,168],[105,178],
  [115,185],[125,175],[135,162],[142,172],[130,180],[120,190],[110,195],[128,192],[138,182],[100,188],
  // South America
  [128,210],[135,220],[125,228],[132,235],[140,225],[130,242],[138,250],[145,240],[135,258],[128,265],
  [140,268],[132,278],[142,285],[138,295],[145,302],[135,312],[148,318],[142,308],
  // Europe
  [220,118],[228,125],[235,118],[242,125],[225,132],[232,138],[240,132],[248,138],[235,145],
  [242,152],[228,145],[250,128],[238,122],
  // Africa
  [225,175],[232,182],[240,175],[228,190],[235,198],[242,188],[230,205],[238,212],[245,202],
  [235,218],[242,225],[230,232],[238,240],[245,248],[235,255],[242,262],[238,270],[245,278],[232,265],
  // Asia
  [265,118],[272,112],[280,118],[288,112],[295,118],[272,125],[280,132],[288,125],[295,132],[302,125],
  [310,118],[318,125],[325,118],[308,132],[315,138],[322,132],[330,125],[338,118],[295,140],[302,145],
  [310,138],[318,145],[325,138],[335,132],[342,125],[350,132],[358,125],[365,132],[305,152],[315,145],
  [325,152],[335,145],[345,138],[355,145],[362,138],[370,145],[360,152],[350,158],[340,152],[330,158],
  [320,165],[310,158],[298,158],[308,165],[318,172],[330,165],[342,158],[355,165],[365,158],[372,152],
  // Australia
  [348,275],[355,268],[362,275],[355,282],[348,288],[355,295],[362,288],[370,282],[362,268],[370,275],
  [358,302],[365,295],[372,302],[378,288],[372,268],
];

const MARKERS = [
  { name: 'TURKEY',      left: '32%', top: '20%', sx: 160, sy: 100 },
  { name: 'SOUTH KOREA', left: '70%', top: '18%', sx: 350, sy:  90 },
  { name: 'THAILAND',    left: '68%', top: '34%', sx: 340, sy: 170 },
  { name: 'COLOMBIA',    left: '74%', top: '44%', sx: 370, sy: 220 },
  { name: 'BRAZIL',      left: '64%', top: '62%', sx: 320, sy: 310 },
  { name: 'COSTA RICA',  left: '22%', top: '56%', sx: 110, sy: 280 },
  { name: 'MEXICO',      left: '18%', top: '38%', sx:  90, sy: 190 },
];

const VISIBLE_DOTS = ALL_DOTS.filter(([cx, cy]) => Math.sqrt((cx - 250) ** 2 + (cy - 250) ** 2) < 188);

export default function SentinelOrbit({ size = 370 }) {
  return (
    <motion.div
      style={{ position: 'relative', width: size, height: size }}
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 500 500" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id="globeGrad" cx="38%" cy="32%" r="70%">
            <stop offset="0%"   stopColor="#1c3a6e" />
            <stop offset="50%"  stopColor="#0a1530" />
            <stop offset="100%" stopColor="#020810" />
          </radialGradient>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={GOLD} stopOpacity="0.4" />
            <stop offset="55%"  stopColor={GOLD} stopOpacity="0.1" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="edgeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={GOLD} stopOpacity="0" />
            <stop offset="78%"  stopColor={GOLD} stopOpacity="0" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.12" />
          </radialGradient>
          <filter id="dotGlow" x="-100%" y="-100%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="shieldGlow" x="-80%" y="-80%" width="360%" height="360%">
            <feGaussianBlur stdDeviation="14" result="b1" />
            <feGaussianBlur stdDeviation="5"  result="b2" in="SourceGraphic" />
            <feMerge><feMergeNode in="b1" /><feMergeNode in="b2" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="lineGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="globeClip">
            <circle cx="250" cy="250" r="193" />
          </clipPath>
          <style>{`
            @keyframes soFlowLine {
              from { stroke-dashoffset: 0; }
              to   { stroke-dashoffset: -24; }
            }
            @keyframes soPulseRing {
              0%,100% { transform: scale(1);   opacity: 0.75; }
              50%     { transform: scale(2.8);  opacity: 0; }
            }
            @keyframes soLonSpin {
              from { transform-origin: 250px 250px; transform: rotate(0deg); }
              to   { transform-origin: 250px 250px; transform: rotate(360deg); }
            }
            .so-lon { animation: soLonSpin 30s linear infinite; }
          `}</style>
        </defs>

        {/* Atmosphere halos */}
        <circle cx="250" cy="250" r="216" fill="none" stroke={GOLD} strokeWidth="0.6" strokeOpacity="0.08" />
        <circle cx="250" cy="250" r="207" fill="none" stroke={GOLD} strokeWidth="0.4" strokeOpacity="0.05" />

        {/* Globe base */}
        <circle cx="250" cy="250" r="195" fill="url(#globeGrad)" stroke={GOLD} strokeWidth="0.8" strokeOpacity="0.35" />

        {/* Latitude lines */}
        {[28, 65, 108, 152, 108, 65, 28].map((ry, i) => (
          <ellipse key={`lat-${i}`} cx="250" cy="250" rx="195" ry={ry}
            stroke={GOLD} strokeOpacity="0.09" strokeWidth="0.5" fill="none" />
        ))}

        {/* Longitude lines (rotating) */}
        <g className="so-lon">
          {[38, 88, 138, 195, 138, 88].map((rx, i) => (
            <ellipse key={`lon-${i}`} cx="250" cy="250" rx={rx} ry="195"
              stroke={GOLD} strokeOpacity="0.09" strokeWidth="0.5" fill="none" />
          ))}
        </g>

        {/* Continent dot matrix */}
        <g clipPath="url(#globeClip)" filter="url(#dotGlow)">
          {VISIBLE_DOTS.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2.2" fill={GOLD} fillOpacity="0.65" />
          ))}
        </g>

        {/* Network lines — base (static) */}
        {MARKERS.map(({ sx, sy, name }) => (
          <line key={`base-${name}`}
            x1={sx} y1={sy} x2="250" y2="250"
            stroke={GOLD} strokeWidth="0.6" strokeOpacity="0.18" />
        ))}

        {/* Network lines — animated dash */}
        <g filter="url(#lineGlow)">
          {MARKERS.map(({ sx, sy, name }, i) => (
            <line key={`flow-${name}`}
              x1={sx} y1={sy} x2="250" y2="250"
              stroke={GOLD} strokeWidth="1.5" strokeOpacity="0.7"
              strokeDasharray="7 15"
              style={{ animation: `soFlowLine 2s linear infinite`, animationDelay: `${i * 0.28}s` }}
            />
          ))}
        </g>

        {/* Center warm glow */}
        <circle cx="250" cy="250" r="88" fill="url(#centerGlow)" />

        {/* Central Shield */}
        <g filter="url(#shieldGlow)">
          {/* Aura rings */}
          <circle cx="250" cy="248" r="66" fill={GOLD} fillOpacity="0.06" />
          <circle cx="250" cy="248" r="54" fill={GOLD} fillOpacity="0.07" />
          {/* Shield body */}
          <path
            d="M250,175 L308,202 L308,254 C308,287 283,307 250,320 C217,307 192,287 192,254 L192,202 Z"
            fill={GOLD}
          />
          {/* Shield depth overlay */}
          <path
            d="M250,184 L301,209 L301,254 C301,283 279,300 250,312 C221,300 199,283 199,254 L199,209 Z"
            fill="#1a0d00" fillOpacity="0.45"
          />
          {/* Shield inner rim */}
          <path
            d="M250,184 L301,209 L301,254 C301,283 279,300 250,312 C221,300 199,283 199,254 L199,209 Z"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"
          />
          {/* Heart */}
          <path
            d="M250,263 C250,250 239,242 229,242 C219,242 213,251 213,259 C213,271 226,282 250,297 C274,282 287,271 287,259 C287,251 281,242 271,242 C261,242 250,250 250,263 Z"
            fill="white" fillOpacity="0.95"
          />
          {/* Cupped hands arc */}
          <path d="M226,280 Q250,296 274,280"
            fill="none" stroke="white" strokeWidth="2.8" strokeOpacity="0.85" strokeLinecap="round" />
        </g>

        {/* Edge glow */}
        <circle cx="250" cy="250" r="195" fill="url(#edgeGlow)" />
        {/* Globe rim */}
        <circle cx="250" cy="250" r="195" fill="none" stroke={GOLD} strokeWidth="1.2" strokeOpacity="0.45" />
      </svg>

      {/* Country markers */}
      {MARKERS.map(({ name, left, top }, i) => (
        <div key={name} style={{
          position: 'absolute', left, top,
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          pointerEvents: 'none',
        }}>
          {/* Pulse ring */}
          <div style={{
            position: 'absolute',
            width: 10, height: 10, borderRadius: '50%',
            border: `1.5px solid ${GOLD}`,
            animation: `soPulseRing 2.4s ease-out infinite`,
            animationDelay: `${i * 0.32}s`,
          }} />
          {/* Core dot */}
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: GOLD,
            boxShadow: `0 0 10px 4px rgba(212,168,67,0.75)`,
            position: 'relative', zIndex: 1,
          }} />
          {/* Name */}
          <span style={{
            marginTop: 5, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.9)', fontFamily: 'system-ui,sans-serif',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
            textShadow: '0 1px 6px rgba(0,0,0,0.95)',
          }}>
            {name}
          </span>
        </div>
      ))}
    </motion.div>
  );
}