import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, Compass } from 'lucide-react';

const STATUS = {
  verified:    { icon: CheckCircle2, cls: 'text-[#3FBF8F] bg-[#3FBF8F]/10 border-[#3FBF8F]/32', label: 'Verified' },
  concern:     { icon: AlertTriangle, cls: 'text-[#E0736B] bg-[#E0736B]/10 border-[#E0736B]/32', label: 'Needs review' },
  unconfirmed: { icon: HelpCircle,   cls: 'text-[#E1B23A] bg-[#E1B23A]/10 border-[#E1B23A]/34', label: 'Unconfirmed' },
};

const OVERALL = {
  verified:   { head: 'Here’s what we found — it looks consistent', tone: 'text-[#3FBF8F]' },
  concerns:   { head: 'Here’s what we found, and what we’d recommend now', tone: 'text-[#E0736B]' },
  incomplete: { head: 'Here’s what we could confirm — and what we couldn’t', tone: 'text-[#E1B23A]' },
};

/**
 * Honest verification result — "guide, don't wall." Never shows a green "verified"
 * over checks that didn't complete; concerns are surfaced plainly with recommended
 * next steps, because the patient has already booked.
 */
export default function VerificationResult({ result, onContinue }) {
  const overall = OVERALL[result.overall] || OVERALL.incomplete;
  return (
    <div className="rounded-2xl border border-[#2A3F4A] bg-[#0C1A1D] overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-[#1B2A32]">
        <h2 className={`text-xl font-semibold ${overall.tone}`}>{overall.head}</h2>
        <p className="text-[13px] text-[#7E939C] mt-1">
          {result.completeness}% of checks completed live.
          {result.overall === 'incomplete' && ' We never show a “verified” badge over something we couldn’t actually confirm.'}
        </p>
      </div>

      <div className="px-6 py-2">
        {result.checks.map((c) => {
          const s = STATUS[c.status] || STATUS.unconfirmed;
          const Icon = s.icon;
          return (
            <div key={c.key} className="flex gap-3 items-start py-3.5 border-b border-[#1B2A32] last:border-0">
              <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${s.cls}`}>
                <Icon className="w-3 h-3" /> {s.label}
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-white m-0">{c.label}</p>
                <p className="text-[12.5px] text-[#B7C6CC] m-0 mt-0.5 leading-relaxed">{c.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {result.recommendations?.length > 0 && (
        <div className="mx-6 mb-5 rounded-xl border border-[#0E8A7D] bg-[#0E8A7D]/10 p-4">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#5FE3D0] font-bold m-0 mb-2">
            <Compass className="w-3.5 h-3.5" /> What we’d recommend now
          </p>
          <ul className="m-0 pl-5 text-[13px] text-white space-y-1.5">
            {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {result.escalated && (
        <div className="mx-6 mb-5 rounded-xl border border-[#E0736B]/40 bg-[#E0736B]/8 px-4 py-3 text-[12.5px] text-[#F0C9C5]">
          Because we found something that needs a closer look, a Morales coordinator is already being notified to reach out — you’re not on your own with this.
        </div>
      )}

      <div className="px-6 pb-6">
        <button onClick={onContinue}
          className="w-full rounded-xl py-3.5 font-semibold text-[15px] flex items-center justify-center gap-2 bg-gradient-to-br from-[#D4AF37] to-[#b8912b] text-[#060B16] hover:opacity-95 transition-opacity">
          Continue to protection <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
