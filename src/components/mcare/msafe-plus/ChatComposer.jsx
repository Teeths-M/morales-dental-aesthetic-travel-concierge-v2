import React from 'react';
import { Send, Mic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AddImageMenu from '@/components/mcare-agent/AddImageMenu';
import MCareVaultUpload from '@/components/mcare-agent/MCareVaultUpload';
import GhostTextOverlay from '@/components/mcare-agent/GhostTextOverlay';
import SmartInputSuggestions from '@/components/mcare-agent/SmartInputSuggestions';
import { handleChatPaste } from '@/lib/chatPaste';

// ChatComposer — the fixed bottom composer: attachment (AddImageMenu, which
// owns device + vault upload), a rounded input with ghost-text overlay and
// smart suggestions, a gold microphone circle, and a gold send circle.
// All send/upload logic is owned by the parent and passed in as props.
export default function ChatComposer({
  input, setInput, onSend, onKeyDown, chatInputRef,
  onFileSelect, vaultRef, onVaulted, isUploading, isSending,
  ghostSuggestion, onApplyCorrection, onToast,
}) {
  const disabled = isSending || isUploading;
  const canSend = (!!input.trim() || isUploading) && !disabled;

  return (
    <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(210,169,61,0.18)', background: '#FBFAF6' }}>
      <SmartInputSuggestions text={input} disabled={disabled} onApplyCorrection={onApplyCorrection} />
      <div className="flex items-center gap-2 px-3 py-3">
        <AddImageMenu
          onDeviceFile={onFileSelect}
          onVaultClick={() => vaultRef.current?.open()}
          onUnsupported={(msg) => onToast?.({ title: 'Attach', description: msg })}
          disabled={disabled}
          uploading={isUploading}
        />
        <MCareVaultUpload ref={vaultRef} hideTrigger onVaulted={onVaulted} />
        <div className="relative flex-1">
          <GhostTextOverlay
            typedText={input}
            suggestion={ghostSuggestion}
            matchClassName={cn('h-10 rounded-full px-4 py-1 text-sm')}
          />
          <Input
            ref={chatInputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={(e) => handleChatPaste(e, {
              onFile: onFileSelect,
              disabled,
              onError: (msg) => onToast?.({ title: 'Paste', description: msg, variant: 'destructive' }),
            })}
            placeholder="Ask M-Safe anything…"
            disabled={disabled}
            className="w-full rounded-full"
            style={{ background: '#FFFFFF', borderColor: 'rgba(210,169,61,0.3)' }}
          />
        </div>
        <button
          type="button"
          className="msafe-mic"
          aria-label="Voice input"
          onClick={() => chatInputRef.current?.focus()}
        >
          <Mic className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="msafe-send"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <style>{`
        .msafe-mic {
          width: 38px; height: 38px; border-radius: 9999px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: #FBF3DE; border: 1px solid rgba(210,169,61,0.35); color: #C9A43B;
          transition: all .15s;
        }
        .msafe-mic:hover { box-shadow: 0 0 0 3px rgba(210,169,61,0.12); }
        .msafe-mic:active { transform: scale(0.95); }
        .msafe-send {
          width: 38px; height: 38px; border-radius: 9999px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #D8B85A, #C9A43B); color: #fff; border: none;
          box-shadow: 0 2px 8px rgba(201,164,59,0.35); transition: all .15s;
        }
        .msafe-send:disabled { opacity: 0.4; box-shadow: none; }
        .msafe-send:not(:disabled):hover { box-shadow: 0 0 0 3px rgba(210,169,61,0.18), 0 2px 10px rgba(201,164,59,0.4); }
        .msafe-send:not(:disabled):active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}