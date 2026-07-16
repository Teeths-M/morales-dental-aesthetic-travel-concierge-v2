import React, { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Globe, XCircle, ExternalLink, Upload, Loader2, Shield, RefreshCw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEvisaLink } from '@/lib/visaMatrix';
import { useVisaRequirement } from '@/hooks/useVisaRequirement';
import { base44 } from '@/api/base44Client';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export default function PassportVaultSection({ form, update, ipCountry }) {
  const [scanState, setScanState] = useState('idle'); // idle | uploading | scanning | done | error
  const [scanError, setScanError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [extracted, setExtracted] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const fileRef = useRef(null);

  // ── 6-Month Sentinel Rule ──────────────────────────────────────────────────
  const passportWarning = useMemo(() => {
    if (!form.passport_expiry_date) return null;
    const expiry = new Date(form.passport_expiry_date);
    const referenceDate = form.preferred_date ? new Date(form.preferred_date) : new Date();
    const diffDays = Math.ceil((expiry.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays < 180 ? diffDays : null;
  }, [form.passport_expiry_date, form.preferred_date]);

  // ── Visa requirement (live source, matrix fallback) ────────────────────────
  const { status: visaStatus } = useVisaRequirement(form.nationality, form.procedure_country);
  const evisaLink = getEvisaLink(form.procedure_country);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const sizeMB = (file.size / 1024 / 1024).toFixed(1);

    if (!ACCEPTED.includes(file.type)) {
      setScanError('That file type isn\'t supported. Please choose a photo (JPG or PNG) or a PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setScanError(`Your file is ${sizeMB} MB — too large. Please choose a file under 10 MB.`);
      return;
    }

    setScanError(null);
    setWarnings([]);
    setScanState('uploading');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setScanState('scanning');

      const res = await base44.functions.invoke('extractPassportData', { file_url });
      const { extracted: data, warnings: w } = res.data;

      if (data.passport_number) update('passport_number', data.passport_number);
      if (data.issue_date) update('passport_issue_date', data.issue_date);
      if (data.expiry_date) update('passport_expiry_date', data.expiry_date);
      if (data.nationality) update('nationality', data.nationality);
      if (data.full_name && !form.patient_name) update('patient_name', data.full_name);

      setExtracted(data);
      setWarnings(w || []);
      setScanState('done');
      setEditMode(false);
    } catch (_err) {
      const isOffline = !navigator.onLine;
      setScanError(
        isOffline
          ? "You're offline. Please connect to the internet and try again."
          : "We couldn't read your passport. That's okay — please try again, or enter your details manually below."
      );
      setScanState('error');
    }
  };

  const handleRescan = () => {
    setScanState('idle');
    setExtracted(null);
    setWarnings([]);
    setScanError(null);
    setEditMode(false);
    // Reset form passport fields
    update('passport_number', '');
    update('passport_issue_date', '');
    update('passport_expiry_date', '');
    if (fileRef.current) fileRef.current.value = '';
  };

  const isScanning = scanState === 'uploading' || scanState === 'scanning';

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

      {/* Upload Zone — shown for idle and after a scan error so user can retry */}
      {(scanState === 'idle' || scanState === 'error') && (
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center mx-auto mb-3 transition-colors">
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Upload Your Passport <span className="font-normal text-slate-400">— optional</span></p>
            <p className="text-xs text-slate-400 mt-1">Photo or PDF · JPEG, PNG, WEBP · Max 10MB</p>
            <p className="text-xs text-slate-500 mt-1">No rush — you can add this later, once you're ready to travel.</p>
            <p className="text-xs text-emerald-600 mt-2 font-medium">🔒 Document is encrypted, access-controlled, and audited</p>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED.join(',')}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {scanError && (
            <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {scanError}
            </p>
          )}
        </div>
      )}

      {/* Scanning State */}
      {isScanning && (
        <div className="flex flex-col items-center gap-3 py-8 bg-slate-50 border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">
              {scanState === 'uploading' ? 'Uploading securely...' : 'Reading passport with AI...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {scanState === 'scanning' ? 'Extracting document fields — usually takes 5-10 seconds' : 'Preparing file...'}
            </p>
          </div>
        </div>
      )}

      {/* Done — show extracted fields */}
      {scanState === 'done' && extracted && (
        <div className="space-y-4">
          {/* Success Banner */}
          <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">Passport scanned successfully</p>
                <p className="text-xs text-emerald-600">
                  Confidence: <span className="font-semibold capitalize">{extracted.confidence || 'high'}</span>
                  {extracted.unreadable_fields?.length > 0 && (
                    <span className="ml-2 text-amber-600">· Some fields may need review</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditMode(m => !m)}>
                <Pencil className="w-3 h-3" /> {editMode ? 'Done' : 'Edit'}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-slate-500" onClick={handleRescan}>
                <RefreshCw className="w-3 h-3" /> Re-scan
              </Button>
            </div>
          </div>

          {/* Extracted Fields — read-only tiles or editable inputs */}
          {editMode ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs text-slate-600">Passport Number</Label>
                <Input value={form.passport_number || ''} onChange={e => update('passport_number', e.target.value)} className="mt-1 font-mono tracking-widest" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Issue Date</Label>
                <Input type="date" value={form.passport_issue_date || ''} onChange={e => update('passport_issue_date', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Expiry Date</Label>
                <Input type="date" value={form.passport_expiry_date || ''} onChange={e => update('passport_expiry_date', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Nationality</Label>
                <Input value={form.nationality || ''} onChange={e => update('nationality', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Full Name (as on passport)</Label>
                <Input value={extracted.full_name || ''} readOnly className="mt-1 bg-slate-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Passport No.', value: form.passport_number, mono: true },
                { label: 'Expiry Date', value: form.passport_expiry_date },
                { label: 'Issue Date', value: form.passport_issue_date },
                { label: 'Full Name', value: extracted.full_name },
                { label: 'Nationality', value: form.nationality },
                { label: 'Date of Birth', value: extracted.date_of_birth },
              ].map(({ label, value, mono }) => (
                <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                  <p className={`text-sm font-semibold text-slate-800 mt-0.5 truncate ${mono ? 'font-mono tracking-wider' : ''}`}>
                    {value || <span className="text-slate-300 font-normal italic">Not detected</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Extraction Warnings */}
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium">{w}</p>
            </div>
          ))}

          {/* 6-Month Sentinel Warning */}
          {passportWarning !== null && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">⚠️ Passport Sentinel Alert</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your passport expires in <strong>{passportWarning} days</strong> — less than the 6-month minimum required by most international destinations. Please renew before travel.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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