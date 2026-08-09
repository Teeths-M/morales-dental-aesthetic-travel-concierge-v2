/**
 * InterruptedIntentChip — the honest version of "M-Care remembers what it
 * was cut off saying" (Conversational Mode). Rather than silently splicing
 * the unfinished topic into the agent's next reply (unverifiable without a
 * live Base44 session, and it would mean either hidden text or words the
 * user never actually said appearing in their own chat history), this
 * surfaces each interrupted topic as a small, dismissible, opt-in chip —
 * tap "Finish it" to actually ask about it as a real follow-up message.
 */
import React from 'react';
import { X, MessageCircleQuestion } from 'lucide-react';
import { shortTopicLabel } from '@/lib/conversationalMode';

const PURPLE = '#6C47FF';

export default function InterruptedIntentChip({ intents, onResume, onDismiss }) {
  if (!intents || intents.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 14px 8px' }}>
      {intents.map((intent) => (
        <div
          key={intent.id}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F4F1FF', border: `1px solid ${PURPLE}33`, borderRadius: 12, padding: '8px 10px' }}
        >
          <MessageCircleQuestion style={{ width: 15, height: 15, color: PURPLE, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
            You also asked about "{shortTopicLabel(intent.fullText)}" — want me to finish that?
          </span>
          <button
            type="button"
            onClick={() => onResume?.(intent)}
            style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: PURPLE, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', whiteSpace: 'nowrap' }}
          >
            Finish it
          </button>
          <button
            type="button"
            onClick={() => onDismiss?.(intent)}
            aria-label="Dismiss"
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 2 }}
          >
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ))}
    </div>
  );
}
