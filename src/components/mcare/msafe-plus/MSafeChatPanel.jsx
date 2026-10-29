import React, { useState } from 'react';
import MessageBubble from '@/components/mcare-agent/MessageBubble';
import McareAvatar from '@/components/mcare-agent/McareAvatar';
import JourneyStageTracker from '@/components/mcare-agent/JourneyStageTracker';
import ChatHeader from './ChatHeader';
import ChatComposer from './ChatComposer';
import ScenarioBar from './ScenarioBar';
import ScenarioPanel from './ScenarioPanel';
import { useMsafeIntake } from '@/hooks/useMsafeIntake';
import { PlayCircle } from 'lucide-react';
import { MSAFE_CHAT } from '../msafePlusConfig';

/**
 * MSafeChatPanel — the main column: session header, the intake state line, the
 * conversation, and the composer.
 *
 * Before a session exists it opens on the nine-stage walkthrough, driven by
 * the live provider record. Sending anything hands over to the real agent.
 * Once a session is live the walkthrough stays reachable from the state line
 * rather than disappearing for good — a demonstration has to be repeatable.
 */
export default function MSafeChatPanel({
  messages, isSending, messagesEndRef,
  input, setInput, onSend, onKeyDown, chatInputRef,
  onFileSelect, vaultRef, onVaulted, isUploading,
  ghostSuggestion, onApplyCorrection, onToast,
  conversations, onSelectConversation, activeConversationId,
  onSafetyRespond, hasConversation, loadingConvos, greeting,
  onSelectIntent,
}) {
  const freshSession = !hasConversation && !loadingConvos;
  const [mode, setMode] = useState('auto'); // 'auto' | 'scenario' | 'chat'
  const walkthrough = mode === 'scenario' || (mode === 'auto' && freshSession);

  const { stages, loading: intakeLoading, loaded, failed } = useMsafeIntake(walkthrough);
  const [stageIndex, setStageIndex] = useState(0);

  const lastAssistant = [...messages].reverse().find((m) => m.role !== 'user');
  const lastMessage = walkthrough ? stages[stageIndex]?.intro : lastAssistant?.content;

  // Sending leaves the walkthrough — the patient's own words start the real
  // session, and their reply must be visible.
  const handleSend = () => {
    setMode('chat');
    onSend();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatHeader lastMessage={lastMessage} />

      {walkthrough && stages.length > 0 && (
        <ScenarioBar
          stages={stages}
          activeIndex={Math.min(stageIndex, stages.length - 1)}
          onSelect={setStageIndex}
          onExit={hasConversation ? () => setMode('chat') : null}
        />
      )}

      {!walkthrough && hasConversation && (
        <div
          className="flex items-center gap-2 px-4 md:px-6 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--ms-border-soft)' }}
        >
          <p
            className="text-[9.5px] font-bold uppercase"
            style={{ color: 'var(--ms-ink-faint)', letterSpacing: '0.14em' }}
          >
            Real scenario
            <span style={{ color: 'var(--ms-gold)' }}> · </span>
            Live session
          </p>
          <button
            type="button"
            onClick={() => { setStageIndex(0); setMode('scenario'); }}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1"
            style={{ background: 'var(--ms-chip)', border: '1px solid var(--ms-border)' }}
          >
            <PlayCircle className="w-3 h-3" style={{ color: 'var(--ms-gold)' }} />
            <span className="text-[10px] font-semibold" style={{ color: 'var(--ms-ink)' }}>
              Walkthrough
            </span>
          </button>
        </div>
      )}

      {hasConversation && messages.length > 0 && !walkthrough && <JourneyStageTracker messages={messages} />}

      {conversations.length > 1 && !walkthrough && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0" style={{ borderBottom: '1px solid var(--ms-border-soft)' }}>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors"
              style={c.id === activeConversationId
                ? { background: 'var(--ms-ink)', color: 'var(--ms-main)', borderColor: 'var(--ms-ink)' }
                : { background: 'var(--ms-card)', color: 'var(--ms-ink)', borderColor: 'var(--ms-border)' }}
            >
              {c.metadata?.name || 'Conversation'}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-5 space-y-4">
          {walkthrough ? (
            <ScenarioPanel
              stages={stages}
              activeIndex={Math.min(stageIndex, Math.max(stages.length - 1, 0))}
              onIntent={onSelectIntent}
              loading={intakeLoading || !loaded}
              failed={failed}
            />
          ) : (
            <>
              {hasConversation && messages.length === 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3" style={{ background: 'var(--ms-card)', border: '1px solid var(--ms-border)' }}>
                    <p className="text-[13px]" style={{ color: 'var(--ms-ink)' }}>{greeting}</p>
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
                  <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--ms-card)', border: '1px solid var(--ms-border)' }}>
                    <div className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--ms-gold)', animationDelay: `${d}ms` }} />
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
        onSend={handleSend}
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