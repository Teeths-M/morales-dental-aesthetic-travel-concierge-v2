import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getChecklist } from '@/lib/activityChecklists';

// Maps activity name → checklist key
const NAME_TO_KEY = {
  'Zip-lining': 'zip_line',
  'Scuba Diving': 'scuba',
  'Snorkeling': 'snorkeling',
  'ATV / Quad Biking': 'atv',
  'Hiking / Trekking': 'hiking',
  'Parasailing': 'parasailing',
  'Kayaking': 'kayaking',
  'Yoga / Wellness': 'yoga',
};

export default function ActivityNudgeBanner({ sessions = [], onRefresh }) {
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState({});

  const now = new Date();
  const oneHour = 60 * 60 * 1000;

  // Sessions starting within 2 hours that haven't been nudge-acknowledged
  const upcoming = sessions.filter(s => {
    if (!s.scheduled_start_at || s.status !== 'registered') return false;
    const start = new Date(s.scheduled_start_at);
    const diff = start - now;
    return diff > 0 && diff <= 2 * oneHour && !dismissed[s.id];
  });

  if (upcoming.length === 0) return null;

  const acknowledgeAll = async (session) => {
    setSaving(true);
    const key = NAME_TO_KEY[session.activity_name] || 'other';
    const checklist = getChecklist(key).map(i => ({ ...i, acknowledged: true }));
    await base44.entities.ActivitySession.update(session.id, {
      iso_checklist_items: checklist,
      nudge_sent_at: now.toISOString(),
    });
    // Log acknowledgment
    const user = await base44.auth.me();
    await base44.functions.invoke('logAuditEvent', {
      event_type: 'handshake_created',
      actor_id: user.id,
      actor_role: user.role,
      actor_name: user.full_name,
      resource_type: 'ActivitySession',
      resource_id: session.id,
      resource_name: session.activity_name,
      case_id: session.case_id,
      details: { action: 'checklist_acknowledged', pre_activity: true },
      sensitive: false,
    });
    setSaving(false);
    setDismissed(d => ({ ...d, [session.id]: true }));
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-3 mb-4">
      {upcoming.map(session => {
        const key = NAME_TO_KEY[session.activity_name] || 'other';
        const checklist = getChecklist(key);
        const isOpen = expanded === session.id;
        const start = new Date(session.scheduled_start_at);
        const minsUntil = Math.round((start - now) / 60000);

        return (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-amber-50 border-2 border-amber-300 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  ⚠️ Pre-Activity Safety Check — {session.activity_name}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Starts in ~{minsUntil} min · Before you jump: confirm your core is hooked
                </p>
              </div>
              <button
                onClick={() => setExpanded(isOpen ? null : session.id)}
                className="text-amber-600 hover:text-amber-800 flex-shrink-0"
              >
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-amber-200 bg-white"
                >
                  <div className="px-4 py-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                      ISO 21101 Safety Checklist — Tap to acknowledge all
                    </p>
                    {checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{item.item}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => acknowledgeAll(session)}
                      disabled={saving}
                      className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : '✅ I have checked all items — I am ready to go'}
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-1">
                      This acknowledgment is logged for your safety record
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}