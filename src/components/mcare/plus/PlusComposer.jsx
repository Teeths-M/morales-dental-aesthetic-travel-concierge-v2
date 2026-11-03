import React, { useState } from 'react';
import { Paperclip, Mic } from 'lucide-react';
import { P } from './plusTheme';

/**
 * PlusComposer — the message pill. It is the way into the live M-Care
 * conversation: anything typed is handed to the real session, and attaching
 * opens that same session so the file lands in the conversation, not here.
 */
export default function PlusComposer({ onSend, onAttach }) {
  const [text, setText] = useState('');

  const submit = (e) => {
    e.preventDefault();
    onSend(text.trim());
    setText('');
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1.5"
      style={{ border: `1px solid ${P.border}`, background: 'rgba(255,255,255,0.04)' }}
    >
      <button
        type="button"
        aria-label="Attach a file"
        onClick={onAttach}
        className="flex h-7 w-7 items-center justify-center rounded-full"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
      >
        <Paperclip size={15} strokeWidth={1.8} color="rgba(255,255,255,0.6)" />
      </button>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Message M-Safe..."
        aria-label="Message M-Safe"
        className="min-w-0 flex-1 bg-transparent outline-none"
        style={{
          border: 'none',
          color: P.text,
          fontSize: 12.5,
          fontFamily: P.font,
          padding: '4px 0',
        }}
      />

      <button
        type="submit"
        aria-label="Speak or send"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{
          border: 'none',
          background: `linear-gradient(150deg, ${P.goldBright}, ${P.gold})`,
          boxShadow: '0 2px 12px rgba(197,160,89,0.35)',
          cursor: 'pointer',
        }}
      >
        <Mic size={16} strokeWidth={2} color="#0A1420" />
      </button>
    </form>
  );
}