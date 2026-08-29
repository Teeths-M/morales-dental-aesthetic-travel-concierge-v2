import React from 'react';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import { MSAFE_CHAT, MSAFE_PALETTE as C } from '../msafePlusConfig';

// ChatBubble — the premium bubble used for the sample preview conversation.
// User bubbles align right in a pale warm-gold gradient; agent bubbles align
// left in white with a small robot avatar. Each carries a small gold dog-ear
// corner accent. Real conversation messages render via the existing
// MessageBubble (which preserves all tool-call/token functionality).
export default function ChatBubble({ role, children, time }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start items-end gap-2'}`}>
      {!isUser && (
        <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: 28, height: 28 }}>
          <RobotAvatarImage size={28} animated={false} />
        </div>
      )}
      <div
        className="relative max-w-[80%] rounded-2xl px-3.5 py-2.5"
        style={isUser
          ? { background: MSAFE_CHAT.userAccent, boxShadow: '0 2px 8px rgba(210,169,61,0.15)' }
          : { background: '#FFFFFF', border: '1px solid rgba(210,169,61,0.18)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <span aria-hidden="true" style={{ position: 'absolute', top: 0, [isUser ? 'right' : 'left']: 0, width: 15, height: 2, background: isUser ? '#B0851E' : '#C9A43B' }} />
        <span aria-hidden="true" style={{ position: 'absolute', top: 0, [isUser ? 'right' : 'left']: 0, width: 2, height: 15, background: isUser ? '#B0851E' : '#C9A43B' }} />
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: C.charcoal }}>{children}</p>
        {time && <p className="text-[10px] mt-1 opacity-50" style={{ color: C.charcoalSoft }}>{time}</p>}
      </div>
    </div>
  );
}