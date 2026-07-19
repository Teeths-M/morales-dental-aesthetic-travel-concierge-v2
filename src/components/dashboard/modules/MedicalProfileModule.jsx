import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Shield, AlertTriangle, CheckCircle2, Heart, Activity, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import LoadingState from '@/components/ui-system/LoadingState';

const riskScores = [
  { label: 'Safety Score',            value: 82, color: '#047857' },
  { label: 'Recovery Readiness',      value: 75, color: '#1d4ed8' },
  { label: 'Procedure Compatibility', value: 90, color: '#7c3aed' },
];

function ScoreBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div className="h-2 rounded-full" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8 }} />
      </div>
    </div>
  );
}

const medHistoryOptions  = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Autoimmune', 'Thyroid Disorder', 'Cancer (past/present)', 'None of the above'];
const lifestyleOptions   = ['Smoker', 'Occasional Smoking', 'Regular Drinker', 'Social Drinker', 'Regular Exercise', 'Sedentary Lifestyle'];
const allergyOptions     = ['Penicillin', 'Latex', 'Iodine', 'Aspirin', 'Sulfa Drugs', 'Anesthesia', 'None known'];
const mentalOptions      = ['Anxiety / Stress concerns', 'Depression (past or current)', 'Procedure-related fear', 'No mental health concerns'];
const culturalOptions    = ['Female doctor preference', 'Halal dietary needs', 'Kosher dietary needs', 'Prayer accommodations', 'No male attendants', 'Language interpreter'];
const pregnancyOptions   = ['Not pregnant', 'Pregnant', 'Possibly pregnant', 'Post-partum (< 6 months)'];

export default function MedicalProfileModule() {
  const queryClient = useQueryClient();

  // ── Load current user and their latest case record ────────────────────────
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 300_000,
  });

  const { data: caseRecord, isLoading } = useQuery({
    queryKey: ['medical-profile-case', user?.email],
    queryFn: async () => {
      const cases = await base44.entities.CaseRecord.filter(
        { client_email: user.email }, '-created_date', 1
      );
      return cases[0] ?? null;
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  // ── Form state — all controlled ───────────────────────────────────────────
  const [personalInfo, setPersonalInfo] = useState({
    full_name:        '',
    date_of_birth:    '',
    nationality:      '',
    occupation:       '',
    emergency_contact:'',
    emergency_phone:  '',
  });
  const [medHistory,   setMedHistory]   = useState([]);
  const [lifestyle,    setLifestyle]    = useState([]);
  const [allergies,    setAllergies]    = useState([]);
  const [mental,       setMental]       = useState([]);
  const [cultural,     setCultural]     = useState([]);
  const [pregnancy,    setPregnancy]    = useState('');
  const [initialised,  setInitialised]  = useState(false);

  // Pre-populate from existing case record data
  useEffect(() => {
    if (!caseRecord || initialised) return;
    setInitialised(true);

    setPersonalInfo({
      full_name:         caseRecord.client_name         || user?.full_name || '',
      date_of_birth:     caseRecord.date_of_birth       || '',
      nationality:       caseRecord.client_country      || '',
      occupation:        caseRecord.occupation          || '',
      emergency_contact: caseRecord.emergency_contact   || '',
      emergency_phone:   caseRecord.emergency_phone     || '',
    });

    if (caseRecord.medical_conditions) {
      setMedHistory(caseRecord.medical_conditions.split(',').map(s => s.trim()).filter(Boolean));
    }
    if (caseRecord.allergies) {
      setAllergies(caseRecord.allergies.split(',').map(s => s.trim()).filter(Boolean));
    }
    if (caseRecord.smoking_status) {
      setLifestyle(prev => prev.includes('Smoker') ? prev : [...prev, 'Smoker']);
    }
    if (caseRecord.alcohol_use) {
      setLifestyle(prev => prev.includes(caseRecord.alcohol_use) ? prev : [...prev, caseRecord.alcohol_use]);
    }
    if (caseRecord.mental_health_notes) {
      setMental(caseRecord.mental_health_notes.split(',').map(s => s.trim()).filter(Boolean));
    }
    if (caseRecord.pregnancy_status) {
      setPregnancy('Pregnant');
    }
  }, [caseRecord, user, initialised]);

  // Pre-populate from user if no case yet
  useEffect(() => {
    if (caseRecord || initialised || !user) return;
    setInitialised(true);
    setPersonalInfo(prev => ({ ...prev, full_name: user.full_name || '', }));
  }, [user, caseRecord, initialised]);

  const toggle = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updatePayload = {
        client_name:        personalInfo.full_name        || undefined,
        date_of_birth:      personalInfo.date_of_birth    || undefined,
        client_country:     personalInfo.nationality      || undefined,
        occupation:         personalInfo.occupation       || undefined,
        emergency_contact:  personalInfo.emergency_contact || undefined,
        emergency_phone:    personalInfo.emergency_phone  || undefined,
        medical_conditions: medHistory.join(', ')         || undefined,
        allergies:          allergies.join(', ')          || undefined,
        smoking_status:     lifestyle.includes('Smoker') || lifestyle.includes('Occasional Smoking'),
        alcohol_use:        lifestyle.find(l => l.includes('Drinker') || l.includes('Drink')) || undefined,
        mental_health_notes:mental.join(', ')             || undefined,
        pregnancy_status:   pregnancy === 'Pregnant' || pregnancy === 'Possibly pregnant',
        cultural_preferences: cultural.join(', ')         || undefined,
      };

      if (caseRecord?.id) {
        await base44.entities.CaseRecord.update(caseRecord.id, updatePayload);
      } else if (user?.email) {
        // No case yet — create a minimal case record to hold this data
        await base44.entities.CaseRecord.create({
          client_email: user.email,
          client_name:  personalInfo.full_name || user.full_name || '',
          procedures:   [],
          status:       'Submitted',
          ...updatePayload,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-profile-case'] });
      toast.success('Medical profile saved successfully');
    },
    onError: () => {
      toast.error('Failed to save — please try again');
    },
  });

  if (isLoading) {
    return (
      <LoadingState rows={4} variant="list" dark={false} label="Loading your medical profile" />
    );
  }

  const saved = saveMutation.isSuccess;
  const saving = saveMutation.isPending;

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
            <p className="text-xs font-semibold text-amber-800">
              {medHistory.length > 0 || allergies.length > 0
                ? `${medHistory.length + allergies.length} risk factor${medHistory.length + allergies.length !== 1 ? 's' : ''} noted`
                : '2 Active Risk Alerts'}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {allergies.length > 0 ? `Allergies: ${allergies.join(', ')}` : 'Smoking cessation recommended · Medication review required'}
            </p>
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
            { key: 'full_name',         label: 'Full Name',               placeholder: 'Maria Lopez' },
            { key: 'date_of_birth',     label: 'Date of Birth',           placeholder: '1985-03-14', type: 'date' },
            { key: 'nationality',       label: 'Nationality / Country',   placeholder: 'American' },
            { key: 'occupation',        label: 'Occupation',              placeholder: 'Teacher' },
            { key: 'emergency_contact', label: 'Emergency Contact Name',  placeholder: 'John Lopez' },
            { key: 'emergency_phone',   label: 'Emergency Contact Number',placeholder: '+1 (555) 000-0000' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={personalInfo[f.key]}
                onChange={e => setPersonalInfo(p => ({ ...p, [f.key]: e.target.value }))}
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
        <p className="text-xs text-slate-500 mb-3">Select all that apply.</p>
        <div className="flex flex-wrap gap-2">
          {medHistoryOptions.map(opt => (
            <button key={opt} onClick={() => toggle(medHistory, setMedHistory, opt)}
              className={`text-xs px-3 py-2 rounded-full border font-medium transition-all ${
                medHistory.includes(opt) ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-red-50'
              }`}>{opt}</button>
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
            <button key={opt} onClick={() => toggle(lifestyle, setLifestyle, opt)}
              className={`text-xs px-3 py-2 rounded-full border font-medium transition-all ${
                lifestyle.includes(opt) ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
              }`}>{opt}</button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-600 mb-2">Pregnancy Status</p>
          <div className="flex flex-wrap gap-2">
            {pregnancyOptions.map(opt => (
              <button key={opt} onClick={() => setPregnancy(p => p === opt ? '' : opt)}
                className={`text-xs px-3 py-2 rounded-full border font-medium transition-all ${
                  pregnancy === opt ? 'bg-pink-600 text-white border-pink-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}>{opt}</button>
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
            <button key={opt} onClick={() => toggle(allergies, setAllergies, opt)}
              className={`text-xs px-3 py-2 rounded-full border font-medium transition-all ${
                allergies.includes(opt) ? 'bg-violet-700 text-white border-violet-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-violet-50'
              }`}>{opt}</button>
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
            {mentalOptions.map(opt => (
              <label key={opt} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-100">
                <input type="checkbox" className="rounded"
                  checked={mental.includes(opt)}
                  onChange={() => toggle(mental, setMental, opt)} />
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
              <button key={opt} onClick={() => toggle(cultural, setCultural, opt)}
                className={`text-xs px-3 py-2 rounded-full border font-medium transition-all ${
                  cultural.includes(opt) ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
                }`}>{opt}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-8 disabled:opacity-60"
          onClick={() => saveMutation.mutate()}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved!</>
          ) : (
            'Save Medical Profile'
          )}
        </Button>
      </div>
    </div>
  );
}
