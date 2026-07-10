import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { getChecklist } from '@/lib/activityChecklists';
import {
  Zap, Waves, Mountain, Wind, Leaf, Plus, Shield, CheckCircle2, Circle,
  Clock, AlertTriangle, Bell, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ACTIVITY_TYPES = [
  { id: 'zip_line', label: 'Zip-lining', category: 'aerial', risk: 'high', icon: Wind },
  { id: 'scuba', label: 'Scuba Diving', category: 'water', risk: 'high', icon: Waves },
  { id: 'snorkeling', label: 'Snorkeling', category: 'water', risk: 'moderate', icon: Waves },
  { id: 'atv', label: 'ATV / Quad Biking', category: 'land', risk: 'high', icon: Zap },
  { id: 'hiking', label: 'Hiking / Trekking', category: 'land', risk: 'moderate', icon: Mountain },
  { id: 'parasailing', label: 'Parasailing', category: 'aerial', risk: 'high', icon: Wind },
  { id: 'kayaking', label: 'Kayaking', category: 'water', risk: 'moderate', icon: Waves },
  { id: 'yoga', label: 'Yoga / Wellness', category: 'wellness', risk: 'low', icon: Leaf },
  { id: 'other', label: 'Other Activity', category: 'other', risk: 'moderate', icon: Zap },
];

const RISK_COLORS = {
  low: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  moderate: 'bg-amber-50 border-amber-200 text-amber-700',
  high: 'bg-red-50 border-red-200 text-red-700',
  extreme: 'bg-rose-100 border-rose-300 text-rose-800',
};

const STATUS_CONFIG = {
  registered: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-600' },
  escalated: { label: '⚠️ Escalated', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500' },
};

export default function ActivitySafetyAdvisor({ caseId }) {
  const [sessions, setSessions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({ date: '', time: '', duration_hours: 2, location: '', operator: '' });
  const [loading, setLoading] = useState(false);
  const [handshaking, setHandshaking] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const { toast } = useToast();

  const loadSessions = async () => {
    if (!caseId) return;
    const data = await base44.entities.ActivitySession.filter({ case_id: caseId }, '-scheduled_start_at');
    setSessions(data);
  };

  useEffect(() => { loadSessions(); }, [caseId]);

  // Direct entity operations — the same proven pattern AdventureSafetyCenter
  // uses. (This component previously invoked 'registerActivitySession' /
  // 'submitActivityHandshake', edge functions that never existed — both
  // actions silently failed since the day this panel was written.)
  const registerActivity = async () => {
    if (!selectedType || !form.date || !form.time) return;
    setLoading(true);
    try {
      const startAt = new Date(`${form.date}T${form.time}`).toISOString();
      const endAt = new Date(new Date(startAt).getTime() + form.duration_hours * 60 * 60 * 1000).toISOString();
      const handshakeDue = new Date(new Date(endAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
      const user = await base44.auth.me();

      await base44.entities.ActivitySession.create({
        case_id: caseId || '',
        patient_id: user.id,
        patient_email: user.email,
        patient_name: user.full_name,
        activity_name: selectedType.label,
        activity_category: selectedType.category,
        risk_level: selectedType.risk,
        scheduled_start_at: startAt,
        scheduled_end_at: endAt,
        handshake_due_at: handshakeDue,
        handshake_status: 'pending',
        status: 'registered',
        location: form.location,
        operator_name: form.operator,
        iso_checklist_items: getChecklist(selectedType.id),
      });

      toast({ title: `✅ ${selectedType.label} registered`, description: 'Safety checklist created. Check in when your activity ends.' });
      setShowForm(false);
      setSelectedType(null);
      setForm({ date: '', time: '', duration_hours: 2, location: '', operator: '' });
      loadSessions();
    } catch (_) {
      toast({ title: 'Could not register the activity', description: 'Please try again.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const submitHandshake = async (sessionId, safe) => {
    setHandshaking(sessionId);
    try {
      await base44.entities.ActivitySession.update(sessionId, {
        handshake_status: 'completed',
        handshake_completed_at: new Date().toISOString(),
        status: safe ? 'completed' : 'escalated',
      });
      toast({
        title: safe ? '✅ Check-in complete — glad you are safe!' : '🚨 Emergency alert sent',
        variant: safe ? 'default' : 'destructive'
      });
      loadSessions();
    } catch (_) {
      toast({ title: 'Check-in did not go through', description: 'Please try again — or contact your coordinator directly.', variant: 'destructive' });
    }
    setHandshaking(null);
  };

  const pendingHandshakes = sessions.filter(s => {
    const due = s.handshake_due_at ? new Date(s.handshake_due_at) : null;
    return s.handshake_status === 'pending' && due && due < new Date();
  });

  return (
    <div className="space-y-5">
      {/* Pending Handshakes Alert */}
      <AnimatePresence>
        {pendingHandshakes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="w-5 h-5 text-amber-600 animate-pulse" />
              <p className="font-semibold text-amber-800 text-sm">Safety Check-In Required</p>
            </div>
            {pendingHandshakes.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{s.activity_name}</p>
                  <p className="text-xs text-slate-500">Handshake overdue — please confirm you are safe</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => submitHandshake(s.id, true)} disabled={handshaking === s.id}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700">
                    ✅ I'm Safe
                  </button>
                  <button onClick={() => submitHandshake(s.id, false)} disabled={handshaking === s.id}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">
                    🆘 Need Help
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" /> Adventure Safety Advisor
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">ISO 21101 aligned — with automated safety check-ins</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Register Activity
        </Button>
      </div>

      {/* Register Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-700 mb-3">Select Activity Type</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {ACTIVITY_TYPES.map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.id} onClick={() => setSelectedType(a)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                      selectedType?.id === a.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <Icon className="w-5 h-5 text-slate-600" />
                    <span className="text-[10px] font-semibold text-slate-700 leading-tight">{a.label}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${RISK_COLORS[a.risk]}`}>{a.risk}</span>
                  </button>
                );
              })}
            </div>

            {selectedType && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className={`rounded-xl border px-4 py-2 flex items-center gap-2 ${RISK_COLORS[selectedType.risk]}`}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <p className="text-xs font-semibold">Risk Level: {selectedType.risk} — ISO 21101 safety checklist will be generated</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Start Time</label>
                    <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Duration (hours)</label>
                    <input type="number" min="1" max="12" value={form.duration_hours}
                      onChange={e => setForm(f => ({ ...f, duration_hours: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Location</label>
                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Playa El Agua Beach"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  </div>
                </div>
                <input value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                  placeholder="Operator / Tour company name (optional)"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
                  <p className="font-semibold mb-1">🔔 Automated Safety Protocol</p>
                  <p>• Nudge 1 hour before: <em>"Make sure your core is hooked. We are here to protect you."</em></p>
                  <p>• Safety check-in 2 hours after your activity ends</p>
                  <p>• Missed check-in triggers automatic care coordinator alert</p>
                </div>
                <Button onClick={registerActivity} disabled={loading || !form.date || !form.time}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">
                  {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Registering...</span>
                    : `Register ${selectedType.label} + Generate Safety Checklist`}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registered Activities */}
      {sessions.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">No activities registered yet</p>
          <p className="text-xs text-slate-400 mt-1">Register an adventure activity to activate ISO 21101 safety protocols</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const statusCfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.registered;
            const riskCfg = RISK_COLORS[s.risk_level] || RISK_COLORS.moderate;
            const isExpanded = expandedId === s.id;
            const doneItems = (s.iso_checklist_items || []).filter(i => i.acknowledged).length;
            const totalItems = (s.iso_checklist_items || []).length;

            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{s.activity_name}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${riskCfg}`}>{s.risk_level} risk</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.scheduled_start_at ? new Date(s.scheduled_start_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}</span>
                      {s.location && <span>📍 {s.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400">{doneItems}/{totalItems} checks</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ISO 21101 Safety Checklist</p>
                    <div className="space-y-1.5">
                      {(s.iso_checklist_items || []).map((item, idx) => (
                        <div key={idx} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${item.acknowledged ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                          {item.acknowledged
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            : <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                          <p className={`text-xs ${item.acknowledged ? 'text-emerald-800 line-through' : 'text-slate-700'}`}>{item.item}</p>
                        </div>
                      ))}
                    </div>

                    {/* Handshake zone */}
                    {s.handshake_status === 'pending' && s.handshake_due_at && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-amber-800 mb-2">
                          ⏰ Safety check-in due: {new Date(s.handshake_due_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => submitHandshake(s.id, true)} disabled={handshaking === s.id}
                            className="flex-1 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700">
                            ✅ I'm Safe
                          </button>
                          <button onClick={() => submitHandshake(s.id, false)} disabled={handshaking === s.id}
                            className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">
                            🆘 Need Help
                          </button>
                        </div>
                      </div>
                    )}
                    {s.handshake_status === 'completed' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <p className="text-xs font-semibold text-emerald-800">Safety check-in completed ✓</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}