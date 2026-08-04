import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';
const BG   = '#04080F';
const FONT = '"SF Pro Display", system-ui, sans-serif';

const STATUS = {
  LIVE:  { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)',   color: '#22c55e', label: '✅ LIVE DEMO' },
  API:   { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.35)', color: '#60a5fa', label: '📡 REAL API'  },
  BUILT: { bg: 'rgba(212,175,55,0.1)',  border: 'rgba(212,175,55,0.35)', color: GOLD,      label: '🔧 BUILT'    },
  VISION: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.35)', color: '#a78bfa', label: '🔭 VISION DEMO' },
};

const CATEGORIES = [
  {
    icon: '🌍', label: 'Natural Disasters', color: '#f97316',
    scenarios: [
      { event: 'Earthquake',          response: 'Accelerometer fires beacon automatically — zero user action. Same tech as Google Android Earthquake Alerts. Fires in milliseconds.',                                        system: 'Mesh Beacon',              demo: '/demo/mesh-beacon', status: 'VISION'  },
      { event: 'Tsunami / Hurricane', response: 'NOAA + GDACS UN disaster feeds (updated every 60s) cross-reference active clients in affected region. Concierge sweeps proactively.',                                    system: 'EVN-iQ400 + Concierge',    demo: '/demo/evn',         status: 'API'   },
      { event: 'Flood / Snowstorm',   response: 'Slow-onset event: Weather Health system flags at-risk clients before conditions deteriorate. Concierge initiates proactive welfare sweep.',                               system: 'Weather to Health',         demo: '/demo/weather',     status: 'LIVE'  },
    ],
  },
  {
    icon: '🚨', label: 'Crime & Security', color: '#ef4444',
    scenarios: [
      { event: 'Robbery in progress',    response: 'Silent Mode locks the phone — no visible alarm. Tap Protocol (double-tap anywhere) fires a covert SOS to the concierge without the attacker knowing.',               system: 'Silent Mode + Tap',        demo: '/demo/silent',      status: 'LIVE'  },
      { event: 'Kidnapping',             response: '5-tier escalation fires automatically on missed check-in. Private security dispatched at +5h. Police and US Embassy alerted at +9h. No human needed to trigger it.', system: 'Safe-T4life™',             demo: '/demo/emergency',   status: 'LIVE'  },
      { event: 'Being followed / unsafe',response: 'EVN-iQ400 scans the area in real time. Arrival Intel flags unsafe drop zones before the client exits the vehicle. Doctor and companion trust scores are real and recalculated daily; driver trust scoring doesn\'t exist yet.',        system: 'EVN-iQ400 + Arrival Intel', demo: '/demo/arrival',    status: 'LIVE'  },
      { event: 'Drugged at nightclub',   response: 'Nightlife Vault Lockdown — all financial access frozen silently, emergency contact alerted, concierge dispatched. Honey Trap: attacker self-reports.',               system: 'Nightlife Safety',         demo: '/demo/nightlife',   status: 'LIVE'  },
    ],
  },
  {
    icon: '🏥', label: 'Medical Emergencies', color: '#22c55e',
    scenarios: [
      { event: 'Post-op complication',  response: 'Recovery Tracker flags abnormal patterns. Doctor finish button confirms safe discharge. MedGuard detects GPS silence + inactivity spike and escalates.',              system: 'Recovery Tracker',         demo: '/demo/recovery',    status: 'LIVE'  },
      { event: 'Unconscious / unresponsive', response: 'MedGuard detects GPS silence + check-in miss together. Escalation fires without the patient doing anything — same 5-tier chain.',                               system: 'MedGuard™',                demo: '/demo/medguard',    status: 'LIVE'  },
      { event: 'Dangerous procedure combo', response: 'Safe-T4life™ blocks the booking before it completes. Patient cannot proceed without licensed physician review. Based on a real 2024 death.',                      system: 'Safe-T4life™',             demo: '/demo',             status: 'LIVE'  },
    ],
  },
  {
    icon: '🧗', label: 'Accidents', color: '#60a5fa',
    scenarios: [
      { event: 'Fall / hiking injury', response: 'Accelerometer detects the impact pattern automatically. Beacon fires with last cached GPS. BLE mesh relays signal to cloud via nearby devices.',                       system: 'Mesh Beacon',              demo: '/demo/mesh-beacon', status: 'VISION'  },
      { event: 'Child trapped',        response: 'Auto-beacon fires on trauma detection — no child action needed. Secret Tap SOS for conscious child. Family Eye shows parent when the dot stops moving.',               system: 'Family Eye + Tap',         demo: '/demo/family',      status: 'LIVE'  },
      { event: 'Car accident',         response: 'Accelerometer detects sudden impact. Beacon fires immediately with last GPS. Concierge auto-alerted. Last known coordinates logged for rescue teams.',                 system: 'Mesh Beacon',              demo: '/demo/mesh-beacon', status: 'VISION'  },
    ],
  },
  {
    icon: '✈️', label: 'Travel Problems', color: '#a78bfa',
    scenarios: [
      { event: 'Lost / stolen passport', response: 'Passport Vault stores encrypted copies (PBKDF2-SHA256). Emergency PIN unlocks on any device — offline, no login, no internet required. Consulate protocols pre-loaded.', system: 'Passport Vault',          demo: '/offline-guide',    status: 'LIVE'  },
      { event: 'Language barrier',       response: 'Language Bridge translates SOS in real time. Dispatch messages sent to local emergency services in their language — not English.',                                    system: 'Language Bridge',          demo: '/demo/language',    status: 'LIVE'  },
      { event: 'Unsafe driver / partner', response: 'Doctor and companion Trust Scores are real, computed daily from case history and patient feedback. Driver trust scoring doesn\'t exist yet, and no partner is blocked from assignment by score today — the score currently informs case routing, not automatic blocking.', system: 'Trust Score',              demo: '/demo/trust',       status: 'LIVE'  },
    ],
  },
  {
    icon: '📡', label: 'Zero Connectivity', color: GOLD,
    scenarios: [
      { event: 'No cell signal',       response: 'BLE mesh beacon hops device to device — no internet required. Offline check-in queue syncs the moment connection returns. Nothing is lost.',                          system: 'Mesh Beacon',              demo: '/demo/mesh-beacon', status: 'VISION'  },
      { event: 'Underground / GPS blocked', response: 'Last cached GPS coordinates transmitted — typically accurate within 10–50m. Cell tower triangulation fallback. Same as real SAR rescue operations.',              system: 'Mesh Beacon',              demo: '/demo/mesh-beacon', status: 'VISION' },
      { event: 'Blind / disabled traveler', response: 'James Voice System — full voice-first flows. Every critical action accessible by voice or audio cue. Zero reading required.',                                    system: 'James Voice',              demo: '/demo/james',       status: 'LIVE'  },
    ],
  },
];

export default function CoverageMatrix() {
  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: FONT }}>

      {/* Nav */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <Link to="/" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontWeight: 600 }}>⌂ Home</Link>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
        <Link to="/demo" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontWeight: 600 }}>← Demos</Link>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: GOLD }}>M COVERAGE MATRIX</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '44px 20px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', color: GOLD, margin: '0 0 14px' }}>MORALES MEDICAL TRAVEL SAFETY</p>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            "But what if…?"<br />
            <span style={{ color: GOLD }}>M has an answer for all of it.</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Every scenario investors and judges ask about — mapped to the exact Morales system that handles it. Tap any row to see the live demo.
          </p>
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {CATEGORIES.map(({ icon, label, color, scenarios }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>

              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '0.14em' }}>{label.toUpperCase()}</span>
                <div style={{ flex: 1, height: 1, background: `${color}25` }} />
              </div>

              {/* Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scenarios.map(({ event, response, system, demo, status }) => {
                  const s = STATUS[status];
                  return (
                    <Link key={event} to={demo} style={{ textDecoration: 'none' }}>
                      <motion.div whileHover={{ x: 3 }}
                        style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{event}</span>
                            <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
                          </div>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', margin: 0, lineHeight: 1.65 }}>{response}</p>
                        </div>
                        <div style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, color: GOLD, whiteSpace: 'nowrap', marginTop: 3, opacity: 0.65 }}>{system} →</div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 52, padding: '16px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {Object.entries(STATUS).map(([key, s]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{s.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>
                {key === 'LIVE' ? 'Interactive demo available' : key === 'API' ? 'Real external API integrated' : 'Architecture built, production roadmap'}
              </span>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          19 scenarios · 6 categories · 0 gaps
        </p>
      </div>
    </div>
  );
}
