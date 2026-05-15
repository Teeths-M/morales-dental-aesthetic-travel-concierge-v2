import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, AlertTriangle, CheckCircle2, Heart, Activity, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

const riskScores = [
  { label: 'Safety Score', value: 82, color: '#047857' },
  { label: 'Recovery Readiness', value: 75, color: '#1d4ed8' },
  { label: 'Procedure Compatibility', value: 90, color: '#7c3aed' },
];

function ScoreBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-2 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  );
}

const medHistoryOptions = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Autoimmune', 'Thyroid Disorder', 'Cancer (past/present)', 'None of the above'];
const lifestyleOptions = ['Smoker', 'Occasional Smoking', 'Regular Drinker', 'Social Drinker', 'Regular Exercise', 'Sedentary Lifestyle'];
const allergyOptions = ['Penicillin', 'Latex', 'Iodine', 'Aspirin', 'Sulfa Drugs', 'Anesthesia', 'None known'];
const culturalOptions = ['Female doctor preference', 'Halal dietary needs', 'Kosher dietary needs', 'Prayer accommodations', 'No male attendants', 'Language interpreter'];

export default function MedicalProfileModule() {
  const [medHistory, setMedHistory] = useState([]);
  const [lifestyle, setLifestyle] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [cultural, setCultural] = useState([]);
  const [saved, setSaved] = useState(false);

  const toggle = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Medical Profile</h2>
        <p className="text-xs text-slate-400 mt-0.5">Your health information — kept secure and private</p>
      </div>

      {/* SAFE-T Risk Summary */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">SAFE-T 4LIFE™ Risk Assessment</h3>
            <p className="text-xs text-slate-400">Intelligent safety analysis of your health profile</p>
          </div>
        </div>
        <div className="space-y-3 mb-4">
          {riskScores.map(s => <ScoreBar key={s.label} {...s} />)}
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">2 Active Risk Alerts</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Smoking cessation recommended · Medication review required</p>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-700" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Personal Information</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Full Name', placeholder: 'Maria Lopez' },
            { label: 'Date of Birth', placeholder: '1985-03-14', type: 'date' },
            { label: 'Nationality', placeholder: 'American' },
            { label: 'Occupation', placeholder: 'Teacher' },
            { label: 'Emergency Contact Name', placeholder: 'John Lopez' },
            { label: 'Emergency Contact Number', placeholder: '+1 (555) 000-0000' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                placeholder={f.placeholder}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Medical History */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Medical History</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">Select all that apply to your current or past medical history.</p>
        <div className="flex flex-wrap gap-2">
          {medHistoryOptions.map(opt => (
            <button
              key={opt}
              onClick={() => toggle(medHistory, setMedHistory, opt)}
              className={`text-xs px-3 py-2 rounded-full border font-medium transition-all ${
                medHistory.includes(opt) ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-red-50'
              }`}
            >{opt}</button>
          ))}
        </div>
      </div>

      {/* Lifestyle */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Lifestyle Assessment</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {lifestyleOptions.map(opt => (
            <button
              key={opt}
              onClick={() => toggle(lifestyle, setLifestyle, opt)}
              className={`text-xs px-3 py-2 rounded-full border font-medium transition-all ${
                lifestyle.includes(opt) ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
              }`}
            >{opt}</button>
          ))}
        </div>

        {/* Pregnancy */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-600 mb-2">Pregnancy Status</p>
          <div className="flex gap-2">
            {['Not pregnant', 'Pregnant', 'Possibly pregnant', 'Post-partum (< 6 months)'].map(opt => (
              <button key={opt} className="text-xs px-3 py-2 rounded-full border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 font-medium">{opt}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Allergies */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Allergies & Sensitivities</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {allergyOptions.map(opt => (
            <button
              key={opt}
              onClick={() => toggle(allergies, setAllergies, opt)}
              className={`text-xs px-3 py-2 rounded-full border font-medium transition-all ${
                allergies.includes(opt) ? 'bg-violet-700 text-white border-violet-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-violet-50'
              }`}
            >{opt}</button>
          ))}
        </div>
      </div>

      {/* Mental Health & Cultural */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-sky-600" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Mental Health Considerations</h3>
          </div>
          <div className="space-y-2">
            {['Anxiety / Stress concerns', 'Depression (past or current)', 'Procedure-related fear', 'No mental health concerns'].map(opt => (
              <label key={opt} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-100">
                <input type="checkbox" className="rounded" />
                <span className="text-xs text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <User className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Cultural & Religious Preferences</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {culturalOptions.map(opt => (
              <button
                key={opt}
                onClick={() => toggle(cultural, setCultural, opt)}
                className={`text-xs px-3 py-2 rounded-full border font-medium transition-all ${
                  cultural.includes(opt) ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
                }`}
              >{opt}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-8"
          onClick={() => setSaved(true)}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved!</> : 'Save Medical Profile'}
        </Button>
      </div>
    </div>
  );
}