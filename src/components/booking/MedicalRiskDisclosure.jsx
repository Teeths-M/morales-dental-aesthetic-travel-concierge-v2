import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Check, AlertTriangle, Trash2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Exported so doctor-facing read-only views (e.g. SignedConsentPanel) render
// the exact same disclosure text the patient signed — one source of truth.
export const PILLARS = [
  {
    num: '1',
    title: 'Surgical Risk Acknowledgement',
    text: 'I understand that every medical, dental, and surgical procedure carries inherent biological risks and potential complications including, but not limited to, infection, adverse reactions, and unforeseen surgical events.',
  },
  {
    num: '2',
    title: 'Variance of Outcomes',
    text: 'I acknowledge that healing processes and clinical outcomes vary by individual and cannot be universally guaranteed. Results depend on personal health factors, post-operative compliance, and biological response.',
  },
  {
    num: '3',
    title: 'Platform Coordination Scope',
    text: 'I explicitly agree that this platform operates solely as a logistics and travel concierge coordinating transit, lodging, and scheduling. Morales Medical Travel Safety is not a medical provider and does not render clinical services.',
  },
  {
    num: '4',
    title: 'Independent Medical Responsibility',
    text: 'I recognize that the selected licensed physician or dentist holds sole, absolute medical responsibility and clinical liability for my treatment. The platform bears no clinical liability whatsoever.',
  },
  {
    num: '5',
    title: 'Cross-Border Jurisdiction Risk & Mandatory Arbitration Agreement',
    text: 'By signing below, I explicitly waive my right to initiate immediate litigation in any public court or foreign jurisdiction. I agree that any and all disputes, claims, or controversies arising out of or relating to the logistics, booking, or coordination services provided by this platform shall be resolved exclusively through the following mandatory, progressive four-tier dispute resolution process:',
    tiers: [
      '👉 Tier 1 — Internal Resolution: The client must first file a formal written grievance via the platform\'s support framework. The platform retains an exclusive 30-day window from receipt to investigate and propose an internal resolution.',
      '👉 Tier 2 — Mediation: If Tier 1 fails to resolve the issue, both parties agree to submit the dispute to formal, non-binding mediation before a mutually approved independent mediator. Costs of mediation shall be shared equally.',
      '👉 Tier 3 — Binding Arbitration: If mediation proves unsuccessful within 60 days, the dispute shall be submitted to and finally resolved by single-arbitrator Binding Arbitration administered in accordance with international commercial arbitration rules. The physical seat of arbitration shall be Port of Spain, Trinidad and Tobago. The arbitrator\'s ruling shall be private, binding, final, and enforceable in any court of competent jurisdiction.',
      '👉 Tier 4 — Restricted Legal Escalation: Any remaining permitted judicial reviews or enforcement actions shall be filed exclusively in the courts of Trinidad and Tobago, applying the laws of Trinidad and Tobago, governing to the absolute exclusion of all other local, national, or foreign maritime/international courts.',
    ],
  },
];

export default function MedicalRiskDisclosure({ signatureData, onSignatureChange, arbitrationAccepted, onArbitrationChange }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(!!signatureData);
  const lastPos = useRef(null);

  // Restore existing signature on mount
  useEffect(() => {
    if (signatureData && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        setHasStrokes(true);
      };
      img.src = signatureData;
    }
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    lastPos.current = pos;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1, 0, Math.PI * 2);
    ctx.fillStyle = '#1a3a2e';
    ctx.fill();
  }, []);

  const draw = useCallback((e) => {
    if (!isDrawing || !lastPos.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a3a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
    setHasStrokes(true);
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSignatureChange(dataUrl);
  }, [isDrawing, onSignatureChange]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onSignatureChange('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-lg">⚖️</span>
        <h3 className="font-display text-lg text-foreground">Medical Risk & Liability Disclosure</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-4">
        Please read all five pillars carefully. Your drawn signature below constitutes a legally binding digital agreement.
      </p>

      {/* 5 Pillars */}
      <div className="space-y-3">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.num}
            className={`rounded-xl border p-4 ${pillar.num === '5' ? 'border-amber-300 bg-amber-50' : 'border-border bg-white'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                pillar.num === '5' ? 'bg-amber-200 text-amber-900' : 'bg-primary/10 text-primary'
              }`}>
                {pillar.num}
              </div>
              <div className="space-y-1.5">
                <p className={`text-sm font-semibold ${pillar.num === '5' ? 'text-amber-900' : 'text-foreground'}`}>
                  {pillar.title}
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
            </div>
          </div>
        ))}
      </div>

      {/* Arbitration Checkbox */}
      <button
        type="button"
        onClick={() => onArbitrationChange(!arbitrationAccepted)}
        className={`w-full text-left px-4 py-3.5 rounded-xl border-2 flex items-start gap-3 transition-all duration-200 ${
          arbitrationAccepted
            ? 'border-amber-500 bg-amber-50'
            : 'border-amber-300 bg-amber-50 hover:border-amber-400'
        }`}
      >
        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          arbitrationAccepted ? 'border-amber-600 bg-amber-500' : 'border-amber-400'
        }`}>
          {arbitrationAccepted && <Check className="w-3 h-3 text-white" />}
        </div>
        <span className="text-xs leading-relaxed text-amber-900 font-medium">
          I have read, understood, and agree to the Cross-Border Jurisdiction Risk and Mandatory Four-Tier Arbitration Agreement described in Pillar 5, and I accept that this constitutes a binding contractual waiver of immediate litigation rights.
        </span>
      </button>

      {/* Canvas Signature Pad */}
      <div className="rounded-xl border-2 border-primary/30 overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Digital Signature — Required</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </Button>
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={700}
            height={160}
            className="w-full touch-none cursor-crosshair"
            style={{ background: hasStrokes ? 'white' : 'repeating-linear-gradient(45deg, #f8faf9, #f8faf9 10px, #f0f5f2 10px, #f0f5f2 20px)' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasStrokes && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-muted-foreground/40 italic select-none">Sign here with mouse, stylus, or finger</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-2 border-t flex items-center justify-between ${hasStrokes ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
          <p className={`text-[11px] font-semibold ${hasStrokes ? 'text-emerald-700' : 'text-slate-400'}`}>
            {hasStrokes ? '✅ Signature captured — legally binding' : '⚠️ No signature detected'}
          </p>
          {hasStrokes && (
            <p className="text-[10px] text-emerald-600">
              Signed: {new Date().toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Hard-lock warning */}
      {(!hasStrokes || !arbitrationAccepted) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-2 p-3 rounded-xl border border-amber-300 bg-amber-50"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-0.5">
            {!arbitrationAccepted && <p>• Arbitration clause checkbox is required.</p>}
            {!hasStrokes && <p>• A drawn signature is required to unlock payment.</p>}
          </div>
        </motion.div>
      )}
    </div>
  );
}