import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, MessageCircle, Loader2 } from 'lucide-react';

const POLL_MS = 15000;

export default function GuardianMessenger({ token, patientName, guardianName }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getGuardianFeed', { token });
      const d = res?.data ?? res;
      if (d?.status === 'ok') setMessages(d.messages || []);
    } catch (_) {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, POLL_MS);
    return () => clearInterval(id);
  }, [fetchFeed]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError(null);
    try {
      await base44.functions.invoke('sendGuardianMessage', { token, message: t });
      setText('');
      await fetchFeed();
    } catch (_) {
      setError("Couldn't send right now. Please try again.");
    }
    setSending(false);
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-4 h-4 text-blue-400" />
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Message through M-Care</p>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">
        Send a message to {patientName || 'the traveler'}. M-Care will deliver it to them on your behalf.
      </p>

      <div ref={scrollRef} className="space-y-2.5 max-h-72 overflow-y-auto pr-1 mb-3">
        {loading ? (
          <div className="h-20 rounded-xl bg-slate-900/40 animate-pulse" />
        ) : messages.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle className="w-7 h-7 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No messages yet.</p>
            <p className="text-slate-600 text-xs mt-1">Say hello — M-Care will deliver it.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isGuardian = m.from_role === 'guardian';
            const isMcare = m.from_role === 'mcare';
            return (
              <div key={m.id} className={`flex ${isGuardian ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    isGuardian
                      ? 'bg-blue-700 text-white'
                      : isMcare
                        ? 'bg-amber-900/40 border border-amber-700/40 text-amber-100'
                        : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                    {isMcare ? 'M-Care' : m.author_name || (isGuardian ? (guardianName || 'You') : 'Traveler')}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="text-[9px] opacity-50 mt-1 text-right">
                    {m.created_at
                      ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={`Message ${patientName || 'the traveler'}…`}
          className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/50"
          style={{ minHeight: 42, maxHeight: 100 }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 text-white text-sm font-semibold transition-colors min-h-[42px]"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">{sending ? 'Sending' : 'Send'}</span>
        </button>
      </div>
    </div>
  );
}