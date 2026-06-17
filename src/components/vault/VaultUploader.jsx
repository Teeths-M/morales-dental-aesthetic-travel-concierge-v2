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
    <div className="space-y-6">
      {/* Security Banner */}
      <div className="flex items-start gap-4 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
        <Lock className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-bold text-emerald-800" style={{ letterSpacing: '-0.01em' }}>Zero-Knowledge Encryption</p>
          <p className="text-[13px] text-emerald-700 mt-1.5 leading-relaxed">
            Your document is encrypted <strong>on your device</strong> using PBKDF2 + AES-256-GCM.
            Your password never leaves your browser. Only you can decrypt.
          </p>
        </div>
      </div>

      {step === 'done' ? (
        <div className="flex flex-col items-center gap-4 py-8 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
          <div className="text-center">
            <p className="text-[15px] font-bold text-green-800" style={{ letterSpacing: '-0.01em' }}>Document Vaulted Successfully</p>
            <p className="text-[13px] text-green-700 mt-2">Secure reference token:</p>
            <code className="mt-3 block text-[12px] bg-white border border-green-200 rounded-lg px-4 py-2.5 font-mono text-green-800 break-all">
              {issuedToken}
            </code>
            <p className="text-[12px] text-green-600 mt-3">
              Store this token safely. Use it to access your document anytime.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Document Type Selection */}
          <div>
            <Label className="text-[13px] font-bold text-white/90" style={{ letterSpacing: '-0.01em' }}>Document Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
              {DOCUMENT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setVaultMeta(p => ({ ...p, document_type: type.value }))}
                  className={`p-4 rounded-xl border text-[13px] font-bold transition-all ${
                    vaultMeta.document_type === type.value
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : 'bg-white/10 text-white/90 border-white/20 hover:border-white/40 hover:bg-white/15'
                  }`}
                >
                  <span className="text-xl block mb-1.5">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Metadata Fields */}
          <div className="space-y-4">
            <h4 className="text-[14px] font-bold text-white flex items-center gap-2" style={{ letterSpacing: '-0.01em' }}>
              <Eye className="w-4 h-4 text-white/70" />
              Document Reference Info
            </h4>

            {relevantFields.includes('last_4_digits') && (
              <div>
                <Label className="text-[13px] font-bold text-white/90">Last 4 Characters of Document Number</Label>
                <Input
                  value={vaultMeta.last_4_digits}
                  onChange={e => setVaultMeta(p => ({ ...p, last_4_digits: e.target.value.slice(-4).toUpperCase() }))}
                  placeholder="e.g. 678"
                  maxLength={4}
                  className="mt-1.5 font-mono bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {relevantFields.includes('expiry_date') && (
              <div>
                <Label className="text-xs font-bold text-white/90">Expiry Date</Label>
                <Input
                  type="date"
                  value={vaultMeta.expiry_date}
                  onChange={e => setVaultMeta(p => ({ ...p, expiry_date: e.target.value }))}
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {relevantFields.includes('nationality') && (
              <div>
                <Label className="text-xs font-bold text-white/90">Nationality</Label>
                <Input
                  value={vaultMeta.nationality}
                  onChange={e => setVaultMeta(p => ({ ...p, nationality: e.target.value }))}
                  placeholder="e.g. United States"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {relevantFields.includes('booking_reference') && (
              <div>
                <Label className="text-xs font-bold text-white/90">Booking/Policy Number</Label>
                <Input
                  value={vaultMeta.booking_reference}
                  onChange={e => setVaultMeta(p => ({ ...p, booking_reference: e.target.value.toUpperCase() }))}
                  placeholder="e.g. ABC123"
                  className="mt-1 font-mono bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {relevantFields.includes('hotel_name') && (
              <div>
                <Label className="text-xs font-bold text-white/90">Hotel Name</Label>
                <Input
                  value={vaultMeta.hotel_name}
                  onChange={e => setVaultMeta(p => ({ ...p, hotel_name: e.target.value }))}
                  placeholder="e.g. Grand Hotel"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {relevantFields.includes('airline') && (
              <div>
                <Label className="text-xs font-bold text-white/90">Airline</Label>
                <Input
                  value={vaultMeta.airline}
                  onChange={e => setVaultMeta(p => ({ ...p, airline: e.target.value }))}
                  placeholder="e.g. American Airlines"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {relevantFields.includes('full_name_redacted') && (
              <div>
                <Label className="text-xs font-bold text-white/90">Full Name (for verification)</Label>
                <Input
                  value={vaultMeta.full_name_redacted}
                  onChange={e => setVaultMeta(p => ({ ...p, full_name_redacted: e.target.value }))}
                  placeholder="As on document"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}
          </div>

          {/* Encryption Password */}
          <div className="bg-blue-900/40 border border-blue-400/30 rounded-xl p-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-blue-300" />
              <p className="text-[14px] font-bold text-blue-100" style={{ letterSpacing: '-0.01em' }}>Set Encryption Password</p>
            </div>
            <p className="text-[13px] text-blue-200/90 leading-relaxed">
              This password encrypts your document. You'll need it to decrypt later. 
              <strong> We cannot recover it if lost.</strong>
            </p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-[13px] font-bold text-blue-100">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div>
                <Label className="text-[13px] font-bold text-blue-100">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-[13px] font-bold text-white/90" style={{ letterSpacing: '-0.01em' }}>Upload Document</Label>
            <div
              className="mt-2 border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-7 h-7 text-white/60 mx-auto mb-3" />
              <p className="text-[14px] text-white/80">
                {fileName ? (
                  <span className="text-emerald-300 font-bold">{fileName}</span>
                ) : (
                  <>Click to select <span className="font-bold text-white">JPEG, PNG, or PDF</span></>
                )}
              </p>
              <p className="text-[12px] text-white/60 mt-2">Max {MAX_SIZE_MB}MB · Encrypted before upload</p>
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
            <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-[13px]">{error}</p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={step === 'encrypting' || step === 'uploading'}
            className="w-full gap-2.5 h-12 rounded-xl text-[14px] font-semibold"
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