import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Globe, XCircle, ExternalLink } from 'lucide-react';
import { getEvisaLink } from '@/lib/visaMatrix';
import { useVisaRequirement } from '@/hooks/useVisaRequirement';
import { passportSentinel, getPassportHelpLinks } from '@/lib/travelReadiness';

/* THE PASSPORT SCAN WAS REMOVED HERE — DO NOT REINSTATE IT AS IT WAS.
 *
 * This section used to offer "Upload Your Passport", send the image to
 * `Core.UploadFile` and hand the resulting URL to `extractPassportData`:
 *
 *     const { file_url } = await base44.integrations.Core.UploadFile({ file });
 *     await base44.functions.invoke('extractPassportData', { file_url });
 *
 * `Core.UploadFile` is the GENERAL bucket, not `UploadPrivateFile`. The image
 * went up unencrypted, before any encryption, and nothing deleted it
 * afterwards — passport number, date of birth, full name and nationality, left
 * sitting in general storage. The upload box directly above it promised
 * "Document is encrypted, access-controlled, and audited", which was not true
 * of this path.
 *
 * The identical defect was found and fixed in VaultUploader.jsx; this file was
 * missed. Scanning was only ever an autofill convenience — every field it
 * populated is typed manually below, and the checks that actually protect the
 * patient (6-month sentinel, visa requirement) run off those typed values, not
 * off the image.
 *
 * If OCR comes back it must: encrypt on device first, use UploadPrivateFile,
 * take explicit consent, and delete the source after extraction.
 * A red-team invariant guards this file against the old pattern returning.
 */

export default function PassportVaultSection({ form, update, ipCountry }) {
  // ── 6-Month Sentinel Rule ──────────────────────────────────────────────────
  const passportWarning = useMemo(
    () => passportSentinel(form.passport_expiry_date, form.preferred_date),
    [form.passport_expiry_date, form.preferred_date]
  );

  // ── Visa requirement (live source, matrix fallback) ────────────────────────
  const { status: visaStatus } = useVisaRequirement(form.nationality, form.procedure_country);
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

      {/* Typed, not scanned — see the note at the top of this file. Only the
          expiry date does any protective work; the rest is here because the
          clinic needs it eventually, and all of it is optional now. */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-xs text-slate-600">
            Passport Expiry Date <span className="text-slate-400 font-normal">— so we can check you&rsquo;re clear to travel</span>
          </Label>
          <Input
            type="date"
            value={form.passport_expiry_date || ''}
            onChange={e => update('passport_expiry_date', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Passport Number <span className="text-slate-400 font-normal">— optional</span></Label>
          <Input
            value={form.passport_number || ''}
            onChange={e => update('passport_number', e.target.value)}
            className="mt-1 font-mono tracking-widest"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Issue Date <span className="text-slate-400 font-normal">— optional</span></Label>
          <Input
            type="date"
            value={form.passport_issue_date || ''}
            onChange={e => update('passport_issue_date', e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        No rush — you can add these later, once you&rsquo;re ready to travel.
      </p>

      {/* 6-Month Sentinel — now outside the old scan block, so it fires
          whenever an expiry date exists rather than only after a successful
          scan. A patient who typed their expiry manually was previously given
          no warning at all. */}
      {passportWarning !== null && (() => {
        const { renewalUrl, videoSearchUrl } = getPassportHelpLinks(form.nationality);
        return (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800">Passport Sentinel Alert</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {passportWarning < 0
                  ? <>Your passport expires <strong>before your travel date</strong>. You&rsquo;ll need to renew it before you can fly.</>
                  : <>Your passport has <strong>{passportWarning} days</strong> of validity left at your travel date — less than the 6-month minimum most destinations require. Please renew before travel.</>}
              </p>
              <a href={renewalUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #92400e, #b45309)' }}>
                Renew Your Passport <ExternalLink className="w-3 h-3" />
              </a>
              <a href={videoSearchUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2.5 ml-2 text-xs font-semibold text-amber-800 hover:underline">
                See how it works <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        );
      })()}


      {/* ── Visa Matrix Status ── */}
      {form.nationality && form.procedure_country && (
        <div className="mt-1">
          <Label className="text-sm font-medium text-slate-700 mb-2 block">Visa Status</Label>

          {visaStatus === 'exempt' && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">✅ No visa required for this itinerary.</p>
                <p className="text-xs text-emerald-600 mt-0.5">{form.nationality} nationals travel visa-free to {form.procedure_country}.</p>
              </div>
            </div>
          )}

          {visaStatus === 'evisa' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">⚠️ e-Visa required – click to apply</p>
                <p className="text-xs text-amber-700 mt-0.5 mb-3">{form.nationality} nationals require an electronic visa for {form.procedure_country}. Apply online before your trip.</p>
                <a href={evisaLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #92400e, #b45309)' }}>
                  Apply for e-Visa <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {visaStatus === 'embassy' && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">❌ Visa required (embassy visit)</p>
                <p className="text-xs text-red-700 mt-0.5 mb-3">{form.nationality} nationals must obtain a tourist visa from the {form.procedure_country} embassy before travel.</p>
                <a href="https://www.iatatravelcentre.com/passport-visa-health-travel-document-requirements.htm"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-700 hover:bg-red-800 transition-colors">
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