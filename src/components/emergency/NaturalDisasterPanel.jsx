import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone, MapPin, ChevronDown, ChevronUp, Loader2, Radio } from 'lucide-react';

/* ── Country emergency data ────────────────────────────────────────────────
   Covers top medical tourism destinations + major countries worldwide.
   disaster_risks lists which hazards are most relevant per country.
*/
const COUNTRY_DATA = {
  'Mexico':             { flag: '🇲🇽', emergency: '911', civil_protection: '800-003-0123', disasters: ['earthquake','hurricane','flood'] },
  'Colombia':           { flag: '🇨🇴', emergency: '123', civil_protection: '144', disasters: ['earthquake','flood','landslide'] },
  'Costa Rica':         { flag: '🇨🇷', emergency: '911', civil_protection: '2210-2828', disasters: ['earthquake','volcano','flood'] },
  'Dominican Republic': { flag: '🇩🇴', emergency: '911', civil_protection: '809-472-0909', disasters: ['hurricane','flood','earthquake'] },
  'Panama':             { flag: '🇵🇦', emergency: '911', civil_protection: '232-5353', disasters: ['flood','earthquake'] },
  'Venezuela':          { flag: '🇻🇪', emergency: '911', civil_protection: '0800-PROTEC', disasters: ['flood','earthquake','landslide'] },
  'Argentina':          { flag: '🇦🇷', emergency: '911', civil_protection: '103', disasters: ['flood','earthquake'] },
  'Brazil':             { flag: '🇧🇷', emergency: '192', civil_protection: '199', disasters: ['flood','hurricane','landslide'] },
  'Thailand':           { flag: '🇹🇭', emergency: '191', civil_protection: '1784', disasters: ['flood','tsunami','tropical_storm'] },
  'Turkey':             { flag: '🇹🇷', emergency: '112', civil_protection: '122', disasters: ['earthquake','flood'] },
  'India':              { flag: '🇮🇳', emergency: '112', civil_protection: '1078', disasters: ['flood','cyclone','earthquake'] },
  'Spain':              { flag: '🇪🇸', emergency: '112', civil_protection: '900-122-112', disasters: ['wildfire','flood'] },
  'Portugal':           { flag: '🇵🇹', emergency: '112', civil_protection: '808-212-812', disasters: ['wildfire','earthquake','flood'] },
  'Hungary':            { flag: '🇭🇺', emergency: '112', civil_protection: '105', disasters: ['flood'] },
  'Poland':             { flag: '🇵🇱', emergency: '112', civil_protection: '601-100-400', disasters: ['flood'] },
  'United States':      { flag: '🇺🇸', emergency: '911', civil_protection: 'FEMA: 1-800-621-3362', disasters: ['hurricane','earthquake','tornado','wildfire'] },
  'United Kingdom':     { flag: '🇬🇧', emergency: '999', civil_protection: '0845-030-4040', disasters: ['flood'] },
  'Japan':              { flag: '🇯🇵', emergency: '119', civil_protection: '03-3264-3366', disasters: ['earthquake','tsunami','typhoon','volcano'] },
  'Philippines':        { flag: '🇵🇭', emergency: '911', civil_protection: '02-8528-5930', disasters: ['typhoon','earthquake','volcano','tsunami'] },
  'Indonesia':          { flag: '🇮🇩', emergency: '112', civil_protection: '021-500-454', disasters: ['earthquake','tsunami','volcano','flood'] },
};

/* ── Disaster response guides ───────────────────────────────────────────── */
const DISASTER_GUIDES = {
  earthquake: {
    icon: '🌍', label: 'Earthquake', color: '#f59e0b',
    immediate: [
      'DROP to your hands and knees immediately',
      'COVER your head and neck under a sturdy desk or table',
      'HOLD ON until the shaking stops — do not run outside',
      'If no table, crouch against an interior wall, away from windows',
    ],
    after: [
      'Expect aftershocks — move to open ground away from buildings',
      'Do not use elevators — take stairs only',
      'Check yourself and others for injuries before moving',
      'Text your Morales guardian your location immediately',
      'Avoid damaged buildings — exit only when safe',
    ],
    avoid: ['Standing near windows', 'Running outside during shaking', 'Using elevators', 'Doorframes (outdated advice)'],
  },
  hurricane: {
    icon: '🌀', label: 'Hurricane / Cyclone', color: '#60a5fa',
    immediate: [
      'Go to the lowest floor interior room (NOT basement — risk of flooding)',
      'Stay away from all windows and glass doors',
      'Lie flat in a bathtub and cover yourself with a mattress if outside is unsafe',
      'Never go outside during the eye of the storm — it will resume',
    ],
    after: [
      'Wait for official all-clear before going outside',
      'Avoid floodwater — even 6 inches can knock you down',
      'Report your location to your Morales coordinator',
      'Do not drive through flooded roads',
    ],
    avoid: ['Windows', 'Coastal areas', 'Driving in storms', 'Outdoors during eye of hurricane'],
  },
  flood: {
    icon: '🌊', label: 'Flood', color: '#3b82f6',
    immediate: [
      'Move immediately to higher ground — do not wait',
      'Never walk, swim, or drive through flood waters',
      'If trapped in a building, go to the roof and signal for help',
      'Disconnect electrical appliances if safe to do so',
    ],
    after: [
      'Do not return until authorities declare it safe',
      'Avoid contact with floodwater — it may be contaminated',
      'Document damage for insurance',
      'Contact Morales coordinator for evacuation assistance',
    ],
    avoid: ['Floodwater on foot or in vehicle', 'Electrical equipment near water', 'Returning too soon'],
  },
  tsunami: {
    icon: '🌊', label: 'Tsunami', color: '#1d4ed8',
    immediate: [
      'If you feel a strong earthquake near the coast — MOVE INLAND IMMEDIATELY',
      'Do not wait for an official warning — move to high ground at once',
      'A receding ocean is a warning sign — run immediately',
      'Get to at least 100 feet (30m) above sea level or 2 miles inland',
    ],
    after: [
      'Wait for official all-clear — multiple waves can come hours apart',
      'Avoid debris-filled water',
      'Contact your Morales guardian to confirm your safety',
    ],
    avoid: ['Coastal areas after earthquake', 'Watching the ocean recede', 'Returning before all-clear'],
  },
  volcano: {
    icon: '🌋', label: 'Volcanic Eruption', color: '#ef4444',
    immediate: [
      'Evacuate the exclusion zone immediately per local authority orders',
      'Wear N95 mask or cover nose/mouth with wet cloth against ash',
      'Close all windows, doors, and fireplace dampers',
      'Do not drive through ash fall — it reduces visibility to zero',
    ],
    after: [
      'Clear ash from rooftops — it is very heavy and can cause collapse',
      'Do not wear contact lenses — ash can scratch corneas',
      'Listen to emergency radio for evacuation updates',
      'Contact Morales for emergency transport out of the zone',
    ],
    avoid: ['Lava flow paths', 'Ash inhalation', 'River valleys (risk of lahars)', 'Driving in ash'],
  },
  wildfire: {
    icon: '🔥', label: 'Wildfire', color: '#f97316',
    immediate: [
      'Evacuate immediately when ordered — do not wait',
      'Close all windows and doors but leave them unlocked for firefighters',
      'Take your emergency kit, medications, and documents',
      'Wear long sleeves, pants, and a N95 mask',
    ],
    after: [
      'Do not return until fire officials say it is safe',
      'Check roof and attic for embers that may cause new fires',
      'Document losses for insurance',
    ],
    avoid: ['Smoke inhalation', 'Returning early', 'Open windows during fire approach'],
  },
  tornado: {
    icon: '🌪️', label: 'Tornado', color: '#a855f7',
    immediate: [
      'Go to the lowest floor — basement if available, or interior room',
      'Get under a staircase or in a bathroom — most structurally sound',
      'Cover your head and neck with your arms',
      'Never shelter under a bridge or overpass',
    ],
    after: [
      'Watch for gas leaks, downed power lines, and structural damage',
      'Wear sturdy shoes — debris can cause foot injuries',
      'Document damage and contact Morales for emergency support',
    ],
    avoid: ['Windows', 'Mobile homes', 'Bridges', 'Cars (cannot outrun tornados)'],
  },
  landslide: {
    icon: '⛰️', label: 'Landslide', color: '#78716c',
    immediate: [
      'Move away from the path of the slide as quickly as possible',
      'If escape is impossible, curl into a tight ball and protect your head',
      'Listen for unusual sounds — cracking trees, rumbling — warning signs',
      'Stay out of valleys, streambeds, and low-lying areas',
    ],
    after: [
      'Do not return to slide area — more slides often follow',
      'Check for injured people — do not move seriously injured persons',
      'Report to authorities if someone is missing',
    ],
    avoid: ['River channels', 'Steep hillsides during heavy rain', 'Areas below recent wildfires'],
  },
  tropical_storm: {
    icon: '⛈️', label: 'Tropical Storm', color: '#06b6d4',
    immediate: [
      'Secure or bring inside all outdoor objects',
      'Move to an interior room away from windows',
      'Have emergency kit ready — food, water, medications for 3 days',
      'Monitor local radio and official alerts',
    ],
    after: [
      'Avoid downed power lines and standing water',
      'Report your status to your Morales coordinator',
    ],
    avoid: ['Coastal areas', 'Open fields', 'Flood-prone roads'],
  },
  cyclone: {
    icon: '🌀', label: 'Cyclone', color: '#60a5fa',
    immediate: [
      'Move to a solid, pre-designated shelter or evacuation centre',
      'Stay away from windows, glass, and exterior walls',
      'Fill bathtubs with water in case supply is cut off',
      'Charge all devices and have emergency radio ready',
    ],
    after: [
      'Do not go outside until the all-clear is given',
      'Check for gas leaks and structural damage before re-entering',
      'Contact your Morales emergency line',
    ],
    avoid: ['Storm surge zones', 'Driving during cyclone', 'Coastal roads post-cyclone'],
  },
};

/* ── USGS earthquake check (public API, no key) ─────────────────────────── */
async function checkNearbyEarthquake(lat, lng) {
  try {
    const now = new Date();
    const past24h = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('.')[0];
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${past24h}&minmagnitude=4.5&latitude=${lat}&longitude=${lng}&maxradiuskm=500&limit=1&orderby=magnitude`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    const quake = data?.features?.[0];
    if (!quake) return null;
    const mag = quake.properties.magnitude ?? quake.properties.mag;
    const place = quake.properties.place;
    return { magnitude: mag, place, time: quake.properties.time };
  } catch (_) {
    return null;
  }
}

/* ── Panel component ─────────────────────────────────────────────────────── */
export default function NaturalDisasterPanel({ userCountry }) {
  const [selectedCountry, setSelectedCountry] = useState(userCountry || '');
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [quakeAlert, setQuakeAlert] = useState(null);
  const [checking, setChecking] = useState(false);
  const [search, setSearch] = useState('');

  const country = COUNTRY_DATA[selectedCountry];
  const filteredCountries = Object.keys(COUNTRY_DATA).filter(c =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-check earthquake when country selected and GPS available
  useEffect(() => {
    if (!userCountry) return;
    setSelectedCountry(userCountry);
    setChecking(true);
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const q = await checkNearbyEarthquake(pos.coords.latitude, pos.coords.longitude);
        setQuakeAlert(q);
        setChecking(false);
      },
      () => setChecking(false),
      { timeout: 5000 }
    );
  }, [userCountry]);

  return (
    <div className="space-y-5">

      {/* Live earthquake alert */}
      <AnimatePresence>
        {quakeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.5)' }}
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-red-300">⚠️ Earthquake Detected Nearby</p>
              <p className="text-xs mt-0.5 text-red-400">
                M{quakeAlert.magnitude?.toFixed(1)} — {quakeAlert.place} · {new Date(quakeAlert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs mt-1 text-red-300/70">
                Follow the earthquake guide below. Contact Morales immediately.
              </p>
            </div>
          </motion.div>
        )}
        {checking && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
            <Loader2 className="w-3 h-3 animate-spin" /> Checking for nearby seismic activity…
          </div>
        )}
      </AnimatePresence>

      {/* Country selector */}
      <div className="rounded-2xl p-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#D4AF37' }}>
          <MapPin className="w-3 h-3 inline mr-1" /> Select Your Country
        </p>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search country…"
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none"
          style={{ background: '#0a1420', border: '1px solid #2A3F4A', color: '#e2e8f0' }}
        />
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
          {filteredCountries.map(c => (
            <button
              key={c}
              onClick={() => { setSelectedCountry(c); setSearch(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: selectedCountry === c ? 'rgba(212,175,55,0.15)' : '#0a1420',
                border: selectedCountry === c ? '1px solid rgba(212,175,55,0.5)' : '1px solid #2A3F4A',
                color: selectedCountry === c ? '#D4AF37' : '#94a3b8',
              }}
            >
              {COUNTRY_DATA[c].flag} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Country emergency numbers */}
      {country && (
        <motion.div
          key={selectedCountry}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{country.flag}</span>
            <div>
              <p className="text-sm font-bold text-white">{selectedCountry}</p>
              <p className="text-xs" style={{ color: '#64748b' }}>Emergency contact numbers</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <a
              href={`tel:${country.emergency}`}
              className="flex items-center gap-2 rounded-xl px-3 py-3 transition-all active:scale-95"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)' }}
            >
              <Phone className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">Emergency</p>
                <p className="text-base font-bold text-white">{country.emergency}</p>
              </div>
            </a>
            <a
              href={`tel:${country.civil_protection}`}
              className="flex items-center gap-2 rounded-xl px-3 py-3 transition-all active:scale-95"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              <Shield className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Civil Protection</p>
                <p className="text-xs font-bold text-white">{country.civil_protection}</p>
              </div>
            </a>
          </div>

          {/* Risk types for this country */}
          <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>
            Known Risks in {selectedCountry}
          </p>
          <div className="flex flex-wrap gap-2">
            {country.disasters.map(d => {
              const g = DISASTER_GUIDES[d];
              if (!g) return null;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDisaster(selectedDisaster === d ? null : d)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: selectedDisaster === d ? `${g.color}20` : '#0a1420',
                    border: `1px solid ${selectedDisaster === d ? g.color + '60' : '#2A3F4A'}`,
                    color: selectedDisaster === d ? g.color : '#64748b',
                  }}
                >
                  {g.icon} {g.label}
                  {selectedDisaster === d ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Disaster guide */}
      <AnimatePresence>
        {selectedDisaster && DISASTER_GUIDES[selectedDisaster] && (() => {
          const g = DISASTER_GUIDES[selectedDisaster];
          return (
            <motion.div
              key={selectedDisaster}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${g.color}40`, background: `${g.color}08` }}
            >
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${g.color}20` }}>
                <p className="text-sm font-bold text-white">{g.icon} {g.label} — What To Do</p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: g.color }}>
                    🚨 Immediate Actions
                  </p>
                  <ul className="space-y-1.5">
                    {g.immediate.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-white">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5"
                          style={{ background: `${g.color}30`, color: g.color }}>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
                    ✅ After It Passes
                  </p>
                  <ul className="space-y-1 text-xs" style={{ color: '#94a3b8' }}>
                    {g.after.map((s, i) => <li key={i} className="flex items-start gap-1.5"><span style={{ color: g.color }}>•</span>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-red-400">
                    ⛔ What To Avoid
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.avoid.map((a, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                        ✗ {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* All disaster types reference */}
      {!selectedDisaster && (
        <div className="rounded-2xl p-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#64748b' }}>
            All Disaster Types — Tap to Learn
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(DISASTER_GUIDES).map(([key, g]) => (
              <button
                key={key}
                onClick={() => setSelectedDisaster(key)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all active:scale-95"
                style={{ background: '#0a1420', border: '1px solid #2A3F4A', color: '#94a3b8' }}
              >
                <span className="text-base">{g.icon}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Morales 24/7 line */}
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.3)' }}>
        <Radio className="w-5 h-5 flex-shrink-0" style={{ color: '#D4AF37' }} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Morales Emergency Line — 24/7</p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>Your coordinator is always reachable during a crisis.</p>
        </div>
        <a href="tel:+18005550199"
          className="text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)' }}>
          Call Now
        </a>
      </div>
    </div>
  );
}
