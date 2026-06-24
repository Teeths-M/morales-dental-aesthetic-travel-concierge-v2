import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Plane, Hotel, Car, Bell, Briefcase,
  Users, Globe, Droplets, Moon, Utensils, BarChart3
} from 'lucide-react';

const prepChecklist = [
  { category: 'Travel Documents', items: [
    { label: 'Passport valid for 6+ months', done: true },
    { label: 'Visa requirements confirmed', done: true },
    { label: 'Travel insurance uploaded', done: false },
  ]},
  { category: 'Medical Clearance', items: [
    { label: 'Medical clearance form submitted', done: false },
    { label: 'Lab results uploaded', done: false },
    { label: 'Medication list reviewed with care team', done: false },
  ]},
  { category: 'Procedure Prep', items: [
    { label: 'Fasting instructions understood', done: true },
    { label: 'Pre-procedure dental hygiene completed', done: false },
    { label: 'Post-procedure care supplies purchased', done: false },
  ]},
  { category: 'Accommodation & Logistics', items: [
    { label: 'Hotel accommodation confirmed', done: true },
    { label: 'Airport transfer arranged', done: false },
    { label: 'Local emergency contacts saved', done: false },
  ]},
];

const travelInfo = [
  { icon: Plane, label: 'Flight', value: 'Miami → Margarita Island (4hr 30min)', color: 'blue' },
  { icon: Hotel, label: 'Recovery Hotel', value: 'Margarita Luxury Suites — 5 nights', color: 'violet' },
  { icon: Car, label: 'Airport Pickup', value: 'Private transfer arranged on arrival', color: 'emerald' },
  { icon: Car, label: 'Local Transport', value: 'Daily concierge car service included', color: 'sky' },
];

const reminders = [
  { icon: Droplets, label: 'Hydration', tip: 'Drink 2–3L of water daily for 5 days before procedure', color: 'blue' },
  { icon: Utensils, label: 'Fasting', tip: 'Nothing to eat or drink 6 hours before your procedure time', color: 'amber' },
  { icon: Moon, label: 'Sleep', tip: 'Ensure 7–9 hours of sleep the night before your procedure', color: 'violet' },
  { icon: Bell, label: 'Medications', tip: 'Take all prescribed pre-procedure medications as directed', color: 'emerald' },
];

const packingList = [
  { item: 'Medical documents & clearance forms', essential: true },
  { item: 'Passport & travel insurance', essential: true },
  { item: 'Prescribed medications (+ 3 extra days)', essential: true },
  { item: 'Loose, comfortable clothing', essential: false },
  { item: 'Compression garments if required', essential: false },
  { item: 'Recovery pillow (for facial procedures)', essential: false },
  { item: 'Soft foods & oral hygiene supplies', essential: true },
  { item: 'Emergency contact card (laminated)', essential: false },
];

const culturalOptions = [
  'Female doctor preference',
  'Halal dietary requirements',
  'Kosher dietary requirements',
  'Prayer time accommodations',
  'No male attendants in recovery',
  'Interpreter / language support',
  'Specific cultural dietary needs',
];

const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', icon: 'text-sky-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600' },
};

export default function PreparationTab() {
  const [companion, setCompanion] = useState(null);
  const [culturalSelected, setCulturalSelected] = useState([]);

  const allItems = prepChecklist.flatMap(c => c.items);
  const doneCount = allItems.filter(i => i.done).length;
  const prepScore = Math.round((doneCount / allItems.length) * 100);

  const toggleCultural = (opt) => {
    setCulturalSelected(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
  };

  return (
    <div className="space-y-6">
      {/* Preparation Score */}
      <div className="bg-gradient-to-r from-emerald-800 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Preparation Score</p>
            <p className="font-display text-4xl">{prepScore}%</p>
            <p className="text-white/70 text-xs mt-1">{doneCount} of {allItems.length} items completed</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="white" strokeWidth="6"
                  strokeDasharray={`${(prepScore / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white/80" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">Status</p>
              <p className="text-white font-semibold text-sm">In Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Preparation Checklist</h3>
            <p className="text-xs text-slate-400">Complete each item before your travel date</p>
          </div>
        </div>
        <div className="space-y-5">
          {prepChecklist.map((section) => (
            <div key={section.category}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{section.category}</p>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <div key={item.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border
                    ${item.done ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.done ? 'text-emerald-600' : 'text-slate-200'}`} />
                    <p className={`text-xs font-medium ${item.done ? 'text-emerald-800' : 'text-slate-600'}`}>{item.label}</p>
                    {!item.done && <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">To Do</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Travel Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <Plane className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Travel Preparation</h3>
              <p className="text-xs text-slate-400">Your travel & accommodation details</p>
            </div>
          </div>
          <div className="space-y-2">
            {travelInfo.map((t) => {
              const Icon = t.icon;
              const c = colorMap[t.color];
              return (
                <div key={t.label} className={`flex items-start gap-3 rounded-xl px-3 py-3 ${c.bg}`}>
                  <Icon className={`w-4 h-4 ${c.icon} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${c.text}`}>{t.label}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{t.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Smart Reminders */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Smart Reminders</h3>
              <p className="text-xs text-slate-400">Daily preparation guidance</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {reminders.map((r) => {
              const Icon = r.icon;
              const c = colorMap[r.color];
              return (
                <div key={r.label} className={`flex items-start gap-3 rounded-xl px-3 py-3 ${c.bg}`}>
                  <Icon className={`w-4 h-4 ${c.text} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-xs font-semibold ${c.text}`}>{r.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{r.tip}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Packing Guide */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-violet-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Packing Guide</h3>
              <p className="text-xs text-slate-400">What to bring for your trip</p>
            </div>
          </div>
          <div className="space-y-2">
            {packingList.map((p) => (
              <div key={p.item} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <p className="text-xs text-slate-700 flex-1">{p.item}</p>
                {p.essential && (
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Essential</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {/* Companion Support */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Companion Support</h3>
                <p className="text-xs text-slate-400">Will someone accompany you?</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Having a companion during your recovery journey provides both emotional and practical support. We can arrange all companion logistics.
            </p>
            <div className="flex gap-3">
              {['Yes, I have a companion', 'No, traveling solo'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setCompanion(opt)}
                  className={`flex-1 text-[11px] font-semibold rounded-xl py-2.5 border transition-all
                    ${companion === opt ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {companion === 'Yes, I have a companion' && (
              <motion.div
                className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                <p className="text-xs text-emerald-800 font-medium">Companion package enabled — extra accommodation & transport coordination will be arranged.</p>
              </motion.div>
            )}
          </div>

          {/* Cultural Preferences */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Globe className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Religious & Cultural Preferences</h3>
                <p className="text-xs text-slate-400">Select all that apply</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {culturalOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleCultural(opt)}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all
                    ${culturalSelected.includes(opt) ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}