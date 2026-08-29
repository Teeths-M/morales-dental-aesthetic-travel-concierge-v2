import React from 'react';
import MessageBubble from '@/components/mcare-agent/MessageBubble';
import McareAvatar from '@/components/mcare-agent/McareAvatar';
import JourneyStageTracker from '@/components/mcare-agent/JourneyStageTracker';
import ChatHeader from './ChatHeader';
import ChatBubble from './ChatBubble';
import ChatComposer from './ChatComposer';
import { MSAFE_CHAT, SAMPLE_CONVERSATION, MSAFE_PALETTE as C } from '../msafePlusConfig';

// MSafeChatPanel — the right column: premium header, scrollable message area,
// and a fixed composer. When no real conversation exists, a styled sample
// preview (the Geneva medical-travel exchange) is shown so the workspace
// matches the reference on first load; real messages take over once the user
// sends a message or taps a capability pill. All chat logic (send, subscribe,
// upload) is owned by the parent and passed in as props.
export default function MSafeChatPanel({
  messages, isSending, messagesEndRef,
  input, setInput, onSend, onKeyDown, chatInputRef,
  onFileSelect, vaultRef, onVaulted, isUploading,
  ghostSuggestion, onApplyCorrection, onToast,
  conversations, onSelectConversation, activeConversationId,
  onSafetyRespond, hasConversation, loadingConvos, greeting,
}) {
  const showDemo = !hasConversation && !loadingConvos;

  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatHeader />

      {hasConversation && messages.length > 0 && <JourneyStageTracker messages={messages} />}

      {conversations.length > 1 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0" style={{ borderBottom: '1px solid rgba(210,169,61,0.12)' }}>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors"
              style={c.id === activeConversationId
                ? { background: C.goldDeep, color: '#fff', borderColor: C.goldDeep }
                : { background: '#fff', color: C.charcoal, borderColor: 'rgba(210,169,61,0.25)' }}
            >
              {c.metadata?.name || 'Conversation'}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto w-full px-4 py-5 space-y-4">
          {showDemo ? (
            <>
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: '#aaa' }}>Preview</span>
              </div>
              {SAMPLE_CONVERSATION.map((m, i) => (
                <ChatBubble key={i} role={m.role} time={m.time}>{m.content}</ChatBubble>
              ))}
              <div className="text-center pt-2">
                <p className="text-[11px]" style={{ color: '#999' }}>Send a message or tap a capability to begin your session</p>
              </div>
            </>
          ) : (
            <>
              {hasConversation && messages.length === 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3" style={{ background: '#FFFFFF', border: '1px solid rgba(210,169,61,0.18)' }}>
                    <p className="text-[13px]" style={{ color: C.charcoal }}>{greeting}</p>
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  onRespond={onSafetyRespond}
                  showReaction
                  accent={MSAFE_CHAT.userAccent}
                  accentTextColor={MSAFE_CHAT.userAccentText}
                />
              ))}
              {isSending && (
                <div className="flex justify-start items-end gap-2">
                  <McareAvatar size={28} glow />
                  <div className="rounded-2xl px-4 py-3" style={{ background: '#FFFFFF', border: '1px solid rgba(210,169,61,0.2)' }}>
                    <div className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: C.goldDeep, animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      <ChatComposer
        input={input}
        setInput={setInput}
        onSend={onSend}
        onKeyDown={onKeyDown}
        chatInputRef={chatInputRef}
        onFileSelect={onFileSelect}
        vaultRef={vaultRef}
        onVaulted={onVaulted}
        isUploading={isUploading}
        isSending={isSending}
        ghostSuggestion={ghostSuggestion}
        onApplyCorrection={onApplyCorrection}
        onToast={onToast}
      />
    </div>
  );
}