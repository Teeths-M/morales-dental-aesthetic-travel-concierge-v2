import React, { useState } from 'react';
import { ShieldAlert, Check, Loader2, Users } from 'lucide-react';

// Mirrors base44/functions/_shared/byoj.ts BYOJ_DISCLOSURE_TEXT /
// BYOJ_DISCLOSURE_TEXT_NONMEDICAL. Legal-approved (BYOJ_DISCLOSURE_STATUS =
// 'legal_approved', version 'byoj-disclosure-v1').
const DISCLOSURE_MEDICAL =
  'Morales did not select, vet, or approve this doctor or clinic, and we cannot control their actions or your ' +
  'medical care. What we provide is independent verification of what is publicly knowable, continuous journey ' +
  'monitoring, and 24/7 emergency response. We cannot guarantee a medical outcome. By enrolling, you are choosing ' +
  'Morales as your safety net — not as the party responsible for the procedure itself.';
const DISCLOSURE_NONMEDICAL =
  'Morales did not select, vet, or approve this provider or venue, and we cannot control their actions or your ' +
  'safety during this trip. What we provide is independent verification of what is publicly knowable, continuous ' +
  'journey monitoring, and 24/7 emergency response. We cannot guarantee an outcome. By enrolling, you are choosing ' +
  'Morales as your safety net — not as the party responsible for the trip itself.';

/**
 * Enrollment step. The disclosure is an UNAVOIDABLE gate — enroll stays disabled
 * until it's acknowledged. One-time plan only (recurring is intentionally absent).
 */
export default function ProtectionEnroll({ onEnroll, loading, journeyType = 'medical' }) {
  const [accepted, setAccepted] = useState(false);
  const [family, setFamily] = useState(false);
  const DISCLOSURE = journeyType === 'medical' ? DISCLOSURE_MEDICAL : DISCLOSURE_NONMEDICAL;

  return (
    <div className="space-y-4">
      {/* Unavoidable disclosure gate */}
      <div className="rounded-2xl border border-[#E1B23A]/40 bg-[#E1B23A]/8 p-5">
        <p className="flex items-center gap-2 font-semibold text-[#E1B23A] text-sm m-0 mb-2">
          <ShieldAlert className="w-4 h-4" /> Before you enroll — please read
        </p>
        <p className="text-[13px] text-white leading-relaxed m-0">{DISCLOSURE}</p>
        <button type="button" onClick={() => setAccepted((a) => !a)}
          className="flex items-start gap-3 w-full text-left mt-4">
          <span className={`shrink-0 mt-0.5 w-[18px] h-[18px] rounded-[5px] border-2 grid place-items-center ${accepted ? 'bg-[#E1B23A] border-[#E1B23A]' : 'border-[#E1B23A]'}`}>
            {accepted && <Check className="w-3 h-3 text-[#060B16]" strokeWidth={3} />}
          </span>
          <span className="text-[12.5px] text-[#EAF2F4] leading-relaxed">
            I understand Morales is providing <b>monitoring and support</b>, not a vetted booking or a guarantee of
            outcome, and I choose to enroll.
          </span>
        </button>
      </div>

      {/* Plan — one-time only at launch */}
      <div className="rounded-2xl border border-[#D4AF37]/34 bg-gradient-to-b from-[#D4AF37]/8 to-[#0C1A1D] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#7E939C] font-bold m-0">Single Journey</p>
            <p className="text-white text-lg font-semibold m-0 mt-0.5">One-time protection</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#D4AF37] bg-[#D4AF37]/12 border border-[#D4AF37]/34 rounded-full px-2.5 py-1">One-time</span>
        </div>
        <p className="text-[12.5px] text-[#B7C6CC] m-0 mt-2">
          Full protection from now through your recovery close-out. Payment is a single charge — no subscription.
        </p>
      </div>

      {/* Family / companion visibility opt-in (req 4) */}
      <button type="button" onClick={() => setFamily((f) => !f)}
        className="w-full flex items-center gap-3 rounded-xl border border-[#2A3F4A] bg-[#0C1A1D] px-4 py-3 text-left">
        <span className={`shrink-0 w-[18px] h-[18px] rounded-[5px] border-2 grid place-items-center ${family ? 'bg-[#0E8A7D] border-[#0E8A7D]' : 'border-[#54666E]'}`}>
          {family && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </span>
        <span className="flex items-center gap-2 text-[13px] text-[#EAF2F4]">
          <Users className="w-4 h-4 text-[#7E939C]" /> Let my family follow my journey (a zero-login link they can watch)
        </span>
      </button>

      <button onClick={() => onEnroll({ disclosure_accepted: accepted, family_visibility_opt_in: family })}
        disabled={!accepted || loading}
        className={`w-full rounded-xl py-3.5 font-semibold text-[15px] flex items-center justify-center gap-2 transition-all
          ${accepted && !loading ? 'bg-gradient-to-br from-[#0E8A7D] to-[#0b6f64] text-white hover:opacity-90' : 'bg-[#14242b] text-[#54666E] cursor-not-allowed'}`}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enrolling…</> : 'Enroll & protect my journey'}
      </button>
    </div>
  );
}
