import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, Send, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { friendlyError } from '@/lib/friendlyError';

// OutreachDraftCard — renders inline in the chat via the same tool-name-
// match mechanism SafetyGateCard/DocumentScannerCard already use (see
// MessageBubble.jsx: message.tool_calls?.map, matched on toolCall.name ===
// 'draftPartnerOutreach'). toolCall.results carries the full drafted
// message computed server-side — this card's only job is to show it
// plainly (editable) and require a real tap before anything sends.
//
// The Confirm button calls sendPartnerOutreach DIRECTLY (base44.functions.
// invoke, same pattern DocumentScannerCard.jsx uses for scanVaultDocument)
// — never through the agent. sendPartnerOutreach is deliberately absent
// from m_care.jsonc's tool_configs, so this tap is structurally the only
// way it can ever be called. See sendPartnerOutreach/entry.ts's own header.

const GOLD = '#D4AF37';

export default function OutreachDraftCard({ toolCall, onRespond }) {
  const ctx = (() => {
    let r = toolCall?.results;
    if (typeof r === 'string') { try { r = JSON.parse(r); } catch { /* keep raw */ } }
    return r?.data || r || {};
  })();

  const [mode, setMode] = useState(ctx.success === false ? 'unavailable' : 'review'); // review | sending | sent | cancelled | unavailable
  const [text, setText] = useState(ctx.draft_message || '');
  const [channel, setChannel] = useState(ctx.suggested_channel || (ctx.partner_email ? 'email' : 'whatsapp'));
  const [error, setError] = useState(null);

  if (mode === 'unavailable') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginTop: 8, borderRadius: 16, border: '1px solid #2A3F4A', background: '#0C1A1D', padding: 14, maxWidth: 380 }}
      >
        <p style={{ fontSize: 13, color: '#9CA3AF' }}>{ctx.message || "Couldn't draft that message."}</p>
      </motion.div>
    );
  }

  const canEmail = !!ctx.partner_email;
  const canWhatsapp = !!ctx.partner_whatsapp;

  const send = async () => {
    setMode('sending');
    setError(null);
    try {
      const invokeRes = await base44.functions.invoke('sendPartnerOutreach', {
        case_id: ctx.case_id,
        partner_type: ctx.partner_type,
        partner_id: ctx.partner_id,
        channel,
        message: text,
      });
      const result = invokeRes?.data ?? invokeRes;
      if (!result || result.error) throw new Error(result?.error || 'Send failed');
      setMode('sent');
      onRespond?.(`I sent that message to ${ctx.partner_name} just now, via ${channel === 'email' ? 'email' : 'WhatsApp'}.`);
    } catch (e) {
      setError(friendlyError(e, "Couldn't send that message. Please try again.", 'OutreachDraftCard'));
      setMode('review');
    }
  };

  const cancel = () => {
    setMode('cancelled');
    onRespond?.('I decided not to send that message.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: 8, borderRadius: 16, border: '1px solid #2A3F4A', background: '#0C1A1D', overflow: 'hidden', maxWidth: 400 }}
    >
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #2A3F4A', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Send className="w-4 h-4" style={{ color: GOLD }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F5F1E8', letterSpacing: '0.02em' }}>
          MESSAGE TO {String(ctx.partner_name || '').toUpperCase()}
        </span>
      </div>

      <div style={{ padding: 14 }}>
        {(mode === 'review' || mode === 'sending') && (
          <>
            {ctx.drafted_in_language && (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
                Drafted in {ctx.drafted_in_language}
                {ctx.language_source === 'partner_preference' && ', per their profile'}
                {ctx.language_source === 'country_inferred' && ", based on their country"}
                {ctx.language_source === 'override' && ', as requested'}
                {' — say the word if you\'d like it in a different language.'}
              </p>
            )}

            {ctx.contact_mismatch && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 10, padding: 8, borderRadius: 8, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                <p style={{ fontSize: 11, color: '#F5F1E8', lineHeight: 1.5 }}>
                  Their website's contact info looked different from what's on file with Morales — worth double-checking before sending.
                </p>
              </div>
            )}

            {canEmail && canWhatsapp && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <button
                  onClick={() => setChannel('email')}
                  disabled={mode === 'sending'}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${channel === 'email' ? GOLD : '#2A3F4A'}`, background: channel === 'email' ? 'rgba(212,175,55,0.1)' : 'transparent', color: channel === 'email' ? GOLD : '#9CA3AF' }}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  onClick={() => setChannel('whatsapp')}
                  disabled={mode === 'sending'}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${channel === 'whatsapp' ? GOLD : '#2A3F4A'}`, background: channel === 'whatsapp' ? 'rgba(212,175,55,0.1)' : 'transparent', color: channel === 'whatsapp' ? GOLD : '#9CA3AF' }}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
              </div>
            )}

            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>
              To: {channel === 'email' ? ctx.partner_email : ctx.partner_whatsapp}
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={mode === 'sending'}
              rows={5}
              style={{ width: '100%', borderRadius: 8, border: '1px solid #2A3F4A', background: 'rgba(255,255,255,0.03)', color: '#F5F1E8', fontSize: 13, lineHeight: 1.6, padding: 10, resize: 'vertical', fontFamily: 'inherit' }}
            />

            {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Button variant="outline" onClick={cancel} disabled={mode === 'sending'} className="flex-1 gap-2">
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button onClick={send} disabled={mode === 'sending' || !text.trim()} className="flex-1 gap-2" style={{ background: GOLD, color: '#0C1A1D' }}>
                {mode === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {mode === 'sending' ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </>
        )}

        {mode === 'sent' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />
            <span style={{ fontSize: 13, color: '#F5F1E8' }}>Sent to {ctx.partner_name}.</span>
          </div>
        )}

        {mode === 'cancelled' && (
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Not sent.</p>
        )}
      </div>
    </motion.div>
  );
}
