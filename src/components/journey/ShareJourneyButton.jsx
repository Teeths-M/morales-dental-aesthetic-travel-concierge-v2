import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

function openNav(url) { window.open(url, '_blank', 'noopener,noreferrer'); }

/**
 * ShareJourneyButton — lets the patient generate a real /track/:token link
 * (via generateShareToken) and share it with family. The missing entry
 * point for PublicRecoveryTracker.jsx — without this, that page can never
 * be reached with a valid token from the real app.
 */
export default function ShareJourneyButton({ caseId }) {
  const [state,    setState]    = useState('idle'); // idle | loading | ready | error
  const [shareUrl, setShareUrl] = useState('');
  const [copied,   setCopied]   = useState(false);

  async function handleShare() {
    if (!caseId) return;
    setState('loading');
    try {
      const res = await base44.functions.invoke('generateShareToken', { case_id: caseId });
      const data = res?.data ?? res;
      if (!data?.share_url) throw new Error('no share_url');
      setShareUrl(data.share_url);
      setState('ready');
    } catch (_) {
      setState('error');
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (state === 'idle' || state === 'loading') {
    return (
      <button
        onClick={handleShare}
        disabled={state === 'loading'}
        className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
        style={{ background: 'rgba(212,175,55,0.08)', border: `1px solid ${GOLD}30`, color: GOLD }}
      >
        <Share2 className="w-3.5 h-3.5" />
        {state === 'loading' ? 'Creating your link…' : 'Share My Journey With Family'}
      </button>
    );
  }

  if (state === 'error') {
    return (
      <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Could not create a share link right now. Please try again shortly.
      </p>
    );
  }

  const shareMsg = encodeURIComponent(`Follow my journey with Morales Medical: ${shareUrl}`);

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
      <p className="text-xs font-semibold" style={{ color: GOLD }}>Your family tracker link is ready</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{shareUrl}</code>
        <button onClick={copyLink} className="flex-shrink-0 p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => openNav(`https://wa.me/?text=${shareMsg}`)}
          style={{ padding: '8px 6px', borderRadius: 8, background: '#25D366', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <MessageCircle size="12" />WhatsApp
        </button>
        <button onClick={() => openNav(`sms:?body=${shareMsg}`)}
          style={{ padding: '8px 6px', borderRadius: 8, background: '#1e3040', border: '1px solid #2A3F4A', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <MessageSquare size="12" />SMS
        </button>
      </div>
    </div>
  );
}
