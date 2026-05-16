import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Upload, MessageCircle, Calendar, HeartPulse, Users,
  Shield, Bell, ArrowRight, CheckCircle2, Clock, AlertTriangle,
  Plane, Star
} from 'lucide-react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import JourneyProgress from '@/components/dashboard/JourneyProgress';
import ConsultationsModule from '@/components/dashboard/modules/ConsultationsModule';
import MedicalProfileModule from '@/components/dashboard/modules/MedicalProfileModule';
import DocumentsModule from '@/components/dashboard/modules/DocumentsModule';
import BookingsModule from '@/components/dashboard/modules/BookingsModule';
import MessagesModule from '@/components/dashboard/modules/MessagesModule';
import JourneyModule from '@/components/dashboard/modules/JourneyModule';
import SupportModule from '@/components/dashboard/modules/SupportModule';
import SettingsModule from '@/components/dashboard/modules/SettingsModule';

const notifications = [
  { type: 'warning', text: 'Lab work still required for medical clearance', time: '2h ago' },
  { type: 'info', text: 'Dr. Ramirez left a note on your consultation', time: '5h ago' },
  { type: 'success', text: 'Your hotel booking is confirmed for June 12', time: 'Yesterday' },
];

const quickActions = [
  { icon: Upload, label: 'Upload Documents', to: '/dashboard/documents', color: 'emerald' },
  { icon: MessageCircle, label: 'Message Coordinator', to: '/dashboard/messages', color: 'blue' },
  { icon: Calendar, label: 'Schedule Consultation', to: '/booking', color: 'violet' },
  { icon: HeartPulse, label: 'View Recovery Plan', to: '/safe-t', color: 'sky' },
  { icon: Users, label: 'Companion Package', to: '/dashboard/bookings', color: 'pink' },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-700', hover: 'hover:bg-emerald-100' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-700', hover: 'hover:bg-blue-100' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-700', hover: 'hover:bg-violet-100' },
  sky: { bg: 'bg-sky-50', icon: 'text-sky-700', hover: 'hover:bg-sky-100' },
  pink: { bg: 'bg-pink-50', icon: 'text-pink-600', hover: 'hover:bg-pink-100' },
};

function DashboardHome({ user, consultations }) {
  const displayName = user?.full_name?.split(' ')[0] || 'there';
  const latestConsultation = consultations[0];

  // Countdown to procedure
  const procedureDate = new Date('2026-06-14');
  const today = new Date();
  const daysUntil = Math.ceil((procedureDate - today) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        className="bg-gradient-to-r from-emerald-800 to-blue-900 rounded-2xl p-6 text-white shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Welcome back</p>
            <h1 className="font-display text-2xl lg:text-3xl">Hello, {displayName} 👋</h1>
            <p className="text-white/70 text-sm mt-1.5">
              Journey Stage: <span className="text-white font-semibold capitalize">{latestConsultation?.journey_stage || 'Consultation'}</span>
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 text-center">
            <p className="text-white/70 text-[11px] uppercase tracking-widest mb-1">Days Until Procedure</p>
            <p className="font-display text-4xl text-white">{daysUntil > 0 ? daysUntil : '—'}</p>
            <p className="text-white/60 text-[11px] mt-0.5">Jun 14, 2026</p>
          </div>
        </div>
      </motion.div>

      {/* Coordinator Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-700 to-blue-800 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Your Assigned Coordinator</p>
          <p className="text-sm font-bold text-slate-800">Ana Morales — Patient Care Specialist</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-[11px] text-emerald-600 font-medium">Online now</span>
          </div>
        </div>
        <Link to="/dashboard/messages">
          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9 gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Message
          </Button>
        </Link>
      </div>

      {/* SAFE-T Status */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">SAFE-T 4LIFE™ Status</p>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Low Risk</span>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          {[
            { label: 'Safety Score', val: 82, color: '#047857' },
            { label: 'Prep Progress', val: 60, color: '#1d4ed8' },
          ].map(s => (
            <div key={s.label}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-500">{s.label}</span>
                <span className="font-bold" style={{ color: s.color }}>{s.val}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${s.val}%`, backgroundColor: s.color }} />
              </div>
            </div>
          ))}
        </div>
        <Link to="/safe-t">
          <Button size="sm" variant="outline" className="w-full text-xs h-8">Full Assessment <ArrowRight className="w-3 h-3 ml-1" /></Button>
        </Link>
      </div>

      {/* Journey Progress */}
      <JourneyProgress currentStage={latestConsultation?.journey_stage || 'consultation'} />

      {/* Quick Actions */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {quickActions.map(({ icon: Icon, label, to, color }) => {
            const c = colorMap[color];
            return (
              <Link key={label} to={to}>
                <div className={`flex flex-col items-center gap-2 rounded-xl p-3.5 border border-slate-100 ${c.bg} ${c.hover} transition-all cursor-pointer text-center`}>
                  <Icon className={`w-5 h-5 ${c.icon}`} />
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight">{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-4 h-4 text-slate-500" />
          <p className="text-sm font-semibold text-slate-800">Notifications</p>
          <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{notifications.length}</span>
        </div>
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl px-3 py-3 border
              ${n.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                n.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
              {n.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /> :
               n.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> :
               <Bell className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className={`text-xs font-medium ${n.type === 'warning' ? 'text-amber-800' : n.type === 'success' ? 'text-emerald-800' : 'text-blue-800'}`}>{n.text}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: consultations = [] } = useQuery({
    queryKey: ['my-consultations', user?.email],
    queryFn: () => base44.entities.Consultation.filter(
      user?.email ? { email: user.email } : {},
      '-created_date', 10
    ),
    enabled: !!user,
  });

  const getModule = () => {
    const p = location.pathname;
    if (p === '/dashboard/consultations') return <ConsultationsModule consultations={consultations} />;
    if (p === '/dashboard/profile') return <MedicalProfileModule />;
    if (p === '/dashboard/documents') return <DocumentsModule />;
    if (p === '/dashboard/bookings') return <BookingsModule />;
    if (p === '/dashboard/messages') return <MessagesModule />;
    if (p === '/dashboard/journey') return <JourneyModule />;
    if (p === '/dashboard/support') return <SupportModule />;
    if (p === '/dashboard/settings') return <SettingsModule />;
    return <DashboardHome user={user} consultations={consultations} />;
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex-1 p-5 lg:p-8 overflow-y-auto max-w-5xl">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {getModule()}
        </motion.div>
      </main>
    </div>
  );
}