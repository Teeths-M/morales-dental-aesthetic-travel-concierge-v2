import React from 'react';
import MessageBubble from '@/components/mcare-agent/MessageBubble';
import EvidenceBlock from './EvidenceBlock';
import { DEMO_TRANSCRIPT, DEMO_DAY_LABEL } from './demoTranscript';
import { CONSOLE } from './consoleTheme';

const bubbleStyle = {
  background: CONSOLE.bubble,
  border: `1px solid ${CONSOLE.bubbleBorder}`,
  borderRadius: 14,
  padding: '12px 15px',
  maxWidth: '78%',
};

const stampStyle = { color: CONSOLE.textFaint, fontSize: 10.5, marginTop: 5 };

function DaySeparator({ label }) {
  return (
    <div className="flex justify-center pt-1 pb-2">
      <span
        style={{
          border: `1px solid ${CONSOLE.border}`,
          borderRadius: 9999,
          padding: '5px 14px',
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: CONSOLE.textSoft,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * ConsoleThread — the conversation itself. Before a session exists it shows
 * the worked day from the demonstration so the screen explains how M-Care
 * reports evidence; the first real message replaces it entirely.
 */
export default function ConsoleThread({ messages, isSending, messagesEndRef, onSafetyRespond, showDemo }) {
  const showSeparator = showDemo || messages.length > 0;
  const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-5">
      {showSeparator && <DaySeparator label={showDemo ? DEMO_DAY_LABEL : `Today · ${today}`} />}

      {showDemo ? (
        <div className="space-y-4">
          {DEMO_TRANSCRIPT.map((m) => (
            <div key={m.id} className="flex flex-col items-start">
              <div style={bubbleStyle}>
                {m.text && (
                  <p style={{ color: CONSOLE.text, fontSize: 14, lineHeight: 1.62, margin: 0 }}>{m.text}</p>
                )}
                {m.blocks?.map((b) => <EvidenceBlock key={b.title} title={b.title} body={b.body} />)}
              </div>
              <span style={stampStyle}>{m.time}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, idx) => {
            const ts = msg.created_date || msg.timestamp;
            const time = ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
            return (
              <div key={idx}>
                <MessageBubble
                  message={msg}
                  onRespond={onSafetyRespond}
                  showReaction
                  variant="console"
                />
                {time && (
                  <p
                    className={msg.role === 'user' ? 'text-right pr-1' : 'pl-1'}
                    style={stampStyle}
                  >
                    {time}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isSending && (
        <div className="flex items-center gap-1.5 mt-4" style={{ ...bubbleStyle, display: 'inline-flex', maxWidth: 'none' }}>
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="animate-bounce rounded-full"
              style={{ width: 6, height: 6, background: CONSOLE.yellow, animationDelay: `${d}ms` }}
            />
          ))}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}