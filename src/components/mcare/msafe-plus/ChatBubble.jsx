import React from 'react';
import { MSAFE_CHAT, MSAFE_PALETTE as C } from '../msafePlusConfig';

// ChatBubble — the agent bubble used by the walkthrough conversation. User
// bubbles align right in a pale warm-gold gradient; agent bubbles align left
// in the surface colour with a small robot avatar. Real conversation messages
// render through MessageBubble, which preserves tool-call and token handling.
export default function ChatBubble({ role, children, time }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start items-end gap-2'}`}>
      {!isUser && (
        <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: 26, height: 26 }}>
          <img src="/morales-m-mark.png" alt="" width={26} height={26} style={{ width: 26, height: 26, objectFit: 'contain' }} />
        </div>
      )}
      <div
        className="relative max-w-[86%] rounded-2xl px-3.5 py-2.5"
        style={isUser
          ? { background: MSAFE_CHAT.userAccent, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
          : { background: 'var(--ms-card)', border: '1px solid var(--ms-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: isUser ? C.charcoal : 'var(--ms-ink)' }}>
          {children}
        </p>
        {time && <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--ms-ink-faint)' }}>{time}</p>}
      </div>
    </div>
  );
}