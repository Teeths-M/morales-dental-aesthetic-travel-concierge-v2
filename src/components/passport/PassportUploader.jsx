import React, { useState, useRef } from 'react';
import { Shield, Upload, CheckCircle2, AlertTriangle, Lock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { encryptFile } from '@/lib/passportEncryption';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function validateFile(file) {
  if (!file) return 'Please select a file';
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `File type not allowed. Please use: PDF, JPG, PNG, or WebP`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large. Maximum size is ${MAX_SIZE_MB}MB (your file: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  return null; // valid
}

export default function PassportUploader({ onTokenIssued, consultationId }) {
  const [step, setStep] = useState('idle'); // idle | encrypting | uploading | done | error
  const [passportMeta, setPassportMeta] = useState({
    last_4_digits: '',
    expiry_date: '',
    nationality: '',
    full_name_redacted: '',
    document_type: 'passport'
  });
  const [error, setError] = useState(null);
  const [issuedToken, setIssuedToken] = useState(null);
  const [fileName, setFileName] = useState(null);
  const fileRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, WEBP, and PDF files are accepted.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setError(null);
    setFileName(file.name);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files[0];
    if (!file) { setError('Please select a passport image or PDF.'); return; }

    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    if (!passportMeta.last_4_digits || !passportMeta.expiry_date || !passportMeta.nationality) {
      setError('Please fill in the document metadata fields below.');
      return;
    }

    setStep('encrypting');
    setError(null);

    // Step 1: Encrypt the file entirely in the browser
    const { encryptedB64, keyB64, ivB64, hashB64, fileSizeBytes } = await encryptFile(file);

    setStep('uploading');

    // Step 2: Upload encrypted blob + key to secure vault
    const response = await base44.functions.invoke('uploadEncryptedPassport', {
      encrypted_file_b64: encryptedB64,
      encryption_key_b64: keyB64,
      encryption_iv_b64: ivB64,
      file_size_bytes: fileSizeBytes,
      file_hash_sha256: hashB64,
      document_type: passportMeta.document_type,
      redacted_for_display: passportMeta
    });

    const { passport_token, expires_at } = response.data;
    setIssuedToken(passport_token);
    setStep('done');

    if (onTokenIssued) {
      onTokenIssued({ passport_token, redacted_for_display: passportMeta, expires_at });
    }
  };

  return (
    <div className="space-y-5">
      {/* Security Banner */}
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <Lock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-emerald-800">End-to-End Encrypted</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Your passport is encrypted <strong>on your device</strong> with AES-256-GCM before upload.
            We never store or access the unencrypted document. Only you control access.
          </p>
        </div>
      </div>

      {step === 'done' ? (
        <div className="flex flex-col items-center gap-3 py-6 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <div className="text-center">
            <p className="text-sm font-semibold text-green-800">Passport Vault Created</p>
            <p className="text-xs text-green-700 mt-1">Secured with your unique token:</p>
            <code className="mt-2 block text-xs bg-white border border-green-200 rounded-lg px-3 py-2 font-mono text-green-800 break-all">
              {issuedToken}
            </code>
            <p className="text-xs text-green-600 mt-2">
              This token replaces your passport number in all system references.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Document Metadata (safe non-sensitive fields) */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              Document Reference Info (Non-Sensitive)
            </h4>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Last 4 Characters of Passport No.</Label>
                <Input
                  value={passportMeta.last_4_digits}
                  onChange={e => setPassportMeta(p => ({ ...p, last_4_digits: e.target.value.slice(-4).toUpperCase() }))}
                  placeholder="e.g. 678"
                  maxLength={4}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Expiry Date</Label>
                <Input
                  type="date"
                  value={passportMeta.expiry_date}
                  onChange={e => setPassportMeta(p => ({ ...p, expiry_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Nationality</Label>
                <Input
                  value={passportMeta.nationality}
                  onChange={e => setPassportMeta(p => ({ ...p, nationality: e.target.value }))}
                  placeholder="e.g. United States"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Full Name (for verification only)</Label>
                <Input
                  value={passportMeta.full_name_redacted}
                  onChange={e => setPassportMeta(p => ({ ...p, full_name_redacted: e.target.value }))}
                  placeholder="As on passport"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-xs text-slate-600">Upload Passport Image or PDF</Label>
            <div
              className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                {fileName ? (
                  <span className="text-emerald-700 font-semibold">{fileName}</span>
                ) : (
                  <>Click to select <span className="font-semibold">JPEG, PNG, or PDF</span></>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">Max {MAX_SIZE_MB}MB · Encrypted before leaving your device</p>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={step === 'encrypting' || step === 'uploading'}
            className="w-full gap-2"
          >
            {step === 'encrypting' ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Encrypting on your device...</>
            ) : step === 'uploading' ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading to secure vault...</>
            ) : (
              <><Shield className="w-4 h-4" /> Encrypt & Vault Passport</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}