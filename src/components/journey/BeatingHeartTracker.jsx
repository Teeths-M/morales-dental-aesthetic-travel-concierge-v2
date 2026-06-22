import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, Heart, Zap, MapPin, User, Car, Plane, Hotel, Stethoscope, UtensilsCrossed, ArrowRight } from 'lucide-react';

const ROLE_COLORS = {
  taxi_service: { bg: 'bg-blue-500',    ring: 'ring-blue-300',    text: 'text-blue-700',    light: 'bg-blue-50',   border: 'border-blue-200',   label: 'Driver' },
  travel_agency: { bg: 'bg-violet-500',  ring: 'ring-violet-300',  text: 'text-violet-700',  light: 'bg-violet-50', border: 'border-violet-200', label: 'Travel Agency' },
  doctor:        { bg: 'bg-emerald-600', ring: 'ring-emerald-300', text: 'text-emerald-700', light: 'bg-emerald-50',border: 'border-emerald-200',label: 'Doctor' },
  companion:     { bg: 'bg-pink-500',    ring: 'ring-pink-300',    text: 'text-pink-700',    light: 'bg-pink-50',   border: 'border-pink-200',   label: 'Companion' },
  all:           { bg: 'bg-yellow-500',  ring: 'ring-yellow-300',  text: 'text-yellow-700',  light: 'bg-yellow-50', border: 'border-yellow-200', label: 'All Partners' },
};

const TP_ICONS = {
  home_pickup:    Car,
  airport_checkin: Plane,
  arrival_airport: Plane,
  hotel_checkin:  Hotel,
  clinic_arrival: Stethoscope,
  companion_meal: UtensilsCrossed,
  return_airport: Plane,
  home_arrival:   Heart,
};

function HeartPulse({ color = '#10b981', size = 40, active = true, proximity = 0 }) {
  const pulseScale = active ? 1 + proximity * 0.4 : 1;
  const pulseSpeed = active ? Math.max(0.4, 1.2 - proximity * 0.8) : 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {active && (
        <>
          <motion.div
            className="absolute rounded-full opacity-30"
            style={{ backgroundColor: color, width: size * 2, height: size * 2 }}
            animate={{ scale: [1, pulseScale + 0.3, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: pulseSpeed, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute rounded-full opacity-20"
            style={{ backgroundColor: color, width: size * 1.5, height: size * 1.5 }}
            animate={{ scale: [1, pulseScale + 0.15, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ duration: pulseSpeed, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
          />
        </>
      )}
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{ backgroundColor: color, width: size, height: size }}
        animate={active ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: pulseSpeed, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Heart className="text-white" style={{ width: size * 0.45, height: size * 0.45 }} fill="white" />
      </motion.div>
    </div>
  );
}

function TouchpointNode({ tp, isActive, isCompleted, isExpired, index, onClick }) {
  const role = ROLE_COLORS[tp.role] || ROLE_COLORS.all;
  const Icon = TP_ICONS[tp.id] || MapPin;
  const isGolden = tp.is_golden_m;

  return (
    <motion.button
      onClick={() => onClick(tp)}
      className={`relative flex flex-col items-center gap-1.5 group cursor-pointer`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      {/* Node */}
      <div className={`relative flex items-center justify-center rounded-full border-2 transition-all duration-300
        ${isGolden && isCompleted
          ? 'w-14 h-14 border-yellow-400 bg-yellow-400 shadow-lg shadow-yellow-200'
          : isCompleted
          ? `w-11 h-11 ${role.bg} border-transparent shadow-md`
          : isExpired
          ? 'w-11 h-11 bg-red-100 border-red-400'
          : isActive
          ? `w-11 h-11 bg-white ${role.border} border-2 ring-4 ${role.ring}`
          : 'w-10 h-10 bg-slate-100 border-slate-300'
        }`}
      >
        {isGolden && isCompleted ? (
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <Heart className="w-6 h-6 text-white" fill="white" />
          </motion.div>
        ) : isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-white" />
        ) : isExpired ? (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        ) : (
          <Icon className={`w-4 h-4 ${isActive ? role.text : 'text-slate-400'}`} />
        )}

        {isActive && !isCompleted && (
          <motion.div
            className={`absolute inset-0 rounded-full ${role.bg} opacity-20`}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Label */}
      <span className={`text-[10px] font-semibold text-center leading-tight max-w-[68px]
        ${isGolden && isCompleted ? 'text-yellow-600' : isCompleted ? role.text : isActive ? role.text : 'text-slate-400'}`}>
        {tp.label}
      </span>

      {/* Role badge */}
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium
        ${isCompleted ? `${role.light} ${role.text}` : 'bg-slate-100 text-slate-400'}`}>
        {role.label}
      </span>
    </motion.button>
  );
}

function ConnectorLine({ isCompleted, isActive }) {
  return (
    <div className="flex-1 flex items-start pt-5 px-0.5 min-w-[12px]">
      <div className={`h-0.5 w-full rounded-full transition-all duration-500 relative overflow-hidden
        ${isCompleted ? 'bg-emerald-400' : 'bg-slate-200'}`}>
        {isActive && (
          <motion.div
            className="absolute top-0 left-0 h-full w-1/3 bg-emerald-300 rounded-full"
            animate={{ x: ['0%', '300%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
    </div>
  );
}

export default function BeatingHeartTracker({ statuses = [], completed = 0, total = 8, onConfirm, loading = false }) {
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState('');

  const activeIdx = statuses.findIndex(s => s.status === 'pending' && !s.is_overdue);
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const goldenReached = statuses.find(s => s.is_golden_m)?.status === 'completed';

  const heartColor = goldenReached ? '#EAB308'
    : progressPct >= 75 ? '#10b981'
    : progressPct >= 50 ? '#3b82f6'
    : progressPct >= 25 ? '#8b5cf6'
    : '#94a3b8';

  const proximity = activeIdx >= 0 ? activeIdx / Math.max(1, total - 1) : 0;

  const handleConfirm = async () => {
    if (!selected || !onConfirm) return;
    setConfirming(true);
    await onConfirm(selected.id, notes);
    setNotes('');
    setSelected(null);
    setConfirming(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading coordination engine…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with beating heart */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">iQ200 Coordination Engine</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">8 Touchpoint Travel Lifecycle · Dual-Factor Handshakes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-700">{completed}/{total} complete</p>
            <p className="text-[10px] text-slate-400">{progressPct}% journey</p>
          </div>
          <HeartPulse color={heartColor} size={44} active={!goldenReached} proximity={proximity} />
        </div>
      </div>

      {/* Golden M achievement banner */}
      <AnimatePresence>
        {goldenReached && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 rounded-2xl p-4 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl mb-2"
            >
              💛
            </motion.div>
            <p className="text-sm font-bold text-yellow-800">Golden M Achieved!</p>
            <p className="text-[11px] text-yellow-600 mt-0.5">All 8 hearts merged. Journey complete.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${heartColor}, ${heartColor}cc)` }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Journey Start</span>
          <span className={`font-semibold ${goldenReached ? 'text-yellow-600' : 'text-slate-500'}`}>
            {goldenReached ? '💛 Complete' : 'Golden M'}
          </span>
        </div>
      </div>

      {/* 8 Touchpoint chain — scrollable on mobile */}
      <div className="overflow-x-auto pb-3">
        <div className="flex items-start min-w-max gap-0 px-2">
          {statuses.map((tp, idx) => (
            <React.Fragment key={tp.id}>
              <TouchpointNode
                tp={tp}
                index={idx}
                isActive={idx === activeIdx}
                isCompleted={tp.status === 'completed'}
                isExpired={tp.is_overdue || tp.status === 'expired'}
                onClick={setSelected}
              />
              {idx < statuses.length - 1 && (
                <ConnectorLine
                  isCompleted={tp.status === 'completed'}
                  isActive={idx === activeIdx}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Touchpoint detail / confirm panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
          >
            {(() => {
              const role = ROLE_COLORS[selected.role] || ROLE_COLORS.all;
              const Icon = TP_ICONS[selected.id] || MapPin;
              const isCompleted = selected.status === 'completed';
              return (
                <div>
                  <div className={`px-5 py-4 ${role.light} border-b ${role.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${role.bg} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{selected.label}</p>
                          <p className={`text-[11px] font-medium ${role.text}`}>{role.label}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg font-light">×</button>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Handshake completed</span>
                        {selected.completed_at && (
                          <span className="text-[11px] text-slate-400 ml-auto">
                            {new Date(selected.completed_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500">Confirm this touchpoint handshake. Both parties must acknowledge.</p>
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Optional notes (location, time, confirmation code…)"
                          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleConfirm}
                            disabled={confirming}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-xl text-white transition-all ${role.bg} hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5`}
                          >
                            {confirming ? (
                              <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Confirming…</>
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5" />Confirm Handshake</>
                            )}
                          </button>
                          <button onClick={() => setSelected(null)} className="px-4 py-2.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                        {/* SMS fallback hint */}
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          No internet? SMS <strong>CHECKIN OK {selected.id.toUpperCase()}</strong> to your iQ200 shortcode
                        </p>
                      </div>
                    )}
                    {selected.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-2 bg-slate-50 rounded-lg px-3 py-2">
                        "{selected.notes}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overdue alerts */}
      {statuses.filter(s => s.is_overdue || s.status === 'expired').map(s => (
        <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-700">Missed Window: {s.label}</p>
            <p className="text-[10px] text-red-500">Contingency auto-rerouting initiated. Concierge alerted.</p>
          </div>
          <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">OVERDUE</span>
        </motion.div>
      ))}
    </div>
  );
}