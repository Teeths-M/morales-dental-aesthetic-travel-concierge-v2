import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Shield, Ambulance, PhoneCall, Car, EyeOff, X, Loader2, CheckCircle2 } from 'lucide-react';

const SOS_OPTIONS = [
  { id: 'police', label: 'Local Police', desc: 'Report crime or threat', icon: Shield, color: 'text-blue-700 bg-blue-50 border-blue-200', pulse: 'bg-blue-600' },
  { id: 'ambulance', label: 'Emergency Ambulance', desc: 'Medical emergency', icon: Ambulance, color: 'text-red-700 bg-red-50 border-red-200', pulse: 'bg-red-600' },
  { id: 'private_security', label: 'Private Security', desc: 'Tactical security dispatch', icon: Shield, color: 'text-slate-700 bg-slate-50 border-slate-200', pulse: 'bg-slate-600' },
  { id: 'urgent_pickup', label: 'Emergency Pickup', desc: 'Immediate extraction', icon: Car, color: 'text-amber-700 bg-amber-50 border-amber-200', pulse: 'bg-amber-500' },
  { id: 'silent_sos', label: 'Silent SOS', desc: 'Discreet — no sound/vibration', icon: EyeOff, color: 'text-violet-700 bg-violet-50 border-violet-200', pulse: 'bg-violet-600' },
];

export default function SOSDropdown({ caseId, patientEmail, patientName, patientPhone, destinationCountry }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const startCountdown = (option) => {
    setConfirming(option);
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          dispatch(option);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(timerRef.current);
    setConfirming(null);
    setCountdown(null);
  };

  const dispatch = async (option) => {
    setSending(true);
    setConfirming(null);
    let latitude = null, longitude = null, locationLabel = 'Unknown';
    // Attempt GPS
    try {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => { latitude = pos.coords.latitude; longitude = pos.coords.longitude; resolve(); },
          () => resolve(),
          { timeout: 5000 }
        );
      });
    } catch (_) {}

    const res = await base44.functions.invoke('triggerSOS', {
      trigger_type: option.id,
      case_id: caseId,
      patient_email: patientEmail,
      patient_name: patientName,
      patient_phone: patientPhone,
      latitude,
      longitude,
      location_label: locationLabel,
      destination_country: destinationCountry,
      is_silent: option.id === 'silent_sos'
    });

    setSending(false);
    setSent(option);
    setOpen(false);
    setTimeout(() => setSent(null), 8000);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { if (!sending) setOpen(!open); }}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs transition-all ${
          sent ? 'bg-emerald-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
      >
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full animate-ping" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {sent ? 'SOS Sent' : 'SOS'}
      </button>

      {/* Sent confirmation banner */}
      <AnimatePresence>
        {sent && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute top-full mt-2 right-0 z-50 bg-emerald-800 text-white rounded-2xl shadow-xl px-4 py-3 w-64">
            <p className="text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {sent.label} Dispatched</p>
            <p className="text-[11px] text-emerald-200 mt-1">Emergency team alerted. Stay where you are.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown overlay */}
      <AnimatePresence>
        {confirming && countdown !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
              <div className={`w-20 h-20 rounded-full ${confirming.pulse} flex items-center justify-center mx-auto mb-4`}>
                <span className="text-white text-4xl font-black">{countdown}</span>
              </div>
              <p className="font-bold text-slate-800 text-lg mb-1">Sending {confirming.label}</p>
              <p className="text-slate-500 text-sm mb-6">Dispatching in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
              <button onClick={cancelCountdown}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl py-3">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden w-72">
            <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-white" />
                <p className="text-white font-bold text-sm">Emergency Response</p>
              </div>
              <button onClick={() => setOpen(false)}>
                <X className="w-4 h-4 text-red-200 hover:text-white" />
              </button>
            </div>
            <div className="p-2">
              {SOS_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.id} onClick={() => { setOpen(false); startCountdown(opt); }}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 mb-1.5 last:mb-0 text-left transition-all hover:opacity-90 ${opt.color}`}>
                    <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{opt.label}</p>
                      <p className="text-[10px] opacity-70">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 pb-3">
              <p className="text-[10px] text-slate-400 text-center">5-second countdown before dispatch. GPS coordinates sent automatically.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}