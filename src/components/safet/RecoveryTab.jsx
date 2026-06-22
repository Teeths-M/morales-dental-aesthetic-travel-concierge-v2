import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HeartPulse, CheckCircle2, Calendar, Phone, Hospital,
  Thermometer, Smile, AlertTriangle, MessageCircle, Camera,
  Clock, Droplets, Moon, Activity, HeartHandshake, ChevronRight
} from 'lucide-react';
import RecoveryMilestoneTimeline from '@/components/recovery/RecoveryMilestoneTimeline';

const healingTimeline = [
  { day: 'Day 1–2', label: 'Immediate Recovery', status: 'active', note: 'Rest, hydrate, avoid chewing on treated area. Light sensitivity normal.' },
  { day: 'Day 3–5', label: 'Settling Period', status: 'upcoming', note: 'Mild sensitivity reduces. Resume soft foods. Gentle oral hygiene.' },
  { day: 'Day 6–7', label: 'Final Recovery Phase', status: 'upcoming', note: 'Most patients resume normal activities. Final assessment before travel clearance.' },
];

const postCareInstructions = [
  { icon: Droplets, label: 'Hydration', instruction: 'Drink plenty of water. Avoid extremely hot or cold beverages for 48 hours.' },
  { icon: Moon, label: 'Sleep Positioning', instruction: 'Sleep on your back for the first 2 nights. Elevate head slightly.' },
  { icon: Activity, label: 'Activity Restrictions', instruction: 'Avoid vigorous exercise for 24 hours post-procedure.' },
  { icon: Droplets, label: 'Wound Care', instruction: 'Rinse gently with saltwater solution twice daily for 3 days.' },
];

const emergencyContacts = [
  { label: 'Coordinator Hotline', value: '+1 (800) MRL-CARE', type: 'primary' },
  { label: 'Dr. Ramirez Direct', value: '+58 (295) 000-0001', type: 'doctor' },
  { label: 'Local Emergency (VE)', value: '911 / 0800-CLÍNICA', type: 'emergency' },
  { label: 'Nearest Hospital', value: 'Clínica La Trinidad — 2.1km away', type: 'hospital' },
];

const moodOptions = [
  { label: '😊 Great', value: 5 },
  { label: '🙂 Good', value: 4 },
  { label: '😐 Okay', value: 3 },
  { label: '😟 Low', value: 2 },
  { label: '😔 Poor', value: 1 },
];

export default function RecoveryTab() {
  const [painLevel, setPainLevel] = useState(null);
  const [mood, setMood] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="space-y-6">
      {/* Recovery Dashboard */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: HeartPulse, label: 'Healing Status', value: 'Not Started', sub: 'Procedure pending', color: 'slate' },
          { icon: Calendar, label: 'Next Follow-Up', value: 'TBD', sub: 'Post-procedure scheduling', color: 'blue' },
          { icon: Clock, label: 'Recovery Duration', value: '7 Days', sub: 'Updated medical travel protocol', color: 'emerald' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className={`w-9 h-9 rounded-xl mb-3 flex items-center justify-center
              ${color === 'slate' ? 'bg-slate-100' : color === 'blue' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
              <Icon className={`w-4 h-4 ${color === 'slate' ? 'text-slate-500' : color === 'blue' ? 'text-blue-600' : 'text-emerald-600'}`} />
            </div>
            <p className="font-semibold text-slate-800 text-sm">{value}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Milestone Timeline — live when session exists, static preview otherwise */}
      <RecoveryMilestoneTimeline session={null} />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Post-Care Instructions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Post-Care Instructions</h3>
              <p className="text-xs text-slate-400">Care steps for smooth recovery</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {postCareInstructions.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3 bg-slate-50 rounded-xl px-3 py-3">
                  <Icon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.instruction}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Wellness Check-In */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-violet-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Daily Wellness Check-In</h3>
              <p className="text-xs text-slate-400">Log how you're feeling today</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Pain Level (0 = none, 10 = severe)</p>
              <div className="flex gap-1.5 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setPainLevel(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all
                      ${painLevel === n ?
                        (n <= 3 ? 'bg-emerald-600 text-white border-emerald-600' :
                         n <= 6 ? 'bg-amber-500 text-white border-amber-500' :
                         'bg-red-500 text-white border-red-500') :
                        'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Mood Today</p>
              <div className="flex gap-2 flex-wrap">
                {moodOptions.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className={`text-xs px-3 py-2 rounded-xl border font-medium transition-all
                      ${mood === m.value ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {!submitted ? (
              <button
                onClick={() => setSubmitted(true)}
                disabled={painLevel === null || mood === null}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl py-3 transition-all"
              >
                Submit Daily Check-In
              </button>
            ) : (
              <motion.div
                className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-emerald-800">Check-in submitted! Your care team has been notified.</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Follow-Up & Recovery Photos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Follow-Up Coordination</h3>
            <p className="text-xs text-slate-400">Scheduling & secure communication</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: Calendar, label: 'Schedule Follow-Up', sub: 'Virtual or in-person check-in', color: 'blue' },
            { icon: Camera, label: 'Upload Recovery Photos', sub: 'Securely share with your doctor', color: 'violet' },
            { icon: MessageCircle, label: 'Message Care Team', sub: 'Secure encrypted messaging', color: 'emerald' },
          ].map(({ icon: Icon, label, sub, color }) => (
            <button key={label} className="flex items-start gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-3 border border-slate-100 transition-all text-left">
              <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color === 'blue' ? 'text-blue-600' : color === 'violet' ? 'text-violet-600' : 'text-emerald-600'}`} />
              <div>
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-300 mt-0.5 ml-auto" />
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Support */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Phone className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Emergency Support</h3>
            <p className="text-xs text-slate-400">24/7 access to your care network</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {emergencyContacts.map((c) => (
            <div key={c.label} className={`flex items-center gap-3 rounded-xl px-4 py-3 border
              ${c.type === 'emergency' ? 'bg-red-50 border-red-100' :
                c.type === 'primary' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              {c.type === 'emergency' ? <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" /> :
               c.type === 'hospital' ? <Hospital className="w-4 h-4 text-blue-500 flex-shrink-0" /> :
               <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{c.label}</p>
                <p className="text-xs font-semibold text-slate-800">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emotional Reassurance */}
      <div className="bg-gradient-to-r from-blue-900 to-emerald-800 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <HeartHandshake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-display text-xl mb-2">Your Recovery is Our Priority</h3>
            <p className="text-white/80 text-sm leading-relaxed max-w-2xl">
              Recovery is a journey, not an event. Your care team and SAFE-T 4LIFE™ are here to support you 
              every step of the way — with compassion, expertise, and round-the-clock guidance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}