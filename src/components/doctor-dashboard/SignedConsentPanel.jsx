import React, { useState } from 'react';
import { Scale, FileSignature } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { PILLARS } from '@/components/booking/MedicalRiskDisclosure';

// Read-only view of the signed liability/arbitration disclosure for a doctor
// reviewing their assigned case. Renders the SAME structured fields the
// patient signed (never the stored informed_consent_email_html string) —
// deliberately no dangerouslySetInnerHTML: that HTML is server-built and this
// is a doctor/admin-facing surface, so there is no reason to inject raw
// markup when the underlying fields render just as well natively.
export default function SignedConsentPanel({ caseRecord }) {
  const [open, setOpen] = useState(false);

  if (!caseRecord?.signature_data) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary transition-colors"
        >
          <FileSignature className="w-3.5 h-3.5" /> View Signed Consent & Arbitration Agreement
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> Medical Risk & Liability Disclosure
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.num}
              className={`rounded-xl border p-4 ${pillar.num === '5' ? 'border-amber-300 bg-amber-50' : 'border-border bg-white'}`}
            >
              <p className={`text-sm font-semibold mb-1 ${pillar.num === '5' ? 'text-amber-900' : 'text-foreground'}`}>
                {pillar.num}. {pillar.title}
              </p>
              <p className={`text-xs leading-relaxed ${pillar.num === '5' ? 'text-amber-800' : 'text-muted-foreground'}`}>
                {pillar.text}
              </p>
              {pillar.tiers && (
                <ul className="space-y-2 mt-2">
                  {pillar.tiers.map((tier, ti) => (
                    <li key={ti} className="text-xs leading-relaxed text-amber-800 bg-amber-100 rounded-lg px-3 py-2">
                      {tier}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border-2 border-primary/30 overflow-hidden bg-white mt-4">
          <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Captured Digital Signature</p>
          </div>
          <div className="p-4 flex justify-center bg-slate-50">
            <img src={caseRecord.signature_data} alt="Patient's digital signature" className="max-h-32 max-w-full" />
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Signed: {caseRecord.signature_timestamp ? new Date(caseRecord.signature_timestamp).toLocaleString() : 'Unknown'}
            </span>
            <span className={`font-semibold px-2 py-0.5 rounded-full ${
              caseRecord.accepted_arbitration_clause ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {caseRecord.accepted_arbitration_clause ? '✅ Arbitration Clause Accepted' : '❌ Arbitration Clause Not Accepted'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
