/**
 * ShareLinkModal
 * Replaces the prompt() chain for share link creation.
 * Shows copy confirmation inline, no alert().
 */
import React, { useState, useEffect } from 'react';
import { Share2, Copy, CheckCircle2, X, Link as LinkIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PURPOSES = [
  { value: 'embassy',   label: '🏛️ Embassy' },
  { value: 'airline',   label: '✈️ Airline' },
  { value: 'hotel',     label: '🏨 Hotel' },
  { value: 'insurance', label: '🛡️ Insurance' },
  { value: 'medical',   label: '🏥 Medical' },
  { value: 'other',     label: '📄 Other' },
];

const EXPIRY_OPTIONS = [
  { value: 1,  label: '1 hour' },
  { value: 6,  label: '6 hours' },
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
];

export default function ShareLinkModal({ isOpen, vault, onClose }) {
  const [purpose, setPurpose]         = useState('other');
  const [expiryHours, setExpiryHours] = useState(24);
  const [maxAccess, setMaxAccess]     = useState(1);
  const [isCreating, setIsCreating]   = useState(false);
  const [shareUrl, setShareUrl]       = useState(null);
  const [copied, setCopied]           = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (isOpen) { setPurpose('other'); setExpiryHours(24); setMaxAccess(1); setShareUrl(null); setCopied(false); setError(null); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape' && !isCreating) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isCreating, onClose]);

  if (!isOpen || !vault) return null;

  const handleCreate = async () => {
    setIsCreating(true); setError(null);
    try {
      const res = await base44.functions.invoke('createSecureShareLink', {
        vault_id: vault.id,
        passport_token: vault.passport_token,
        purpose,
        expires_in_hours: expiryHours,
        max_access_count: maxAccess,
      });
      setShareUrl(res.data.share_url);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create share link.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isCreating ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0D1525] p-6"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}>
        <button onClick={onClose} disabled={isCreating}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.05] transition-colors disabled:opacity-0">
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
          <Share2 className="w-5 h-5 text-blue-400" strokeWidth={1.75} />
        </div>
        <h2 className="text-base font-semibold text-white mb-1">Create Secure Share Link</h2>
        <p className="text-xs text-white/40 mb-5 truncate">
          {vault.file_name} — {vault.document_type?.replace(/_/g, ' ')}
        </p>

        {shareUrl ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/[0.08] border border-emerald-500/25 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Link created — expires in {expiryHours}h · {maxAccess} access{maxAccess > 1 ? 'es' : ''}
              </p>
              <p className="text-xs text-white/50 font-mono break-all leading-relaxed">{shareUrl}</p>
            </div>
            <button onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${copied ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/[0.06] text-white border border-white/[0.10] hover:bg-white/[0.10]'}`}>
              {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
            </button>
            <button onClick={onClose} className="w-full px-4 py-2.5 rounded-xl text-xs text-white/40 hover:text-white/70 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Purpose */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-2">Purpose</p>
              <div className="grid grid-cols-3 gap-2">
                {PURPOSES.map(p => (
                  <button key={p.value} onClick={() => setPurpose(p.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${purpose === p.value ? 'border-blue-400/50 bg-blue-500/10 text-blue-300' : 'border-white/[0.08] text-white/40 hover:border-white/[0.15] hover:text-white/70'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-2">Expires After</p>
              <div className="grid grid-cols-4 gap-2">
                {EXPIRY_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setExpiryHours(o.value)}
                    className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all ${expiryHours === o.value ? 'border-blue-400/50 bg-blue-500/10 text-blue-300' : 'border-white/[0.08] text-white/40 hover:border-white/[0.15] hover:text-white/70'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max access */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-2">Max Downloads</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setMaxAccess(m => Math.max(1, m - 1))}
                  className="w-9 h-9 rounded-xl border border-white/[0.10] text-white/50 hover:text-white hover:bg-white/[0.05] flex items-center justify-center text-lg font-bold transition-all">
                  −
                </button>
                <span className="text-xl font-display font-semibold text-white min-w-[2ch] text-center tabular-nums">{maxAccess}</span>
                <button onClick={() => setMaxAccess(m => Math.min(10, m + 1))}
                  className="w-9 h-9 rounded-xl border border-white/[0.10] text-white/50 hover:text-white hover:bg-white/[0.05] flex items-center justify-center text-lg font-bold transition-all">
                  +
                </button>
                <span className="text-xs text-white/25 ml-1">Auto-revokes after {maxAccess} download{maxAccess > 1 ? 's' : ''}</span>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/25 rounded-xl px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 bg-white/[0.03] transition-all">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={isCreating}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {isCreating
                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                  : <><LinkIcon className="w-4 h-4" /> Create Link</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}