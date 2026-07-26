import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageCircle, HelpCircle, Loader2 } from 'lucide-react';

/**
 * CaseThread — the on-platform clarification thread (doctor/partner ↔ patient).
 * Theme-aware (dark for the patient board, light for the doctor dashboard). Content is
 * read here in-portal; the backend scrubs contact details at the quote stage.
 *
 * Props: caseId, quoteId, viewer ('patient' | 'doctor'), theme ('dark' | 'light').
 */
export default function CaseThread({ caseId, quoteId, viewer = 'patient', theme = 'light' }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const dark = theme === 'dark';

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['case-messages', caseId, quoteId],
    enabled: !!(caseId || quoteId),
    refetchInterval: 20000,
    queryFn: () => base44.entities.QuoteMessage
      .filter(quoteId ? { quote_id: quoteId } : { case_id: caseId }, 'created_at', 50)
      .catch(() => []),
  });

  const messagesKey = ['case-messages', caseId, quoteId];

  const post = useMutation({
    mutationFn: ({ body, message_type }) => base44.functions.invoke('postCaseMessage', {
      case_id: caseId, quote_id: quoteId, body, message_type,
    }),
    onMutate: async ({ body, message_type }) => {
      await qc.cancelQueries({ queryKey: messagesKey });
      const previous = qc.getQueryData(messagesKey);
      const optimisticMessage = {
        id: `optimistic-${Date.now()}`,
        body, message_type,
        from_party: viewer,
        created_at: new Date().toISOString(),
        _pending: true,
      };
      qc.setQueryData(messagesKey, (old) => [...(Array.isArray(old) ? old : []), optimisticMessage]);
      setText('');
      return { previous };
    },
    // A failed send must not leave a bubble that looks delivered — roll back
    // and hand the draft back so the sender can retry.
    onError: (_err, variables, context) => {
      if (context?.previous) qc.setQueryData(messagesKey, context.previous);
      setText(variables.body);
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['case-messages'] }); },
  });

  // The patient's send is an "answer" when the doctor's last message asked for info.
  const lastFromOther = [...messages].reverse().find((m) => m.from_party !== viewer);
  const patientAnswering = viewer === 'patient' && lastFromOther?.message_type === 'info_request';
  const defaultType = patientAnswering ? 'answer' : 'message';

  const c = dark
    ? { bg: 'rgba(255,255,255,0.03)', border: '#2A3F4A', text: '#fff', sub: 'rgba(255,255,255,0.55)', mine: 'rgba(212,175,55,0.15)', theirs: 'rgba(255,255,255,0.06)', input: '#0C1A1D' }
    : { bg: '#f8fafc', border: '#e2e8f0', text: '#0f172a', sub: '#64748b', mine: '#e0f2fe', theirs: '#f1f5f9', input: '#fff' };

  const send = (type) => {
    if (!text.trim() || post.isPending) return;
    post.mutate({ body: text.trim(), message_type: type });
  };

  return (
    <div style={{ marginTop: 12, border: `1px solid ${c.border}`, borderRadius: 12, padding: 12, background: c.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: c.sub, fontSize: 12, fontWeight: 700 }}>
        <MessageCircle size={13} /> Messages
      </div>

      {isLoading ? (
        <Loader2 size={16} className="animate-spin" style={{ color: c.sub }} />
      ) : messages.length === 0 ? (
        <p style={{ color: c.sub, fontSize: 12, margin: '4px 0 10px' }}>No messages yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
          {messages.map((m) => {
            const mine = m.from_party === viewer;
            return (
              <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%',
                background: mine ? c.mine : c.theirs, borderRadius: 10, padding: '7px 11px',
                opacity: m._pending ? 0.6 : 1 }}>
                {m._pending ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: c.sub, fontSize: 10, fontWeight: 700, marginBottom: 2 }}>
                    <Loader2 size={11} className="animate-spin" /> Sending…
                  </div>
                ) : m.message_type === 'info_request' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: c.sub, fontSize: 10, fontWeight: 700, marginBottom: 2 }}>
                    <HelpCircle size={11} /> Question
                  </div>
                )}
                <p style={{ color: c.text, fontSize: 13, margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{m.body}</p>
                {m.contact_scrubbed && (
                  <p style={{ color: c.sub, fontSize: 10, margin: '3px 0 0', fontStyle: 'italic' }}>Contact details are kept in-platform.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <textarea
        value={text} onChange={(e) => setText(e.target.value)}
        placeholder={patientAnswering ? 'Answer the question…' : 'Write a message…'}
        rows={2}
        style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 8, border: `1px solid ${c.border}`,
          background: c.input, color: c.text, resize: 'none', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={() => send(defaultType)} disabled={!text.trim() || post.isPending}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#D4AF37', color: '#060B16',
            border: 'none', borderRadius: 99, padding: '8px 16px', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', opacity: !text.trim() || post.isPending ? 0.5 : 1 }}>
          {post.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {patientAnswering ? 'Send answer' : 'Send'}
        </button>
        {viewer === 'doctor' && (
          <button onClick={() => send('info_request')} disabled={!text.trim() || post.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: c.text,
              border: `1px solid ${c.border}`, borderRadius: 99, padding: '8px 16px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', opacity: !text.trim() || post.isPending ? 0.5 : 1 }}>
            <HelpCircle size={13} /> Ask for more info
          </button>
        )}
      </div>
    </div>
  );
}
