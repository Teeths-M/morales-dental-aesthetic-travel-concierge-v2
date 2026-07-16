import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, Lock, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { decryptFileWithPassword } from '@/lib/vaultEncryption';

export default function ShareLinkViewer() {
  const { share_token } = useParams();
  const [vaultData, setVaultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [password, setPassword] = useState('');
  const [downloadError, setDownloadError] = useState(null);

  useEffect(() => {
    loadShareLink();
  }, []);

  const loadShareLink = async () => {
    try {
      const res = await base44.functions.invoke('accessShareLink', { share_token });
      setVaultData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired share link');
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!password) { setDownloadError('Please enter the decryption password.'); return; }
    setDownloading(true);
    setDownloadError(null);
    try {
      const { signed_url, encryption_iv_b64, encryption_salt_b64, file_name, mime_type } = vaultData;
      const blob = await fetch(signed_url).then(r => r.blob());
      const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));
      const decryptedBlob = await decryptFileWithPassword(encryptedB64, encryption_iv_b64, encryption_salt_b64, password, mime_type);
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      setDownloadError('Decryption failed — please check your password and try again.');
    }
    setDownloading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-red-200 p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-slate-800">Share Link Error</h1>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Secure Document Share</h1>
          <p className="text-sm text-slate-500 mt-1">
            Purpose: {vaultData?.purpose?.replace(/_/g, ' ') || 'Document Sharing'}
          </p>
        </div>

        {/* Document Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl">
              {vaultData?.redacted_for_display?.document_type === 'passport' ? '🛂' : '📄'}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{vaultData?.file_name || 'Document'}</p>
              <p className="text-xs text-slate-500">
                {(vaultData?.redacted_for_display?.full_name_redacted) || 'Shared Document'}
              </p>
            </div>
          </div>

          {vaultData?.redacted_for_display && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-1">
              {vaultData.redacted_for_display.booking_reference && (
                <p className="text-xs">
                  <span className="font-semibold">Reference:</span> {vaultData.redacted_for_display.booking_reference}
                </p>
              )}
              {vaultData.redacted_for_display.nationality && (
                <p className="text-xs">
                  <span className="font-semibold">Nationality:</span> {vaultData.redacted_for_display.nationality}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {vaultData?.accesses_remaining || 0} download{vaultData?.accesses_remaining !== 1 ? 's' : ''} remaining
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <Lock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                <strong>Encrypted document.</strong> Enter the decryption password provided by the document owner.
              </p>
            </div>
            <Input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setDownloadError(null); }}
              onKeyDown={e => e.key === 'Enter' && !downloading && handleDownload()}
              placeholder="Decryption password"
              className="w-full"
              autoComplete="off"
            />
            {downloadError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <p className="text-xs">{downloadError}</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full gap-2"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Decrypting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Document
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          🔒 Zero-knowledge encrypted · AES-256-GCM · PBKDF2 key derivation
        </p>
      </div>
    </div>
  );
}