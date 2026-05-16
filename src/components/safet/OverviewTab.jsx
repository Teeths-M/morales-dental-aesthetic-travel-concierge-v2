import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  User, MapPin, Calendar, Stethoscope, Upload, MessageCircle,
  CheckCircle2, Clock, AlertTriangle, FileText, Plane, ArrowRight,
  Star, Shield, TrendingUp, ClipboardList, HeartHandshake, Heart, Pill
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

const alerts = [
  { type: 'warning', text: 'Lab work still required before procedure clearance' },
  { type: 'warning', text: 'Medication review pending with your care team' },
  { type: 'info', text: 'Smoking cessation strongly recommended 4 weeks prior' },
  { type: 'info', text: 'Companion support recommended for your procedure type' },
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

export default function OverviewTab() {
   return (
     <div className="space-y-6">
       {/* Hero Section with Image and Assistant Card */}
       <div className="grid lg:grid-cols-2 gap-5 items-center">
         {/* Left: Assistant Image */}
         <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-amber-900 to-amber-950 h-96 lg:h-full min-h-[500px]">
           <img 
             src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/06f0b367f_ChatGPTImageMay16202607_55_07AM.png"
             alt="SAFE-T 4LIFE Assistant"
             className="w-full h-full object-cover"
           />
         </div>

         {/* Right: Welcome Card */}
         <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 lg:p-8">
           <div className="mb-6">
             <h2 className="font-display text-3xl lg:text-4xl text-slate-800 mb-2">Welcome back, <span className="text-emerald-700">Sarah!</span> 👋</h2>
             <p className="text-slate-600">We're here to make your experience safe, smooth, and stress-free.</p>
           </div>

           {/* Journey Status */}
           <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
             <div className="flex items-center gap-3 mb-3">
               <div className="w-12 h-12 rounded-lg bg-emerald-700 flex items-center justify-center">
                 <CheckCircle2 className="w-6 h-6 text-white" />
               </div>
               <div>
                 <h3 className="font-semibold text-slate-800">Your Journey Status</h3>
                 <p className="text-emerald-700 font-bold text-lg">On Track</p>
               </div>
             </div>
             <p className="text-sm text-slate-700">You're doing great! Keep following your plan and don't hesitate to reach out.</p>
           </div>

           {/* Next Step */}
           <div className="border border-slate-200 rounded-xl p-4 mb-6">
             <div className="flex items-start justify-between mb-3">
               <div>
                 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Next Step</p>
                 <h4 className="font-bold text-slate-800">Pre-Op Consultation</h4>
               </div>
               <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
             </div>
             <p className="text-sm text-slate-600">May 24, 2025 | 10:00 AM</p>
           </div>

           {/* Quick Access Grid */}
           <div className="grid grid-cols-3 gap-3 mb-6">
             <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
               <Calendar className="w-5 h-5 text-slate-700" />
               <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">My Timeline</span>
             </button>
             <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
               <Pill className="w-5 h-5 text-slate-700" />
               <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">Medications</span>
             </button>
             <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
               <FileText className="w-5 h-5 text-slate-700" />
               <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">Documents</span>
             </button>
           </div>

           {/* Support Section */}
           <div className="grid grid-cols-3 gap-3">
             <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
               <MessageCircle className="w-5 h-5 text-slate-700" />
               <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">Messages</span>
             </button>
             <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
               <HeartHandshake className="w-5 h-5 text-slate-700" />
               <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">Support</span>
             </button>
             <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
               <AlertTriangle className="w-5 h-5 text-slate-700" />
               <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">Emergency</span>
             </button>
           </div>

           {/* Not Alone Message */}
           <div className="mt-6 bg-slate-50 border border-slate-100 rounded-xl p-4">
             <div className="flex items-start gap-3">
               <Heart className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
               <div>
                 <p className="font-semibold text-slate-800 text-sm mb-1">You're not alone.</p>
                 <p className="text-xs text-slate-600">Our team and your Patient Coordinator are always here for you.</p>
               </div>
             </div>
           </div>
         </div>
       </div>

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
              { icon: User, label: 'Patient', value: 'Maria Lopez' },
              { icon: Stethoscope, label: 'Procedure Interest', value: 'Porcelain Veneers' },
              { icon: Star, label: 'Assigned Coordinator', value: 'Ana Morales' },
              { icon: Stethoscope, label: 'Assigned Doctor', value: 'Dr. Ramirez, DDS' },
              { icon: MapPin, label: 'Travel Destination', value: 'Margarita Island, VE' },
              { icon: Calendar, label: 'Consultation Date', value: 'June 12, 2026' },
              { icon: Calendar, label: 'Procedure Date', value: 'TBD — Pending Review' },
              { icon: Clock, label: 'Recovery Estimate', value: '3–5 days post-procedure' },
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
            <ScoreRing score={82} label="Safety Readiness" color="#047857" />
            <ScoreRing score={60} label="Prep Progress" color="#1d4ed8" />
            <ScoreRing score={75} label="Recovery Readiness" color="#7c3aed" />
            <ScoreRing score={40} label="Docs Complete" color="#d97706" />
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> 2 items require attention
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
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border
                ${a.type === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${a.type === 'warning' ? 'text-amber-600' : 'text-blue-500'}`} />
                <p className={`text-xs font-medium ${a.type === 'warning' ? 'text-amber-800' : 'text-blue-800'}`}>{a.text}</p>
              </div>
            ))}
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