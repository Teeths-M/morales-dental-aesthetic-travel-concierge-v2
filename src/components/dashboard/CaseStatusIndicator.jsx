import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  CheckCircle2, FileText, Plane, HeartPulse,
  Shield, Star, CreditCard, Stethoscope, AlertTriangle, Loader2
} from 'lucide-react';

// Maps pipeline CaseRecord statuses to ordered steps
const PIPELINE_STEPS = [
  {
    key: 'submitted',
    label: 'Application Received',
    detail: 'Your request is in our system.',
    icon: FileText,
    match: ['Submitted'],
  },
  {
    key: 'safety',
    label: 'Safety Assessment',
    detail: 'SAFE-T 4LIFE™ risk check completed.',
    icon: Shield,
    match: ['Safe-T-Reviewed'],
  },
  {
    key: 'doctor',
    label: 'Specialist Assigned',
    detail: 'A board-certified doctor has been matched.',
    icon: Stethoscope,
    match: ['Doctor-Pending', 'Vendor-Pending', 'Admin-Review'],
  },
  {
    key: 'proposal',
    label: 'Package Proposal',
    detail: 'Your personalised travel package is ready.',
    icon: Star,
    match: ['Proposal-Sent', 'PMP-25', 'PMP-50'],
  },
  {
    key: 'payment',
    label: 'Payment Confirmed',
    detail: 'Deposit received — logistics underway.',
    icon: CreditCard,
    match: ['Deposit-Paid'],
  },
  {
    key: 'travel',
    label: 'Travel Coordination',
    detail: 'Flights, hotel and transfers being arranged.',
    icon: Plane,
    match: ['Travel-Coordination', 'Ready-For-Travel'],
  },
  {
    key: 'procedure',
    label: 'Procedure',
    detail: 'You are at the clinic for your procedure.',
    icon: HeartPulse,
    match: ['Procedure-In-Progress', 'SURGICAL_EXECUTION_WINDOW'],
  },
  {
    key: 'recovery',
    label: 'Recovery & Aftercare',
    detail: 'Monitored recovery and aftercare support.',
    icon: HeartPulse,
    match: ['RECOVERY_PHASE_7_DAY', 'Recovery'],
  },
  {
    key: 'complete',
    label: 'Journey Complete',
    detail: 'Your medical journey is complete!',
    icon: CheckCircle2,
    match: ['Completed'],
  },
];

const ALERT_STATUSES = {
  'Admin-Review': { label: 'Under Review', color: '#EC4899', note: 'Our medical team is reviewing your case — no action needed.' },
  'waiver_refused': { label: 'Action Required', color: '#EF4444', note: 'A required waiver was refused. Please contact your coordinator.' },
  'companion_required_pending': { label: 'Companion Required', color: '#F59E0B', note: 'A travel companion is required for your safety. Contact us to arrange.' },
};

function getStepIndex(caseStatus) {
  for (let i = PIPELINE_STEPS.length - 1; i >= 0; i--) {
    if (PIPELINE_STEPS[i].match.includes(caseStatus)) return i;
  }
  return 0;
}

export default function CaseStatusIndicator({ caseStatus: consultationStatus, userEmail }) {
  // Fetch the real CaseRecord status from the pipeline
  const { data: caseRecord, isLoading } = useQuery({
    queryKey: ['case-record-status', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const cases = await base44.entities.CaseRecord.filter(
        { client_email: userEmail },
        '-created_date',
        1
      );
      return cases[0] || null;
    },
    enabled: !!userEmail,
    staleTime: 60000,
  });

  const activeStatus = caseRecord?.status || consultationStatus || 'Submitted';
  const currentStepIndex = useMemo(() => getStepIndex(activeStatus), [activeStatus]);
  const alert = ALERT_STATUSES[activeStatus];
  const isComplete = activeStatus === 'Completed';

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500">Loading your journey status…</span>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400 mb-1">Your Journey</p>
            <h3 className="text-base font-semibold text-slate-800" style={{ letterSpacing: '-0.01em' }}>
              {isComplete ? '🎉 Journey Complete!' : `Step ${currentStepIndex + 1} of ${PIPELINE_STEPS.length}`}
            </h3>
          </div>
          <div
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full border"
            style={{
              background: isComplete ? '#F0FDF4' : '#EFF6FF',
              color: isComplete ? '#16A34A' : '#2563EB',
              borderColor: isComplete ? '#BBF7D0' : '#BFDBFE',
            }}
          >
            {PIPELINE_STEPS[currentStepIndex]?.label}
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-4">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(((currentStepIndex + 1) / PIPELINE_STEPS.length) * 100)}%` }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">Application Received</span>
            <span className="text-[10px] font-semibold text-emerald-600">
              {Math.round(((currentStepIndex + 1) / PIPELINE_STEPS.length) * 100)}% complete
            </span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className="px-5 py-3 text-xs font-medium flex items-center gap-2"
          style={{ background: `${alert.color}12`, color: alert.color, borderBottom: `1px solid ${alert.color}20` }}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span><strong>{alert.label}:</strong> {alert.note}</span>
        </div>
      )}

      {/* Step list */}
      <div className="px-5 py-4 space-y-1">
        {PIPELINE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isCompleted = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          const _isUpcoming = i > currentStepIndex;

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Icon column */}
              <div className="flex flex-col items-center" style={{ minWidth: 32 }}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                    ${isCompleted ? 'bg-emerald-500' : isCurrent ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-100'}`}
                >
                  {isCompleted
                    ? <CheckCircle2 className="w-4 h-4 text-white" />
                    : isCurrent
                    ? <Icon className="w-4 h-4 text-white" />
                    : <Icon className="w-4 h-4 text-slate-300" />}
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className={`w-0.5 flex-1 my-1 rounded-full ${isCompleted ? 'bg-emerald-300' : 'bg-slate-100'}`} style={{ minHeight: 16 }} />
                )}
              </div>

              {/* Label column */}
              <div className={`pb-3 pt-1 flex-1 ${i < PIPELINE_STEPS.length - 1 ? '' : ''}`}>
                <p className={`text-sm font-semibold leading-tight
                  ${isCompleted ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : 'text-slate-300'}`}>
                  {step.label}
                </p>
                {isCurrent && (
                  <motion.p
                    className="text-xs text-slate-500 mt-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {step.detail}
                  </motion.p>
                )}
              </div>

              {/* Status badge */}
              <div className="pt-1.5">
                {isCompleted && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Done</span>
                )}
                {isCurrent && !isComplete && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    Now
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}