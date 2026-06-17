import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, FileText, Plane, HeartPulse, Shield } from 'lucide-react';

const STATUS_CONFIG = {
  // Initial Phase
  'Submitted': {
    phase: 'Initial Review',
    color: '#3B82F6',
    icon: FileText,
    description: 'Your case has been submitted and is awaiting review',
    progress: 10
  },
  'Safe-T-Reviewed': {
    phase: 'Safety Assessment',
    color: '#10B981',
    icon: Shield,
    description: 'SAFE-T risk assessment completed successfully',
    progress: 20
  },
  // Doctor Matching Phase
  'Doctor-Pending': {
    phase: 'Doctor Matching',
    color: '#8B5CF6',
    icon: Clock,
    description: 'We\'re matching you with the best specialist for your procedure',
    progress: 30
  },
  'Vendor-Pending': {
    phase: 'Vendor Coordination',
    color: '#F59E0B',
    icon: Clock,
    description: 'Coordinating with travel and accommodation partners',
    progress: 35
  },
  // Admin Review
  'Admin-Review': {
    phase: 'Final Review',
    color: '#EC4899',
    icon: AlertTriangle,
    description: 'Your case is under administrative review',
    progress: 40
  },
  // Proposal Phase
  'Proposal-Sent': {
    phase: 'Proposal Review',
    color: '#3B82F6',
    icon: FileText,
    description: 'Your personalized treatment proposal has been sent',
    progress: 50
  },
  'PMP-25': {
    phase: 'Payment Plan (25%)',
    color: '#10B981',
    icon: Clock,
    description: '25% deposit payment plan active',
    progress: 55
  },
  'PMP-50': {
    phase: 'Payment Plan (50%)',
    color: '#10B981',
    icon: Clock,
    description: '50% deposit payment plan active',
    progress: 60
  },
  'Deposit-Paid': {
    phase: 'Deposit Confirmed',
    color: '#10B981',
    icon: CheckCircle2,
    description: 'Your deposit has been received and confirmed',
    progress: 65
  },
  // Travel Coordination
  'Travel-Coordination': {
    phase: 'Travel Arrangements',
    color: '#3B82F6',
    icon: Plane,
    description: 'Coordinating your flights, hotel, and transfers',
    progress: 70
  },
  'Ready-For-Travel': {
    phase: 'Ready to Travel',
    color: '#10B981',
    icon: CheckCircle2,
    description: 'Everything is confirmed - you\'re ready to travel!',
    progress: 80
  },
  // Procedure Phase
  'Procedure-In-Progress': {
    phase: 'Procedure Execution',
    color: '#8B5CF6',
    icon: HeartPulse,
    description: 'Your procedure is currently in progress',
    progress: 90
  },
  'SURGICAL_EXECUTION_WINDOW': {
    phase: 'Surgical Phase',
    color: '#EC4899',
    icon: HeartPulse,
    description: 'Active surgical procedure window',
    progress: 92
  },
  // Recovery Phase
  'RECOVERY_PHASE_7_DAY': {
    phase: 'Critical Recovery (7 Days)',
    color: '#F59E0B',
    icon: HeartPulse,
    description: 'First 7 days of recovery - critical monitoring period',
    progress: 95
  },
  'Recovery': {
    phase: 'Recovery',
    color: '#10B981',
    icon: HeartPulse,
    description: 'You\'re in the recovery phase',
    progress: 95
  },
  // Completion
  'Completed': {
    phase: 'Journey Complete',
    color: '#10B981',
    icon: CheckCircle2,
    description: 'Your medical journey has been completed successfully',
    progress: 100
  },
  // Special Cases
  'waiver_refused': {
    phase: 'Waiver Required',
    color: '#EF4444',
    icon: AlertTriangle,
    description: 'A required waiver has been refused - action needed',
    progress: 50
  },
  'companion_required_pending': {
    phase: 'Companion Required',
    color: '#F59E0B',
    icon: AlertTriangle,
    description: 'A travel companion is required for your case',
    progress: 40
  },
  'companion_required_waived': {
    phase: 'Companion Waived',
    color: '#3B82F6',
    icon: CheckCircle2,
    description: 'Companion requirement has been waived',
    progress: 45
  }
};

export default function CaseStatusIndicator({ caseStatus }) {
  const config = useMemo(() => 
    STATUS_CONFIG[caseStatus] || STATUS_CONFIG['Submitted'],
    [caseStatus]
  );

  const Icon = config.icon;

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border shadow-lg"
      style={{
        background: `linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%)`,
        borderColor: `${config.color}40`
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Ambient glow effect */}
      <div 
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-20 blur-3xl"
        style={{ background: config.color }}
      />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ 
                background: `${config.color}15`,
                border: `1px solid ${config.color}40`
              }}
            >
              <Icon className="w-7 h-7" style={{ color: config.color }} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/50 mb-1.5">
                Current Status
              </p>
              <h3 className="text-xl font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>
                {caseStatus.replace(/-/g, ' ')}
              </h3>
              <p className="text-[14px] text-white/60 mt-1" style={{ fontWeight: 300 }}>
                {config.description}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: `${config.color}20`,
                color: config.color,
                border: `1px solid ${config.color}30`
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
              {config.phase}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] mb-2">
            <span className="text-white/40 uppercase tracking-[0.2em] font-semibold">Journey Progress</span>
            <span className="text-white/70 font-bold">{config.progress}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${config.color} 0%, ${config.color}CC 100%)` }}
              initial={{ width: 0 }}
              animate={{ width: `${config.progress}%` }}
              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* Status Timeline Indicators */}
        <div className="flex items-center gap-2 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
            <span className="text-[12px] text-white/70 font-medium">Active Phase</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[12px] text-white/50">Real-time Updates</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}