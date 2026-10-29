import React from 'react';
import ChatComposer from '@/components/mcare/msafe-plus/ChatComposer';
import ConsoleHeader from './ConsoleHeader';
import ConsoleThread from './ConsoleThread';
import VaultBanner from './VaultBanner';
import { CONSOLE, CONSOLE_VARS } from './consoleTheme';

/**
 * MCareConsole — the M-Care chat as a full-screen dark console: identity bar,
 * the working thread, the standing Vault reassurance, and the composer.
 *
 * Fixed and full-bleed so it escapes the surrounding app chrome, and the
 * authorised-scope notice stays visible at the foot rather than scrolling
 * away with the conversation.
 */
export default function MCareConsole({
  messages, isSending, messagesEndRef, showDemo, onSafetyRespond,
  input, setInput, onSend, onKeyDown, chatInputRef,
  onFileSelect, vaultRef, onVaulted, isUploading,
  ghostSuggestion, onApplyCorrection, onToast,
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ ...CONSOLE_VARS, background: CONSOLE.page, color: CONSOLE.text }}
    >
      <ConsoleHeader />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <ConsoleThread
          messages={messages}
          isSending={isSending}
          messagesEndRef={messagesEndRef}
          onSafetyRespond={onSafetyRespond}
          showDemo={showDemo}
        />
      </div>

      <div className="flex-shrink-0">
        <div className="mx-auto w-full max-w-[820px]">
          <VaultBanner />
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
            placeholder="Message M-Care…"
          />
        </div>
        <p
          className="text-center px-5 pt-2"
          style={{
            color: '#3f4753',
            fontSize: 9.5,
            letterSpacing: '0.05em',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
          }}
        >
          Provider verification is one of the most important parts of Morales — nothing here books a clinic for you.
        </p>
      </div>
    </div>
  );
}