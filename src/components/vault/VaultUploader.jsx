import React, { useState, useRef } from 'react';
import { Shield, Upload, CheckCircle2, AlertTriangle, Lock, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { encryptFileWithPassword, storeVaultKey } from '@/lib/vaultEncryption';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 10;

const DOCUMENT_TYPES = [
  { value: 'passport', label: '🛂 Passport', icon: '🛂' },
  { value: 'visa', label: '🛂 Visa', icon: '🛂' },
  { value: 'national_id', label: '🆔 National ID', icon: '🆔' },
  { value: 'flight_ticket', label: '✈️ Flight Ticket', icon: '✈️' },
  { value: 'hotel_booking', label: '🏨 Hotel Booking', icon: '🏨' },
  { value: 'medical_record', label: '🏥 Medical Record', icon: '🏥' },
  { value: 'insurance', label: '🛡️ Insurance', icon: '🛡️' },
  { value: 'other', label: '📄 Other', icon: '📄' },
];

export default function VaultUploader({ onTokenIssued, consultationId }) {
  const [step, setStep] = useState('idle');
  const [vaultMeta, setVaultMeta] = useState({
    document_type: 'passport',
    last_4_digits: '',
    expiry_date: '',
    nationality: '',
    full_name_redacted: '',
    booking_reference: '',
    hotel_name: '',
    airline: '',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (!file) { setError('Please select a file.'); return; }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStep('encrypting');
    setError(null);

    try {
      // Step 1: Encrypt with PBKDF2 key derivation
      const { encryptedB64, ivB64, saltB64, hashB64, fileSizeBytes } = await encryptFileWithPassword(file, password);

      setStep('uploading');

      // Step 2: Upload to vault
      const response = await base44.functions.invoke('uploadToVault', {
        encrypted_file_b64: encryptedB64,
        encryption_iv_b64: ivB64,
        encryption_salt_b64: saltB64,
        file_hash_sha256: hashB64,
        file_size_bytes: fileSizeBytes,
        file_name: file.name,
        mime_type: file.type,
        document_type: vaultMeta.document_type,
        redacted_for_display: vaultMeta,
        is_emergency_accessible: true
      });

      const { vault_token, expires_at } = response.data;
      
      // Store salt in sessionStorage for later decryption
      storeVaultKey(vault_token, saltB64);
      
      setIssuedToken(vault_token);
      setStep('done');

      if (onTokenIssued) {
        onTokenIssued({ vault_token, redacted_for_display: vaultMeta, expires_at });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setStep('error');
    }
  };

  const getRelevantFields = () => {
    switch (vaultMeta.document_type) {
      case 'passport':
      case 'visa':
      case 'national_id':
        return ['last_4_digits', 'expiry_date', 'nationality', 'full_name_redacted'];
      case 'flight_ticket':
        return ['booking_reference', 'airline', 'full_name_redacted'];
      case 'hotel_booking':
        return ['booking_reference', 'hotel_name', 'full_name_redacted'];
      case 'insurance':
        return ['booking_reference', 'full_name_redacted'];
      default:
        return ['full_name_redacted'];
    }
  };

  const relevantFields = getRelevantFields();

  return (
    <div className="space-y-5">
      {/* Security Banner */}
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <Lock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-emerald-800">Zero-Knowledge Encryption</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Your document is encrypted <strong>on your device</strong> using PBKDF2 + AES-256-GCM.
            Your password never leaves your browser. Only you can decrypt.
          </p>
        </div>
      </div>

      {step === 'done' ? (
        <div className="flex flex-col items-center gap-3 py-6 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <div className="text-center">
            <p className="text-sm font-bold text-green-800">Document Vaulted Successfully</p>
            <p className="text-xs text-green-700 mt-1">Secure reference token:</p>
            <code className="mt-2 block text-xs bg-white border border-green-200 rounded-lg px-3 py-2 font-mono text-green-800 break-all">
              {issuedToken}
            </code>
            <p className="text-xs text-green-600 mt-2">
              Store this token safely. Use it to access your document anytime.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Document Type Selection */}
          <div>
            <Label className="text-xs text-slate-600">Document Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {DOCUMENT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setVaultMeta(p => ({ ...p, document_type: type.value }))}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                    vaultMeta.document_type === type.value
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-lg block mb-1">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Metadata Fields */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              Document Reference Info
            </h4>

            {relevantFields.includes('last_4_digits') && (
              <div>
                <Label className="text-xs text-slate-600">Last 4 Characters of Document Number</Label>
                <Input
                  value={vaultMeta.last_4_digits}
                  onChange={e => setVaultMeta(p => ({ ...p, last_4_digits: e.target.value.slice(-4).toUpperCase() }))}
                  placeholder="e.g. 678"
                  maxLength={4}
                  className="mt-1 font-mono"
                />
              </div>
            )}

            {relevantFields.includes('expiry_date') && (
              <div>
                <Label className="text-xs text-slate-600">Expiry Date</Label>
                <Input
                  type="date"
                  value={vaultMeta.expiry_date}
                  onChange={e => setVaultMeta(p => ({ ...p, expiry_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}

            {relevantFields.includes('nationality') && (
              <div>
                <Label className="text-xs text-slate-600">Nationality</Label>
                <Input
                  value={vaultMeta.nationality}
                  onChange={e => setVaultMeta(p => ({ ...p, nationality: e.target.value }))}
                  placeholder="e.g. United States"
                  className="mt-1"
                />
              </div>
            )}

            {relevantFields.includes('booking_reference') && (
              <div>
                <Label className="text-xs text-slate-600">Booking/Policy Number</Label>
                <Input
                  value={vaultMeta.booking_reference}
                  onChange={e => setVaultMeta(p => ({ ...p, booking_reference: e.target.value.toUpperCase() }))}
                  placeholder="e.g. ABC123"
                  className="mt-1 font-mono"
                />
              </div>
            )}

            {relevantFields.includes('hotel_name') && (
              <div>
                <Label className="text-xs text-slate-600">Hotel Name</Label>
                <Input
                  value={vaultMeta.hotel_name}
                  onChange={e => setVaultMeta(p => ({ ...p, hotel_name: e.target.value }))}
                  placeholder="e.g. Grand Hotel"
                  className="mt-1"
                />
              </div>
            )}

            {relevantFields.includes('airline') && (
              <div>
                <Label className="text-xs text-slate-600">Airline</Label>
                <Input
                  value={vaultMeta.airline}
                  onChange={e => setVaultMeta(p => ({ ...p, airline: e.target.value }))}
                  placeholder="e.g. American Airlines"
                  className="mt-1"
                />
              </div>
            )}

            {relevantFields.includes('full_name_redacted') && (
              <div>
                <Label className="text-xs text-slate-600">Full Name (for verification)</Label>
                <Input
                  value={vaultMeta.full_name_redacted}
                  onChange={e => setVaultMeta(p => ({ ...p, full_name_redacted: e.target.value }))}
                  placeholder="As on document"
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Encryption Password */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-bold text-blue-800">Set Encryption Password</p>
            </div>
            <p className="text-xs text-blue-700">
              This password encrypts your document. You'll need it to decrypt later. 
              <strong> We cannot recover it if lost.</strong>
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-blue-700">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-blue-700">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-xs text-slate-600">Upload Document</Label>
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
              <p className="text-xs text-slate-400 mt-1">Max {MAX_SIZE_MB}MB · Encrypted before upload</p>
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
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading to vault...</>
            ) : (
              <><Shield className="w-4 h-4" /> Encrypt & Vault Document</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}