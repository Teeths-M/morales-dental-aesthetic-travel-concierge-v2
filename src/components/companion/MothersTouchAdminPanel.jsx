import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Phone, CheckCircle, Clock, ChefHat, MapPin, User,
  ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pending_interview:   'bg-amber-100 text-amber-700',
  interview_scheduled: 'bg-blue-100 text-blue-700',
  verified:            'bg-emerald-100 text-emerald-700',
  rejected:            'bg-red-100 text-red-700',
};

const MOBILITY_LABELS = {
  neighborhood_only: 'Neighborhood Only',
  city_wide: 'City-wide',
  cook_only: 'Cook-only',
};

function CompanionCard({ companion, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const approve = async () => {
    setSaving(true);
    await base44.entities.Companion.update(companion.id, {
      verification_status: 'verified',
      status: 'active',
      admin_verification_notes: notes || 'Verified via WhatsApp interview',
      verified_at: new Date().toISOString(),
    });
    toast.success(`${companion.full_legal_name} verified ✓`);
    onUpdate();
    setSaving(false);
  };

  const reject = async () => {
    if (!notes.trim()) { toast.error('Please add a rejection reason.'); return; }
    setSaving(true);
    await base44.entities.Companion.update(companion.id, {
      verification_status: 'rejected',
      status: 'suspended',
      admin_verification_notes: notes,
    });
    toast.success('Application rejected.');
    onUpdate();
    setSaving(false);
  };

  const scheduleInterview = async () => {
    setSaving(true);
    await base44.entities.Companion.update(companion.id, {
      verification_status: 'interview_scheduled',
    });
    toast.success('Marked as interview scheduled.');
    onUpdate();
    setSaving(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors">
        <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-rose-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-800 text-sm">{companion.full_legal_name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[companion.verification_status] || 'bg-slate-100 text-slate-500'}`}>
              {companion.verification_status?.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] text-slate-400">{companion.age_tier}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{companion.neighborhood}</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{companion.whatsapp_number}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <InfoBlock label="Mobility" value={MOBILITY_LABELS[companion.transit_mobility] || companion.transit_mobility} />
                <InfoBlock label="Care Comfort" value={companion.care_comfort_affirmation === 'yes' ? 'Yes — Comfortable' : 'Not Sure'} />
                <InfoBlock label="Culinary" value={companion.culinary_specialties?.join(', ') || '—'} />
                <InfoBlock label="Nurse / Med History" value={companion.medical_nurse_history || 'None listed'} />
              </div>

              {/* References */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">References</p>
                <div className="text-xs space-y-1">
                  <p><span className="font-semibold">{companion.reference_1_name}</span> — {companion.reference_1_phone}</p>
                  {companion.reference_2_name && <p><span className="font-semibold">{companion.reference_2_name}</span> — {companion.reference_2_phone}</p>}
                </div>
              </div>

              {/* Admin notes + actions */}
              {companion.verification_status !== 'verified' && (
                <div className="space-y-2">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Admin notes / interview outcome…"
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-emerald-300" />
                  <div className="flex gap-2">
                    {companion.verification_status === 'pending_interview' && (
                      <button onClick={scheduleInterview} disabled={saving}
                        className="flex-1 py-2.5 bg-blue-50 border border-blue-300 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-100 transition-all">
                        📅 Mark Interview Scheduled
                      </button>
                    )}
                    <button onClick={approve} disabled={saving}
                      className="flex-1 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={reject} disabled={saving}
                      className="flex-1 py-2.5 bg-red-50 border border-red-300 text-red-700 text-xs font-bold rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              )}

              {companion.verification_status === 'verified' && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                  <CheckCircle className="w-4 h-4" /> Verified {companion.verified_at ? `on ${new Date(companion.verified_at).toLocaleDateString()}` : ''} · {companion.admin_verification_notes}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-slate-700 mt-0.5 text-[11px]">{value}</p>
    </div>
  );
}

export default function MothersTouchAdminPanel() {
  const [statusFilter, setStatusFilter] = useState('pending_interview');
  const qc = useQueryClient();

  const { data: companions = [], isLoading } = useQuery({
    queryKey: ['mt_companions', statusFilter],
    queryFn: () => statusFilter === 'all'
      ? base44.entities.Companion.list('-created_date', 100)
      : base44.entities.Companion.filter({ verification_status: statusFilter }, '-created_date', 100),
    staleTime: 30000,
  });

  const refresh = () => qc.invalidateQueries(['mt_companions']);

  const FILTERS = [
    { v: 'pending_interview', l: 'Pending Interview' },
    { v: 'interview_scheduled', l: 'Scheduled' },
    { v: 'verified', l: 'Verified' },
    { v: 'all', l: 'All' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
          <Heart className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">Mother's Touch — Companion Verification</p>
          <p className="text-xs text-slate-400">WhatsApp interview queue · Admin approval flow</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.v} onClick={() => setStatusFilter(f.v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              statusFilter === f.v ? 'bg-slate-800 text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}>{f.l}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-slate-400 gap-2 text-sm">
          <Heart className="w-4 h-4 animate-pulse text-rose-300" /> Loading companions…
        </div>
      ) : companions.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Heart className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No companions in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companions.map(c => <CompanionCard key={c.id} companion={c} onUpdate={refresh} />)}
        </div>
      )}
    </div>
  );
}