import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Moon, Phone, CheckCircle2, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import RecoveryMilestoneTimeline from './RecoveryMilestoneTimeline';

const COMPLEXITY_LABELS = { minor: 'Minor', moderate: 'Moderate', major: 'Major' };
const COMPLEXITY_COLORS = {
  minor:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  moderate: { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
  major:    { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
};

function GentlePulse() {
  return (
    <div className="relative flex items-center justify-center w-16 h-16 mx-auto mb-4">
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          className="absolute rounded-full bg-emerald-400/20"
          animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 3, delay: i * 1, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 64, height: 64 }}
        />
      ))}
      <div className="relative z-10 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
        <Heart className="w-6 h-6 text-emerald-600" />
      </div>
    </div>
  );
}

export default function RecoveryModePanel({ caseId }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCheckin, setShowCheckin] = useState(null); // checkin index
  const [checkinData, setCheckinData] = useState({ pain_level: 5, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [activateForm, setActivateForm] = useState({ surgery_type: '', surgery_complexity: 'moderate' });
  const [activating, setActivating] = useState(false);
  const audioCtx = useRef(null);

  useEffect(() => { loadSession(); }, [caseId]);

  const loadSession = async () => {
    setLoading(true);
    const sessions = await base44.entities.RecoverySession.filter({ case_id: caseId });
    const active = sessions.find(s => s.is_active);
    setSession(active || null);
    setLoading(false);
  };

  const playGentleChime = () => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      // Gentle sine wave — 440Hz, low gain, slow fade
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) { /* audio not available */ }
  };

  const handleActivate = async () => {
    setActivating(true);
    await base44.functions.invoke('activateRecoveryMode', {
      case_id: caseId,
      surgery_type: activateForm.surgery_type,
      surgery_complexity: activateForm.surgery_complexity
    });
    setShowActivate(false);
    loadSession();
    setActivating(false);
  };

  const handleCheckin = async (idx, escalate = false) => {
    setSubmitting(true);
    playGentleChime();
    await base44.functions.invoke('submitRecoveryCheckin', {
      session_id: session.id,
      checkin_index: idx,
      pain_level: checkinData.pain_level,
      notes: checkinData.notes,
      escalate
    });
    setShowCheckin(null);
    setCheckinData({ pain_level: 5, notes: '' });
    loadSession();
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading recovery status...
    </div>
  );

  if (!session) return (
    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
      <Moon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-sm font-medium text-slate-600 mb-1">Recovery Mode Not Active</p>
      <p className="text-xs text-slate-400 mb-4">Activate after your procedure completes to enable gentle check-ins, notification silencing, and concierge escalation.</p>
      <Button onClick={() => setShowActivate(true)} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
        Activate Recovery Mode
      </Button>

      <AnimatePresence>
        {showActivate && (
          <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <h3 className="font-semibold text-gray-900 mb-4">Activate Recovery Mode</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Surgery Type</label>
                  <input value={activateForm.surgery_type} onChange={e => setActivateForm({ ...activateForm, surgery_type: e.target.value })}
                    placeholder="e.g. Rhinoplasty, Gastric Sleeve"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Surgery Complexity</label>
                  <select value={activateForm.surgery_complexity} onChange={e => setActivateForm({ ...activateForm, surgery_complexity: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none">
                    <option value="minor">Minor — check-in every 12h for 24h</option>
                    <option value="moderate">Moderate — check-in every 8h for 48h</option>
                    <option value="major">Major — check-in every 4h for 72h</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={handleActivate} disabled={!activateForm.surgery_type || activating}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                  {activating ? 'Activating...' : 'Activate'}
                </Button>
                <Button variant="outline" onClick={() => setShowActivate(false)} className="flex-1 rounded-xl">Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const pendingCheckins = (session.checkins || []).map((c, i) => ({ ...c, idx: i })).filter(c => c.status === 'pending');
  const nextCheckin = pendingCheckins[0];
  const complexity = session.surgery_complexity || 'moderate';
  const cc = COMPLEXITY_COLORS[complexity];
  const completed = session.total_checkins_completed || 0;
  const total = session.total_checkins_scheduled || 1;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="space-y-4">
      {/* Active Recovery Banner */}
      <div className={`${cc.bg} border ${cc.border} rounded-2xl p-5`}>
        <GentlePulse />
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Moon className={`w-4 h-4 ${cc.text}`} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${cc.text}`}>Recovery Mode Active</span>
          </div>
          <p className="font-semibold text-gray-900 text-lg">{session.surgery_type}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {COMPLEXITY_LABELS[complexity]} · {session.checkin_interval_hours}h check-ins · 
            Ends {new Date(session.recovery_end_at).toLocaleDateString()}
          </p>
        </div>

        {/* Notification silencing badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-white/70 border border-current/20 rounded-full px-3 py-1">
            <Moon className="w-3 h-3 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700">Non-critical alerts silenced</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{completed}/{total} check-ins completed</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-white/60 rounded-full h-2">
            <motion.div className="bg-emerald-500 h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Milestone Timeline */}
      <RecoveryMilestoneTimeline session={session} />

      {/* Next Check-in */}
      {nextCheckin ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-slate-800">Next Check-in</p>
            </div>
            <span className="text-xs text-slate-400">
              {new Date(nextCheckin.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">How are you feeling right now?</p>
          <Button onClick={() => { setShowCheckin(nextCheckin.idx); playGentleChime(); }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-semibold">
            <Heart className="w-4 h-4 mr-2" /> Complete Check-in
          </Button>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
          <p className="text-sm font-semibold text-emerald-800">All check-ins completed!</p>
          <p className="text-xs text-emerald-600 mt-0.5">Recovery monitoring is complete. Excellent recovery progress.</p>
        </div>
      )}

      {/* 1-Tap Concierge Escalation */}
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Emergency Concierge</p>
            <p className="text-xs text-red-600">Something urgent? 1-tap escalation to your care team</p>
          </div>
          {nextCheckin && (
            <button onClick={() => { setShowCheckin(nextCheckin.idx); setCheckinData({ ...checkinData }); }}
              className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> SOS
            </button>
          )}
        </div>
      </div>

      {/* Check-in Modal */}
      <AnimatePresence>
        {showCheckin !== null && (
          <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}>
              <GentlePulse />
              <h3 className="font-semibold text-gray-900 text-xl text-center mb-1">Recovery Check-in</h3>
              <p className="text-gray-400 text-xs text-center mb-6">Take a moment. How are you feeling?</p>

              <div className="mb-5">
                <p className="text-sm font-medium text-gray-600 mb-2 text-center">Pain Level: <strong className="text-gray-900">{checkinData.pain_level}/10</strong></p>
                <input type="range" min={1} max={10} value={checkinData.pain_level}
                  onChange={e => setCheckinData({ ...checkinData, pain_level: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 — No pain</span><span>10 — Severe</span>
                </div>
              </div>

              <textarea value={checkinData.notes} onChange={e => setCheckinData({ ...checkinData, notes: e.target.value })}
                placeholder="Any symptoms, concerns, or notes? (optional)"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 mb-4" rows={3} />

              <div className="space-y-2">
                <Button onClick={() => handleCheckin(showCheckin, false)} disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> I'm doing OK</>}
                </Button>
                <Button onClick={() => handleCheckin(showCheckin, true)} disabled={submitting}
                  variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50 rounded-xl py-3">
                  <AlertTriangle className="w-4 h-4 mr-2" /> I Need Help — Escalate to Concierge
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}