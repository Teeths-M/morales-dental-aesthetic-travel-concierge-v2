import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, UserCheck, Package, FileText, Plane, CheckCircle, Activity, Heart, Archive, ShieldCheck } from 'lucide-react';

const STAGES = [
  { status: 'Submitted',            label: 'Submitted',           icon: Clock,        bg: 'bg-slate-100',   text: 'text-slate-600',   bar: 'bg-slate-400' },
  { status: 'Safe-T-Reviewed',      label: 'SAFE-T Reviewed',     icon: ShieldCheck,  bg: 'bg-blue-100',    text: 'text-blue-600',    bar: 'bg-blue-400' },
  { status: 'Doctor-Pending',       label: 'Doctor Confirmation', icon: UserCheck,    bg: 'bg-amber-100',   text: 'text-amber-600',   bar: 'bg-amber-400' },
  { status: 'Vendor-Pending',       label: 'Vendor Pending',      icon: Package,      bg: 'bg-purple-100',  text: 'text-purple-600',  bar: 'bg-purple-400' },
  { status: 'Admin-Review',         label: 'Admin Review',        icon: Clock,        bg: 'bg-orange-100',  text: 'text-orange-600',  bar: 'bg-orange-400' },
  { status: 'Proposal-Sent',        label: 'Proposal Sent',       icon: FileText,     bg: 'bg-indigo-100',  text: 'text-indigo-600',  bar: 'bg-indigo-400' },
  { status: 'Travel-Coordination',  label: 'Travel Planning',     icon: Plane,        bg: 'bg-cyan-100',    text: 'text-cyan-600',    bar: 'bg-cyan-400' },
  { status: 'Ready-For-Travel',     label: 'Ready for Travel',    icon: CheckCircle,  bg: 'bg-emerald-100', text: 'text-emerald-600', bar: 'bg-emerald-400' },
  { status: 'Procedure-In-Progress',label: 'In Procedure',        icon: Activity,     bg: 'bg-red-100',     text: 'text-red-600',     bar: 'bg-red-400' },
  { status: 'Recovery',             label: 'Recovery',            icon: Heart,        bg: 'bg-violet-100',  text: 'text-violet-600',  bar: 'bg-violet-400' },
  { status: 'Completed',            label: 'Completed',           icon: Archive,      bg: 'bg-slate-100',   text: 'text-slate-500',   bar: 'bg-slate-300' },
];

export default function JourneyStageSummary({ cases }) {
  const counts = STAGES.map(stage => ({
    ...stage,
    count: cases.filter(c => c.status === stage.status).length,
  }));

  const maxCount = Math.max(...counts.map(s => s.count), 1);

  return (
    <Card className="bg-white border-0 shadow-md rounded-2xl">
      <CardContent className="pt-5 pb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Pipeline at a Glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-3">
          {counts.map((stage) => {
            const Icon = stage.icon;
            return (
              <div key={stage.status} className="flex flex-col items-center gap-1.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl ${stage.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${stage.text}`} />
                </div>
                <span className={`text-2xl font-semibold ${stage.count > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                  {stage.count}
                </span>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stage.bar} transition-all duration-500`}
                    style={{ width: `${(stage.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 text-center leading-tight">{stage.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}