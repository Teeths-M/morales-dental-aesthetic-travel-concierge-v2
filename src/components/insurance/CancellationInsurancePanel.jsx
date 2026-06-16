import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Shield, ShieldCheck, Umbrella, BadgeCheck, AlertTriangle, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIERS = [
  {
    id: 'standard',
    label: 'Standard Protection',
    price: 'Included',
    priceNote: 'No additional cost',
    color: 'border-slate-200 bg-white',
    headerColor: 'bg-slate-50',
    badge: null,
    features: [
      { label: '> 14 days before', value: '100% refund', good: true },
      { label: '7–14 days before', value: '50% refund', good: true },
      { label: '2–7 days before', value: '25% refund', warn: true },
      { label: '< 48 hours', value: 'No refund', bad: true },
      { label: 'Cancel For Any Reason', value: 'Not covered', bad: true },
    ]
  },
  {
    id: 'cfar',
    label: 'Cancel For Any Reason',
    price: '+$250',
    priceNote: 'one-time premium',
    color: 'border-blue-300 bg-blue-50/30',
    headerColor: 'bg-blue-600',
    badge: 'RECOMMENDED',
    features: [
      { label: '> 14 days before', value: '100% refund', good: true },
      { label: '7–14 days before', value: '75% refund', good: true },
      { label: '2–7 days before', value: '75% refund', good: true },
      { label: '< 48 hours', value: '75% refund', good: true },
      { label: 'Any reason at all', value: '75% covered ✓', good: true },
    ]
  },
  {
    id: 'annual',
    label: 'Annual Passport Membership',
    price: '$499/yr',
    priceNote: 'unlimited trips',
    color: 'border-amber-300 bg-amber-50/30',
    headerColor: 'bg-gradient-to-r from-amber-500 to-amber-600',
    badge: 'PREMIUM',
    features: [
      { label: 'All cancellations', value: '100% refund', good: true },
      { label: 'Multiple trips/year', value: 'All covered', good: true },
      { label: 'No deadline rules', value: 'Fully flexible', good: true },
      { label: 'Priority support', value: '24/7 concierge', good: true },
      { label: 'Insurance bundled', value: 'Included', good: true },
    ]
  }
];

const REFUND_LADDER = [
  { range: '> 14 days', pct: 100, color: 'bg-emerald-500', width: 'w-full' },
  { range: '7–14 days', pct: 50, color: 'bg-blue-500', width: 'w-1/2' },
  { range: '2–7 days', pct: 25, color: 'bg-amber-500', width: 'w-1/4' },
  { range: '< 48 hours', pct: 0, color: 'bg-red-400', width: 'w-0' },
];

export default function CancellationInsurancePanel({ caseId, onSelect }) {
  const [selected, setSelected] = useState('standard');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save coverage selection to CancellationPolicy entity
      const policyData = {
        case_id: caseId || 'pending',
        is_cfar_protected: selected === 'cfar',
        is_annual_passport: selected === 'annual',
        cfar_premium_paid_usd: selected === 'cfar' ? 250 : 0,
        status: 'pending'
      };
      await base44.entities.CancellationPolicy.create(policyData);
      setSaved(true);
      if (onSelect) onSelect(selected);
    } catch (e) {
      // silent
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Refund Ladder Visual */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" /> Sliding-Scale Refund Policy
        </h3>
        <div className="space-y-3">
          {REFUND_LADDER.map(tier => (
            <div key={tier.range} className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-600 w-24 flex-shrink-0">{tier.range}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className={`h-3 rounded-full ${tier.color} ${tier.width} transition-all`} />
              </div>
              <span className={`text-xs font-bold w-12 text-right ${tier.pct === 100 ? 'text-emerald-700' : tier.pct === 0 ? 'text-red-600' : 'text-amber-700'}`}>{tier.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Coverage Tiers */}
      <div className="grid md:grid-cols-3 gap-4">
        {TIERS.map(tier => (
          <button key={tier.id} onClick={() => setSelected(tier.id)}
            className={`relative rounded-2xl border-2 overflow-hidden text-left transition-all ${
              selected === tier.id ? tier.color.replace('border-', 'border-') + ' ring-2 ring-offset-1 ' + (tier.id === 'cfar' ? 'ring-blue-500' : tier.id === 'annual' ? 'ring-amber-500' : 'ring-slate-400') : tier.color
            }`}>
            {tier.badge && (
              <div className={`absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full text-white ${tier.id === 'cfar' ? 'bg-blue-600' : 'bg-amber-500'}`}>
                {tier.badge}
              </div>
            )}
            <div className={`px-4 py-3 ${tier.headerColor}`}>
              <p className={`font-bold text-sm ${tier.id !== 'standard' ? 'text-white' : 'text-slate-800'}`}>{tier.label}</p>
              <p className={`text-lg font-black mt-0.5 ${tier.id !== 'standard' ? 'text-white' : 'text-slate-900'}`}>{tier.price}</p>
              <p className={`text-[10px] ${tier.id !== 'standard' ? 'text-white/70' : 'text-slate-500'}`}>{tier.priceNote}</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              {tier.features.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-600">{f.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    f.good ? 'bg-emerald-100 text-emerald-700' :
                    f.warn ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-600'
                  }`}>{f.value}</span>
                </div>
              ))}
            </div>
            {selected === tier.id && (
              <div className="px-4 pb-3">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Insurance Partners Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
        <BadgeCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-slate-700 mb-1">Embedded Insurance Ecosystem</p>
          <p className="text-xs text-slate-500 leading-relaxed">Your coverage is backed by leading digital insurance carriers including <strong>Cover Genius</strong> and <strong>battleface</strong>. Policy documentation is issued automatically upon booking confirmation.</p>
        </div>
      </div>

      {saved ? (
        <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
          <CheckCircle2 className="w-4 h-4" /> Coverage preference saved!
        </div>
      ) : (
        <Button onClick={handleSave} disabled={saving}
          className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:opacity-90 text-white rounded-xl font-semibold">
          {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span> : <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Confirm Coverage: {TIERS.find(t => t.id === selected)?.label}</span>}
        </Button>
      )}
    </div>
  );
}