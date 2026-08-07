// MCarePreviewNotice — shown in place of the M-Safe chat when the only
// "session" is the Base44 preview mock admin. The live agent runtime needs a
// real, signed-in app-user session to run its safety checks and coordination;
// the preview mock has no token, so every message comes back as
// "You have to sign in to communicate." Rather than let the user talk to a
// wall, we explain it plainly and offer the real path forward.
import React from 'react';
import { Shield, LogIn, X, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const PURPLE = '#6C47FF';

export default function MCarePreviewNotice({ onClose }) {
  // appBaseUrl points at the published app when set; on the preview host it's
  // usually empty, so only offer the link when it resolves somewhere different.
  const publishedUrl = appParams?.appBaseUrl && appParams.appBaseUrl !== window.location.origin
    ? appParams.appBaseUrl
    : null;

  const signIn = () => base44.auth.redirectToLogin(window.location.pathname);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16, background: '#F6F7FB' }}>
      <span style={{ width: 56, height: 56, borderRadius: '50%', background: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="m-breathe">
        <Shield style={{ width: 26, height: 26, color: '#fff' }} fill="#fff" />
      </span>
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#111827' }}>M-Safe needs a real account</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.55, maxWidth: 380 }}>
          You're viewing the Base44 preview as a mock admin. The live M-Safe agent runs safety checks,
          matches verified providers, and coordinates your trip — and that needs a real, signed-in account.
          The preview session can't authenticate the agent, so it can't run here.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280 }}>
        <button onClick={signIn}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: PURPLE, color: '#fff', border: 'none', borderRadius: 12, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        ><LogIn style={{ width: 15, height: 15 }} /> Sign in with a real account</button>
        {publishedUrl && (
          <a href={publishedUrl} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', color: PURPLE, border: '1px solid #E5E7EB', borderRadius: 12, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
          ><ExternalLink style={{ width: 15, height: 15 }} /> Open the published app</a>
        )}
        <button onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent', color: '#6B7280', border: 'none', borderRadius: 12, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        ><X style={{ width: 15, height: 15 }} /> Close</button>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', maxWidth: 340, lineHeight: 1.5 }}>
        Publish your app and open it on a real account to chat with M-Safe. The agent itself is fully configured and ready.
      </p>
    </div>
  );
}