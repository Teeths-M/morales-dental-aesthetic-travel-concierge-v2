import React from 'react';
import { motion } from 'framer-motion';

const GOLD = '#d4a843';

const MARKERS = [
  { name: 'TURKEY',      cx: 160, cy: 100, lx: 147, ly:  91, ta: 'end'   },
  { name: 'SOUTH KOREA', cx: 352, cy:  90, lx: 365, ly:  81, ta: 'start' },
  { name: 'THAILAND',    cx: 342, cy: 170, lx: 355, ly: 161, ta: 'start' },
  { name: 'COLOMBIA',    cx: 372, cy: 222, lx: 385, ly: 213, ta: 'start' },
  { name: 'BRAZIL',      cx: 322, cy: 314, lx: 335, ly: 326, ta: 'start' },
  { name: 'COSTA RICA',  cx: 110, cy: 282, lx:  96, ly: 296, ta: 'end'   },
  { name: 'MEXICO',      cx:  90, cy: 192, lx:  76, ly: 183, ta: 'end'   },
];

// Continent paths — traced within 500×500 viewBox, globe center (250,250), radius ~193
const CONT = [
  // North America
  `M82,108 C88,90 105,80 124,78 C143,76 160,83 168,97 C173,107 168,120 160,128
   C150,138 141,150 132,165 C121,182 110,202 102,222 C94,242 91,260 93,273
   C95,284 103,290 113,292 C107,305 99,312 90,307 C81,300 75,284 74,266
   C73,248 77,228 81,210 C85,194 87,176 86,160 C85,146 82,130 82,112 Z`,
  // South America
  `M118,316 C130,300 147,294 165,294 C182,294 198,302 207,317
   C214,330 214,348 209,366 C202,386 191,405 178,421
   C165,437 151,446 141,441 C131,434 123,419 120,401 C117,383 118,364 118,345 Z`,
  // Europe
  `M212,94 C223,80 238,75 253,75 C267,75 276,83 274,97
   C271,110 259,119 247,124 C236,128 224,132 218,140
   C213,134 212,121 212,108 Z`,
  // Africa
  `M210,158 C222,143 241,136 258,136 C274,136 288,145 293,161
   C297,175 294,192 288,209 C280,229 269,249 258,268
   C247,286 237,300 230,306 C223,310 216,306 211,297
   C206,285 204,269 204,251 C204,233 206,213 208,196
   C210,179 210,166 210,158 Z`,
  // Asia (wide E–W stretch)
  `M263,86 C280,70 302,63 326,63 C350,63 372,71 388,86
   C400,98 403,114 396,129 C387,144 370,154 351,160
   C331,164 311,161 294,153 C278,145 266,133 260,119
   C255,105 258,97 263,86 Z`,
  // SE Asia
  `M348,156 C361,147 376,150 382,164 C386,175 381,186 369,188
   C358,190 348,180 348,167 Z`,
  // Australia
  `M338,278 C353,263 371,258 388,265 C403,273 409,289 404,305
   C398,320 383,326 368,322 C353,318 341,305 338,291 Z`,
];

export default function SentinelOrbit({ size = 370 }) {
  return (
    <motion.div
      style={{ position: 'relative', width: size, height: size }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 500 500" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          {/* Globe body */}
          <radialGradient id="so-globe" cx="35%" cy="28%" r="72%">
            <stop offset="0%"   stopColor="#1c3d72" />
            <stop offset="48%"  stopColor="#0d1e42" />
            <stop offset="100%" stopColor="#040d1e" />
          </radialGradient>

          {/* Shield fill */}
          <linearGradient id="so-shield" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%"   stopColor="#f8d96c" />
            <stop offset="45%"  stopColor="#d4a843" />
            <stop offset="100%" stopColor="#9a6e12" />
          </linearGradient>

          {/* Center warm glow */}
          <radialGradient id="so-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={GOLD} stopOpacity="0.55" />
            <stop offset="55%"  stopColor={GOLD} stopOpacity="0.14" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>

          {/* Marker halo */}
          <radialGradient id="so-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffd560" stopOpacity="0.95" />
            <stop offset="55%"  stopColor="#d4a843" stopOpacity="0.50" />
            <stop offset="100%" stopColor="#d4a843" stopOpacity="0" />
          </radialGradient>

          {/* Continent dot matrix pattern */}
          <pattern id="so-dots" x="0" y="0" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="1.9" fill={GOLD} fillOpacity="0.80" />
          </pattern>

          {/* Globe clip */}
          <clipPath id="so-gc"><circle cx="250" cy="250" r="190" /></clipPath>

          {/* Per-continent clip paths */}
          {CONT.map((d, i) => (
            <clipPath key={i} id={`so-cc${i}`}><path d={d} /></clipPath>
          ))}

          {/* Shield glow */}
          <filter id="so-sg" x="-80%" y="-80%" width="360%" height="360%">
            <feGaussianBlur stdDeviation="24" result="b1" />
            <feGaussianBlur stdDeviation="7"  result="b2" in="SourceGraphic" />
            <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Dot glow */}
          <filter id="so-dg" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Line glow */}
          <filter id="so-lg" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Marker glow */}
          <filter id="so-mg" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          <style>{`
            @keyframes soFlow {
              from { stroke-dashoffset: 0; }
              to   { stroke-dashoffset: -28; }
            }
            @keyframes soLon {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            .so-lon { transform-origin: 250px 250px; animation: soLon 36s linear infinite; }
          `}</style>
        </defs>

        {/* ── Atmosphere halos */}
        <circle cx="250" cy="250" r="219" fill="none" stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.09" />
        <circle cx="250" cy="250" r="208" fill="none" stroke={GOLD} strokeWidth="0.4" strokeOpacity="0.05" />

        {/* ── Globe base */}
        <circle cx="250" cy="250" r="193" fill="url(#so-globe)" />

        {/* ── Latitude rings */}
        {[-122, -72, -22, 28, 78, 126].map((dy, i) => {
          const rx = Math.sqrt(Math.max(0, 193 * 193 - dy * dy));
          const ry = Math.max(7, Math.abs(dy) * 0.30);
          return (
            <ellipse key={i} cx="250" cy={250 + dy} rx={rx} ry={ry}
              stroke={GOLD} strokeWidth="0.55" fill="none" strokeOpacity="0.13" />
          );
        })}

        {/* ── Longitude lines (slowly rotating) */}
        <g className="so-lon">
          {[0.18, 0.52, 0.80, 0.96, 0.80, 0.52].map((f, i) => (
            <ellipse key={i} cx="250" cy="250" rx={f * 193} ry="193"
              stroke={GOLD} strokeWidth="0.5" fill="none" strokeOpacity="0.10" />
          ))}
        </g>

        {/* ── Continent dot matrix (each continent clipped independently) */}
        <g clipPath="url(#so-gc)" filter="url(#so-dg)">
          {CONT.map((_, i) => (
            <g key={i} clipPath={`url(#so-cc${i})`}>
              <rect x="40" y="40" width="420" height="420" fill="url(#so-dots)" />
            </g>
          ))}
        </g>

        {/* ── Continent outlines */}
        <g clipPath="url(#so-gc)" fill="none" stroke={GOLD} strokeWidth="1.1"
          strokeOpacity="0.55" strokeLinejoin="round" strokeLinecap="round">
          {CONT.map((d, i) => <path key={i} d={d} />)}
        </g>

        {/* ── Network lines — static dim base */}
        {MARKERS.map(({ cx, cy, name }) => (
          <line key={name} x1={cx} y1={cy} x2="250" y2="248"
            stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.16" />
        ))}

        {/* ── Animated flow lines */}
        <g filter="url(#so-lg)">
          {MARKERS.map(({ cx, cy, name }, i) => (
            <line key={name} x1={cx} y1={cy} x2="250" y2="248"
              stroke={GOLD} strokeWidth="1.6" strokeOpacity="0.72"
              strokeDasharray="9 20"
              style={{ animation: 'soFlow 2.4s linear infinite', animationDelay: `${i * 0.32}s` }}
            />
          ))}
        </g>

        {/* ── Center warm glow aura */}
        <circle cx="250" cy="248" r="108" fill="url(#so-center)" />

        {/* ── Central Golden Shield */}
        <g filter="url(#so-sg)">
          {/* Aura rings */}
          <circle cx="250" cy="248" r="84" fill={GOLD} fillOpacity="0.08" />
          <circle cx="250" cy="248" r="66" fill={GOLD} fillOpacity="0.09" />

          {/* Shield body */}
          <path
            d="M250,172 L315,203 L315,259 C315,296 288,317 250,331 C212,317 185,296 185,259 L185,203 Z"
            fill="url(#so-shield)"
          />
          {/* Inner shadow overlay for depth */}
          <path
            d="M250,183 L309,211 L309,259 C309,292 285,310 250,322 C215,310 191,292 191,259 L191,211 Z"
            fill="#1a0800" fillOpacity="0.32"
          />
          {/* Inner rim highlight */}
          <path
            d="M250,183 L309,211 L309,259 C309,292 285,310 250,322 C215,310 191,292 191,259 L191,211 Z"
            fill="none" stroke="rgba(255,235,130,0.30)" strokeWidth="1"
          />

          {/* Heart */}
          <path
            d="M250,267 C250,250 237,240 223,240 C209,240 202,252 202,262
               C202,277 218,290 250,307 C282,290 298,277 298,262
               C298,252 291,240 277,240 C263,240 250,250 250,267 Z"
            fill="white" fillOpacity="0.96"
          />

          {/* Cupped hands cradling heart from below */}
          <path d="M218,289 Q250,311 282,289"
            fill="none" stroke="white" strokeWidth="4.2" strokeOpacity="0.90" strokeLinecap="round" />
          <path d="M210,278 C209,281 212,289 221,295"
            fill="none" stroke="white" strokeWidth="3.2" strokeOpacity="0.76" strokeLinecap="round" />
          <path d="M290,278 C291,281 288,289 279,295"
            fill="none" stroke="white" strokeWidth="3.2" strokeOpacity="0.76" strokeLinecap="round" />
        </g>

        {/* ── Globe rim */}
        <circle cx="250" cy="250" r="193" fill="none" stroke={GOLD} strokeWidth="1.3" strokeOpacity="0.52" />

        {/* ── Country markers */}
        {MARKERS.map(({ cx, cy, name, lx, ly, ta }, i) => (
          <g key={name} filter="url(#so-mg)">
            {/* Outer halo disc */}
            <circle cx={cx} cy={cy} r="23" fill="url(#so-halo)" />
            {/* Animated pulse ring */}
            <motion.circle
              cx={cx} cy={cy} r="8"
              fill="none" stroke={GOLD} strokeWidth="1.5"
              animate={{ r: [7, 23], opacity: [0.9, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: i * 0.30 }}
            />
            {/* Core dot */}
            <circle cx={cx} cy={cy} r="5.5" fill={GOLD} />
            <circle cx={cx} cy={cy} r="2.5" fill="#fffacc" />
            {/* Star accent */}
            <text x={cx} y={cy - 11} fontSize="8" fill={GOLD} fillOpacity="0.80"
              textAnchor="middle" fontFamily="system-ui,sans-serif">★</text>
            {/* Country label */}
            <text x={lx} y={ly} fontSize="8" fill="rgba(255,255,255,0.90)"
              fontFamily="system-ui,sans-serif" fontWeight="700"
              letterSpacing="1" textAnchor={ta}>
              {name}
            </text>
          </g>
        ))}
      </svg>
    </motion.div>
  );
}