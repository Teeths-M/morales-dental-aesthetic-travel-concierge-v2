import React, { useState, useRef } from 'react';
import { Shield, Lock, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { encryptFileWithPassword, storeVaultKey } from '@/lib/vaultEncryption';
import { friendlyError } from '@/lib/friendlyError';

// Document types a partner can vault from the M-Care chat.
// 'other' covers licenses (medical/business/driver) — PassportVault has no
// dedicated license type, and honesty beats a wrong enum label.
const DOC_TYPES = [
  { value: 'other', label: 'License / Cert' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'national_id', label: 'ID / Passport' },
];

const LABEL_BY_TYPE = {
  other: 'license / certification',
  insurance: 'insurance certificate',
  national_id: 'ID document',
};

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf';
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_MB = 8;

export const DOC_LABEL = LABEL_BY_TYPE;

export default function MCareVaultUpload({ onVaulted }) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState('other');
  const [reference, setReference] = useState('');
  const [nameOnDoc, setNameOnDoc] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('idle'); // idle | encrypting | uploading | done | error
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const reset = () => {
    setDocType('other'); setReference(''); setNameOnDoc(''); setPassword(''); setConfirmPw('');
    setFile(null); setStep('idle'); setToken(null); setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => { setOpen(false); setTimeout(reset, 200); };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) { setError('Only JPEG, PNG, WebP, or PDF files are accepted.'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`File must be under ${MAX_MB}MB.`); return; }
    setError(null); setFile(f);
  };

  const handleUpload = async () => {
    if (!file) { setError('Please choose a file.'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    if (!navigator.onLine) { setError('Upload requires an internet connection.'); return; }

    setStep('encrypting'); setError(null);
    try {
      // 1. Encrypt on-device (AES-256-GCM, PBKDF2 key) — plaintext never leaves the browser.
      const { encryptedB64, ivB64, saltB64, hashB64, fileSizeBytes } = await encryptFileWithPassword(file, password);

      setStep('uploading');

      // 2. Upload the encrypted blob to private storage.
      const encryptedBytes = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));
      const encryptedFile = new File([encryptedBytes], 'vault_document.enc', { type: 'application/octet-stream' });
      const uploadResult = await base44.integrations.Core.UploadPrivateFile({ file: encryptedFile });
      if (!uploadResult?.file_uri) throw new Error('Private upload returned no file_uri');

      // 3. Register the vault record (mirrors the proven VaultUploader invocation).
      const response = await base44.functions.invoke('uploadToVault', {
        encrypted_file_uri: uploadResult.file_uri,
        encryption_iv_b64: ivB64,
        encryption_salt_b64: saltB64,
        file_hash_sha256: hashB64,
        file_size_bytes: fileSizeBytes,
        file_name: file.name,
        mime_type: file.type,
        document_type: docType,
        redacted_for_display: {
          document_type: docType,
          booking_reference: reference || undefined,
          full_name_redacted: nameOnDoc || undefined,
        },
        is_emergency_accessible: true,
      });

      const data = response?.data || response;
      if (data?.error) throw new Error(data.error);
      const vault_token = data?.vault_token;
      if (!vault_token) throw new Error('Vault did not issue a reference token.');

      storeVaultKey(vault_token, saltB64);
      setToken(vault_token);
      setStep('done');
      if (onVaulted) onVaulted({ token: vault_token, document_type: docType, file_name: file.name });
    } catch (err) {
      setError(friendlyError(err, 'We could not vault that document. Nothing was stored — please try again.', 'MCareVaultUpload'));
      setStep('error');
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="icon"
        title="Upload a license or insurance document to the secure vault"
      >
        <Shield className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" /> Secure Document Vault
            </DialogTitle>
            <DialogDescription>
              Submit your license or insurance certificate. It's encrypted on your device before upload — only you can decrypt it.
            </DialogDescription>
          </DialogHeader>

          {step === 'done' ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="w-11 h-11 text-emerald-600" />
              <p className="text-sm font-semibold text-foreground">Document vaulted securely</p>
              <p className="text-xs text-muted-foreground">Secure reference token:</p>
              <code className="text-xs bg-secondary border border-border rounded-lg px-3 py-2 font-mono break-all max-w-full">{token}</code>
              <p className="text-xs text-muted-foreground max-w-xs">
                M-Care has been notified. Your document is stored encrypted and will be reviewed by our verification team.
              </p>
              <Button onClick={close} className="mt-2">Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Document type</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {DOC_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setDocType(t.value)}
                      className={`px-2 py-2.5 rounded-lg border text-xs font-medium text-center transition-colors ${
                        docType === t.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-card-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Reference / Policy # (optional)</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. LIC-12345" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Name on document (optional)</Label>
                  <Input value={nameOnDoc} onChange={(e) => setNameOnDoc(e.target.value)} placeholder="As on document" className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Document file</Label>
                <div
                  className="mt-1.5 border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm">
                    {file ? <span className="text-emerald-600 font-medium">{file.name}</span> : <>Click to select <span className="font-medium">JPEG, PNG, or PDF</span></>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Max {MAX_MB}MB · encrypted before upload</p>
                  <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFile} />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold">Encryption password</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This encrypts your document on your device. You'll need it to decrypt later. We cannot recover it if lost.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars" />
                  <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-destructive text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button onClick={handleUpload} disabled={step === 'encrypting' || step === 'uploading'} className="w-full">
                {step === 'encrypting' ? (
                  <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Encrypting…</>
                ) : step === 'uploading' ? (
                  <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Uploading to vault…</>
                ) : (
                  <><Shield className="w-4 h-4" /> Encrypt &amp; Vault Document</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}