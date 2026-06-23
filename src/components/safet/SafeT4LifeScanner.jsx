import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, CheckCircle2, AlertTriangle, AlertOctagon,
  Activity, Zap, ArrowRight, RefreshCw
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import PatientIntakeTelemetry from './PatientIntakeTelemetry';
import HighRiskWaiverModal from './HighRiskWaiverModal';
import CriticalRiskInterceptModal from './CriticalRiskInterceptModal';

const TIER_CONFIG = {
  LOW: {
    label: 'Low Risk',
    sublabel: 'Cleared for pipeline progression',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    bar: 'bg-emerald-500',
    barWidth: '20%',
    gradient: 'from-emerald-600 to-teal-600',
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-800',
  },
  MEDIUM: {
    label: 'Medium Risk',
    sublabel: 'Minor factors noted — coordinator review',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    bar: 'bg-amber-400',
    barWidth: '50%',
    gradient: 'from-amber-500 to-orange-500',
    icon: AlertTriangle,
    badge: 'bg-amber-100 text-amber-800',
  },
  HIGH: {
    label: 'High Risk',
    sublabel: 'Mandatory waiver required before proceeding',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    bar: 'bg-red-500',
    barWidth: '80%',
    gradient: 'from-red-600 to-rose-600',
    icon: AlertTriangle,
    badge: 'bg-red-100 text-red-800',
  },
  CRITICAL: {
    label: 'Critical Risk',
    sublabel: 'HARD LOCK — Concierge dispatched',
    color: 'text-red-900',
    bg: 'bg-red-100',
    border: 'border-red-400',
    bar: 'bg-red-700',
    barWidth: '100%',
    gradient: 'from-red-900 to-red-700',
    icon: AlertOctagon,
    badge: 'bg-red-200 text-red-900',
  },
};

const SCAN_STEPS = [
  'Ingesting patient telemetry',
  'Evaluating medical history',
  'Checking procedure compatibility',
  'Analyzing medications & allergens',
  'Scoring lifestyle risk indicators',
  'Applying critical intercept matrix',
  'Computing composite risk tier',
  'Generating safety assessment',
];

export default function SafeT4LifeScanner({ userEmail }) {
  const [phase, setPhase] = useState('intro');
  const [scanResult, setScanResult] = useState(null);
  const [caseId, setCaseId] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [scanStep, setScanStep] = useState(0);
  const [existingCase, setExistingCase] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.CaseRecord.filter({ client_email: userEmail }, '-created_date', 1)
      .then(cases => {
        if (cases[0]) {
          setExistingCase(cases[0]);
          setCaseId(cases[0].id);
          setPatientName(cases[0].client_name || '');
        }
      }).catch(() => {});
    base44.auth.me().then(u => {
      if (u?.full_name) setPatientName(u.full_name);
    }).catch(() => {});
  }, [userEmail]);

  const runScan = async (intakeData) => {
    setPhase('scanning');
    setScanStep(0);

    for (let i = 0; i < SCAN_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 340));
      setScanStep(i + 1);
    }

    let activeCaseId = caseId;
    if (!activeCaseId) {
      const newCase = await base44.entities.CaseRecord.create({
        client_name: patientName || 'Patient',
        client_email: userEmail,
        procedures: [],
        status: 'Submitted',
        ...intakeData,
      });
      activeCaseId = newCase.id;
      setCaseId(activeCaseId);
    } else {
      await base44.entities.CaseRecord.update(activeCaseId, { ...intakeData });
    }

    const res = await base44.functions.invoke('safeT4LifeScan', { caseId: activeCaseId });
    const data = res.data;
    setScanResult(data);

    if (data.status === 'BLOCKED') {
      setPhase('critical');
    } else if (data.status === 'WAIVER_REQUIRED') {
      setPhase('waiver');
    } else {
      setPhase('result');
    }
  };

  // INTRO
  if (phase === 'intro') {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-8 text-white text-center">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield className="w-8 h-8 text-emerald-300" />
          </motion.div>
          <h2 className="font-display text-2xl mb-2">SAFE-T 4LIFE™ Intake Scanner</h2>
          <p className="text-white/60 text-sm max-w-md mx-auto mb-6">
            Complete your full patient telemetry profile. Our automated engine scores your case across four risk tiers: Low · Medium · High · Critical.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { tier: 'Low', color: 'text-emerald-300', desc: 'Frictionless progression' },
              { tier: 'Medium', color: 'text-amber-300', desc: 'Coordinator flags' },
              { tier: 'High', color: 'text-red-300', desc: 'Waiver gate required' },
              { tier: 'Critical', color: 'text-red-400', desc: 'Hard lock + concierge' },
            ].map(t => (
              <div key={t.tier} className="bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-center">
                <p className={`text-sm font-semibold ${t.color}`}>{t.tier}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setPhase('intake')}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl hover:opacity-90 transition-all inline-flex items-center gap-2">
            Begin Patient Intake <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {existingCase?.safe_t_result === 'PASSED' && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">Previous scan on file — PASSED ({existingCase.risk_score} Risk)</p>
              <p className="text-xs text-emerald-600">You can re-run the scan if your medical profile has changed.</p>
            </div>
            <button onClick={() => setPhase('intake')}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl hover:bg-emerald-200 transition-all">
              <RefreshCw className="w-3 h-3" /> Re-scan
            </button>
          </div>
        )}
      </div>
    );
  }

  // INTAKE
  if (phase === 'intake') {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Patient Telemetry Intake</p>
            <p className="text-xs text-slate-400">Complete all sections for accurate risk scoring</p>
          </div>
        </div>
        <PatientIntakeTelemetry onComplete={runScan} initialData={existingCase || {}} />
      </div>
    );
  }

  // SCANNING
  if (phase === 'scanning') {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full" />
          <div>
            <p className="font-semibold text-sm">SAFE-T 4LIFE™ Automated Scan</p>
            <p className="text-white/50 text-xs">Analyzing your complete patient telemetry…</p>
          </div>
        </div>
        <div className="space-y-2">
          {SCAN_STEPS.map((step, i) => {
            const done = i < scanStep;
            const active = i === scanStep - 1;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: done || active ? 1 : 0.3, x: 0 }}
                transition={{ delay: i * 0.05 }} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : active ? (
                  <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-3.5 h-3.5 rounded-full bg-blue-400 flex-shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex-shrink-0" />
                )}
                <span className={`text-xs ${done ? 'text-white/80' : active ? 'text-white font-semibold' : 'text-white/30'}`}>{step}</span>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-6 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-emerald-400 rounded-full"
            animate={{ width: `${(scanStep / SCAN_STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }} />
        </div>
      </div>
    );
  }

  // CRITICAL
  if (phase === 'critical' && scanResult) {
    return (
      <CriticalRiskInterceptModal
        reason={scanResult.reason}
        flags={scanResult.flags}
        patientName={patientName}
        onDismiss={() => setPhase('intro')}
      />
    );
  }

  // WAIVER
  if (phase === 'waiver' && scanResult) {
    return (
      <HighRiskWaiverModal
        caseId={caseId}
        flags={scanResult.flags}
        patientName={patientName}
        onWaiverSigned={() => { setScanResult(r => ({ ...r, tier: 'HIGH', status: 'WAIVER_SIGNED' })); setPhase('result'); }}
        onCancel={() => setPhase('intro')}
      />
    );
  }

  // RESULT
  if (phase === 'result' && scanResult) {
    const tier = scanResult.tier || 'LOW';
    const cfg = TIER_CONFIG[tier] || TIER_CONFIG.LOW;
    const Icon = cfg.icon;

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl border-2 overflow-hidden ${cfg.bg} ${cfg.border}`}>
        <div className={`bg-gradient-to-r ${cfg.gradient} px-6 py-6 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">SAFE-T 4LIFE™ Result</p>
                <h3 className="text-xl font-semibold">{cfg.label}</h3>
                <p className="text-white/70 text-xs">{cfg.sublabel}</p>
              </div>
            </div>
            {scanResult.status === 'WAIVER_SIGNED' && (
              <div className="bg-white/20 border border-white/30 rounded-xl px-3 py-2 text-center">
                <CheckCircle2 className="w-5 h-5 text-white mx-auto mb-0.5" />
                <p className="text-[10px] text-white/80 font-semibold">Waiver Signed</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pt-4">
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <motion.div className={`h-full rounded-full ${cfg.bar}`}
              initial={{ width: 0 }} animate={{ width: cfg.barWidth }} transition={{ duration: 1, ease: 'easeOut' }} />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-slate-500">
            <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">
          <div className="bg-white/70 rounded-2xl p-4">
            <p className="text-sm text-slate-700 leading-relaxed">{scanResult.message}</p>
          </div>

          {scanResult.flags && scanResult.flags.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                {tier === 'LOW' ? 'Minor Observations' : 'Risk Factors Identified'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {scanResult.flags.map((f, i) => (
                  <span key={i} className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${cfg.badge}`}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {scanResult.procedure_count >= 2 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <Zap className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                <strong>{scanResult.procedure_count} procedures</strong> selected — average baseline is 2.34. Recovery load has been factored into your risk tier.
              </p>
            </div>
          )}

          {scanResult.bmi && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Activity className="w-3.5 h-3.5" />
              <span>BMI calculated: <strong>{scanResult.bmi}</strong></span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setPhase('intro')}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Re-scan
            </button>
            {scanResult.status === 'PASSED' && (
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cleared for Next Step
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 bg-white/50 border border-slate-200 rounded-xl px-3 py-2.5">
            <Shield className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-slate-400 leading-relaxed">
              SAFE-T 4LIFE™ is an AI-assisted coordination and screening tool only. It does not replace medical diagnosis, advice, or clinical clearance from a licensed healthcare professional.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}