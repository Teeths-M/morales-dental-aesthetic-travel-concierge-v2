import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Globe, XCircle, ExternalLink } from 'lucide-react';
import { checkVisaRequirement, getEvisaLink } from '@/lib/visaMatrix';

/**
 * Passport Vault Section
 * - Passport number + expiry date fields
 * - 6-Month Sentinel Rule: warns if passport expires < 6 months after travel date
 * - Visa Matrix: evaluates origin vs destination and renders status badge
 */
export default function PassportVaultSection({ form, update, ipCountry }) {
  // ── 6-Month Sentinel Rule ──────────────────────────────────────────────────
  const passportWarning = useMemo(() => {
    if (!form.passport_expiry_date) return null;
    const expiry = new Date(form.passport_expiry_date);
    // Reference date: travel date if set, otherwise today
    const referenceDate = form.preferred_date ? new Date(form.preferred_date) : new Date();
    const sixMonthsAfterTravel = new Date(referenceDate);
    sixMonthsAfterTravel.setMonth(sixMonthsAfterTravel.getMonth() + 6);
    const diffDays = Math.ceil((expiry - referenceDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 180) return diffDays;
    return null;
  }, [form.passport_expiry_date, form.preferred_date]);

  // ── Visa Matrix ────────────────────────────────────────────────────────────
  const visaStatus = useMemo(() => {
    return checkVisaRequirement(form.nationality, form.procedure_country);
  }, [form.nationality, form.procedure_country]);

  const evisaLink = getEvisaLink(form.procedure_country);

  return (
    <div className="space-y-5 pt-2">
      {/* Section header */}
      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
        <span className="text-base">🛂</span>
        <h4 className="font-semibold text-slate-700 text-sm tracking-wide">Travel Document Vault</h4>
      </div>

      {/* IP Country Banner */}
      {ipCountry && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Globe className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-800">
            <span className="font-semibold">Origin detected:</span> {ipCountry}
            <span className="text-emerald-500 ml-1">(auto-filled via IP)</span>
          </p>
        </div>
      )}

      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        ⚠️ All passport and travel date fields are <strong>required</strong> — the travel agency needs this information to accurately price your package.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Passport Number */}
        <div className="sm:col-span-2">
          <Label className="text-sm font-medium text-slate-700">
            Passport Number <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.passport_number || ''}
            onChange={e => update('passport_number', e.target.value)}
            placeholder="e.g. A12345678"
            className="mt-1.5 font-mono tracking-widest"
            required
          />
        </div>

        {/* Passport Issue Date */}
        <div>
          <Label className="text-sm font-medium text-slate-700">
            Passport Issue Date <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            value={form.passport_issue_date || ''}
            onChange={e => update('passport_issue_date', e.target.value)}
            className="mt-1.5"
            required
          />
        </div>

        {/* Passport Expiry Date */}
        <div>
          <Label className="text-sm font-medium text-slate-700">
            Passport Expiry Date <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            value={form.passport_expiry_date || ''}
            onChange={e => update('passport_expiry_date', e.target.value)}
            className="mt-1.5"
            required
          />

          {/* 6-Month Sentinel Warning */}
          {passportWarning !== null && (
            <div className="mt-2 flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">⚠️ Passport Sentinel Alert</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your passport expires in <strong>{passportWarning} days</strong> — which is less than the 6-month minimum required by most international destinations. You may be denied boarding or entry. Please renew your passport before travel.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Visa Matrix Status ── */}
      {form.nationality && form.procedure_country && (
        <div className="mt-1">
          <Label className="text-sm font-medium text-slate-700 mb-2 block">Visa Status</Label>

          {visaStatus === 'exempt' && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">✅ No visa required for this itinerary.</p>
                <p className="text-xs text-emerald-600 mt-0.5">{form.nationality} nationals travel visa-free to {form.procedure_country}.</p>
              </div>
            </div>
          )}

          {visaStatus === 'evisa' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">⚠️ e-Visa required – click to apply</p>
                <p className="text-xs text-amber-700 mt-0.5 mb-3">{form.nationality} nationals require an electronic visa for {form.procedure_country}. Apply online before your trip.</p>
                <a
                  href={evisaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #92400e, #b45309)' }}
                >
                  Apply for e-Visa <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {visaStatus === 'embassy' && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">❌ Visa required (embassy visit)</p>
                <p className="text-xs text-red-700 mt-0.5 mb-3">{form.nationality} nationals must obtain a tourist visa from the {form.procedure_country} embassy before travel. Please begin this process early.</p>
                <a
                  href="https://www.iatatravelcentre.com/passport-visa-health-travel-document-requirements.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-700 hover:bg-red-800 transition-colors"
                >
                  View Embassy Guide <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}