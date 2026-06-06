import React from 'react';
import { motion } from 'framer-motion';

// Country label positions within 500x500 viewBox
// Coordinates based on Mercator-like projection clipped to globe circle
const COUNTRIES = [
  { name: 'Turkey',      x: 263, y: 152 },
  { name: 'South Korea', x: 370, y: 148 },
  { name: 'Thailand',    x: 358, y: 195 },
  { name: 'Mexico',      x: 108, y: 188 },
  { name: 'Colombia',    x: 168, y: 240 },
  { name: 'Costa Rica',  x: 148, y: 255 },
  { name: 'Brazil',      x: 208, y: 278 },
];

// Simplified but recognizable continent SVG paths (Mercator, clipped to globe)
// ViewBox 500x500, globe center (250,250), radius 190
const LAND_PATHS = [
  // North America
  `M 112,90 C 125,78 148,72 165,74 C 180,76 192,84 196,98
     C 200,112 194,128 185,140 C 174,154 162,164 152,178
     C 140,194 130,212 122,230 C 114,248 110,265 112,278
     C 116,292 128,300 136,306 C 128,318 118,322 108,316
     C 96,308 88,292 86,274 C 84,254 88,232 93,214
     C 98,196 103,178 106,160 C 109,142 110,118 112,100 Z`,

  // Central America (connecting strip)
  `M 136,306 C 138,316 140,328 138,336 C 136,342 130,344 126,340
     C 122,334 120,322 122,312 C 126,306 132,304 136,306 Z`,

  // South America
  `M 148,340 C 162,326 180,318 198,318 C 216,318 232,328 240,344
     C 248,360 246,380 240,398 C 232,418 220,435 206,448
     C 192,460 176,466 164,460 C 152,452 144,436 140,416
     C 136,396 138,374 142,356 C 145,348 146,344 148,340 Z`,

  // Europe
  `M 218,100 C 228,88 244,82 258,82 C 270,82 278,90 276,104
     C 274,116 264,124 252,130 C 242,134 230,136 222,142
     C 216,136 214,122 216,110 Z`,

  // Africa
  `M 216,154 C 228,140 246,132 264,132 C 280,132 294,142 300,158
     C 306,174 304,194 298,212 C 290,234 278,254 266,272
     C 254,288 242,298 232,302 C 222,304 214,298 210,286
     C 206,272 206,254 208,236 C 210,218 212,196 214,176
     C 215,168 215,160 216,154 Z`,

  // Middle East + Arabian Peninsula
  `M 278,144 C 290,136 304,136 314,146 C 322,156 320,172 312,182
     C 302,190 288,192 278,184 C 268,176 266,160 272,150 Z`,

  // Asia (main landmass)
  `M 270,82 C 290,66 318,58 348,58 C 376,58 400,68 414,84
     C 426,98 428,116 420,132 C 410,148 392,158 372,164
     C 352,170 330,168 312,160 C 294,152 280,140 274,126
     C 268,112 268,96 270,82 Z`,

  // Southeast Asia
  `M 356,164 C 368,158 382,162 388,174 C 392,184 388,196 378,200
     C 368,204 356,198 352,187 C 348,176 350,168 356,164 Z`,

  // Indonesia hint
  `M 372,210 C 380,206 390,208 394,216 C 396,222 392,228 384,228
     C 376,228 370,222 370,215 Z
   M 396,212 C 402,208 410,210 412,218 C 414,224 410,228 404,226
     C 398,224 394,218 396,212 Z`,

  // Australia
  `M 376,296 C 390,280 410,274 428,280 C 444,286 452,302 448,320
     C 444,336 430,346 414,346 C 398,346 384,336 378,320
     C 372,308 373,304 376,296 Z`,

  // Japan (small island)
  `M 390,128 C 396,122 404,124 406,132 C 408,140 402,146 394,144
     C 386,142 384,134 390,128 Z`,

  // UK / British Isles hint
  `M 208,98 C 212,92 218,92 220,98 C 222,104 218,110 212,110
     C 208,108 205,104 208,98 Z`,

  // Greenland
  `M 148,54 C 158,44 172,42 180,50 C 186,58 182,70 172,74
     C 162,78 150,74 146,64 Z`,
];

export default function SentinelOrbit({ size = 420 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg
        viewBox="0 0 500 500"
        width={size}
        height={size}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Ocean gradient */}
          <radialGradient id="so-ocean" cx="38%" cy="30%" r="75%">
            <stop offset="0%"   stopColor="#3b82f6" />
            <stop offset="45%"  stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>

          {/* Land gradient */}
          <linearGradient id="so-land" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#6ab04c" />
            <stop offset="55%"  stopColor="#78a832" />
            <stop offset="100%" stopColor="#a0784a" />
          </linearGradient>

          {/* Atmosphere glow */}
          <radialGradient id="so-atm" cx="50%" cy="50%" r="50%">
            <stop offset="75%"  stopColor="transparent" />
            <stop offset="94%"  stopColor="#93c5fd" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.35" />
          </radialGradient>

          {/* Globe shadow overlay for 3D feel */}
          <radialGradient id="so-shadow" cx="68%" cy="65%" r="55%">
            <stop offset="0%"   stopColor="#0f172a" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>

          {/* Globe highlight */}
          <radialGradient id="so-shine" cx="28%" cy="22%" r="45%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.18" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          {/* Clip to globe circle */}
          <clipPath id="so-clip">
            <circle cx="250" cy="250" r="190" />
          </clipPath>

          {/* Subtle grid */}
          <pattern id="so-grid" x="0" y="0" width="38" height="38" patternUnits="userSpaceOnUse">
            <path d="M 38 0 L 0 0 0 38" fill="none" stroke="white" strokeWidth="0.25" strokeOpacity="0.07" />
          </pattern>
        </defs>

        {/* ── Drop shadow */}
        <circle cx="255" cy="258" r="188" fill="#0f172a" fillOpacity="0.30" />

        {/* ── Ocean */}
        <circle cx="250" cy="250" r="190" fill="url(#so-ocean)" />

        {/* ── Grid overlay (lat/lon feel) */}
        <circle cx="250" cy="250" r="190" fill="url(#so-grid)" clipPath="url(#so-clip)" />

        {/* ── Land masses */}
        <g clipPath="url(#so-clip)" fill="url(#so-land)" stroke="#4a7c35" strokeWidth="0.6" strokeOpacity="0.7">
          {LAND_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* ── 3D shadow overlay */}
        <circle cx="250" cy="250" r="190" fill="url(#so-shadow)" clipPath="url(#so-clip)" />

        {/* ── Atmosphere glow ring */}
        <circle cx="250" cy="250" r="190" fill="url(#so-atm)" />

        {/* ── Highlight (top-left sheen) */}
        <circle cx="250" cy="250" r="190" fill="url(#so-shine)" clipPath="url(#so-clip)" />

        {/* ── Globe rim */}
        <circle cx="250" cy="250" r="190" fill="none" stroke="#93c5fd" strokeWidth="1.2" strokeOpacity="0.55" />

        {/* ── Country labels embedded on map */}
        {COUNTRIES.map(({ name, x, y }) => {
          const charW = 5.8;
          const pad = 4;
          const w = name.length * charW + pad * 2;
          const h = 14;
          return (
            <g key={name}>
              {/* Pin dot */}
              <circle cx={x} cy={y} r="3" fill="#f59e0b" stroke="white" strokeWidth="1" />
              {/* Label box */}
              <rect
                x={x - w / 2} y={y - h - 6}
                width={w} height={h} rx="3"
                fill="rgba(10, 20, 40, 0.82)"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="0.6"
              />
              {/* Label text */}
              <text
                x={x} y={y - h/2 - 6 + 4.5}
                fontSize="7.2"
                fill="white"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="600"
                textAnchor="middle"
                letterSpacing="0.3"
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}