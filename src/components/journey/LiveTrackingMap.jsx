import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Clock, Car, User, Plane, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const ROLE_COLORS = {
  driver:    { color: '#3b82f6', bg: 'bg-blue-500',    text: 'text-blue-700',    light: 'bg-blue-50',    label: 'Driver' },
  companion: { color: '#ec4899', bg: 'bg-pink-500',    text: 'text-pink-700',    light: 'bg-pink-50',    label: 'Companion' },
  doctor:    { color: '#10b981', bg: 'bg-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50', label: 'Doctor' },
  patient:   { color: '#8b5cf6', bg: 'bg-violet-500',  text: 'text-violet-700',  light: 'bg-violet-50',  label: 'Patient' },
};

// Simulated partner proximity feeds (in production: WebSocket / Redis pub-sub)
function usePartnerTelemetry(active) {
  const [partners, setPartners] = useState([
    { id: 'driver_1',    role: 'driver',    name: 'Carlos M.',   eta_min: 12, proximity: 0.35, status: 'En Route',         vehicle: 'Toyota Camry · BLK-2291', lat: 10.95, lng: -63.87 },
    { id: 'companion_1', role: 'companion', name: 'Maria V.',    eta_min: 4,  proximity: 0.85, status: 'Nearby',            vehicle: 'On foot',                  lat: 10.97, lng: -63.84 },
    { id: 'doctor_1',    role: 'doctor',    name: 'Dr. Rossanna', eta_min: 0, proximity: 1.0,  status: 'At Clinic',         vehicle: 'Dental Spa Margarita',     lat: 10.98, lng: -63.83 },
  ]);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      tickRef.current += 1;
      setPartners(prev => prev.map(p => {
        if (p.status === 'At Clinic') return p;
        const drift = (Math.sin(tickRef.current * 0.3 + p.id.length) * 0.002);
        const etaDelta = p.eta_min > 0 ? -0.07 : 0;
        return {
          ...p,
          lat: p.lat + drift,
          lng: p.lng + drift * 0.5,
          eta_min: Math.max(0, p.eta_min + etaDelta),
          proximity: Math.min(1, p.proximity + 0.003),
        };
      }));
    }, 4000); // 4-second refresh as spec
    return () => clearInterval(interval);
  }, [active]);

  return partners;
}

function PartnerCard({ partner, isSelected, onClick }) {
  const cfg = ROLE_COLORS[partner.role] || ROLE_COLORS.driver;
  const Icon = partner.role === 'driver' ? Car : partner.role === 'doctor' ? User : User;
  const proximityPct = Math.round(partner.proximity * 100);

  return (
    <motion.button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-3.5 transition-all ${
        isSelected ? `${cfg.light} border-current` : 'bg-white border-slate-100 hover:border-slate-200'
      }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 relative`}>
          <Icon className="w-4.5 h-4.5 text-white" />
          <motion.div
            className="absolute inset-0 rounded-xl opacity-40"
            style={{ backgroundColor: cfg.color }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{partner.name}</p>
          <p className={`text-[10px] font-medium ${cfg.text}`}>{cfg.label}</p>
          <p className="text-[10px] text-slate-400 truncate">{partner.vehicle}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {partner.eta_min > 0 ? (
            <>
              <p className="text-sm font-semibold text-slate-800">{Math.ceil(partner.eta_min)}<span className="text-[10px] font-normal text-slate-400"> min</span></p>
              <p className="text-[10px] text-slate-400">ETA</p>
            </>
          ) : (
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.light} ${cfg.text}`}>{partner.status}</span>
          )}
        </div>
      </div>

      {/* Proximity bar */}
      <div className="mt-2.5 space-y-1">
        <div className="flex justify-between text-[9px] text-slate-400">
          <span>Proximity</span>
          <span className={`font-semibold ${cfg.text}`}>{proximityPct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: cfg.color }}
            animate={{ width: `${proximityPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.button>
  );
}

// Minimal SVG map visualization (no external map library needed)
function MapVisualization({ partners, selected }) {
  const W = 340, H = 200;
  // Normalize lat/lng to SVG coords
  const lats = partners.map(p => p.lat);
  const lngs = partners.map(p => p.lng);
  const minLat = Math.min(...lats) - 0.02, maxLat = Math.max(...lats) + 0.02;
  const minLng = Math.min(...lngs) - 0.02, maxLng = Math.max(...lngs) + 0.02;

  const toX = lng => ((lng - minLng) / (maxLng - minLng)) * (W - 40) + 20;
  const toY = lat => (1 - (lat - minLat) / (maxLat - minLat)) * (H - 40) + 20;

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden relative">
      <div className="absolute top-2 left-3 flex items-center gap-1.5 z-10">
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-widest">Live · 4s refresh</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <React.Fragment key={f}>
            <line x1={f * W} y1="0" x2={f * W} y2={H} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="0" y1={f * H} x2={W} y2={f * H} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </React.Fragment>
        ))}
        {/* Route path */}
        <polyline
          points={partners.map(p => `${toX(p.lng)},${toY(p.lat)}`).join(' ')}
          fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="1.5" strokeDasharray="4,3"
        />
        {/* Partner dots */}
        {partners.map(p => {
          const cfg = ROLE_COLORS[p.role];
          const x = toX(p.lng), y = toY(p.lat);
          const isSel = selected === p.id;
          return (
            <g key={p.id}>
              <circle cx={x} cy={y} r={isSel ? 10 : 7} fill={cfg.color} opacity="0.2" />
              <circle cx={x} cy={y} r={isSel ? 6 : 4} fill={cfg.color} />
              <text x={x} y={y - 10} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)">{p.name.split(' ')[0]}</text>
            </g>
          );
        })}
        {/* Patient marker */}
        <circle cx={W / 2} cy={H / 2} r="5" fill="#8b5cf6" />
        <circle cx={W / 2} cy={H / 2} r="10" fill="rgba(139,92,246,0.2)" />
        <text x={W / 2} y={H / 2 - 12} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)">You</text>
      </svg>
      <div className="absolute bottom-2 right-3 text-[9px] text-slate-500">Margarita Island, Venezuela</div>
    </div>
  );
}

export default function LiveTrackingMap() {
  const [isLive, setIsLive] = useState(true);
  const [selected, setSelected] = useState(null);
  const partners = usePartnerTelemetry(isLive);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setLastUpdate(new Date()), 4000);
    return () => clearInterval(t);
  }, [isLive]);

  const secAgo = Math.floor((new Date() - lastUpdate) / 1000);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Live Partner Tracking</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time telemetry · {secAgo}s ago</p>
        </div>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
            isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isLive ? 'Live' : 'Paused'}
        </button>
      </div>

      <MapVisualization partners={partners} selected={selected} />

      <div className="space-y-2">
        {partners.map(p => (
          <PartnerCard
            key={p.id}
            partner={p}
            isSelected={selected === p.id}
            onClick={() => setSelected(selected === p.id ? null : p.id)}
          />
        ))}
      </div>
    </div>
  );
}