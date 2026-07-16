/**
 * WildernessSafetyNudge
 * Rule-based predictive risk assessment for wilderness/adventure activities.
 * Does NOT claim verified global certification data.
 * Risk is derived from activity type + remote/solo indicators.
 */
import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info, Shield } from 'lucide-react';

const HIGH_RISK_ACTIVITIES = ['zip_line', 'zipline', 'canopy', 'jungle', 'cloud_forest', 'waterfall', 'atv', 'parasailing', 'boat', 'river'];
const MEDIUM_RISK_ACTIVITIES = ['hiking', 'snorkeling', 'kayaking', 'scuba', 'beach'];

function computeRisk({ activityType, hasOperator, isRemote, isSolo }) {
  const type = (activityType || '').toLowerCase().replace(/[\s-]/g, '_');
  let risk = 'low';
  const nudges = [];
  const checks = [];

  if (HIGH_RISK_ACTIVITIES.some(a => type.includes(a))) {
    risk = 'high';
  } else if (MEDIUM_RISK_ACTIVITIES.some(a => type.includes(a))) {
    risk = 'medium';
  }

  if (isSolo && risk !== 'low') {
    risk = 'high';
    nudges.push('Solo traveler: Enable guardian tracking before you start.');
  }

  if (!hasOperator) {
    nudges.push('No verified operator on record. Visually inspect harness, carabiners, and anchor points yourself.');
  }

  if (isRemote) {
    nudges.push('Remote location: Cell coverage may be limited or unavailable.');
    nudges.push('Download offline emergency profile before departing.');
  }

  // Universal high-risk nudges
  if (risk === 'high') {
    nudges.push('Warning: This activity has limited verified safety data. Before proceeding, confirm operator certification and inspect all safety equipment.');
    checks.push('Confirm operator has valid safety certification (ask to see it)');
    checks.push('Inspect harness, carabiners, and anchor points visually');
    checks.push('Ensure guardian link is active and shared');
    checks.push('Enable GPS beacon while app is open');
    checks.push('Cache offline emergency profile before departing signal range');
  }

  if (risk !== 'low') {
    checks.push('Share your start location with someone you trust');
    checks.push('Set expected return time in adventure mode');
  }

  const certWarning = !hasOperator
    ? 'Operator certification status: Unverified. Morales does not have verified safety data for this provider.'
    : null;

  return { risk, nudges, checks, certWarning };
}

const RISK_STYLES = {
  high:    { banner: 'bg-red-900/40 border-red-500/60 text-red-300',    icon: 'text-red-400',    label: 'High Risk' },
  medium:  { banner: 'bg-amber-900/40 border-amber-500/60 text-amber-300', icon: 'text-amber-400', label: 'Medium Risk' },
  low:     { banner: 'bg-emerald-900/30 border-emerald-600/40 text-emerald-300', icon: 'text-emerald-400', label: 'Low Risk' },
  unknown: { banner: 'bg-slate-800/50 border-slate-600/40 text-slate-300', icon: 'text-slate-400', label: 'Unknown Risk' },
};

export default function WildernessSafetyNudge({
  activityType = '',
  hasOperator = false,
  isRemote = false,
  isSolo = true,
  _dark = true,
}) {
  const assessment = useMemo(
    () => computeRisk({ activityType, hasOperator, isRemote, isSolo }),
    [activityType, hasOperator, isRemote, isSolo]
  );

  if (!activityType) return null;

  const style = RISK_STYLES[assessment.risk] || RISK_STYLES.unknown;

  return (
    <div className={`rounded-2xl border ${style.banner} overflow-hidden`} role="alert">
      {/* Risk header */}
      <div className="px-5 py-3 flex items-center gap-3 border-b border-white/10">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${style.icon} ${assessment.risk === 'high' ? 'animate-pulse' : ''}`} />
        <div>
          <p className="font-semibold text-sm">Safety Assessment: {style.label}</p>
          {assessment.certWarning && (
            <p className="text-[10px] opacity-75 mt-0.5">{assessment.certWarning}</p>
          )}
        </div>
      </div>

      {assessment.nudges.length > 0 && (
        <div className="px-5 py-3 space-y-1.5">
          {assessment.nudges.map((nudge, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" />
              <span>{nudge}</span>
            </div>
          ))}
        </div>
      )}

      {assessment.checks.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-2">Recommended Checks</p>
          <div className="space-y-1.5">
            {assessment.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-60" />
                <span>{check}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pb-3 flex items-center gap-1.5 text-[10px] opacity-50">
        <Shield className="w-3 h-3" />
        <span>Rule-based assessment only. Morales does not hold verified global activity safety data.</span>
      </div>
    </div>
  );
}