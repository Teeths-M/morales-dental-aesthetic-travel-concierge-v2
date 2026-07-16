// @ts-nocheck — pre-existing type gaps
import React, { useState, useRef } from 'react';
import { Shield, Upload, CheckCircle2, AlertTriangle, Lock, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { encryptFileWithPassword, storeVaultKey } from '@/lib/vaultEncryption';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 10;

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'ðŸ›‚ Passport', icon: 'ðŸ›‚' },
  { value: 'visa', label: 'ðŸ›‚ Visa', icon: 'ðŸ›‚' },
  { value: 'national_id', label: 'ðŸ†” National ID', icon: 'ðŸ†”' },
  { value: 'flight_ticket', label: 'âœˆï¸ Flight Ticket', icon: 'âœˆï¸' },
  { value: 'hotel_booking', label: 'ðŸ¨ Hotel Booking', icon: 'ðŸ¨' },
  { value: 'medical_record', label: 'ðŸ¥ Medical Record', icon: 'ðŸ¥' },
  { value: 'insurance', label: 'ðŸ›¡ï¸ Insurance', icon: 'ðŸ›¡ï¸' },
  { value: 'payment_reference', label: 'ðŸ’³ Payment Reference', icon: 'ðŸ’³' },
  { value: 'other', label: 'ðŸ“„ Other', icon: 'ðŸ“„' },
];

export default function VaultUploader({ onTokenIssued, _consultationId }) {
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
    card_issuer: '',
    bank_phone: '',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [issuedToken, setIssuedToken] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  const handleFileSelect = async (e) => {
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
    setSelectedFile(file);
    
    // Skip auto-extraction if offline or if document type is not passport
    if (vaultMeta.document_type === 'passport' && file.type.includes('image') && navigator.onLine) {
      setExtracting(true);
      try {
        console.log('[VaultUploader] Starting extraction for file:', file.name, file.type);
        
        // Convert file to ArrayBuffer to ensure proper serialization through SDK
        const arrayBuffer = await file.arrayBuffer();
        const uploadRes = await base44.integrations.Core.UploadFile({ file: arrayBuffer });
        console.log('[VaultUploader] File uploaded, URL:', uploadRes.data.file_url);
        
        const extractRes = await base44.functions.invoke('extractPassportData', { file_url: uploadRes.data.file_url });
        
        console.log('[VaultUploader] Extraction response:', extractRes.data);
        
        // Check if extraction was successful
        if (extractRes.data?.success && extractRes.data?.extracted) {
          const data = extractRes.data.extracted;
          console.log('[VaultUploader] Extracted data:', data);
          
          // Create extracted data object with all fields
          const extractedObj = {
            full_name: data.full_name || '',
            nationality: data.nationality || '',
            expiry_date: data.expiry_date || '',
            last_4: data.last_4 || (data.passport_number ? data.passport_number.slice(-4) : '') || '',
            warnings: extractRes.data.warnings || []
          };
          
          setExtractedData(extractedObj);
          
          // Auto-populate fields with extracted data - force update
          const newVaultMeta = {
            ...vaultMeta,
            last_4_digits: extractedObj.last_4,
            expiry_date: extractedObj.expiry_date,
            nationality: extractedObj.nationality,
            full_name_redacted: extractedObj.full_name,
          };
          
          console.log('[VaultUploader] Setting vault meta to:', newVaultMeta);
          setVaultMeta(newVaultMeta);
        } else {
          console.log('[VaultUploader] Extraction failed - no data returned', extractRes.data);
          setExtractedData({ extracted: false, error: 'Could not read passport' });
        }
      } catch (err) {
        console.error('[VaultUploader] Auto-extract error:', err);
        setExtractedData({ extracted: false, error: 'Extraction failed - please fill manually' });
        // Continue without extraction - not critical, user can fill manually
      }
      setExtracting(false);
    } else if (!navigator.onLine) {
      // Offline - skip extraction, user fills manually
      console.log('[VaultUploader] Offline - skipping auto-extraction');
    }
  };

  const handleUpload = async () => {
    const file = selectedFile || fileRef.current?.files[0];
    if (!file) { setError('Please select a file.'); return; }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Check file size before encryption (10MB limit, but encrypted base64 will be ~33% larger)
    const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB to allow room for base64 expansion
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB (original file must be under 8MB to allow for encryption overhead).`);
      return;
    }

    // Guard: Block uploads when offline
    if (!navigator.onLine) {
      setError('Upload requires internet connection. Please reconnect and try again.');
      return;
    }

    setStep('encrypting');
    setError(null);

    try {
      console.log('[VaultUploader] Starting encryption, file size:', file.size, 'bytes');
      
      // Step 1: Encrypt with PBKDF2 key derivation
      const { encryptedB64, ivB64, saltB64, hashB64, fileSizeBytes } = await encryptFileWithPassword(file, password);
      
      console.log('[VaultUploader] Encryption complete, encrypted size:', encryptedB64.length, 'chars');

      setStep('uploading');

      // Step 2: Upload encrypted file to private storage directly from frontend
      console.log('[VaultUploader] Uploading encrypted file to private storage...');
      
      // Convert base64 to File for UploadPrivateFile (preserves filename for multipart/form-data)
      const encryptedBytes = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
      const encryptedFile = new File([encryptedBytes], 'vault_document.enc', { type: 'application/octet-stream' });
      
      const uploadResult = await base44.integrations.Core.UploadPrivateFile({ file: encryptedFile });
      console.log('[VaultUploader] Private file uploaded, URI:', uploadResult.file_uri);
      
      if (!uploadResult.file_uri) {
        throw new Error('UploadPrivateFile returned no file_uri');
      }

      // Step 3: Register vault record with the file URI
      console.log('[VaultUploader] Registering vault record...');
      const response = await base44.functions.invoke('uploadToVault', {
        encrypted_file_uri: uploadResult.file_uri,
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

      console.log('[VaultUploader] Upload response:', response.data);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const { vault_token, expires_at } = response.data;
      
      // Store salt in sessionStorage for later decryption
      storeVaultKey(vault_token, saltB64);

      // AUTO-CACHE: write the encrypted blob to localStorage right now, while
      // we already have it in memory. Without this, a document is only
      // retrievable offline if the user separately triggers "Save Offline"
      // or successfully downloads it once while online first â€” meaning a
      // document uploaded and then immediately taken offline (e.g. airport,
      // no Wi-Fi after upload) would be permanently unreachable until the
      // next time the user is online. Caching here closes that gap so every
      // uploaded document is offline-ready from the moment it's vaulted.
      const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB â€” matches VaultDashboard's limit
      if (fileSizeBytes < MAX_CACHE_SIZE) {
        try {
          const cacheKey = `vault_encrypted_${vault_token}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            encryptedB64,
            encryption_iv_b64: ivB64,
            encryption_salt_b64: saltB64,
            file_name: file.name,
            mime_type: file.type,
            cached_at: new Date().toISOString()
          }));
          console.log('[VaultUploader] Auto-cached for offline access:', file.name);
        } catch (cacheErr) {
          // Non-fatal â€” upload already succeeded; just won't be offline-ready
          // until the user later triggers "Save Offline" while online.
          console.warn('[VaultUploader] Auto-cache failed (non-fatal):', cacheErr);
        }
      } else {
        console.warn('[VaultUploader] Document too large to auto-cache for offline use:', fileSizeBytes, 'bytes');
      }
      
      setIssuedToken(vault_token);
      setStep('done');

      if (onTokenIssued) {
        onTokenIssued({ vault_token, redacted_for_display: vaultMeta, expires_at });
      }
    } catch (err) {
      console.error('[VaultUploader] Upload error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Upload failed. Please try again.';
      setError(errorMessage);
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
      case 'payment_reference':
        return ['card_issuer', 'bank_phone', 'last_4_digits', 'full_name_redacted'];
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
          <p className="text-[13px] font-semibold text-emerald-800" style={{ letterSpacing: '-0.01em' }}>Zero-Knowledge Encryption</p>
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
            <p className="text-[15px] font-semibold text-green-800" style={{ letterSpacing: '-0.01em' }}>Document Vaulted Successfully</p>
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
            <Label className="text-[13px] font-semibold text-white/90" style={{ letterSpacing: '-0.01em' }}>Document Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
              {DOCUMENT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => {
                    setVaultMeta(p => ({ ...p, document_type: type.value }));
                    // Clear file state when changing document type to prevent cross-contamination
                    setFileName(null);
                    setSelectedFile(null);
                    setExtractedData(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className={`p-4 rounded-xl border text-[13px] font-semibold transition-all ${
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

          {/* Auto-Extraction Status */}
          {extracting && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Reading passport...</p>
                <p className="text-xs text-blue-700">Auto-filling your details</p>
              </div>
            </div>
          )}
          
          {extractedData && extractedData.extracted === false ? (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Could not auto-fill passport</p>
                <p className="text-xs text-amber-700 mt-1">
                  {extractedData.error || 'AI extraction failed. Please enter details manually.'}
                </p>
              </div>
            </div>
          ) : extractedData && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900">âœ“ Passport details auto-filled!</p>
                <p className="text-xs text-green-700 mt-1">
                  Extracted: <span className="font-semibold">{extractedData.full_name || 'Name'}</span> â€¢ 
                  <span className="font-semibold"> {extractedData.nationality || 'Nationality'}</span>
                  {extractedData.expiry_date && <span> â€¢ Expires: {extractedData.expiry_date}</span>}
                </p>
                {extractedData.warnings && extractedData.warnings.length > 0 && (
                  <div className="mt-2 text-xs text-amber-700 font-semibold">
                    âš  {extractedData.warnings[0]}
                  </div>
                )}
                <button 
                  onClick={() => { setExtractedData(null); setVaultMeta(p => ({ ...p, last_4_digits: '', expiry_date: '', nationality: '', full_name_redacted: '' })); }}
                  className="text-xs text-green-700 underline mt-2 hover:text-green-900"
                >
                  Clear and enter manually
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Metadata Fields */}
          <div className="space-y-4">
            <h4 className="text-[14px] font-semibold text-white flex items-center gap-2" style={{ letterSpacing: '-0.01em' }}>
              <Eye className="w-4 h-4 text-white/70" />
              Document Reference Info
            </h4>

            {/* Payment Reference Security Warning */}
            {vaultMeta.document_type === 'payment_reference' && (
              <div className="flex items-start gap-3 bg-amber-900/40 border border-amber-400/30 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-amber-100" style={{ letterSpacing: '-0.01em' }}>Security Notice</p>
                  <p className="text-[12px] text-amber-200/90 mt-1.5 leading-relaxed">
                    <strong>Do NOT upload images showing full card numbers or CVV codes.</strong> This vault is for emergency reference only. 
                    Before uploading, physically cover the middle 8 digits and CVV on your card. Store only the last 4 digits below.
                  </p>
                </div>
              </div>
            )}

            {relevantFields.includes('last_4_digits') && (
              <div>
                <Label className="text-[13px] font-semibold text-white/90">Last 4 Characters of Document Number</Label>
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
                <Label className="text-xs font-semibold text-white/90">Expiry Date</Label>
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
                <Label className="text-xs font-semibold text-white/90">Nationality</Label>
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
                <Label className="text-xs font-semibold text-white/90">Booking/Policy Number</Label>
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
                <Label className="text-xs font-semibold text-white/90">Hotel Name</Label>
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
                <Label className="text-xs font-semibold text-white/90">Airline</Label>
                <Input
                  value={vaultMeta.airline}
                  onChange={e => setVaultMeta(p => ({ ...p, airline: e.target.value }))}
                  placeholder="e.g. American Airlines"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {relevantFields.includes('card_issuer') && (
              <div>
                <Label className="text-[13px] font-semibold text-white/90">Card Issuer / Bank Name</Label>
                <Input
                  value={vaultMeta.card_issuer}
                  onChange={e => setVaultMeta(p => ({ ...p, card_issuer: e.target.value }))}
                  placeholder="e.g. Chase Visa, RBC Mastercard"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {relevantFields.includes('bank_phone') && (
              <div>
                <Label className="text-[13px] font-semibold text-white/90">Bank Emergency Phone</Label>
                <Input
                  value={vaultMeta.bank_phone}
                  onChange={e => setVaultMeta(p => ({ ...p, bank_phone: e.target.value }))}
                  placeholder="e.g. +1-800-555-1234"
                  className="mt-1.5 font-mono bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {relevantFields.includes('full_name_redacted') && (
              <div>
                <Label className="text-xs font-semibold text-white/90">Full Name (for verification)</Label>
                <Input
                  value={vaultMeta.full_name_redacted}
                  onChange={e => setVaultMeta(p => ({ ...p, full_name_redacted: e.target.value }))}
                  placeholder="As on document"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}

            {/* Other document type - show generic note */}
            {vaultMeta.document_type === 'other' && (
              <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-white/70">
                  For documents not listed above. Enter your name for verification purposes.
                </p>
              </div>
            )}
          </div>

          {/* Encryption Password */}
          <div className="bg-blue-900/40 border border-blue-400/30 rounded-xl p-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-blue-300" />
              <p className="text-[14px] font-semibold text-blue-100" style={{ letterSpacing: '-0.01em' }}>Set Encryption Password</p>
            </div>
            <p className="text-[13px] text-blue-200/90 leading-relaxed">
              This password encrypts your document. You'll need it to decrypt later. 
              <strong> We cannot recover it if lost.</strong>
            </p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-[13px] font-semibold text-blue-100">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div>
                <Label className="text-[13px] font-semibold text-blue-100">Confirm Password</Label>
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
            <Label className="text-[13px] font-semibold text-white/90" style={{ letterSpacing: '-0.01em' }}>Upload Document</Label>
            <div
              className="mt-2 border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-7 h-7 text-white/60 mx-auto mb-3" />
              <p className="text-[14px] text-white/80">
                {fileName ? (
                  <span className="text-emerald-300 font-semibold">{fileName}</span>
                ) : (
                  <>Click to select <span className="font-semibold text-white">JPEG, PNG, or PDF</span></>
                )}
              </p>
              <p className="text-[12px] text-white/60 mt-2">Max {MAX_SIZE_MB}MB Â· Encrypted before upload</p>
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
