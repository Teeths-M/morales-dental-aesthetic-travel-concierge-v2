import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  User, MapPin, Calendar, Stethoscope, Upload, MessageCircle,
  CheckCircle2, Clock, AlertTriangle, FileText, Plane, ArrowRight,
  Star, Shield, TrendingUp, ClipboardList, HeartHandshake
} from 'lucide-react';

const timelineSteps = [
  { label: 'Consultation', sub: 'Initial intake complete', done: true },
  { label: 'Documents', sub: 'Awaiting uploads', done: false, active: true },
  { label: 'Doctor Review', sub: 'Pending document submission', done: false },
  { label: 'Travel Planning', sub: 'Not started', done: false },
  { label: 'Procedure Scheduled', sub: 'Pending review', done: false },
  { label: 'Recovery Planning', sub: 'Not started', done: false },
  { label: 'Post-Care Follow-up', sub: 'Not started', done: false },
];

const actions = [
  { icon: Upload, label: 'Upload Documents', to: '/booking', accent: true },
  { icon: MessageCircle, label: 'Message Coordinator', to: '/booking' },
  { icon: Calendar, label: 'Book Consultation', to: '/booking' },
  { icon: Plane, label: 'View Travel Plan', to: '/booking' },
  { icon: ClipboardList, label: 'Preparation Checklist', to: '/booking' },
];

function ScoreRing({ score, label, color }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#e8f0ee" strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-slate-800">{score}%</span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

const PROCEDURE_LABELS = {
  dental_implants: 'Dental Implants',
  all_on_4: 'All-on-4',
  porcelain_veneers: 'Porcelain Veneers',
  smile_makeover: 'Smile Makeover',
  bone_regeneration: 'Bone Regeneration',
  teeth_whitening: 'Teeth Whitening',
  rhinoplasty: 'Rhinoplasty',
  breast_surgery: 'Breast Surgery',
  liposuction: 'Liposuction',
  tummy_tuck: 'Tummy Tuck',
  facelift: 'Facelift',
  brow_lift: 'Brow Lift',
  blepharoplasty: 'Blepharoplasty',
  otoplasty: 'Otoplasty',
  thigh_arm_lift: 'Thigh / Arm Lift',
  laser_resurfacing: 'Laser Resurfacing',
  mole_removal: 'Mole Removal',
  lipoma_removal: 'Lipoma Removal',
  gastric_sleeve: 'Gastric Sleeve',
  gastric_bypass: 'Gastric Bypass',
  gastric_band_revision: 'Gastric Band Revision',
  gynecological_exams: 'Gynecological Exams',
  ivf: 'IVF',
  egg_freezing: 'Egg Freezing',
  oncology_surgery: 'Oncology Surgery',
  tumor_testing: 'Tumor Testing',
  joint_replacement: 'Joint Replacement',
  spine_surgery: 'Spine Surgery',
  sports_arthroscopy: 'Sports Arthroscopy',
  fracture_surgery: 'Fracture Surgery',
  other: 'Other / Not Listed',
};

const formatProcedure = (val) =>
  PROCEDURE_LABELS[val] || (val ? val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'N/A');

export default function OverviewTab() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: safeTProfile, isLoading } = useQuery({
    queryKey: ['safeTProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.SafeTProfile.filter({ patient_email: user.email }, '-created_at', 1);
      return profiles?.[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: consultation } = useQuery({
    queryKey: ['consultation', safeTProfile?.consultation_id],
    queryFn: async () => {
      if (!safeTProfile?.consultation_id) return null;
      return await base44.entities.Consultation.get(safeTProfile.consultation_id);
    },
    enabled: !!safeTProfile?.consultation_id,
  });

  const riskScores = {
    low: 85,
    medium: 65,
    high: 40,
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading SAFE-T profile...</div>;
  }

  if (!safeTProfile) {
    return <div className="text-center py-12 text-slate-500">No SAFE-T profile found. Book a consultation to get started.</div>;
  }

  const alerts = safeTProfile.risk_factors?.map((factor, i) => ({
    type: safeTProfile.risk_level === 'high' ? 'warning' : 'info',
    text: factor,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Patient Card + Safety Scores */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Patient Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Patient Overview</h3>
              <p className="text-xs text-slate-400">Your healthcare journey snapshot</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: User, label: 'Patient', value: safeTProfile.patient_name },
              { icon: Stethoscope, label: 'Procedure Interest', value: formatProcedure(safeTProfile.procedure || consultation?.procedure_interest) },
              { icon: Star, label: 'Risk Level', value: safeTProfile.risk_level?.toUpperCase() || 'PENDING' },
              { icon: Stethoscope, label: 'Age', value: safeTProfile.health_summary?.age || 'N/A' },
              { icon: MapPin, label: 'Travel Destination', value: safeTProfile.destination || 'TBD' },
              { icon: Calendar, label: 'Consultation Date', value: consultation?.created_date?.split('T')[0] || 'N/A' },
              { icon: Calendar, label: 'Preferred Procedure Date', value: consultation?.preferred_date || 'TBD' },
              { icon: Clock, label: 'Medical Conditions', value: safeTProfile.health_summary?.medical_conditions?.join(', ') || 'None' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3">
                <Icon className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-slate-700">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Scores */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">SAFE-T 4LIFE™</h3>
              <p className="text-xs text-slate-400">Safety readiness status</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ScoreRing score={riskScores[safeTProfile.risk_level] || 50} label="Safety Readiness" color="#047857" />
            <ScoreRing score={Math.min(safeTProfile.preparation_checklist?.filter(t => t.completed).length / safeTProfile.preparation_checklist?.length * 100 || 0, 100)} label="Prep Progress" color="#1d4ed8" />
            <ScoreRing score={75} label="Recovery Readiness" color="#7c3aed" />
            <ScoreRing score={safeTProfile.health_summary?.medical_conditions?.length ? 40 : 85} label="Health Status" color="#d97706" />
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> {safeTProfile.risk_factors?.length || 0} risk factors identified
            </p>
          </div>
        </div>
      </div>

      {/* Journey Timeline */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-violet-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Your Journey Timeline</h3>
            <p className="text-xs text-slate-400">Track each milestone in your care journey</p>
          </div>
        </div>
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100 hidden sm:block" />
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
            {timelineSteps.map((step, i) => (
              <motion.div
                key={step.label}
                className="flex flex-col items-center text-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                  ${step.done ? 'bg-emerald-600 border-emerald-600' :
                    step.active ? 'bg-white border-blue-500 ring-4 ring-blue-50' :
                    'bg-white border-slate-200'}`}>
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <span className={`text-xs font-bold ${step.active ? 'text-blue-600' : 'text-slate-300'}`}>{i + 1}</span>
                  )}
                </div>
                <div>
                  <p className={`text-[11px] font-semibold ${step.done ? 'text-emerald-700' : step.active ? 'text-blue-700' : 'text-slate-400'}`}>{step.label}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{step.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Quick Alerts</h3>
              <p className="text-xs text-slate-400">Action items for your safety</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {alerts.length > 0 ? alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border
                ${a.type === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${a.type === 'warning' ? 'text-amber-600' : 'text-blue-500'}`} />
                <p className={`text-xs font-medium ${a.type === 'warning' ? 'text-amber-800' : 'text-blue-800'}`}>{a.text}</p>
              </div>
            )) : (
              <div className="flex items-start gap-3 rounded-xl px-3 py-2.5 border bg-emerald-50 border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
                <p className="text-xs font-medium text-emerald-800">No identified risk factors</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Quick Actions</h3>
              <p className="text-xs text-slate-400">Next steps in your journey</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {actions.map(({ icon: Icon, label, to, accent }) => (
              <Link key={label} to={to}>
                <button className={`w-full flex flex-col items-center gap-2 rounded-xl p-3 border text-center transition-all hover:shadow-md
                  ${accent ? 'bg-emerald-700 border-emerald-700 text-white hover:bg-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'}`}>
                  <Icon className={`w-4 h-4 ${accent ? 'text-white' : 'text-emerald-600'}`} />
                  <span className="text-[11px] font-medium leading-tight">{label}</span>
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Emotional Support */}
      <div className="bg-gradient-to-r from-emerald-800 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <HeartHandshake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-display text-xl mb-2">You Are Not Alone</h3>
            <p className="text-white/80 text-sm leading-relaxed max-w-2xl">
              You are not alone throughout this process. Your care team and SAFE-T 4LIFE™ are here to help guide 
              and organize your healthcare journey step-by-step — from your first consultation to your full recovery.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link to="/booking">
                <Button size="sm" className="bg-white text-emerald-800 hover:bg-white/90 font-semibold">
                  Begin Your Journey <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}